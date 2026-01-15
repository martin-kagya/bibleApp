const { fork } = require('child_process');
const path = require('path');
const fs = require('fs');

let appPath = process.cwd();
try {
  const { app } = require('electron');
  if (app) appPath = app.getAppPath();
} catch (e) { }

class WhisperService {
  constructor() {
    this.worker = null;
    this.isReady = false;
    this.pendingRequests = new Map();
    this.restartDelay = 1000;
    this.init();
  }

  async init() {
    if (this.worker) return; // Already initialized or initializing

    console.log('🎤 Spawning Whisper Child Process...');
    this.worker = fork(path.join(__dirname, 'whisperWorker.js'), [appPath], {
      stdio: ['inherit', 'inherit', 'inherit', 'ipc']
    });

    this.worker.on('message', (msg) => {
      if (msg.type === 'ready') {
        this.isReady = true;
        console.log('✓ Whisper Child Process Ready');
      } else if (msg.type === 'log') {
        console.log(`[WhisperChild] ${msg.message}`);
      } else if (msg.type === 'error') {
        if (msg.requestId) {
          const resolver = this.pendingRequests.get(msg.requestId);
          if (resolver) resolver.reject(new Error(msg.error));
          this.pendingRequests.delete(msg.requestId);
        } else {
          console.error(`[WhisperChild Error] ${msg.message}`);
        }
      } else if (msg.type === 'result') {
        const resolver = this.pendingRequests.get(msg.requestId);
        if (resolver) {
          resolver.resolve(msg.data);
          this.pendingRequests.delete(msg.requestId);
        }
      }
    });

    this.worker.on('error', (err) => {
      console.error('❌ Whisper Child Process Crash:', err);
    });

    this.worker.on('exit', (code) => {
      console.error(`Whisper Child Process stopped with exit code ${code}. Restarting in ${this.restartDelay}ms...`);
      this.isReady = false;
      this.worker = null;
      setTimeout(() => this.init(), this.restartDelay);
    });
  }

  async ensureReady() {
    if (this.isReady) return;
    if (!this.worker) await this.init();

    let attempts = 0;
    while (!this.isReady && attempts < 150) {
      await new Promise(r => setTimeout(r, 100));
      attempts++;
    }
    if (!this.isReady) throw new Error('Whisper service failed to initialize after restart');
  }

  async transcribe(audio, options = {}) {
    await this.ensureReady();

    let audioInput = audio;

    // Handle Buffer input (convert to Float32Array)
    if (Buffer.isBuffer(audio)) {
      const int16 = new Int16Array(audio.buffer, audio.byteOffset, audio.length / 2);
      audioInput = new Float32Array(int16.length);
      for (let i = 0; i < int16.length; i++) {
        audioInput[i] = int16[i] / 32768.0;
      }
    } else if (typeof audio === 'string') {
      console.warn('File path transcription not fully supported in Worker mode yet. Please pass Buffer/Float32Array.');
      return { text: '' };
    }

    return new Promise((resolve, reject) => {
      const requestId = Math.random().toString(36).substring(7);
      this.pendingRequests.set(requestId, { resolve, reject });

      // Post Float32Array to worker
      // Logic checks
      if (!(audioInput instanceof Float32Array)) {
        reject(new Error('Invalid audio input format. Expected Buffer or Float32Array.'));
        return;
      }

      try {
        if (!this.worker) throw new Error('Worker died unexpectedly');
        this.worker.send({
          type: 'transcribe',
          requestId,
          audio: Array.from(audioInput)
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  isServiceAvailable() {
    return this.isReady;
  }
}

const whisperService = new WhisperService();
module.exports = { whisperService };
