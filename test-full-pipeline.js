const io = require('socket.io-client');
const fs = require('fs');
const path = require('path');

const socket = io('http://127.0.0.1:8000', {
    reconnection: true,
    transports: ['websocket', 'polling']
});

const audioPath = path.join(__dirname, 'audio/2830-3980-0043.wav');

socket.on('connect_error', (err) => {
    console.log('❌ Connection Error:', err.message);
});

socket.on('connect', () => {
    console.log('✅ Connected to server with ID:', socket.id);

    if (!fs.existsSync(audioPath)) {
        console.error('❌ Audio file not found:', audioPath);
        process.exit(1);
    }

    const buffer = fs.readFileSync(audioPath);
    const pcmData = buffer.subarray(44); // Skip header

    console.log(`Sending ${pcmData.length} bytes of audio...`);

    // Simulate streaming
    const chunkSize = 4000;
    let offset = 0;

    const interval = setInterval(() => {
        if (offset >= pcmData.length) {
            clearInterval(interval);
            console.log('🏁 Finished sending audio. Waiting for results...');
            return;
        }

        const chunk = pcmData.subarray(offset, offset + chunkSize);
        socket.emit('audio-chunk', { audio: chunk });
        offset += chunkSize;
    }, 100); // 100ms interval
});

socket.on('transcript-update', (data) => {
    if (data.isFinal) {
        console.log('🔥 FINAL TRANSCRIPT:', data.transcript);
        console.log('   Source:', data.source);
    } else {
        console.log('📝 Partial:', data.transcript);
    }
});

socket.on('analysis-result', (data) => {
    console.log('💡 ANALYSIS RESULT:', JSON.stringify(data, null, 2));
});

socket.on('disconnect', () => {
    console.log('❌ Disconnected');
});

// Timeout
setTimeout(() => {
    console.log('🏁 Timeout reached. Closing.');
    socket.disconnect();
    process.exit(0);
}, 30000);
