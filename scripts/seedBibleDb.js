const Database = require('better-sqlite3')
const fs = require('fs-extra')
const path = require('path')
const https = require('https')

const DB_PATH = path.join(__dirname, '../data/bible.sqlite')
const BIBLE_JSON_URL = 'https://raw.githubusercontent.com/thiagobodruk/bible/master/json/en_kjv.json' // Public domain KJV JSON

// Ensure data directory exists
fs.ensureDirSync(path.dirname(DB_PATH))

// Delete existing DB to start fresh
if (fs.existsSync(DB_PATH)) {
    fs.removeSync(DB_PATH)
}

const db = new Database(DB_PATH)

// Create Schema
console.log('Creating database schema...')
db.exec(`
  CREATE TABLE IF NOT EXISTS books (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    abbreviation TEXT
  );

  CREATE TABLE IF NOT EXISTS verses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    book_id INTEGER,
    chapter INTEGER,
    verseNumber INTEGER,
    text TEXT,
    FOREIGN KEY(book_id) REFERENCES books(id)
  );

  CREATE INDEX IF NOT EXISTS idx_book_chapter ON verses(book_id, chapter);
  CREATE INDEX IF NOT EXISTS idx_text ON verses(text);
`)

// Helper to download JSON
function downloadJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
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

async function seed() {
    console.log('Downloading Bible data...')
    try {
        const bibleData = await downloadJson(BIBLE_JSON_URL)

        console.log('Seeding database... this may take a moment.')

        const insertBook = db.prepare('INSERT INTO books (name, abbreviation) VALUES (?, ?)')
        const insertVerse = db.prepare('INSERT INTO verses (book_id, chapter, verseNumber, text) VALUES (?, ?, ?, ?)')

        db.transaction(() => {
            let bookId = 1
            for (const book of bibleData) {
                insertBook.run(book.name, book.abbreviation)

                let chapterNum = 1
                for (const chapter of book.chapters) {
                    let verseNum = 1
                    for (const text of chapter) {
                        insertVerse.run(bookId, chapterNum, verseNum, text)
                        verseNum++
                    }
                    chapterNum++
                }
                bookId++
                process.stdout.write('.')
            }
        })()

        console.log('\n✓ Database seeded successfully!')

        // Test query
        const test = db.prepare('SELECT count(*) as count FROM verses').get()
        console.log(`Total verses: ${test.count}`)

    } catch (error) {
        console.error('Seeding failed:', error)
    }
}

seed()
