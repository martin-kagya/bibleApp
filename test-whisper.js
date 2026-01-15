// Test Whisper transcription with a saved audio file
const { whisperService } = require('./services/whisperService')
const path = require('path')

async function testWhisper() {
    console.log('🧪 Testing Whisper transcription...')

    // Wait for model to load
    console.log('⏳ Waiting for Whisper model to load...')
    await new Promise(resolve => setTimeout(resolve, 10000))

    const testFile = process.argv[2] || 'temp/eUmV-JzsM3QAm0RoAAAF/chunk_1765232912828.wav'
    const audioPath = path.join(__dirname, testFile)

    console.log(`📁 Testing file: ${audioPath}`)

    try {
        const result = await whisperService.transcribe(audioPath)
        console.log('✅ Transcription result:', JSON.stringify(result, null, 2))

        if (!result.text || result.text.trim() === '') {
            console.log('⚠️  Empty transcription - this is the problem!')
            console.log('Chunks:', result.chunks)
        } else {
            console.log('🎉 SUCCESS! Transcription:', result.text)
        }
    } catch (error) {
        console.error('❌ Error:', error)
    }

    process.exit(0)
}

testWhisper()
