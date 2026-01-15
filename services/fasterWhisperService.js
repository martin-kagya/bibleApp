const { spawn } = require('child_process');
const path = require('path');
const { EventEmitter } = require('events');

class FasterWhisperService extends EventEmitter {
    constructor() {
        super();
        this.pythonProcess = null;
        this.isReady = false;
        this.buffer = '';
        this.pythonPath = 'python3'; // Assume valid env or venv
        this.scriptPath = path.join(__dirname, 'faster_whisper_server.py');
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
                        console.error('JSON Parse Error from Python line:', line, e);
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
            console.log('🛑 Shutting down Faster-Whisper Python Bridge');
            this.pythonProcess.kill();
            this.pythonProcess = null;
            this.isReady = false;
            this.isInitializing = false;
        }
    }
}

module.exports = { FasterWhisperService };
