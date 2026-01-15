const { voskService } = require('./services/voskService');

async function test() {
    try {
        console.log('Attempting to initialize Vosk...');
        // We need to re-enable the require in voskService first
        await voskService.initialize();
        console.log('Vosk initialized successfully!');
    } catch (error) {
        console.error('Vosk failed to initialize:', error);
    }
}

test();
