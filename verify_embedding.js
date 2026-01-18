
const fs = require('fs');
const readline = require('readline');

async function verifyEmbedding() {
    console.log("Loading pipeline...");
    const { pipeline, env } = await import('@xenova/transformers');
    const path = require('path');
    env.localModelPath = path.join(process.cwd(), 'models');
    env.allowRemoteModels = true; // ALLOW DOWNLOAD trying to find match
    console.log(`Model Path: ${env.localModelPath}`);

    // We suspect the stored vector is Unquantized bge-base-en-v1.5
    // So we try to load THAT. (It might download ~500MB)

    try {
        console.log("Downloading/Loading Unquantized Model...");
        const extractor = await pipeline('feature-extraction', 'Xenova/bge-base-en-v1.5', { quantized: false });

        // Load stored vector
        const content = fs.readFileSync('rev20_9.json', 'utf-8');
        const data = JSON.parse(content.trim());
        const storedVector = data.vector;
        const text = data.metadata.text;

        const output = await extractor(text, { pooling: 'cls', normalize: true });
        const vec = Array.from(output.data);
        const sim = dotProduct(storedVector, vec);

        console.log(`\nUnquantized Model Similarity: ${sim.toFixed(6)}`);

        if (sim > 0.99) {
            console.log("✅ MATCH CONFIRMED! Stored vectors are Unquantized.");
            console.log("SOLUTION: Switch app to use quantized: false.");
        } else {
            console.log("❌ Still mismatch even with Unquantized.");
        }

    } catch (e) {
        console.error("Error loading unquantized:", e.message);
    }
}

function dotProduct(a, b) {
    return a.reduce((acc, val, i) => acc + val * b[i], 0);
}

verifyEmbedding().catch(console.error);
