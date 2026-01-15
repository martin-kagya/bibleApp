const { bibleApiService } = require('../services/bibleApiService.enhanced')
const { localBibleService } = require('../services/localBibleService')
const { bibleCacheService } = require('../services/bibleCacheService')
require('dotenv').config()

const TRANSLATION_ID = process.argv[2]
const ABBREV = process.argv[3] || 'NEW'

if (!TRANSLATION_ID) {
    console.log('Usage: node scripts/primeTranslation.js <TranslationID> <LocalAbbrev>')
    console.log('Example: node scripts/primeTranslation.js bba9f40183526463-01 BSB')
    process.exit(1)
}

async function prime() {
    console.log(`🚀 Starting bulk download for ${ABBREV} (${TRANSLATION_ID})...`)

    try {
        // 1. Get all books from API
        console.log('Fetching book list...')
        const books = await bibleApiService.getBooks(TRANSLATION_ID)
        console.log(`Found ${books.length} books.`)

        // Ensure translation exists locally
        localBibleService.ensureTranslation(ABBREV, ABBREV)

        let totalChapters = 0
        let processedChapters = 0

        // Count total chapters first for progress reporting
        for (const book of books) {
            const chapters = await bibleApiService.getChapters(book.id, TRANSLATION_ID)
            totalChapters += chapters.length
            // Be careful with rate limit here too, but chapters fetch is usually 1 call per book (66 calls total)
            await new Promise(r => setTimeout(r, 100))
        }

        console.log(`Total chapters to download: ${totalChapters}`)
        console.log('Starting chapter-by-chapter download (Respecting 100 RPM rate limit)...')

        for (const book of books) {
            const chapters = await bibleApiService.getChapters(book.id, TRANSLATION_ID)

            for (const chapter of chapters) {
                // chapter.number might be "intro" or actual number
                const chapterNum = parseInt(chapter.number)
                if (isNaN(chapterNum)) continue

                try {
                    await bibleCacheService.getOrFetchChapter(book.name, chapterNum, ABBREV)
                    processedChapters++
                    const percent = ((processedChapters / totalChapters) * 100).toFixed(1)
                    process.stdout.write(`\rProgress: ${percent}% (${processedChapters}/${totalChapters}) - Last: ${book.name} ${chapterNum}    `)
                } catch (err) {
                    console.error(`\nFailed to fetch ${book.name} ${chapterNum}: ${err.message}`)
                }

                // Rate limit: 100 req/min = 600ms per request.
                // We use slightly more to be safe.
                await new Promise(r => setTimeout(r, 700))
            }
        }

        console.log('\n\n✨ Bulk download complete!')
        console.log(`Successfully indexed ${processedChapters} chapters in ${ABBREV}.`)

    } catch (error) {
        console.error('\n❌ Bulk download failed:', error.message)
    }
}

prime()
