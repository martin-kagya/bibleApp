const axios = require('axios')
const { get, set, exists, increment } = require('../config/redis')
require('dotenv').config()

// API.Bible configuration
const BIBLE_API_KEY = process.env.BIBLE_API_KEY
const BIBLE_API_BASE_URL = process.env.BIBLE_API_BASE_URL || 'https://api.scripture.api.bible/v1'
const DEFAULT_BIBLE_ID = process.env.DEFAULT_BIBLE_VERSION || 'de4e12af7f28f599-02' // KJV
const CACHE_TTL = parseInt(process.env.CACHE_BIBLE_VERSE_TTL) || 86400 // 24 hours

// Rate limiting configuration
const RATE_LIMIT_KEY = 60
const RATE_LIMIT_MAX = 100 // requests per minute
const RATE_LIMIT_WINDOW = 60 // seconds

// Bible book mappings for reference parsing
const BIBLE_BOOKS = {
  // Old Testament
  'genesis': 'GEN', 'gen': 'GEN',
  'exodus': 'EXO', 'exo': 'EXO', 'exod': 'EXO',
  'leviticus': 'LEV', 'lev': 'LEV',
  'numbers': 'NUM', 'num': 'NUM',
  'deuteronomy': 'DEU', 'deut': 'DEU', 'deu': 'DEU',
  'joshua': 'JOS', 'josh': 'JOS', 'jos': 'JOS',
  'judges': 'JDG', 'judg': 'JDG', 'jdg': 'JDG',
  'ruth': 'RUT', 'rut': 'RUT',
  '1 samuel': '1SA', '1samuel': '1SA', '1sam': '1SA', '1sa': '1SA', 'first samuel': '1SA',
  '2 samuel': '2SA', '2samuel': '2SA', '2sam': '2SA', '2sa': '2SA', 'second samuel': '2SA',
  '1 kings': '1KI', '1kings': '1KI', '1ki': '1KI', 'first kings': '1KI',
  '2 kings': '2KI', '2kings': '2KI', '2ki': '2KI', 'second kings': '2KI',
  '1 chronicles': '1CH', '1chronicles': '1CH', '1chr': '1CH', '1ch': '1CH', 'first chronicles': '1CH',
  '2 chronicles': '2CH', '2chronicles': '2CH', '2chr': '2CH', '2ch': '2CH', 'second chronicles': '2CH',
  'ezra': 'EZR', 'ezr': 'EZR',
  'nehemiah': 'NEH', 'neh': 'NEH',
  'esther': 'EST', 'est': 'EST',
  'job': 'JOB',
  'psalm': 'PSA', 'psalms': 'PSA', 'psa': 'PSA', 'ps': 'PSA',
  'proverbs': 'PRO', 'prov': 'PRO', 'pro': 'PRO',
  'ecclesiastes': 'ECC', 'eccl': 'ECC', 'ecc': 'ECC',
  'song of solomon': 'SNG', 'song of songs': 'SNG', 'songs': 'SNG', 'sng': 'SNG',
  'isaiah': 'ISA', 'isa': 'ISA',
  'jeremiah': 'JER', 'jer': 'JER',
  'lamentations': 'LAM', 'lam': 'LAM',
  'ezekiel': 'EZK', 'ezek': 'EZK', 'ezk': 'EZK',
  'daniel': 'DAN', 'dan': 'DAN',
  'hosea': 'HOS', 'hos': 'HOS',
  'joel': 'JOL', 'jol': 'JOL',
  'amos': 'AMO', 'amo': 'AMO',
  'obadiah': 'OBA', 'obad': 'OBA', 'oba': 'OBA',
  'jonah': 'JON', 'jon': 'JON',
  'micah': 'MIC', 'mic': 'MIC',
  'nahum': 'NAM', 'nah': 'NAM', 'nam': 'NAM',
  'habakkuk': 'HAB', 'hab': 'HAB',
  'zephaniah': 'ZEP', 'zeph': 'ZEP', 'zep': 'ZEP',
  'haggai': 'HAG', 'hag': 'HAG',
  'zechariah': 'ZEC', 'zech': 'ZEC', 'zec': 'ZEC',
  'malachi': 'MAL', 'mal': 'MAL',
  // New Testament
  'matthew': 'MAT', 'matt': 'MAT', 'mat': 'MAT', 'mt': 'MAT',
  'mark': 'MRK', 'mrk': 'MRK', 'mk': 'MRK',
  'luke': 'LUK', 'luk': 'LUK', 'lk': 'LUK',
  'john': 'JHN', 'jhn': 'JHN', 'jn': 'JHN',
  'acts': 'ACT', 'act': 'ACT',
  'romans': 'ROM', 'rom': 'ROM',
  '1 corinthians': '1CO', '1corinthians': '1CO', '1cor': '1CO', '1co': '1CO', 'first corinthians': '1CO',
  '2 corinthians': '2CO', '2corinthians': '2CO', '2cor': '2CO', '2co': '2CO', 'second corinthians': '2CO',
  'galatians': 'GAL', 'gal': 'GAL',
  'ephesians': 'EPH', 'eph': 'EPH',
  'philippians': 'PHP', 'phil': 'PHP', 'php': 'PHP',
  'colossians': 'COL', 'col': 'COL',
  '1 thessalonians': '1TH', '1thessalonians': '1TH', '1thess': '1TH', '1th': '1TH', 'first thessalonians': '1TH',
  '2 thessalonians': '2TH', '2thessalonians': '2TH', '2thess': '2TH', '2th': '2TH', 'second thessalonians': '2TH',
  '1 timothy': '1TI', '1timothy': '1TI', '1tim': '1TI', '1ti': '1TI', 'first timothy': '1TI',
  '2 timothy': '2TI', '2timothy': '2TI', '2tim': '2TI', '2ti': '2TI', 'second timothy': '2TI',
  'titus': 'TIT', 'tit': 'TIT',
  'philemon': 'PHM', 'phlm': 'PHM', 'phm': 'PHM',
  'hebrews': 'HEB', 'heb': 'HEB',
  'james': 'JAS', 'jas': 'JAS', 'jam': 'JAS',
  '1 peter': '1PE', '1peter': '1PE', '1pet': '1PE', '1pe': '1PE', 'first peter': '1PE',
  '2 peter': '2PE', '2peter': '2PE', '2pet': '2PE', '2pe': '2PE', 'second peter': '2PE',
  '1 john': '1JN', '1john': '1JN', '1jn': '1JN', 'first john': '1JN',
  '2 john': '2JN', '2john': '2JN', '2jn': '2JN', 'second john': '2JN',
  '3 john': '3JN', '3john': '3JN', '3jn': '3JN', 'third john': '3JN',
  'jude': 'JUD', 'jud': 'JUD',
  'revelation': 'REV', 'rev': 'REV'
}

class BibleApiService {
  constructor() {
    if (!BIBLE_API_KEY || BIBLE_API_KEY === 'your_api_bible_key_here') {
      console.warn('⚠️  API.Bible key not configured. Bible verse fetching will be limited.')
      this.apiAvailable = false
    } else {
      this.apiAvailable = true
    }
    
    this.axios = axios.create({
      baseURL: BIBLE_API_BASE_URL,
      headers: {
        'api-key': BIBLE_API_KEY
      }
    })
  }

  // Check rate limit
  async checkRateLimit() {
    const count = await increment(RATE_LIMIT_KEY, RATE_LIMIT_WINDOW)
    if (count > RATE_LIMIT_MAX) {
      throw new Error('Rate limit exceeded. Please try again later.')
    }
    return true
  }

  // Parse scripture reference to API format
  parseReference(reference) {
    // Normalize reference
    const normalized = reference
      .toLowerCase()
      .replace(/\b(first|1st)\b/gi, '1')
      .replace(/\b(second|2nd)\b/gi, '2')
      .replace(/\b(third|3rd)\b/gi, '3')
      .trim()

    // Match pattern: Book Chapter:Verse or Book Chapter:Verse-Verse
    const pattern = /^(.+?)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/
    const match = normalized.match(pattern)

    if (!match) {
      throw new Error(`Invalid scripture reference format: ${reference}`)
    }

    const [, bookName, chapter, verseStart, verseEnd] = match
    const bookCode = BIBLE_BOOKS[bookName.trim()]

    if (!bookCode) {
      throw new Error(`Unknown book: ${bookName}`)
    }

    return {
      bookCode,
      chapter: parseInt(chapter),
      verseStart: verseStart ? parseInt(verseStart) : null,
      verseEnd: verseEnd ? parseInt(verseEnd) : null,
      apiReference: verseStart
        ? verseEnd
          ? `${bookCode}.${chapter}.${verseStart}-${bookCode}.${chapter}.${verseEnd}`
          : `${bookCode}.${chapter}.${verseStart}`
        : `${bookCode}.${chapter}`
    }
  }

  // Get verse from API with caching
  async getVerse(reference, bibleId = DEFAULT_BIBLE_ID) {
    const cacheKey = `bible:verse:${bibleId}:${reference}`

    // Check cache first
    const cached = await get(cacheKey)
    if (cached) {
      console.log(`✓ Cache hit for ${reference}`)
      return cached
    }

    if (!this.apiAvailable) {
      throw new Error('Bible API not configured')
    }

    try {
      // Check rate limit
      await this.checkRateLimit()

      // Parse reference
      const parsed = this.parseReference(reference)

      // Fetch from API
      const response = await this.axios.get(
        `/bibles/${bibleId}/passages/${parsed.apiReference}`,
        {
          params: {
            'content-type': 'text',
            'include-notes': false,
            'include-titles': false,
            'include-chapter-numbers': false,
            'include-verse-numbers': true,
            'include-verse-spans': false
          }
        }
      )

      const data = response.data.data
      const result = {
        reference: data.reference,
        text: data.content.trim(),
        bookCode: parsed.bookCode,
        chapter: parsed.chapter,
        verseStart: parsed.verseStart,
        verseEnd: parsed.verseEnd,
        translation: bibleId,
        copyright: data.copyright
      }

      // Cache the result
      await set(cacheKey, result, CACHE_TTL)
      console.log(`✓ Fetched and cached ${reference}`)

      return result
    } catch (error) {
      console.error(`Error fetching verse ${reference}:`, error.message)
      throw error
    }
  }

  // Get multiple verses in batch
  async getVerses(references, bibleId = DEFAULT_BIBLE_ID) {
    const results = []
    for (const reference of references) {
      try {
        const verse = await this.getVerse(reference, bibleId)
        results.push(verse)
      } catch (error) {
        console.error(`Failed to fetch ${reference}:`, error.message)
        results.push({ reference, error: error.message })
      }
    }
    return results
  }

  // Get all chapters from a book
  async getChapters(bookCode, bibleId = DEFAULT_BIBLE_ID) {
    const cacheKey = `bible:chapters:${bibleId}:${bookCode}`
    
    const cached = await get(cacheKey)
    if (cached) return cached

    if (!this.apiAvailable) {
      throw new Error('Bible API not configured')
    }

    try {
      await this.checkRateLimit()

      const response = await this.axios.get(
        `/bibles/${bibleId}/books/${bookCode}/chapters`
      )

      const chapters = response.data.data
      await set(cacheKey, chapters, CACHE_TTL * 7) // Cache for 7 days

      return chapters
    } catch (error) {
      console.error(`Error fetching chapters for ${bookCode}:`, error.message)
      throw error
    }
  }

  // Get all verses from a chapter
  async getChapterVerses(bookCode, chapter, bibleId = DEFAULT_BIBLE_ID) {
    const cacheKey = `bible:chapter:${bibleId}:${bookCode}:${chapter}`
    
    const cached = await get(cacheKey)
    if (cached) return cached

    if (!this.apiAvailable) {
      throw new Error('Bible API not configured')
    }

    try {
      await this.checkRateLimit()

      const chapterId = `${bookCode}.${chapter}`
      const response = await this.axios.get(
        `/bibles/${bibleId}/chapters/${chapterId}/verses`
      )

      const verses = response.data.data
      await set(cacheKey, verses, CACHE_TTL * 7) // Cache for 7 days

      return verses
    } catch (error) {
      console.error(`Error fetching verses for ${bookCode} ${chapter}:`, error.message)
      throw error
    }
  }

  // Search Bible text
  async searchBible(query, bibleId = DEFAULT_BIBLE_ID, limit = 10) {
    const cacheKey = `bible:search:${bibleId}:${query}:${limit}`
    
    const cached = await get(cacheKey)
    if (cached) return cached

    if (!this.apiAvailable) {
      throw new Error('Bible API not configured')
    }

    try {
      await this.checkRateLimit()

      const response = await this.axios.get(
        `/bibles/${bibleId}/search`,
        {
          params: {
            query,
            limit,
            sort: 'relevance'
          }
        }
      )

      const results = response.data.data.verses
      await set(cacheKey, results, CACHE_TTL)

      return results
    } catch (error) {
      console.error(`Error searching Bible for "${query}":`, error.message)
      throw error
    }
  }

  // Get all available Bible versions
  async getBibleVersions() {
    const cacheKey = 'bible:versions'
    
    const cached = await get(cacheKey)
    if (cached) return cached

    if (!this.apiAvailable) {
      throw new Error('Bible API not configured')
    }

    try {
      const response = await this.axios.get('/bibles', {
        params: { language: 'eng' }
      })

      const versions = response.data.data
      await set(cacheKey, versions, CACHE_TTL * 30) // Cache for 30 days

      return versions
    } catch (error) {
      console.error('Error fetching Bible versions:', error.message)
      throw error
    }
  }

  // Get all books in a Bible
  async getBooks(bibleId = DEFAULT_BIBLE_ID) {
    const cacheKey = `bible:books:${bibleId}`
    
    const cached = await get(cacheKey)
    if (cached) return cached

    if (!this.apiAvailable) {
      throw new Error('Bible API not configured')
    }

    try {
      const response = await this.axios.get(`/bibles/${bibleId}/books`)

      const books = response.data.data
      await set(cacheKey, books, CACHE_TTL * 30) // Cache for 30 days

      return books
    } catch (error) {
      console.error('Error fetching books:', error.message)
      throw error
    }
  }
}

// Export singleton instance
const bibleApiService = new BibleApiService()

module.exports = {
  bibleApiService,
  BibleApiService,
  BIBLE_BOOKS
}



