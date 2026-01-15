const { bibleCacheService } = require('./services/bibleCacheService')
const { localBibleService } = require('./services/localBibleService')
const Database = require('better-sqlite3')
const path = require('path')

const DB_PATH = path.join(__dirname, 'data/bible.sqlite')

async function verify() {
    console.log('--- Bible Cache Verification ---')

    const translation = 'BSB'
    const book = 'John'
    const chapter = 3

    // 1. Check if BSB exists locally
    const db = new Database(DB_PATH)
    const existing = db.prepare('SELECT id FROM translations WHERE abbreviation = ?').get(translation)

    if (existing) {
        console.log(`⚠️ Translation ${translation} already exists locally. Deleting it to force a clean test...`)
        db.prepare('DELETE FROM verses WHERE translation_id = ?').run(existing.id)
        db.prepare('DELETE FROM translations WHERE id = ?').run(existing.id)
        console.log(`✓ Deleted ${translation} from local DB.`)
    } else {
        console.log(`✓ ${translation} not found locally (expected).`)
    }
    db.close()

    // 2. Fetch via CacheService
    console.log(`\nTesting: getOrFetchChapter for ${book} ${chapter} (${translation})...`)
    try {
        const start = Date.now()
        const verses = await bibleCacheService.getOrFetchChapter(book, chapter, translation)
        const end = Date.now()

        console.log(`✓ Successfully retrieved ${verses.length} verses in ${end - start}ms.`)
        console.log(`First verse: ${verses[0].reference} - ${verses[0].text.substring(0, 50)}...`)

        // 3. Verify it's now in the database
        const db2 = new Database(DB_PATH)
        const count = db2.prepare(`
      SELECT count(*) as count 
      FROM verses v 
      JOIN translations t ON v.translation_id = t.id 
      WHERE t.abbreviation = ?
    `).get(translation)

        console.log(`\nDatabase Check: Found ${count.count} verses for ${translation} in SQLite.`)

        // 4. Test Cache Hit (should be much faster)
        console.log('\nTesting Cache Hit (fetching again)...')
        const start2 = Date.now()
        const verses2 = await bibleCacheService.getOrFetchChapter(book, chapter, translation)
        const end2 = Date.now()
        console.log(`✓ Cache hit retrieved ${verses2.length} verses in ${end2 - start2}ms.`)

        if (count.count > 0 && (end2 - start2) < (end - start)) {
            console.log('\n✅ VERIFICATION SUCCESSFUL!')
        } else {
            console.log('\n❌ VERIFICATION FAILED: Cache performance or database insertion issue.')
        }

        db2.close()
    } catch (err) {
        console.error('\n❌ VERIFICATION FAILED with error:', err.message)
        console.error(err.stack)
    }
}

verify()
