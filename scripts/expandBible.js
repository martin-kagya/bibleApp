const Database = require('better-sqlite3');
const path = require('path');
const https = require('https');

const DB_PATH = path.join(__dirname, '../data/bible.sqlite');
const db = new Database(DB_PATH);

const NEW_TRANSLATIONS = [
    {
        name: 'English Standard Version',
        abbrev: 'ESV',
        language: 'en',
        url: 'https://raw.githubusercontent.com/jadenzaleski/bible-translations/66d2f2cadd81f57df5b6cd93d0d72aee06b46f9a/ESV/ESV_bible.json'
    },
    {
        name: 'New American Standard Bible',
        abbrev: 'NASB',
        language: 'en',
        url: 'https://raw.githubusercontent.com/jadenzaleski/bible-translations/66d2f2cadd81f57df5b6cd93d0d72aee06b46f9a/NASB/NASB_bible.json'
    },
    {
        name: 'New English Translation',
        abbrev: 'NET',
        language: 'en',
        url: 'https://raw.githubusercontent.com/jadenzaleski/bible-translations/66d2f2cadd81f57df5b6cd93d0d72aee06b46f9a/NET/NET_bible.json'
    }
];

function downloadJson(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode !== 200) {
                reject(new Error(`Failed to download ${url}: Status Code ${res.statusCode}`));
                return;
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                if (data.charCodeAt(0) === 0xFEFF) {
                    data = data.slice(1);
                }
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    reject(e);
                }
            });
            res.on('error', reject);
        });
    });
}

function cleanBibleText(text) {
    if (!text) return '';
    return text
        .replace(/\{[^{}]*:[^{}]*\}/g, '') // Remove notes with colons like {firmament: Heb. expansion}
        .replace(/\{([^{}]+)\}/g, '$1')   // Keep content of added-word brackets like {was}
        .replace(/\s+/g, ' ')             // Remove double spaces
        .trim();
}

async function start() {
    console.log('--- Phase 1: Cleaning KJV ---');
    const kjv = db.prepare("SELECT id FROM translations WHERE abbreviation = 'KJV'").get();
    if (kjv) {
        const verses = db.prepare("SELECT id, text FROM verses WHERE translation_id = ? AND text LIKE '%{%'").all(kjv.id);
        console.log(`Found ${verses.length} verses in KJV needing cleanup.`);

        const update = db.prepare('UPDATE verses SET text = ? WHERE id = ?');
        const updateMany = db.transaction((list) => {
            for (const v of list) {
                update.run(cleanBibleText(v.text), v.id);
            }
        });

        updateMany(verses);
        console.log('✓ KJV cleaned.');
    } else {
        console.log('KJV not found, skipping cleanup.');
    }

    console.log('\n--- Phase 2: Adding New Translations ---');
    const insertTranslation = db.prepare('INSERT INTO translations (name, abbreviation, language) VALUES (?, ?, ?)');
    const getBookId = db.prepare('SELECT id FROM books WHERE name = ?');
    const insertVerse = db.prepare('INSERT INTO verses (translation_id, book_id, chapter, verseNumber, text) VALUES (?, ?, ?, ?, ?)');

    for (const config of NEW_TRANSLATIONS) {
        const existing = db.prepare('SELECT id FROM translations WHERE abbreviation = ?').get(config.abbrev);
        if (existing) {
            console.log(`${config.abbrev} already exists, skipping.`);
            continue;
        }

        console.log(`\nProcessing ${config.name} (${config.abbrev})...`);
        try {
            const data = await downloadJson(config.url);
            const transResult = insertTranslation.run(config.name, config.abbrev, config.language);
            const translationId = transResult.lastInsertRowid;

            const versesToInsert = [];
            const bookNames = Object.keys(data);

            for (const bookName of bookNames) {
                const bookRow = getBookId.get(bookName);
                if (!bookRow) {
                    // Try some normalization if needed, but Jadenzaleski names usually match
                    continue;
                }
                const bookId = bookRow.id;
                const bookData = data[bookName];

                for (const chapterNumStr of Object.keys(bookData)) {
                    const chapterNum = parseInt(chapterNumStr);
                    const verses = bookData[chapterNumStr];
                    for (const verseNumStr of Object.keys(verses)) {
                        const verseNum = parseInt(verseNumStr);
                        const text = verses[verseNumStr];
                        versesToInsert.push({ translationId, bookId, chapter: chapterNum, verse: verseNum, text });
                    }
                }
            }

            console.log(`Inserting ${versesToInsert.length} verses for ${config.abbrev}...`);
            const transaction = db.transaction((list) => {
                for (const v of list) {
                    insertVerse.run(v.translationId, v.bookId, v.chapter, v.verse, v.text);
                }
            });
            transaction(versesToInsert);
            console.log(`✓ ${config.abbrev} complete.`);

        } catch (err) {
            console.error(`Error processing ${config.abbrev}:`, err.message);
        }
    }

    console.log('\n--- Done! ---');
    const stats = db.prepare('SELECT t.abbreviation, COUNT(v.id) as count FROM verses v JOIN translations t ON v.translation_id = t.id GROUP BY t.abbreviation').all();
    console.table(stats);
}

start().catch(console.error);
