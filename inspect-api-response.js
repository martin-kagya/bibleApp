const { bibleApiService } = require('./services/bibleApiService.enhanced')
require('dotenv').config()

async function inspect() {
    const bibleId = 'bba9f40183526463-01' // BSB
    const ref = 'John 3:16'

    try {
        const verse = await bibleApiService.getVerse(ref, bibleId)
        console.log('--- API Response for John 3:16 ---')
        console.log('Reference:', verse.reference)
        console.log('Text (RAW):', JSON.stringify(verse.text))

        const ref2 = 'John 3'
        const chapter = await bibleApiService.getVerse(ref2, bibleId)
        console.log('\n--- API Response for John 3 (Full Chapter) ---')
        console.log('Text (Start):', JSON.stringify(chapter.text.substring(0, 100)))
    } catch (err) {
        console.error('Error:', err.message)
    }
}

inspect()
