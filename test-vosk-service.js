const { voskService } = require('./services/voskService');

async function testVoskService() {
    console.log('--- Testing Vosk Service (Event-Based) ---');
    try {
        const initialized = await voskService.initialize();
        if (!initialized) {
            console.error('❌ Failed to initialize Vosk service');
            return;
        }

        const recognizer = voskService.createRecognizer(16000);

        recognizer.on('ready', () => {
            console.log('✅ Success: Bridge signaled READY');

            // Feed some dummy audio (headerless PCM silence)
            const silence = Buffer.alloc(32000, 0); // 1 sec of silence @ 16k
            recognizer.acceptWaveform(silence);
            console.log('🎤 Fed silence to bridge');

            // Wait for a result (likely empty partial or final)
            // Silence usually results in empty partials or nothing.
        });

        recognizer.on('transcript', (data) => {
            console.log('📝 Received Transcript:', JSON.stringify(data));
        });

        recognizer.on('error', (err) => {
            console.error('❌ Recognizer Error:', err);
        });

        // Timeout after 5 seconds
        setTimeout(() => {
            console.log('Test complete (timeout)');
            recognizer.free();
            process.exit(0);
        }, 8000);

    } catch (e) {
        console.error('❌ Unexpected Error during test:', e);
    }
}

testVoskService();
