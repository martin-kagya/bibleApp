const { bibleCacheService } = require('./services/bibleCacheService')
const { localBibleService } = require('./services/localBibleService')
require('dotenv').config()

async function runBulkDownload() {
    const translation = process.argv[2] || 'WEB'

    console.log(`\n--- PneumaVoice Bulk Download Tool ---`)
    console.log(`Target Translation: ${translation}`)

    try {
        await bibleCacheService.downloadEntireTranslation(translation, (progress) => {
            if (progress.status === 'downloading') {
                const percent = Math.round((progress.currentBook / progress.totalBooks) * 100)
                process.stdout.write(`\r[${percent}%] Downloading ${progress.book} (${progress.chapters} chapters)...      `)
            } else if (progress.status === 'complete') {
                console.log(`\n\n✅ Successfully downloaded ${progress.translation}!`)
            }
        })

        // Verify some data exists now
        const db = localBibleService.getTranslationByAbbrev(translation)
        if (db) {
            console.log(`Verification: ${translation} is registered in the database.`)
        }

    } catch (err) {
        console.error(`\n\n❌ Bulk download failed:`, err.message)
        process.exit(1)
    }
}

// Check if run directly
if (require.main === module) {
    runBulkDownload()
}
