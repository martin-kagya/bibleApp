const { vectorDbService } = require('../services/vectorDbService')

async function test() {
    console.log('🧪 Testing Search Ensemble...')

    // Mock the generateEmbedding to return a fixed vector so we match our dummy data
    vectorDbService.generateEmbedding = async (text, modelId) => {
        return [0.1, 0.2, 0.3] // Close to our dummy vectors
    }

    // Mock cosineSimilarity to return predictable scores
    vectorDbService.cosineSimilarity = (a, b) => {
        // Just return a random high score if it matches our data
        return 0.9
    }

    // Force init
    await vectorDbService.init()

    console.log('Search Query: "Jesus wept"')
    const results = await vectorDbService.searchEnsemble("Jesus wept", 5)

    console.log('\nResults:')
    results.forEach((r, i) => {
        console.log(`${i + 1}. [${r.similarity.toFixed(4)}] ${r.reference} (${r.debug})`)
        console.log(`   ${r.text.substring(0, 50)}...`)
    })

    if (results.length > 0) {
        console.log('\n✅ Search returned results!')
    } else {
        console.error('\n❌ No results found')
        process.exit(1)
    }
}

test().catch(console.error)
