
const fs = require('fs');
const readline = require('readline');

async function checkMagnitude() {
    const stream = fs.createReadStream('data/vectors-bge-base.json');
    const rl = readline.createInterface({ input: stream, crlfDelay: Infinity });

    for await (const line of rl) {
        if (!line.trim()) continue;
        try {
            const data = JSON.parse(line);
            const vec = data.vector;
            const mag = Math.sqrt(vec.reduce((sum, val) => sum + (val * val), 0));
            console.log(`Reference: ${data.reference}`);
            console.log(`Dimensions: ${vec.length}`);
            console.log(`Magnitude: ${mag.toFixed(6)}`);
            break; // Check only first valid line
        } catch (e) {
            console.error("Parse error:", e.message);
        }
    }
}

checkMagnitude();
