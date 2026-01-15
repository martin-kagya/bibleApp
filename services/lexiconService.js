const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

class LexiconService {
    constructor() {
        this.dbPath = path.join(__dirname, '../data/lexicon.sqlite');
        this.bibleDbPath = path.join(__dirname, '../data/bible.sqlite');
        this.db = null;
        this.bibleDb = null;
        this.bookMap = {};
        this.init();
    }

    init() {
        if (this.db) return;

        const dataDir = path.dirname(this.dbPath);
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        this.db = new Database(this.dbPath);
        this.bibleDb = new Database(this.bibleDbPath);

        // Map books for quick lookup
        try {
            const books = this.bibleDb.prepare("SELECT id, name FROM books").all();
            books.forEach(b => {
                const name = b.name.toLowerCase();
                this.bookMap[name] = b.id;
            });

            // Add Comprehensive Abbreviations
            const abbreviations = {
                'gen': 1, 'ex': 2, 'exo': 2, 'exod': 2, 'lev': 3, 'num': 4, 'numb': 4, 'deut': 5, 'deu': 5,
                'josh': 6, 'jos': 6, 'judg': 7, 'jdg': 7, 'ruth': 8, 'rut': 8, '1sam': 9, '2sam': 10,
                '1samuel': 9, '2samuel': 10, '1sam.': 9, '2sam.': 10, '1sm': 9, '2sm': 10,
                '1kgs': 11, '2kgs': 12, '1king': 11, '2king': 12, '1kings': 11, '2kings': 12,
                '1chr': 13, '2chr': 14, '1chronanicles': 13, '2chronicles': 14, '1ch': 13, '2ch': 14,
                'ezra': 15, 'neh': 16, 'esth': 17, 'est': 17, 'job': 18, 'ps': 19, 'psa': 19, 'psalm': 19, 'psalms': 19,
                'prov': 20, 'pro': 20, 'eccl': 21, 'ecc': 21, 'song': 22, 'sos': 22, 'songs': 22,
                'isa': 23, 'is': 23, 'jer': 24, 'je': 24, 'lam': 25, 'ezek': 26, 'eze': 26, 'dan': 27, 'da': 27,
                'hos': 28, 'joel': 29, 'joe': 29, 'amos': 30, 'am': 30, 'obad': 31, 'ob': 31, 'jonah': 32, 'jon': 32,
                'mic': 33, 'nah': 34, 'hab': 35, 'zeph': 36, 'zep': 36, 'hag': 37, 'zech': 38, 'zec': 38, 'mal': 39,
                'matt': 40, 'mat': 40, 'mt': 40, 'mk': 41, 'mrk': 41, 'mar': 41, 'mark': 41,
                'lk': 42, 'luk': 42, 'luke': 42, 'jn': 43, 'joh': 43, 'john': 43, 'acts': 44, 'act': 44,
                'rom': 45, 'ro': 45, '1cor': 46, '2cor': 47, '1corinthians': 46, '2corinthians': 47,
                'gal': 48, 'ga': 48, 'eph': 49, 'phil': 50, 'phi': 50, 'col': 51, 'co': 51,
                '1thess': 52, '2thess': 53, '1thes': 52, '2thes': 53, '1tim': 54, '2tim': 55, '1ti': 54, '2ti': 55,
                'tit': 56, 'phlm': 57, 'philem': 57, 'heb': 58, 'jas': 59, 'jam': 59, '1pet': 60, '2pet': 61,
                '1pt': 60, '2pt': 61, '1jn': 62, '2jn': 63, '3jn': 64, '1john': 62, '2john': 63, '3john': 64,
                'jude': 65, 'rev': 66, 're': 66, 'revelation': 66
            };

            Object.entries(abbreviations).forEach(([abbr, id]) => {
                this.bookMap[abbr] = id;
                this.bookMap[abbr + '.'] = id; // Handle trailing dots
            });

            // Handle Roman Numerals too
            this.bookMap['i john'] = 62;
            this.bookMap['ii john'] = 63;
            this.bookMap['iii john'] = 64;
            this.bookMap['i samuel'] = 9;
            this.bookMap['ii samuel'] = 10;
            this.bookMap['i kings'] = 11;
            this.bookMap['ii kings'] = 12;
            this.bookMap['i chronicles'] = 13;
            this.bookMap['ii chronicles'] = 14;
            this.bookMap['i corinthians'] = 46;
            this.bookMap['ii corinthians'] = 47;
            this.bookMap['i thessalonians'] = 52;
            this.bookMap['ii thessalonians'] = 53;
            this.bookMap['i timothy'] = 54;
            this.bookMap['ii timothy'] = 55;
            this.bookMap['i peter'] = 60;
            this.bookMap['ii peter'] = 61;

        } catch (err) {
            console.error('[LexiconService] Failed to load book mapping:', err.message);
        }
    }

    /**
     * Search for a term in the dictionary (Strong's number or Word)
     */
    async search(query) {
        const isStrong = /^[GH]\d+[a-z]?$/i.test(query);
        const normalizedQuery = query.trim().toUpperCase();

        let entry;
        if (isStrong) {
            entry = this.db.prepare('SELECT * FROM dictionary_entries WHERE strong_number = ?').get(normalizedQuery);
        } else {
            // Priority 1: Exact word match
            entry = this.db.prepare('SELECT * FROM dictionary_entries WHERE word = ? COLLATE NOCASE').get(query);
            // Priority 2: Fuzzy match if no exact match
            if (!entry) {
                entry = this.db.prepare('SELECT * FROM dictionary_entries WHERE word LIKE ?').get(`%${query}%`);
            }
        }

        if (entry) {
            console.log(`[LexiconService] ✓ Local hit for: ${query}`);
            return entry;
        }

        console.warn(`[LexiconService] ✗ No results for: ${query}`);
        return null;
    }

    async getInterlinearVerse(reference) {
        console.log(`[LexiconService] Fetching local interlinear for: ${reference}`);

        try {
            let bookName, chapter, verse;
            const fullMatch = reference.match(/^(.+)\s+(\d+)[:.](\d+)$/);
            const singleMatch = reference.match(/^(.+)\s+(\d+)$/);

            if (fullMatch) {
                [, bookName, chapter, verse] = fullMatch;
            } else if (singleMatch) {
                [, bookName, verse] = singleMatch;
                chapter = 1;
            } else {
                throw new Error('Invalid format. Use "John 3:16" or "Jude 20"');
            }

            const bookId = this.bookMap[bookName.toLowerCase()];
            if (!bookId) {
                throw new Error(`Book not found: ${bookName}`);
            }

            const row = this.db.prepare(`
                SELECT words_json FROM interlinear_verses 
                WHERE book_id = ? AND chapter = ? AND verse = ?
            `).get(bookId, parseInt(chapter), parseInt(verse));

            if (!row) {
                console.warn(`[LexiconService] No local interlinear data for ${reference}`);
                return null;
            }

            const words = JSON.parse(row.words_json);
            const prefix = bookId >= 40 ? 'G' : 'H';

            // Format into the expected "Word [Strong]" string for the frontend parsing
            const taggedText = words.map(w => {
                const strong = w.number ? ` [${prefix}${w.number.substring(1).toUpperCase()}]` : '';
                return `${w.text}${strong}`;
            }).join(' ');

            return {
                reference,
                text: taggedText,
                translation: 'KJV+Interlinear'
            };
        } catch (error) {
            console.error('[LexiconService] Local interlinear fetch failed:', error.message);
            throw error;
        }
    }
}

module.exports = { lexiconService: new LexiconService() };

module.exports = { lexiconService: new LexiconService() };
