const { bibleApiService, BIBLE_BOOKS } = require('./bibleApiService.enhanced')
const { localBibleService } = require('./localBibleService')

// Translation ID Mappings (Scripture API IDs)
const TRANSLATION_MAPPINGS = {
    'KJV': 'de4e12af7f28f599-02',
    'BSB': 'bba9f40183526463-01',
    'ASV': '06125adad2d5898a-01',
    'WEB': '9879dbb7cfe39e4d-02',
    'DRA': '179568874c45066f-01', // Douay-Rheims American 1899
    'RV': '40072c4a5aba4022-01',  // Revised Version 1885
    'NIV': '2dd5030d14443c52-01', // New International Version
    'ESV': '06125adad2d5898a-01', // English Standard Version
    'NLT': '06125adad2d5898a-01', // New Living Translation (Note: using available IDs, may need real-time adjustment)
    'GNT': 'bf8f147752c5c4ca-01'  // Good News Translation
}

class BibleCacheService {
    /**
     * Get chapter verses, fetching from API and caching if not found locally
     */
    async getOrFetchChapter(bookName, chapter, translationAbbrev = 'KJV') {
        // 1. Try local first
        console.log(`[CacheService] Checking local for ${bookName} ${chapter} (${translationAbbrev})`)
        const localVerses = await localBibleService.getChapter(bookName, chapter, translationAbbrev)

        if (localVerses && localVerses.length > 0) {
            console.log(`[CacheService] ✓ Local hit for ${bookName} ${chapter}`)
            return localVerses
        }

        // 2. Not local, try API
        const bibleId = TRANSLATION_MAPPINGS[translationAbbrev.toUpperCase()]
        if (!bibleId) {
            throw new Error(`Translation ${translationAbbrev} not supported for online fetching`)
        }

        console.log(`[CacheService] ☁️ Local miss. Fetching from API: ${bookName} ${chapter} (${bibleId})`)

        try {
            // Get book mapping for code
            // Attempt to find book by name first, if it fails, we might be in a download context where we have the ID
            let book = localBibleService.getBookByName(bookName)

            // 3. Fetch full chapter passage from API
            // Use BIBLE_BOOKS mapping to get standard code if bookName is a name
            const bookCode = BIBLE_BOOKS[bookName.toLowerCase()] || bookName.toUpperCase() // Fallback to bookName itself if it looks like a code

            if (!book && bookCode) {
                // Try finding book by abbreviation/code
                book = localBibleService.getBookByName(bookCode)
            }

            if (!book) throw new Error(`Book not found: ${bookName}`)

            const passage = await bibleApiService.getVerse(`${bookName} ${chapter}`, bibleId)

            if (!passage || !passage.text) {
                throw new Error("Failed to fetch passage content from API")
            }

            // 4. Persist to local DB
            console.log(`[CacheService] 📥 Persisting fetched verses for ${bookName} ${chapter} to local DB`)

            // Ensure translation exists locally
            const translationId = localBibleService.ensureTranslation(translationAbbrev, translationAbbrev)

            const parsedVerses = this.parsePassageToVerses(passage.text, book.id, chapter, translationId)

            if (parsedVerses.length === 0) {
                throw new Error("Failed to parse verses from API text")
            }

            await localBibleService.saveVerses(parsedVerses)

            return parsedVerses.map(v => ({
                reference: `${book.name} ${v.chapter}:${v.verseNumber}`,
                text: v.text,
                book: book.name,
                chapter: v.chapter,
                verse: v.verseNumber,
                translation: translationAbbrev,
                isCached: true
            }))

        } catch (error) {
            console.error(`[CacheService] ❌ Failed to fetch/cache ${bookName} ${chapter}:`, error.message)
            throw error
        }
    }

    /**
     * Simplified parser for passage text to verse objects
     * Expects text like "[1] In the beginning... [2] And the..."
     */
    parsePassageToVerses(text, bookId, chapter, translationId) {
        const verses = []
        // Match [number] followed by text
        const regex = /\[(\d+)\]\s*([^\[]+)/g
        let match

        while ((match = regex.exec(text)) !== null) {
            verses.push({
                translationId,
                bookId,
                chapter,
                verseNumber: parseInt(match[1]),
                text: match[2].trim()
            })
        }

        // If regex fails (e.g. format differs), save whole chapter as verse 1 or handle error
        if (verses.length === 0) {
            verses.push({
                translationId,
                bookId,
                chapter,
                verseNumber: 1,
                text: text.trim()
            })
        }

        return verses
    }

    /**
     * Download an entire translation for offline use
     * @param {string} translationAbbrev - Abbreviation like 'WEB', 'ASV'
     * @param {Function} onProgress - Optional callback for progress updates
     */
    async downloadEntireTranslation(translationAbbrev, onProgress = null) {
        const bibleId = TRANSLATION_MAPPINGS[translationAbbrev.toUpperCase()]
        if (!bibleId) throw new Error(`Translation ${translationAbbrev} not supported for online fetching`)

        console.log(`[CacheService] 🚀 Starting bulk download for ${translationAbbrev}...`)

        // 1. Ensure translation exists locally
        const translationId = localBibleService.ensureTranslation(translationAbbrev, translationAbbrev)

        // 2. Get all books in this Bible with retry
        const books = await this.withRetry(() => bibleApiService.getBooks(bibleId))
        console.log(`[CacheService] 📚 Found ${books.length} books to download`)

        for (let i = 0; i < books.length; i++) {
            const apiBook = books[i]
            const bookName = apiBook.name
            const bookId = apiBook.id // e.g. "GEN", "LUK"

            // Map API book to local book
            let localBook = localBibleService.getBookByName(bookId) || localBibleService.getBookByName(bookName)

            if (!localBook) {
                console.warn(`[CacheService] ⚠️ Skipping book not found locally: ${bookName} (${bookId})`)
                continue
            }

            // 3. Get all chapters for this book with retry
            const chapters = await this.withRetry(() => bibleApiService.getChapters(apiBook.id, bibleId))

            if (onProgress) {
                onProgress({
                    status: 'downloading',
                    book: bookName,
                    currentBook: i + 1,
                    totalBooks: books.length,
                    chapters: chapters.length
                })
            }

            console.log(`[CacheService] 📥 Downloading ${bookName} (${chapters.length} chapters)...`)

            for (const chapter of chapters) {
                const chapterNum = parseInt(chapter.number)
                if (isNaN(chapterNum)) {
                    console.log(`[CacheService] ⏩ Skipping non-numeric chapter: ${chapter.number}`)
                    continue
                }

                // 4. Fetch and save chapter with retry
                try {
                    await this.withRetry(() => this.getOrFetchChapter(bookName, chapterNum, translationAbbrev))
                    // Base delay to be polite to the API
                    await this.delay(250)
                } catch (err) {
                    console.error(`[CacheService] ❌ Failed to download ${bookName} ${chapterNum} after retries:`, err.message)
                }
            }
        }

        console.log(`[CacheService] ✅ Bulk download for ${translationAbbrev} complete!`)
        if (onProgress) onProgress({ status: 'complete', translation: translationAbbrev })
    }

    /**
     * Helper to retry operations that fail due to rate limits
     */
    async withRetry(operation, maxRetries = 5) {
        let lastError;
        for (let i = 0; i < maxRetries; i++) {
            try {
                return await operation();
            } catch (err) {
                lastError = err;
                if (err.message.includes('Rate limit exceeded')) {
                    const waitTime = Math.pow(2, i) * 2000; // Exponential backoff: 2s, 4s, 8s...
                    console.warn(`[CacheService] ⏳ Rate limit hit. Retrying in ${waitTime / 1000}s... (Attempt ${i + 1}/${maxRetries})`)
                    await this.delay(waitTime);
                } else {
                    throw err; // Re-throw if not a rate limit error
                }
            }
        }
        throw lastError;
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    }
}

module.exports = {
    bibleCacheService: new BibleCacheService(),
    TRANSLATION_MAPPINGS
}
