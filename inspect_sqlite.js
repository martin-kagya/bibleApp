const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'data/bible.sqlite');
const db = new Database(dbPath, { verbose: console.log });

try {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    console.log('--- TABLES IN BIBLE.SQLITE ---');
    tables.forEach(t => console.log(t.name));

    // If we find interesting tables, let's peek at their columns
    const potentialTables = ['strongs', 'lexicon', 'definitions', 'interlinear', 'greek', 'hebrew', 'words'];

    for (const t of tables) {
        if (potentialTables.some(pt => t.name.toLowerCase().includes(pt))) {
            console.log(`\n--- COLUMNS FOR ${t.name} ---`);
            const columns = db.prepare(`PRAGMA table_info(${t.name})`).all();
            console.log(columns.map(c => c.name).join(', '));

            console.log(`\n--- SAMPLE DATA FOR ${t.name} ---`);
            const sample = db.prepare(`SELECT * FROM ${t.name} LIMIT 1`).get();
            console.log(sample);
        }
    }

} catch (err) {
    console.error('Error inspecting DB:', err);
}
