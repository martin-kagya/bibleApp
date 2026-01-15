const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const EventEmitter = require('events');

let appPath = process.cwd();
try {
    const { app } = require('electron');
    if (app) appPath = app.getAppPath();
} catch (e) { }

class VoskRecognizerProxy extends EventEmitter {
    constructor(bridgeProcess) {
        super();
        this.bridge = bridgeProcess;

        // Pipe stderr to console for debugging Python bridge
        this.bridge.stderr.on('data', (data) => {
            console.error(`[VoskBridge Log] ${data.toString()}`);
        });

        const readline = require('readline');
        this.rl = readline.createInterface({
            input: this.bridge.stdout,
            terminal: false
        });

        this.rl.on('line', (line) => {
            if (!line.trim()) return;
            try {
                const parsed = JSON.parse(line);
                if (parsed.text !== undefined || parsed.partial !== undefined) {
                    this.emit('transcript', {
                        text: parsed.text || "",
                        partial: parsed.partial || "",
                        isFinal: !!parsed.isFinal
                    });
                    console.log(`📝 Vosk Bridge Result: ${line}`);
                } else if (parsed.status === 'ready') {
                    console.log('🚀 Vosk Bridge Process Ready');
                    this.emit('ready');
                }
            } catch (e) {
                // console.log('[Python Bridge Log]:', line);
            }
        });

        this.bridge.on('error', (err) => {
            console.error('❌ Vosk Python Bridge Process Error:', err);
            this.emit('error', err);
        });

        this.bridge.on('exit', (code) => {
            if (code !== 0) {
                console.error(`❌ Vosk Python Bridge exited with code ${code}`);
            }
            this.emit('exit', code);
        });
    }

    acceptWaveform(buffer) {
        if (this.bridge.stdin.writable) {
            console.log(`🎤 Feeding ${buffer.length} bytes to Vosk bridge`);
            this.bridge.stdin.write(buffer);
            return true;
        }
        return false;
    }

    free() {
        if (this.bridge) {
            this.bridge.kill();
        }
    }
}

class VoskService {
    constructor() {
        this.modelPath = path.join(appPath, 'models', 'vosk-model-small-en-us-0.15');
        this.isReady = false;
        this.pythonPath = 'python3'; // Assume python3 is in PATH as verified
    }

    async initialize() {
        if (this.isReady) return true;

        if (!fs.existsSync(this.modelPath)) {
            console.warn('🎤 Vosk model not found at:', this.modelPath);
            return false;
        }

        // Check if python bridge exists
        const bridgePath = path.join(__dirname, 'vosk_bridge.py');
        if (!fs.existsSync(bridgePath)) {
            console.error('❌ Vosk bridge script not found at:', bridgePath);
            return false;
        }

        // Verify python3 availability
        try {
            const { execSync } = require('child_process');
            execSync('python3 --version', { stdio: 'ignore' });
        } catch (e) {
            console.error('❌ Vosk Service Error: python3 not found. Please install Python to use STT.');
            return false;
        }

        this.isReady = true;
        console.log('✓ Vosk Service (Python Bridge) ready');
        return true;
    }

    createRecognizer(sampleRate = 16000) {
        if (!this.isReady) throw new Error('Vosk service not initialized');

        const bridgePath = path.join(__dirname, 'vosk_bridge.py');
        const child = spawn(this.pythonPath, [bridgePath, this.modelPath]);

        // Small delay or wait for "ready" signal from Python could be added
        // but for now we just return the proxy and let buffers pipe in.
        return new VoskRecognizerProxy(child);
    }

    isServiceAvailable() {
        return this.isReady;
    }
}

const voskService = new VoskService();
module.exports = { voskService };
