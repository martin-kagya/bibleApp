/**
 * Scripture Reference Parser
 * Handles complex scripture references including:
 * - Single verses: "John 3:16"
 * - Verse ranges: "John 3:16-18"
 * - Multiple verses: "Romans 8:1,5,9"
 * - Multiple ranges: "Romans 8:1-3,5-7"
 * - Chapter references: "Psalm 23"
 * - Multiple chapters: "Psalm 23-24"
 * - Complex combinations: "John 3:16-18; Romans 8:1,5; Psalm 23"
 */

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

class ScriptureParser {
  constructor() {
    // Reverse mapping for book codes
    this.bookNameToCode = BIBLE_BOOKS
    this.bookCodeToName = {}

    for (const [name, code] of Object.entries(BIBLE_BOOKS)) {
      this.bookCodeToName[code] = this.toTitleCase(name)
    }
  }

  /**
   * Parse any scripture reference format
   * @param {string} reference - Scripture reference
   * @returns {Array<Object>} Parsed references
   */
  parse(reference) {
    if (!reference || typeof reference !== 'string') {
      throw new Error('Invalid reference: must be a non-empty string')
    }

    const normalized = this.normalizeReference(reference)

    // Split by semicolons first (handles multiple book references)
    const bookReferences = normalized.split(';').map(s => s.trim())

    const allReferences = []

    for (const bookRef of bookReferences) {
      try {
        const parsed = this.parseBookReference(bookRef)
        allReferences.push(...parsed)
      } catch (error) {
        console.error(`Error parsing "${bookRef}":`, error.message)
      }
    }

    return allReferences
  }

  /**
   * Parse a single book reference (may contain multiple verses/ranges)
   * @param {string} bookRef - Book reference
   * @returns {Array<Object>} Parsed references
   */
  parseBookReference(bookRef) {
    // Pattern: BookName Chapter:Verses
    const pattern = /^(.+?)\s+(\d+)(?::(.+))?$/
    const match = bookRef.match(pattern)

    if (!match) {
      throw new Error(`Invalid book reference format: ${bookRef}`)
    }

    const [, bookName, chapter, versePart] = match
    const bookCode = this.getBookCode(bookName.trim())

    if (!bookCode) {
      throw new Error(`Unknown book: ${bookName}`)
    }

    const bookFullName = this.bookCodeToName[bookCode]

    // If no verse part, it's a chapter reference
    if (!versePart) {
      return [{
        book: bookFullName,
        bookCode,
        chapter: parseInt(chapter),
        verses: null,
        type: 'chapter',
        reference: `${bookFullName} ${chapter}`,
        normalized: `${bookCode}.${chapter}`
      }]
    }

    // Parse verse part (may contain commas and ranges)
    const verseRanges = this.parseVerseRanges(versePart)

    return verseRanges.map(range => ({
      book: bookFullName,
      bookCode,
      chapter: parseInt(chapter),
      verseStart: range.start,
      verseEnd: range.end,
      verses: range.end ? `${range.start}-${range.end}` : `${range.start}`,
      type: range.end ? 'range' : 'single',
      reference: range.end
        ? `${bookFullName} ${chapter}:${range.start}-${range.end}`
        : `${bookFullName} ${chapter}:${range.start}`,
      normalized: range.end
        ? `${bookCode}.${chapter}.${range.start}-${bookCode}.${chapter}.${range.end}`
        : `${bookCode}.${chapter}.${range.start}`
    }))
  }

  /**
   * Parse verse ranges (handles commas and dashes)
   * @param {string} versePart - Verse portion of reference
   * @returns {Array<Object>} Array of {start, end} objects
   */
  parseVerseRanges(versePart) {
    const ranges = []

    // Split by commas
    const parts = versePart.split(',').map(s => s.trim())

    for (const part of parts) {
      if (part.includes('-')) {
        // Range: "16-18"
        const [start, end] = part.split('-').map(s => parseInt(s.trim()))
        ranges.push({ start, end })
      } else {
        // Single verse: "16"
        const verse = parseInt(part.trim())
        ranges.push({ start: verse, end: null })
      }
    }

    return ranges
  }

  /**
   * Get book code from book name
   * @param {string} bookName - Book name
   * @returns {string} Book code
   */
  getBookCode(bookName) {
    const normalized = bookName.toLowerCase().trim()
    return this.bookNameToCode[normalized] || null
  }

  /**
   * Normalize reference string
   * @param {string} reference - Raw reference
   * @returns {string} Normalized reference
   */
  normalizeReference(reference) {
    return reference
      .replace(/\b(first|1st)\b/gi, '1')
      .replace(/\b(second|2nd)\b/gi, '2')
      .replace(/\b(third|3rd)\b/gi, '3')
      .replace(/\s+/g, ' ')
      .replace(/\s*:\s*/g, ':')
      .replace(/\s*-\s*/g, '-')
      .replace(/\s*,\s*/g, ',')
      .replace(/\s*;\s*/g, ';')
      .trim()
  }

  /**
   * Expand a range into individual verses
   * @param {Object} parsedRef - Parsed reference object
   * @returns {Array<Object>} Array of individual verse references
   */
  expandRange(parsedRef) {
    if (parsedRef.type === 'single') {
      return [parsedRef]
    }

    if (parsedRef.type === 'chapter') {
      // Can't expand without knowing chapter length
      return [parsedRef]
    }

    const verses = []
    for (let v = parsedRef.verseStart; v <= parsedRef.verseEnd; v++) {
      verses.push({
        ...parsedRef,
        verseStart: v,
        verseEnd: null,
        verses: `${v}`,
        type: 'single',
        reference: `${parsedRef.book} ${parsedRef.chapter}:${v}`,
        normalized: `${parsedRef.bookCode}.${parsedRef.chapter}.${v}`
      })
    }

    return verses
  }

  /**
   * Format parsed reference back to string
   * @param {Object} parsedRef - Parsed reference object
   * @returns {string} Formatted reference
   */
  format(parsedRef) {
    return parsedRef.reference
  }

  /**
   * Validate a reference string
   * @param {string} reference - Reference to validate
   * @returns {boolean} Is valid
   */
  isValid(reference) {
    try {
      this.parse(reference)
      return true
    } catch {
      return false
    }
  }

  /**
   * Extract all scripture references from text
   * @param {string} text - Text to search
   * @returns {Array<string>} Found references
   */
  extractReferences(text) {
    const references = []

    // Pattern for scripture references in natural text
    const bookNames = Object.keys(this.bookNameToCode).join('|')
    const pattern = new RegExp(
      `\\b(${bookNames})\\s+\\d+(?::\\d+(?:-\\d+)?(?:,\\d+(?:-\\d+)?)*)?`,
      'gi'
    )

    const matches = text.match(pattern)
    if (matches) {
      matches.forEach(match => {
        try {
          const parsed = this.parse(match)
          if (parsed.length > 0) {
            references.push(match.trim())
          }
        } catch {
          // Skip invalid references
        }
      })
    }

    return [...new Set(references)] // Remove duplicates
  }

  /**
   * Convert string to title case
   * @param {string} str - String to convert
   * @returns {string} Title cased string
   */
  toTitleCase(str) {
    return str
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  /**
   * Compare two references
   * @param {string} ref1 - First reference
   * @param {string} ref2 - Second reference
   * @returns {number} -1, 0, or 1
   */
  compare(ref1, ref2) {
    try {
      const parsed1 = this.parse(ref1)[0]
      const parsed2 = this.parse(ref2)[0]

      // Compare book
      if (parsed1.bookCode !== parsed2.bookCode) {
        return parsed1.bookCode.localeCompare(parsed2.bookCode)
      }

      // Compare chapter
      if (parsed1.chapter !== parsed2.chapter) {
        return parsed1.chapter - parsed2.chapter
      }

      // Compare verse
      return (parsed1.verseStart || 0) - (parsed2.verseStart || 0)
    } catch {
      return 0
    }
  }

  /**
   * Sort an array of references
   * @param {Array<string>} references - References to sort
   * @returns {Array<string>} Sorted references
   */
  sort(references) {
    return [...references].sort((a, b) => this.compare(a, b))
  }
}

// Export singleton instance
const scriptureParser = new ScriptureParser()

module.exports = {
  scriptureParser,
  ScriptureParser
}


