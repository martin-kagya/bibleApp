const fs = require('fs');
const path = require('path');
const { WaveFile } = require('wavefile');

const audioPath = path.join(__dirname, 'test_audio.wav');
const buffer = fs.readFileSync(audioPath);
const wav = new WaveFile(buffer);

console.log('--- Audio Format Analysis ---');
console.log('Container:', wav.container);
console.log('Chunk Size:', wav.chunkSize);
console.log('Format:', wav.fmt.audioFormat === 1 ? 'PCM' : wav.fmt.audioFormat);
console.log('Channels:', wav.fmt.numChannels);
console.log('Sample Rate:', wav.fmt.sampleRate);
console.log('Byte Rate:', wav.fmt.byteRate);
console.log('Block Align:', wav.fmt.blockAlign);
console.log('Bits Per Sample:', wav.fmt.bitsPerSample);

if (wav.fmt.sampleRate !== 16000) {
    console.error('❌ ERROR: Sample rate must be 16000Hz');
}
if (wav.fmt.numChannels !== 1) {
    console.error('❌ ERROR: Must be Mono (1 channel)');
}
if (wav.fmt.bitsPerSample !== 16) {
    console.error('❌ ERROR: Must be 16-bit');
}
