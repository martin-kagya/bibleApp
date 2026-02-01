const { spawn } = require('child_process');
const path = require('path');
const { EventEmitter } = require('events');
const { getResourcePath } = require('./pathUtils');
const { app } = require('electron');

class FasterWhisperService extends EventEmitter {
    constructor() {
        super();
        this.pythonProcess = null;
        this.isReady = false;
        this.buffer = '';

        // Use python3 on Mac, python on Windows
        this.pythonPath = process.platform === 'win32' ? 'python' : 'python3';

        const isProd = app && app.isPackaged;
        if (isProd) {
            // Unpacked files in production are in app.asar.unpacked
            this.scriptPath = path.join(process.resourcesPath, 'app.asar.unpacked', 'services', 'faster_whisper_server.py');
        } else {
            this.scriptPath = path.join(__dirname, 'faster_whisper_server.py');
        }

        this.modelPath = getResourcePath('models/vosk-model-small-en-us-0.15'); // Note: You might need to adjust this depending on which model faster-whisper is using
        this.isInitializing = false;
    }

    init() {
        if (this.pythonProcess || this.isInitializing) {
            if (this.isReady) this.emit('ready');
            return;
        }

        this.isInitializing = true;
        console.log(`🎤 Spawning Shared Faster-Whisper Python Bridge: ${this.pythonPath} ${this.scriptPath}`);

        try {
            this.pythonProcess = spawn(this.pythonPath, ['-u', this.scriptPath], {
                stdio: ['pipe', 'pipe', 'inherit'] // pipe stdin/stdout, inherit stderr for logs
            });

            this.pythonProcess.stdout.on('data', (data) => {
                this.buffer += data.toString();
                const lines = this.buffer.split('\n');
                this.buffer = lines.pop(); // Keep incomplete line

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const msg = JSON.parse(line);
                        this.handleMessage(msg);
                    } catch (e) {
                        // console.error('JSON Parse Error from Python line:', line, e);
                    }
                }
            });

            this.pythonProcess.on('error', (err) => {
                console.error('❌ Faster-Whisper Process Spawn Error:', err);
                this.isInitializing = false;
                this.pythonProcess = null;
            });

            this.pythonProcess.on('exit', (code, signal) => {
                console.error(`⚠️ Faster-Whisper Process exited (code: ${code}, signal: ${signal})`);
                this.isReady = false;
                this.isInitializing = false;
                this.pythonProcess = null;
                this.emit('exit', { code, signal });
            });

            // Handle stdin errors (Broken Pipe on the JS side)
            this.pythonProcess.stdin.on('error', (err) => {
                console.error('❌ Faster-Whisper Stdin Error:', err);
            });

        } catch (err) {
            console.error('❌ Failed to start Faster-Whisper process:', err);
            this.isInitializing = false;
        }
    }

    handleMessage(msg) {
        if (msg.type === 'ready') {
            this.isReady = true;
            this.isInitializing = false;
            console.log('✅ Faster-Whisper Service Ready');
            this.emit('ready');
        } else if (msg.type === 'partial') {
            this.emit('transcript', {
                text: msg.text,
                isFinal: false
            });
        } else if (msg.type === 'final') {
            this.emit('transcript', {
                text: msg.text,
                isFinal: true,
                start: msg.start,
                end: msg.end
            });
        }
    }

    writeAudio(chunk) {
        if (!this.pythonProcess || !this.pythonProcess.stdin || !this.isReady) {
            // Silently drop if not ready, avoids spamming logs during startup
            return;
        }

        try {
            // check if writable
            if (this.pythonProcess.stdin.writable) {
                this.pythonProcess.stdin.write(chunk);
            }
        } catch (e) {
            console.error('Error writing audio to Faster-Whisper:', e);
        }
    }

    shutdown() {
        if (this.pythonProcess) {
            console.log('🛑 Shutting down Faster-Whisper Python Bridge gracefully...');

            try {
                // 1. Close stdin to signal EOF to the Python process
                if (this.pythonProcess.stdin) {
                    this.pythonProcess.stdin.end();
                }

                // 2. Send SIGTERM to trigger signal handlers
                this.pythonProcess.kill('SIGTERM');

                // 3. Set a timeout to force kill if it doesn't exit
                const forceKillTimeout = setTimeout(() => {
                    if (this.pythonProcess) {
                        console.log('⚠️ Process did not exit gracefully, force killing...');
                        this.pythonProcess.kill('SIGKILL');
                    }
                }, 2000);

                this.pythonProcess.on('exit', () => {
                    clearTimeout(forceKillTimeout);
                });
            } catch (e) {
                console.error('Error during shutdown:', e);
                this.pythonProcess.kill('SIGKILL');
            }

            this.pythonProcess = null;
            this.isReady = false;
            this.isInitializing = false;
        }
    }
}

module.exports = { FasterWhisperService };
