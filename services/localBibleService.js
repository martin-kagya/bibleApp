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
     * Get all available translations
     */
    getTranslations() {
        if (!db) this.initializeDb()
        try {
            return db.prepare('SELECT id, name, abbreviation, language FROM translations ORDER BY id').all()
        } catch (error) {
            console.error('Error fetching translations:', error)
            return []
        }
    }

    /**
     * Get translation by abbreviation
     */
    getTranslationByAbbrev(abbrev) {
        if (!db) this.initializeDb()
        try {
            return db.prepare('SELECT id, name, abbreviation, language FROM translations WHERE abbreviation = ?').get(abbrev)
        } catch (error) {
            console.error(`Error fetching translation ${abbrev}:`, error)
            return null
        }
    }

    /**
     * Ensure a translation exists in the database
     */
    ensureTranslation(abbreviation, name, language = 'en') {
        if (!db) this.initializeDb()
        try {
            const existing = this.getTranslationByAbbrev(abbreviation)
            if (existing) return existing.id

            const result = db.prepare('INSERT INTO translations (name, abbreviation, language) VALUES (?, ?, ?)')
                .run(name, abbreviation, language)
            return result.lastInsertRowid
        } catch (error) {
            console.error(`Error ensuring translation ${abbreviation}:`, error)
            throw error
        }
    }

    /**
     * Save multiple verses to the database
     */
    saveVerses(verses) {
        if (!db) this.initializeDb()
        const insert = db.prepare(`
            INSERT INTO verses (translation_id, book_id, chapter, verseNumber, text)
            VALUES (?, ?, ?, ?, ?)
        `)

        const transaction = db.transaction((versesToInsert) => {
            for (const v of versesToInsert) {
                insert.run(v.translationId, v.bookId, v.chapter, v.verseNumber, v.text)
            }
        })

        try {
            transaction(verses)
            // Note: FTS triggers in SQLite handle the indexing automatically
            return true
        } catch (error) {
            console.error('Error saving verses bulk:', error)
            throw error
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

    async getVerse(reference, translationAbbrev = 'KJV') {
        if (!db) this.initializeDb()

        const parsed = this.parseReference(reference)
        if (!parsed) {
            throw new Error(`Invalid reference format: ${reference}`)
        }

        try {
            // Get Translation ID
            const transRow = db.prepare('SELECT id, abbreviation FROM translations WHERE abbreviation = ?').get(translationAbbrev)

            if (!transRow) {
                // If specific non-KJV translation requested but not found, return not found
                if (translationAbbrev !== 'KJV') {
                    return {
                        reference,
                        text: `[Translation ${translationAbbrev} not found locally]`,
                        book: parsed.book,
                        chapter: parsed.chapter,
                        translation: translationAbbrev,
                        error: 'Translation missing'
                    }
                }
            }

            let translationId = transRow ? transRow.id : 1;

            // Normalize book name (fuzzy match)
            const bookQuery = db.prepare('SELECT id, name, abbreviation FROM books WHERE name LIKE ? OR abbreviation LIKE ? LIMIT 1')
            const book = bookQuery.get(`${parsed.book}%`, `${parsed.book}%`)

            if (!book) {
                throw new Error(`Book not found: ${parsed.book}`)
            }

            let query = 'SELECT * FROM verses WHERE book_id = ? AND chapter = ? AND translation_id = ?'
            const params = [book.id, parsed.chapter, translationId]

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
                // Try fallback to just checking if the chapter exists, maybe translation missing verses?
                // throw new Error(`Verse not found: ${reference} in ${translationAbbrev}`)
                return {
                    reference,
                    text: `[Verse not found in ${translationAbbrev}]`,
                    book: book.name,
                    chapter: parsed.chapter,
                    translation: translationAbbrev
                }
            }

            // Combine text if multiple verses
            const text = verses.map(v => v.text).join(' ')

            return {
                reference: parsed.verseEnd ? `${book.name} ${parsed.chapter}:${parsed.verseStart}-${parsed.verseEnd}` : `${book.name} ${parsed.chapter}:${parsed.verseStart}`,
                text: text,
                book: book.name,
                chapter: parsed.chapter,
                verse: parsed.verseStart,
                translation: transRow ? transRow.abbreviation : 'Unknown'
            }
        } catch (error) {
            console.error(`Error fetching ${reference}:`, error)
            return { reference, error: error.message }
        }
    }

    async searchBible(query, limit = 10, translationAbbrev = 'KJV') {
        if (!db) this.initializeDb()

        try {
            const transRow = db.prepare('SELECT id FROM translations WHERE abbreviation = ?').get(translationAbbrev)
            let translationId = transRow ? transRow.id : 1;

            // Use FTS5 if available, or simple LIKE for now
            // Assuming a simple schema for now
            const stmt = db.prepare(`
        SELECT v.text, v.chapter, v.verseNumber, b.name as bookName 
        FROM verses v
        JOIN books b ON v.book_id = b.id
        WHERE v.translation_id = ? AND v.text LIKE ?
        LIMIT ?
      `)

            const results = stmt.all(translationId, `%${query}%`, limit)

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

    /**
     * Sanitize query for FTS5
     * Removes special characters that cause syntax errors
     */
    sanitizeQuery(query) {
        if (!query) return ''
        // Remove FTS5 operators like *, OR, AND, NEAR, NOT if they are likely to cause syntax errors
        // Also remove punctuation that might confuse the parser if not properly escaped
        // Keep alphanumeric and spaces.
        // Simple approach: replace non-alphanumeric (except space) with empty string or space
        return query.replace(/[^a-zA-Z0-9\s]/g, ' ').trim().replace(/\s+/g, ' ')
    }

    /**
     * Search using FTS5 for keywords
     */
    searchByKeyword(query, limit = 20) {
        if (!db) this.initializeDb()

        try {
            // FTS5 Match Query: uses BM25 by default
            const stmt = db.prepare(`
                SELECT v.text, v.chapter, v.verseNumber, b.name as bookName, fts.rank 
                FROM verses_fts fts
                JOIN verses v ON fts.rowid = v.id
                JOIN books b ON v.book_id = b.id
                WHERE verses_fts MATCH ? 
                ORDER BY rank 
                LIMIT ?
            `)

            // Format query for FTS5 (basic sanitization)
            // e.g. "true religion" -> '"true" "religion"' OR 'true religion' usually works
            // Better: use simple tokenization for now.
            // If user types            console.log(`[FTS] Querying: "${query}"`)
            const cleanQuery = this.sanitizeQuery(query)

            // Format for AND search: "word1 AND word2 AND word3"
            const ftsQuery = cleanQuery.split(/\s+/).filter(t => t.length > 0).join(' AND ')

            if (!ftsQuery) return []

            console.log(`[FTS] Querying: "${cleanQuery}" (raw: "${query}")`)
            const results = stmt.all(ftsQuery, limit)
            console.log(`[FTS] Found ${results.length} results for query: ${ftsQuery}`)
            return results.map(r => ({
                reference: `${r.bookName} ${r.chapter}:${r.verseNumber}`,
                text: r.text,
                book: r.bookName,
                chapter: r.chapter,
                verse: r.verseNumber,
                rank: r.rank,
                similarity: -1 * r.rank // FTS rank is negative (more negative = better) in some versions, or small float.
                // BM25 usually returns a score. SQLite rank is a custom function result. 
                // Default 'rank' column in valid fts5 is not BM25 score unless configured custom function.
                // Actually standard FTS5 'rank' is just a score where lower is better usually? No, depends.
                // Let's assume order is correct by ORDER BY rank.
            }))
        } catch (error) {
            console.error('Keyword search error:', error)
            return []
        }
    }

    // Helper for dropdowns
    getBooks() {
        if (!db) this.initializeDb();
        try {
            return db.prepare('SELECT id, name FROM books ORDER BY id').all();
        } catch (e) { return [] }
    }

    /**
     * Get book by name or abbreviation
     */
    getBookByName(name) {
        if (!db) this.initializeDb();
        try {
            const stmt = db.prepare('SELECT id, name, abbreviation FROM books WHERE name LIKE ? OR abbreviation LIKE ? LIMIT 1');
            return stmt.get(`${name}%`, `${name}%`);
        } catch (e) { return null; }
    }

    getChapters(bookName) {
        if (!db) this.initializeDb();
        try {
            const book = db.prepare('SELECT id FROM books WHERE name = ?').get(bookName);
            if (!book) return [];
            // Get simple max chapter. 
            // Note: verses table has all chapters. Max chapter in verses table for this book.
            const res = db.prepare('SELECT MAX(chapter) as maxChap FROM verses WHERE book_id = ?').get(book.id);
            return Array.from({ length: res.maxChap }, (_, i) => i + 1);
        } catch (e) { return [] }
    }

    /**
     * Get all verses in a specific chapter
     * @param {string} bookName - Book name
     * @param {number} chapterNumber - Chapter number
     * @param {string} translationAbbrev - Translation abbreviation (default: KJV)
     * @returns {Promise<Array>} Array of verse objects
     */
    async getChapter(bookName, chapterNumber, translationAbbrev = 'KJV') {
        if (!db) this.initializeDb();

        try {
            // Get Translation ID
            const transRow = db.prepare('SELECT id, abbreviation FROM translations WHERE abbreviation = ?').get(translationAbbrev);

            if (!transRow && translationAbbrev !== 'KJV') {
                return []; // Return empty if translation missing (trigger cache fetch)
            }

            let translationId = transRow ? transRow.id : 1;

            // Normalize book name (fuzzy match)
            const bookQuery = db.prepare('SELECT id, name, abbreviation FROM books WHERE name LIKE ? OR abbreviation LIKE ? LIMIT 1');
            const book = bookQuery.get(`${bookName}%`, `${bookName}%`);

            if (!book) {
                throw new Error(`Book not found: ${bookName}`);
            }

            // Fetch all verses in the chapter
            const query = 'SELECT * FROM verses WHERE book_id = ? AND chapter = ? AND translation_id = ? ORDER BY verseNumber ASC';
            const verses = db.prepare(query).all(book.id, chapterNumber, translationId);

            return verses.map(v => ({
                reference: `${book.name} ${v.chapter}:${v.verseNumber}`,
                text: v.text,
                book: book.name,
                chapter: v.chapter,
                verse: v.verseNumber,
                translation: transRow ? transRow.abbreviation : 'Unknown',
                isCached: true // Mark as locally available
            }));
        } catch (error) {
            console.error(`Error fetching chapter ${bookName} ${chapterNumber}:`, error);
            return [];
        }
    }


    getAllVerses(translationId = 1) {
        if (!db) this.initializeDb()
        try {
            // If translationId is 'ALL', we fetch everything, but usually we want a specific one or several for embeddings.
            // For cross-translation embeddings, we might want to group by book/chapter/verse.
            let query = `
                SELECT v.text, v.chapter, v.verseNumber, b.name as bookName, b.id as book_id, t.abbreviation as trans
                FROM verses v
                JOIN books b ON v.book_id = b.id
                JOIN translations t ON v.translation_id = t.id
            `;
            const params = [];

            if (translationId !== 'ALL') {
                query += ' WHERE v.translation_id = ?';
                params.push(translationId);
            }

            query += ' ORDER BY b.id, v.chapter, v.verseNumber';

            const stmt = db.prepare(query);
            return stmt.all(...params).map(r => ({
                reference: `${r.bookName} ${r.chapter}:${r.verseNumber}`,
                text: r.text,
                book: r.bookName,
                book_id: r.book_id,
                chapter: r.chapter,
                verse: r.verseNumber,
                translation: r.trans
            }))
        } catch (error) {
            console.error('Error getting all verses:', error)
            return []
        }
    }

    getAllCommentaries() {
        if (!db) this.initializeDb()
        try {
            // Ensure table exists safely (it might not yet)
            const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='commentaries'").get()
            if (!tableExists) return []

            const stmt = db.prepare(`
                SELECT c.text, c.chapter, c.verseNumber, b.name as bookName, c.source
                FROM commentaries c
                JOIN books b ON c.book_id = b.id
            `)
            return stmt.all().map(r => ({
                reference: `${r.bookName} ${r.chapter}:${r.verseNumber}`,
                text: r.text,
                book: r.bookName,
                chapter: r.chapter,
                verse: r.verseNumber,
                source: r.source,
                type: 'commentary'
            }))
        } catch (error) {
            console.error('Error getting commentaries:', error)
            return []
        }
    }

    getAllQA() {
        if (!db) this.initializeDb()
        try {
            const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='theological_qa'").get()
            if (!tableExists) return []

            const stmt = db.prepare('SELECT question, answer, ref_citation FROM theological_qa')
            return stmt.all().map(r => ({
                question: r.question,
                answer: r.answer,
                references: r.ref_citation, // Keep 'references' as a key for frontend compatibility if needed, or change to citations
                type: 'qa'
            }))
        } catch (error) {
            console.error('Error getting QA:', error)
            return []
        }
    }
}

const localBibleService = new LocalBibleService()
module.exports = { localBibleService, LocalBibleService }
