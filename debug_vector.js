
const fs = require('fs');
const path = require('path');
const readline = require('readline');

async function debugVectors() {
    console.log("Starting Vector Debug...");

    // 1. Load BGE-Base Extractor
    const { pipeline } = await import('@xenova/transformers');
    const extractor = await pipeline('feature-extraction', 'Xenova/bge-base-en-v1.5');

    // 2. Generate Query Embedding
    const query = "encompassed the beloved city";
    const instruction = `Represent this sentence for searching relevant passages: ${query}`;
    const output = await extractor(instruction, { pooling: 'cls', normalize: true });
    const queryVector = Array.from(output.data);

    console.log(`Query Vector Generated. Norm: ${magnitude(queryVector)}`);

    // 3. Find Revelation 20:9 in vectors-bge-base.json
    const vectorPath = path.join(process.cwd(), 'data', 'vectors-bge-base.json');
    const fileStream = fs.createReadStream(vectorPath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let targetVector = null;
    let targetText = "";

    for await (const line of rl) {
        if (line.includes("Revelation 20:9") || line.includes("Revelation 20:9")) {
            const data = JSON.parse(line);
            if (data.metadata.book === "Revelation" && data.metadata.chapter === 20 && data.metadata.verseNumber === 9) {
                targetVector = data.vector;
                targetText = data.metadata.text;
                console.log(`FOUND Target: ${data.id}`);
                console.log(`Text: ${targetText}`);
                break;
            }
        }
    }

    if (targetVector) {
        // 4. Check Target Normalization
        const mag = magnitude(targetVector);
        console.log(`Target Vector Magnitude: ${mag}`);

        // 5. Compute Dot Product
        const dot = dotProduct(queryVector, targetVector);
        console.log(`Dot Product (Similarity): ${dot}`);

        // 6. Compute Cosine Similarity (Manual)
        const cosine = dot / (magnitude(queryVector) * mag); // Should be same if norms are 1
        console.log(`Cosine Similarity: ${cosine}`);
    } else {
        console.log("Could not find Revelation 20:9 in vector file.");
    }
}

function magnitude(vec) {
    return Math.sqrt(vec.reduce((acc, val) => acc + val * val, 0));
}

function dotProduct(a, b) {
    return a.reduce((acc, val, i) => acc + val * b[i], 0);
}

debugVectors().catch(console.error);
