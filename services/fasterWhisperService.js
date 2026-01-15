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
    }

    init() {
        if (this.pythonProcess) return;

        console.log(`🎤 Spawning Faster-Whisper Python Bridge: ${this.pythonPath} ${this.scriptPath}`);
        this.pythonProcess = spawn(this.pythonPath, ['-u', this.scriptPath], {
            stdio: ['pipe', 'pipe', 'inherit'] // pipe stdin/stdout, inherit stderr for logs
        });

        this.pythonProcess.stdout.on('data', (data) => {
            // console.log('[FasterWhisper Raw]', data.toString()); // DEBUG
            this.buffer += data.toString();
            const lines = this.buffer.split('\n');
            this.buffer = lines.pop(); // Keep incomplete line

            for (const line of lines) {
                if (!line.trim()) continue;
                try {
                    const msg = JSON.parse(line);
                    this.handleMessage(msg);
                } catch (e) {
                    console.error('JSON Parse Error from specific line:', line, e);
                }
            }
        });

        this.pythonProcess.on('error', (err) => {
            console.error('❌ Faster-Whisper Process Error:', err);
        });

        this.pythonProcess.on('exit', (code) => {
            console.error(`Faster-Whisper Process exited with code ${code}`);
            this.isReady = false;
            this.pythonProcess = null;
            // Optional: Auto-restart logic could go here
        });
    }

    handleMessage(msg) {
        if (msg.type === 'ready') {
            this.isReady = true;
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
        if (!this.pythonProcess || !this.pythonProcess.stdin) {
            console.warn('⚠️ Faster-Whisper process not initialized, dropping audio');
            return;
        }

        try {
            this.pythonProcess.stdin.write(chunk);
        } catch (e) {
            console.error('Error writing audio to Faster-Whisper:', e);
        }
    }

    shutdown() {
        if (this.pythonProcess) {
            this.pythonProcess.kill();
            this.pythonProcess = null;
        }
    }
}

module.exports = { FasterWhisperService };
