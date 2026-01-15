const { voskService } = require('./services/voskService');
const fs = require('fs');
const path = require('path');

async function testVoskWithAudio() {
    console.log('--- Testing Vosk Service with Real Audio ---');
    try {
        const initialized = await voskService.initialize();
        if (!initialized) {
            console.error('❌ Failed to initialize Vosk service');
            return;
        }

        const recognizer = voskService.createRecognizer(16000);
        const audioPath = path.join(__dirname, 'audio', '2830-3980-0043.wav');

        if (!fs.existsSync(audioPath)) {
            console.error('❌ Audio file not found:', audioPath);
            process.exit(1);
        }

        const audioBuffer = fs.readFileSync(audioPath);
        // WAV header is 44 bytes, usually we skip it, but Vosk might handle it or we should skip.
        // Let's skip 44 bytes just in case.
        const pcmData = audioBuffer.subarray(44);

        console.log(`Loaded audio file: ${audioBuffer.length} bytes`);

        recognizer.on('ready', () => {
            console.log('✅ Bridge READY. Feeding audio...');

            // Feed in chunks to simulate streaming
            const chunkSize = 4000;
            let offset = 0;

            const interval = setInterval(() => {
                if (offset >= pcmData.length) {
                    clearInterval(interval);
                    console.log('🏁 Finished feeding audio');
                    return;
                }

                const chunk = pcmData.subarray(offset, offset + chunkSize);
                recognizer.acceptWaveform(chunk);
                offset += chunkSize;
            }, 50); // Feed every 50ms
        });

        recognizer.on('transcript', (data) => {
            if (data.isFinal) {
                console.log('🔥 FINAL:', data.text);
            } else {
                if (data.partial) console.log('📝 Partial:', data.partial);
            }
        });

        recognizer.on('error', (err) => {
            console.error('❌ Recognizer Error:', err);
        });

        // Timeout after 15 seconds
        setTimeout(() => {
            console.log('Test complete (timeout)');
            recognizer.free();
            process.exit(0);
        }, 15000);

    } catch (e) {
        console.error('❌ Unexpected Error during test:', e);
    }
}

testVoskWithAudio();
