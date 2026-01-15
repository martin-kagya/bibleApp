const fs = require('fs');
const path = require('path');

const audioPath = path.join(__dirname, 'test_audio.wav');
const buffer = fs.readFileSync(audioPath);
const pcm = buffer.subarray(44); // Skip header

let max = 0;
let sum = 0;
for (let i = 0; i < pcm.length; i += 2) {
    const val = pcm.readInt16LE(i);
    const abs = Math.abs(val);
    if (abs > max) max = abs;
    sum += abs;
}

const avg = sum / (pcm.length / 2);

console.log(`Max Amplitude: ${max}`);
console.log(`Avg Amplitude: ${avg}`);
if (avg < 100) console.log('WARNING: Audio might be silence');
