const fs = require('fs');
const path = require('path');
const https = require('https');
const unzipper = require('unzipper'); // I should check if unzipper is installed or use another way

const MODEL_URL = 'https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip';
const MODEL_NAME = 'vosk-model-small-en-us-0.15';
const MODELS_DIR = path.join(__dirname, '..', 'models');
const ZIP_PATH = path.join(MODELS_DIR, 'vosk-model.zip');

async function downloadModel() {
    if (!fs.existsSync(MODELS_DIR)) {
        fs.mkdirSync(MODELS_DIR, { recursive: true });
    }

    const targetDir = path.join(MODELS_DIR, MODEL_NAME);
    if (fs.existsSync(targetDir)) {
        console.log('✓ Vosk model already exists.');
        return;
    }

    console.log('📥 Downloading Vosk model (approx. 40MB)...');
    console.log('🔗 URL:', MODEL_URL);

    const file = fs.createWriteStream(ZIP_PATH);

    https.get(MODEL_URL, (response) => {
        response.pipe(file);

        file.on('finish', () => {
            file.close();
            console.log('📦 Extracting model...');

            fs.createReadStream(ZIP_PATH)
                .pipe(unzipper.Extract({ path: MODELS_DIR }))
                .on('close', () => {
                    console.log('✓ Model extracted to:', targetDir);
                    fs.unlinkSync(ZIP_PATH); // Delete zip
                    console.log('✨ Setup complete!');
                })
                .on('error', (err) => {
                    console.error('❌ Extraction failed:', err);
                });
        });
    }).on('error', (err) => {
        fs.unlinkSync(ZIP_PATH);
        console.error('❌ Download failed:', err);
    });
}

downloadModel();
