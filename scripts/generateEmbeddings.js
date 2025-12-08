/**
 * Generate Embeddings for Local Bible Database
 * 
 * Usage: node scripts/generateEmbeddings.js
 */

const { vectorDbService } = require('../services/vectorDbService')
const { localBibleService } = require('../services/localBibleService')
const fs = require('fs-extra')
const path = require('path')

const BATCH_SIZE = 50

async function generate() {
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║                                                            ║')
  console.log('║   📚 Local Bible Embedding Generator                      ║')
  console.log('║                                                            ║')
  console.log('╚════════════════════════════════════════════════════════════╝\n')

  try {
    // 1. Initialize Vector Service (triggers model load)
    console.log('⏳ Initializing vector service...')
    // We need to wait for init. But init is called in constructor loosely. 
    // Let's force a call or wait.
    // Ideally vectorDbService should have an exposed init or we just wait a bit/check ready

    // We can rely on generateEmbedding to auto-init, but let's be explicit
    await vectorDbService.init()

    // 2. Fetch all verses
    console.log('📖 Fetching verses from local database...')
    const verses = localBibleService.getAllVerses()
    console.log(`✓ Found ${verses.length} verses to process`)

    if (verses.length === 0) {
      console.error('❌ No verses found. Run npm run db:seed first.')
      process.exit(1)
    }

    // 3. Process in batches
    console.log(`🚀 Starting generation (Batch size: ${BATCH_SIZE})...`)
    const startTime = Date.now()
    let processed = 0

    // Check if we have existing vectors to skip?
    // For now, full regenerate

    // We need to access vectorDbService.vectors directly or use storeVerse
    // ensure vectorDbService.vectors is reset if we want clean state, or we append
    vectorDbService.vectors = []

    for (let i = 0; i < verses.length; i += BATCH_SIZE) {
      const batch = verses.slice(i, i + BATCH_SIZE)

      await Promise.all(batch.map(async (verse) => {
        try {
          await vectorDbService.storeVerse(verse)
        } catch (err) {
          console.error(`Error processing ${verse.reference}:`, err.message)
        }
      }))

      processed += batch.length

      // Progress
      if (processed % 100 === 0) {
        const elapsed = (Date.now() - startTime) / 1000
        const rate = processed / elapsed
        const remaining = verses.length - processed
        const eta = remaining / rate

        process.stdout.write(`\rProgress: ${processed}/${verses.length} (${(processed / verses.length * 100).toFixed(1)}%) | Rate: ${rate.toFixed(1)} v/s | ETA: ${eta.toFixed(0)}s   `)
      }

      // Periodic save (optional, but good for safety)
      // For simplicity, save at end
    }

    console.log('\n\n💾 Saving vectors to disk...')
    const savePath = path.join(process.cwd(), 'data', 'vectors.json')
    await fs.writeJson(savePath, vectorDbService.vectors)

    console.log(`✓ Saved ${vectorDbService.vectors.length} vectors to ${savePath}`)
    console.log(`✓ Total time: ${((Date.now() - startTime) / 1000).toFixed(1)}s`)

  } catch (error) {
    console.error('\n❌ Fatal error:', error)
    process.exit(1)
  }
}

generate()
