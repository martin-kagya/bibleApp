/**
 * Generate Embeddings for Multi-Model Bible System
 * 
 * Usage: node scripts/generateEmbeddings.js [model_name]
 * If no model name provided, generates for ALL configured models.
 */

const { vectorDbService } = require('../services/vectorDbService')
const { localBibleService } = require('../services/localBibleService')
const fs = require('fs-extra')
const path = require('path')

const BATCH_SIZE = 50

async function generate() {
  console.log('╔════════════════════════════════════════════════════════════╗')
  console.log('║                                                            ║')
  console.log('║   Bible Embedding Generator (Multi-Model)                  ║')
  console.log('║                                                            ║')
  console.log('╚════════════════════════════════════════════════════════════╝\n')

  try {
    await vectorDbService.init()

    // Determine which models to generate
    const args = process.argv.slice(2)
    const specificModel = args[0]

    let modelsToProcess = vectorDbService.getAvailableModels()
    if (specificModel) {
      if (modelsToProcess.includes(specificModel)) {
        modelsToProcess = [specificModel]
      } else {
        console.error(`❌ Unknown model: ${specificModel}`)
        console.log(`Available: ${modelsToProcess.join(', ')}`)
        process.exit(1)
      }
    }

    console.log(`🎯 Targets: ${modelsToProcess.join(', ')}`)

    // We prioritize KJV (1) for the "display text" in metadata as it's the master translation
    // Then we include NIV (3), ESV (7), NLT (4), and AMP (2) for semantic richness
    const transIds = [1, 3, 7, 4, 2];
    const versionData = {}; // ref -> { texts: [], metadata: {} }

    for (const tid of transIds) {
      console.log(`\n  📥 Fetching translation ID ${tid}...`);
      const transVerses = localBibleService.getAllVerses(tid);
      for (const v of transVerses) {
        if (!versionData[v.reference]) {
          versionData[v.reference] = {
            texts: [],
            metadata: {
              type: 'verse',
              book: v.book,
              book_id: v.book_id,
              chapter: v.chapter,
              verse: v.verse,
              reference: v.reference,
              text: v.text // KJV will be first
            }
          };
        }
        versionData[v.reference].texts.push(`[${v.translation}] ${v.text}`);
      }
    }

    const commentaries = localBibleService.getAllCommentaries()
    const qaPairs = localBibleService.getAllQA()

    console.log(`✓ Compiled ${Object.keys(versionData).length} unique verse references`)
    console.log(`✓ Found ${commentaries.length} commentaries`)
    console.log(`✓ Found ${qaPairs.length} QA pairs`)

    // Prepare ALL items to embed
    let allItems = []

    // 1. Verses (Consolidated)
    Object.values(versionData).forEach(v => {
      // We concatenate multiple versions of the same verse into one semantic string.
      // This makes the vector robust to ANY of those versions being quoted.
      const consolidatedText = v.texts.join(' ').trim();
      allItems.push({
        id: v.metadata.reference,
        textToEmbed: consolidatedText,
        metadata: v.metadata
      });
    });

    // 2. Commentaries
    allItems = allItems.concat(commentaries.map((c, idx) => ({
      id: `comm-${c.book}-${c.chapter}-${c.verse}-${idx}`,
      textToEmbed: `${c.source} on ${c.reference}: ${c.text}`,
      metadata: {
        type: 'commentary',
        book: c.book,
        chapter: c.chapter,
        verse: c.verse,
        text: c.text,
        reference: c.reference,
        source: c.source
      }
    })))

    // 3. QA
    allItems = allItems.concat(qaPairs.map((qa, idx) => ({
      id: `qa-${idx}`,
      textToEmbed: `Question: ${qa.question} Answer: ${qa.answer}`,
      metadata: {
        type: 'qa',
        question: qa.question,
        answer: qa.answer,
        reference: qa.references,
        text: `${qa.question}\n${qa.answer}`
      }
    })))

    console.log(`\nTotal items to embed: ${allItems.length}`)
    const textsToEmbed = allItems.map(i => i.textToEmbed)

    // Loop through models
    for (const modelId of modelsToProcess) {
      console.log(`\n------------------------------------------------------------`)
      console.log(`🧠 Processing Model: ${modelId.toUpperCase()}`)
      console.log(`------------------------------------------------------------`)

      const filename = `vectors-${modelId}.json`
      const savePath = path.join(process.cwd(), 'data', filename)

      // Use WriteStream to avoid "Structure too large" / "Invalid string length" errors
      const stream = fs.createWriteStream(savePath, { flags: 'w' })

      const startTime = Date.now()
      let processed = 0
      // const vectors = [] // No longer keeping in memory

      for (let i = 0; i < allItems.length; i += BATCH_SIZE) {
        const batchTexts = textsToEmbed.slice(i, i + BATCH_SIZE)
        const batchItems = allItems.slice(i, i + BATCH_SIZE)

        try {
          const embeddings = await vectorDbService.generateBatch(batchTexts, modelId)

          const batchResults = batchItems.map((item, idx) => ({
            id: item.id,
            vector: embeddings[idx],
            metadata: item.metadata
          }))

          // Write each item as a JSON line
          for (const item of batchResults) {
            stream.write(JSON.stringify(item) + '\n')
          }

          processed += batchItems.length

          // Progress
          const elapsed = (Date.now() - startTime) / 1000
          const rate = processed / elapsed
          const remaining = allItems.length - processed
          const eta = remaining / (rate || 1)
          process.stdout.write(`\r[${modelId}] ${processed}/${allItems.length} (${(processed / allItems.length * 100).toFixed(0)}%) | ${rate.toFixed(0)} items/s | ETA: ${eta.toFixed(0)}s  `)

        } catch (err) {
          console.error(`\n❌ Error batch ${i}:`, err.message)
          if (err.message.includes('429')) {
            console.log('Sleeping 60s...')
            await new Promise(r => setTimeout(r, 60000))
            i -= BATCH_SIZE; processed -= batchVerses.length;
          }
        }
      }

      stream.end()
      console.log(`\n💾 Saved stream to data/${filename}`)
      console.log(`✓ Completed ${modelId} in ${((Date.now() - startTime) / 1000).toFixed(1)}s`)
    }

    console.log('\n✨ All operations complete!')
    process.exit(0)

  } catch (error) {
    console.error('\n❌ Fatal Error:', error)
  }
}

generate()
