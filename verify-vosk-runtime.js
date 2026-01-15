const { app } = require('electron');
const path = require('path');

app.whenReady().then(() => {
    console.log('--- Vosk Runtime Verification ---');
    console.log('Electron Version:', process.versions.electron);
    console.log('Node Version:', process.versions.node);

    try {
        const vosk = require('vosk');
        console.log('✅ Success: Vosk native module loaded successfully.');
        // Try creating a model instance too
        const modelPath = path.join(__dirname, 'models', 'vosk-model-small-en-us-0.15');
        if (require('fs').existsSync(modelPath)) {
            console.log('Model found, attempting to initialize...');
            const model = new vosk.Model(modelPath);
            console.log('✅ Success: Vosk model initialized successfully.');
        } else {
            console.log('⚠️ Model not found at:', modelPath);
        }
    } catch (e) {
        console.error('❌ Error: Vosk failed to load in Electron runtime:');
        console.error(e.message);
        if (e.stack) console.error(e.stack);
    }

    app.quit();
});
