
const path = require('path');
const fs = require('fs');

// We need to handle the import of transformers dynamically or standard requires
let pipeline, env;

// State
let transcriber = null;
let isReady = false;

// Get APP_PATH from arguments (fork mode)
const APP_PATH = process.argv[2] || process.cwd();
const MODELS_PATH = path.join(APP_PATH, 'models');

const log = (...args) => {
    console.log(`[WhisperNative]`, ...args); // Direct stdout
    if (process.send) process.send({ type: 'log', message: args.join(' ') });
};

const error = (...args) => {
    console.error(`[WhisperNative Error]`, ...args); // Direct stderr
    if (process.send) process.send({ type: 'error', message: args.join(' ') });
};

const init = async () => {
    try {
        log('🔧 Child Process initializing transformers...');
        const transformers = await import('@xenova/transformers');
        pipeline = transformers.pipeline;
        env = transformers.env;

        env.localModelPath = MODELS_PATH;
        env.cacheDir = MODELS_PATH;
        env.allowRemoteModels = false; // Assume offline/local only for production stability

        log(`📂 Loading model from ${MODELS_PATH}...`);
        transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-small.en');

        isReady = true;
        log('✅ Child Process: Whisper model loaded');
        if (process.send) process.send({ type: 'ready' });

    } catch (err) {
        error('Failed to load Whisper in process:', err.message);
    }
};

const transcribe = async (audioData) => {
    if (!isReady) {
        throw new Error('Model not ready');
    }

    // Audio Data comes in as Float32Array (serialized object in IPC)
    // Note: In 'fork', typed arrays might be serialized to objects like { 0: 0.1, 1: 0.2 ... } 
    // Recovery: Ensure it's Float32Array
    let input = audioData;
    if (!(input instanceof Float32Array)) {
        // If it comes as an object/array, convert back
        if (input && input.data) input = input.data; // generic handle if packaged
        input = new Float32Array(Object.values(input));
    }

    const result = await transcriber(input, {
        language: 'en',
        task: 'transcribe',
        condition_on_previous_text: true,
        temperature: 0,
        no_speech_threshold: 0.6,
    });

    return result;
};

// Handle messages
process.on('message', async (msg) => {
    if (msg.type === 'transcribe') {
        try {
            const { audio } = msg;

            // log(`Worker processing audio...`);
            const output = await transcribe(audio);

            if (process.send) process.send({
                type: 'result',
                requestId: msg.requestId,
                data: {
                    text: output.text.trim(),
                    chunks: output.chunks
                }
            });
        } catch (err) {
            error('Transcribe error:', err.message);
            if (process.send) process.send({
                type: 'error',
                requestId: msg.requestId,
                error: err.message
            });
        }
    }
});

// Start
init();
