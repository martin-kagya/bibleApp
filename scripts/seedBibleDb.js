const Database = require('better-sqlite3')
const fs = require('fs-extra')
const path = require('path')
const https = require('https')

const DB_PATH = path.join(__dirname, '../data/bible.sqlite')

// Translation Configurations
const TRANSLATIONS = [
    {
        name: 'King James Version',
        abbrev: 'KJV',
        language: 'en',
        url: 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_kjv.json',
        format: 'thiagobodruk',
        clean: true // Apply cleaning to KJV
    },
    {
        name: 'English Standard Version',
        abbrev: 'ESV',
        language: 'en',
        url: 'https://raw.githubusercontent.com/jadenzaleski/bible-translations/66d2f2cadd81f57df5b6cd93d0d72aee06b46f9a/ESV/ESV_bible.json',
        format: 'jadenzaleski'
    },
    {
        name: 'New American Standard Bible',
        abbrev: 'NASB',
        language: 'en',
        url: 'https://raw.githubusercontent.com/jadenzaleski/bible-translations/66d2f2cadd81f57df5b6cd93d0d72aee06b46f9a/NASB/NASB_bible.json',
        format: 'jadenzaleski'
    },
    {
        name: 'New English Translation',
        abbrev: 'NET',
        language: 'en',
        url: 'https://raw.githubusercontent.com/jadenzaleski/bible-translations/66d2f2cadd81f57df5b6cd93d0d72aee06b46f9a/NET/NET_bible.json',
        format: 'jadenzaleski'
    },
    {
        name: 'Amplified Bible',
        abbrev: 'AMP',
        language: 'en',
        url: 'https://raw.githubusercontent.com/jadenzaleski/bible-translations/master/AMP/AMP_bible.json',
        format: 'jadenzaleski'
    },
    {
        name: 'New International Version',
        abbrev: 'NIV',
        language: 'en',
        url: 'https://raw.githubusercontent.com/jadenzaleski/bible-translations/master/NIV/NIV_bible.json',
        format: 'jadenzaleski'
    },
    {
        name: 'New Living Translation',
        abbrev: 'NLT',
        language: 'en',
        url: 'https://raw.githubusercontent.com/jadenzaleski/bible-translations/master/NLT/NLT_bible.json',
        format: 'jadenzaleski'
    },
    {
        name: 'Young\'s Literal Translation',
        abbrev: 'YLT',
        language: 'en',
        url: 'https://raw.githubusercontent.com/jadenzaleski/bible-translations/master/YLT/YLT_bible.json',
        format: 'jadenzaleski'
    },
    {
        name: 'World English Bible',
        abbrev: 'WEB',
        language: 'en',
        url: 'https://raw.githubusercontent.com/jadenzaleski/bible-translations/master/WEB/WEB_bible.json',
        format: 'jadenzaleski'
    }
]

// Ensure data directory exists
fs.ensureDirSync(path.dirname(DB_PATH))

const db = new Database(DB_PATH)

function downloadJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Failed to download ${url}: Status Code ${res.statusCode}`))
                return
            }
            let data = ''
            res.on('data', chunk => data += chunk)
            res.on('end', () => {
                // Strip BOM if present
                if (data.charCodeAt(0) === 0xFEFF) {
                    data = data.slice(1)
                }
                try {
                    resolve(JSON.parse(data))
                } catch (e) {
                    reject(e)
                }
            })
            res.on('error', reject)
        })
    })
}

function normalizeBookName(name) {
    return name.trim();
}

function cleanBibleText(text) {
    if (!text) return '';
    return text
        .replace(/\{[^{}]*:[^{}]*\}/g, '') // Remove notes with colons like {firmament: Heb. expansion}
        .replace(/\{([^{}]+)\}/g, '$1')   // Keep content of added-word brackets like {was}
        .replace(/\s+/g, ' ')             // Remove double spaces
        .trim();
}

async function seed() {
    console.log('Initializing database...')

    // Create Schema
    db.exec(`
      CREATE TABLE IF NOT EXISTS translations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        abbreviation TEXT NOT NULL UNIQUE,
        language TEXT
      );

      CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        abbreviation TEXT
      );

      CREATE TABLE IF NOT EXISTS verses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        translation_id INTEGER NOT NULL,
        book_id INTEGER NOT NULL,
        chapter INTEGER NOT NULL,
        verseNumber INTEGER NOT NULL,
        text TEXT NOT NULL,
        FOREIGN KEY (translation_id) REFERENCES translations(id),
        FOREIGN KEY (book_id) REFERENCES books(id)
      );

      /* Full Text Search Table */
      CREATE VIRTUAL TABLE IF NOT EXISTS verses_fts USING fts5(
          text,
          content='verses',
          content_rowid='id'
      );

      /* Triggers to keep FTS in sync */
      CREATE TRIGGER IF NOT EXISTS verses_ai AFTER INSERT ON verses BEGIN
        INSERT INTO verses_fts(rowid, text) VALUES (new.id, new.text);
      END;

      CREATE TRIGGER IF NOT EXISTS verses_ad AFTER DELETE ON verses BEGIN
        INSERT INTO verses_fts(verses_fts, rowid, text) VALUES('delete', old.id, old.text);
      END;

      CREATE TRIGGER IF NOT EXISTS verses_au AFTER UPDATE ON verses BEGIN
        INSERT INTO verses_fts(verses_fts, rowid, text) VALUES('delete', old.id, old.text);
        INSERT INTO verses_fts(rowid, text) VALUES (new.id, new.text);
      END;
    `)

    // Prepared statements
    const insertTranslation = db.prepare('INSERT INTO translations (name, abbreviation, language) VALUES (?, ?, ?)')
    const getBookId = db.prepare('SELECT id FROM books WHERE name = ?')
    const insertBook = db.prepare('INSERT INTO books (name, abbreviation) VALUES (?, ?)')
    const insertVerse = db.prepare('INSERT INTO verses (translation_id, book_id, chapter, verseNumber, text) VALUES (?, ?, ?, ?, ?)')

    // Cache book IDs to avoid constant lookups
    const bookIdCache = new Map();

    const getOrInsertBookId = (name, abbrev = null) => {
        const normalized = normalizeBookName(name);
        if (bookIdCache.has(normalized)) return bookIdCache.get(normalized);

        let row = getBookId.get(normalized);
        if (!row) {
            const result = insertBook.run(normalized, abbrev);
            bookIdCache.set(normalized, result.lastInsertRowid);
            return result.lastInsertRowid;
        }

        bookIdCache.set(normalized, row.id);
        return row.id;
    }

    try {
        const transaction = db.transaction((translationId, verses) => {
            let count = 0;
            for (const v of verses) {
                insertVerse.run(translationId, v.bookId, v.chapter, v.verse, v.text);
                count++;
                if (count % 1000 === 0) process.stdout.write('.');
            }
        });

        for (const config of TRANSLATIONS) {
            console.log(`\n\nProcessing ${config.name} (${config.abbrev})...`)

            // Check if already exists
            const existing = db.prepare('SELECT id FROM translations WHERE abbreviation = ?').get(config.abbrev);
            if (existing) {
                console.log(`✓ ${config.abbrev} already exists, skipping.`)
                continue;
            }

            console.log(`Downloading data from ${config.url}...`)
            const data = await downloadJson(config.url);

            const versesToInsert = [];

            if (config.format === 'thiagobodruk') {
                for (const book of data) {
                    const bookId = getOrInsertBookId(book.name, book.abbreviation);
                    let chapterNum = 1;
                    for (const chapter of book.chapters) {
                        let verseNum = 1;
                        for (let text of chapter) {
                            if (config.clean) text = cleanBibleText(text);
                            versesToInsert.push({ bookId, chapter: chapterNum, verse: verseNum, text });
                            verseNum++;
                        }
                        chapterNum++;
                    }
                }
            } else if (config.format === 'jadenzaleski') {
                const bookNames = Object.keys(data);
                for (const bookName of bookNames) {
                    const bookId = getOrInsertBookId(bookName);
                    const chapters = data[bookName];
                    for (const chapterNumStr of Object.keys(chapters)) {
                        const chapterNum = parseInt(chapterNumStr);
                        const verses = chapters[chapterNumStr];
                        for (const verseNumStr of Object.keys(verses)) {
                            const verseNum = parseInt(verseNumStr);
                            let text = verses[verseNumStr];
                            if (config.clean) text = cleanBibleText(text);
                            versesToInsert.push({ bookId, chapter: chapterNum, verse: verseNum, text });
                        }
                    }
                }
            }

            console.log(`Inserting ${versesToInsert.length} verses...`);
            transaction(translationId, versesToInsert);
            console.log(`\n✓ ${config.abbrev} complete.`);
        }

        console.log('\nFinalizing database...')
        db.exec('CREATE INDEX IF NOT EXISTS idx_verses_lookup ON verses(book_id, chapter, translation_id)')
        db.exec('INSERT INTO verses_fts(verses_fts) VALUES("rebuild")')

        const total = db.prepare('SELECT count(*) as count FROM verses').get();
        console.log(`\n✨ Seeding complete! Total verses: ${total.count}`);

    } catch (error) {
        console.error('\n❌ Seeding failed:', error)
    }
}

seed();
