const { bibleCacheService, TRANSLATION_MAPPINGS } = require('./services/bibleCacheService')
const { bibleApiService } = require('./services/bibleApiService.enhanced')
require('dotenv').config()

async function testSingleBookDownload() {
    const translation = 'ASV'
    const bookName = 'Jude'

    console.log(`\n--- Testing Bulk Download Logic (via Service) ---`)

    try {
        // We use the real service method which now has the NaN check
        await bibleCacheService.downloadEntireTranslation(translation, (p) => {
            if (p.book === 'Jude') {
                console.log(`Progress: ${p.status} ${p.book}...`)
            }
        })

        console.log(`\n✅ Test Complete!`)

    } catch (err) {
        console.error(`\n❌ Test failed:`, err.message)
    }
}

testSingleBookDownload()
