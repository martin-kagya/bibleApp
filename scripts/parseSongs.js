#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const xml2js = require('xml2js');

const SONGS_DIR = path.join(__dirname, '..', 'data', 'songs');
const DB_PATH = path.join(__dirname, '..', 'data', 'bible.sqlite');

/**
 * Parse OpenLyrics XML file
 * Directly replaces <br/> tags in the raw XML to ensure spaces are preserved
 */
async function parseSongFile(filePath) {
    try {
        let xmlContent = fs.readFileSync(filePath, 'utf16le');

        // CRITICAL FIX: Replace <br/> tags with spaces in the RAW XML before parsing
        // This is the most reliable way to prevent word clustering if the tags are adjacent to text
        xmlContent = xmlContent.replace(/<br\s*\/?>/gi, ' ');

        const parser = new xml2js.Parser({
            explicitArray: false,
            mergeAttrs: true,
            normalize: true,
            normalizeTags: false
        });

        const result = await parser.parseStringPromise(xmlContent);
        const song = result.song;

        // Metadata extraction
        let title = song.properties?.titles?.title;
        if (Array.isArray(title)) title = title[0];
        if (typeof title === 'object' && title._) title = title._;
        title = String(title || path.basename(filePath, '.xml')).trim();

        let author = song.properties?.authors?.author;
        if (Array.isArray(author)) author = author[0];
        if (typeof author === 'object' && author._) author = author._;
        author = String(author || 'Unknown').trim();

        const copyright = String(song.properties?.copyright || '').trim();
        const ccliNo = String(song.properties?.ccliNo || '').trim();

        let themes = [];
        if (song.properties?.themes?.theme) {
            const themeList = Array.isArray(song.properties.themes.theme) ? song.properties.themes.theme : [song.properties.themes.theme];
            themes = themeList.map(t => typeof t === 'object' ? (t._ || t.value || '') : t).filter(Boolean);
        }

        let allLyrics = [];
        let verseOrder = String(song.properties?.verseOrder || '').trim();

        if (song.lyrics?.verse) {
            const verses = Array.isArray(song.lyrics.verse) ? song.lyrics.verse : [song.lyrics.verse];

            for (const verse of verses) {
                const verseName = verse.name || '';
                let content = '';

                if (verse.lines) {
                    content = verse.lines._ || verse.lines;
                    if (typeof content === 'object') content = JSON.stringify(content);
                }

                const cleanedContent = String(content)
                    .replace(/\r\n/g, '\n')
                    .replace(/\r/g, '\n')
                    .replace(/[ \t]+/g, ' ')
                    .split('\n')
                    .map(line => line.trim())
                    .join('\n')
                    .trim();

                allLyrics.push({
                    name: verseName,
                    content: cleanedContent
                });
            }
        }

        const fullLyrics = allLyrics.map(v => v.content).join('\n\n');

        return {
            title,
            author,
            copyright,
            ccliNo,
            lyrics: fullLyrics,
            themes: themes.join(', '),
            verseOrder
        };
    } catch (error) {
        console.error(`Error parsing ${path.basename(filePath)}:`, error.message);
        return null;
    }
}

async function main() {
    console.log('🎵 Starting final spacing-aware song database update...\n');

    if (!fs.existsSync(SONGS_DIR)) {
        console.error(`Error: Songs directory not found at ${SONGS_DIR}`);
        process.exit(1);
    }

    const files = fs.readdirSync(SONGS_DIR)
        .filter(f => f.endsWith('.xml'))
        .map(f => path.join(SONGS_DIR, f));

    console.log(`Found ${files.length} song files\n`);

    const db = new Database(DB_PATH);

    try {
        db.exec(`DROP TABLE IF EXISTS songs`);
        db.exec(`
            CREATE TABLE songs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                author TEXT,
                copyright TEXT,
                ccli_number TEXT,
                lyrics TEXT NOT NULL,
                themes TEXT,
                verse_order TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        console.log('✓ Created fresh songs table\n');

        const insertStmt = db.prepare(`
            INSERT INTO songs (title, author, copyright, ccli_number, lyrics, themes, verse_order)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        const transaction = db.transaction((songs) => {
            for (const song of songs) {
                insertStmt.run(
                    song.title,
                    song.author,
                    song.copyright,
                    song.ccliNo,
                    song.lyrics,
                    song.themes,
                    song.verseOrder
                );
            }
        });

        let songsToInsert = [];
        let successCount = 0;

        for (let i = 0; i < files.length; i++) {
            const songData = await parseSongFile(files[i]);
            if (songData && songData.lyrics.length > 0) {
                songsToInsert.push(songData);
                successCount++;
                if (successCount % 100 === 0) {
                    process.stdout.write(`Parsed ${successCount}/${files.length} songs...\r`);
                }
            }
        }

        console.log(`\n\nInserting songs into database...`);
        transaction(songsToInsert);

        db.exec(`CREATE INDEX IF NOT EXISTS idx_songs_title ON songs(title)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_songs_lyrics ON songs(lyrics)`);

        console.log('✅ Song database updated successfully!\n');

        const samples = db.prepare(`SELECT title, lyrics FROM songs WHERE lyrics != '' LIMIT 2`).all();
        samples.forEach((sample, idx) => {
            console.log(`${idx + 1}. "${sample.title}"\n---\n${sample.lyrics.substring(0, 300)}...\n---\n`);
        });

    } finally {
        db.close();
    }
}

main().catch(console.error);
