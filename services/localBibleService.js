const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs-extra')

const DB_PATH = path.join(__dirname, '../data/bible.sqlite')

// Ensure data directory exists
fs.ensureDirSync(path.dirname(DB_PATH))

let db = null

class LocalBibleService {
    constructor() {
        this.initializeDb()
    }

    initializeDb() {
        if (db) return

        try {
            db = new Database(DB_PATH, { verbose: null }) // Set verbose: console.log for debugging

            // Initialize validation
            const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='verses'").get()
            if (!tableExists) {
                console.warn('⚠️  Bible database tables not found. Please run seed script.')
            } else {
                console.log('✓ Local Bible database connected')
            }
        } catch (error) {
            console.error('❌ Failed to initialize local Bible database:', error)
        }
    }

    /**
     * Parse reference string into book, chapter, verse components
     * @param {string} reference e.g., "John 3:16", "Genesis 1:1-5"
     */
    parseReference(reference) {
        // Simple regex for Book Chapter:Verse(s)
        // Matches: "1 John 1:9", "John 3:16", "Rom 8:28"
        const match = reference.match(/^((?:\d\s*)?[a-zA-Z\s]+)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/)

        if (!match) return null

        return {
            book: match[1].trim(),
            chapter: parseInt(match[2]),
            verseStart: match[3] ? parseInt(match[3]) : null,
            verseEnd: match[4] ? parseInt(match[4]) : null
        }
    }

    async getVerse(reference, translation = 'KJV') {
        if (!db) this.initializeDb()

        const parsed = this.parseReference(reference)
        if (!parsed) {
            throw new Error(`Invalid reference format: ${reference}`)
        }

        try {
            // Normalize book name (fuzzy match)
            const bookQuery = db.prepare('SELECT id, name, abbreviation FROM books WHERE name LIKE ? OR abbreviation LIKE ? LIMIT 1')
            const book = bookQuery.get(`${parsed.book}%`, `${parsed.book}%`)

            if (!book) {
                throw new Error(`Book not found: ${parsed.book}`)
            }

            let query = 'SELECT * FROM verses WHERE book_id = ? AND chapter = ?'
            const params = [book.id, parsed.chapter]

            if (parsed.verseStart) {
                if (parsed.verseEnd) {
                    query += ' AND verseNumber >= ? AND verseNumber <= ?'
                    params.push(parsed.verseStart, parsed.verseEnd)
                } else {
                    query += ' AND verseNumber = ?'
                    params.push(parsed.verseStart)
                }
            }

            const verses = db.prepare(query).all(...params)

            if (verses.length === 0) {
                throw new Error(`Verse not found: ${reference}`)
            }

            // Combine text if multiple verses
            const text = verses.map(v => v.text).join(' ')

            return {
                reference: parsed.verseEnd ? `${book.name} ${parsed.chapter}:${parsed.verseStart}-${parsed.verseEnd}` : `${book.name} ${parsed.chapter}:${parsed.verseStart}`,
                text: text,
                book: book.name,
                chapter: parsed.chapter,
                verse: parsed.verseStart,
                translation
            }
        } catch (error) {
            console.error(`Error fetching ${reference}:`, error)
            return { reference, error: error.message }
        }
    }

    async searchBible(query, limit = 10) {
        if (!db) this.initializeDb()

        try {
            // Use FTS5 if available, or simple LIKE for now
            // Assuming a simple schema for now
            const stmt = db.prepare(`
        SELECT v.text, v.chapter, v.verseNumber, b.name as bookName 
        FROM verses v
        JOIN books b ON v.book_id = b.id
        WHERE v.text LIKE ?
        LIMIT ?
      `)

            const results = stmt.all(`%${query}%`, limit)

            return results.map(r => ({
                reference: `${r.bookName} ${r.chapter}:${r.verseNumber}`,
                text: r.text,
                book: r.bookName,
                chapter: r.chapter,
                verse: r.verseNumber
            }))
        } catch (error) {
            console.error('Search error:', error)
            return []
        }
    }

    getAllVerses() {
        if (!db) this.initializeDb()
        try {
            const stmt = db.prepare(`
                SELECT v.text, v.chapter, v.verseNumber, b.name as bookName 
                FROM verses v
                JOIN books b ON v.book_id = b.id
                ORDER BY b.id, v.chapter, v.verseNumber
            `)
            return stmt.all().map(r => ({
                reference: `${r.bookName} ${r.chapter}:${r.verseNumber}`,
                text: r.text,
                book: r.bookName,
                chapter: r.chapter,
                verse: r.verseNumber
            }))
        } catch (error) {
            console.error('Error getting all verses:', error)
            return []
        }
    }
}

const localBibleService = new LocalBibleService()
module.exports = { localBibleService, LocalBibleService }
