const { vectorDbService } = require('../services/vectorDbService');
const { localBibleService } = require('../services/localBibleService');

async function test() {
    console.log('--- TEST 1: Hotfix logic ---');
    console.log('Search "face" (Normal Search - Hotfixes OFF):');
    const kw1 = vectorDbService.extractKeywords('face', false);
    console.log('Keywords:', kw1); // Should be ['face']

    console.log('\nSearch "face" (Speech transcription - Hotfixes ON):');
    const kw2 = vectorDbService.extractKeywords('face', true);
    console.log('Keywords:', kw2); // Should be ['edifice']

    console.log('\n--- TEST 2: Hybrid Search Ranking (stone as witness) ---');
    try {
        const results = await vectorDbService.searchHybrid('stone as witness', { topK: 5, useHotfixes: false });
        console.log('Top Results:');
        results.forEach((r, i) => {
            console.log(`${i + 1}. ${r.reference} [Score: ${r.confidence.toFixed(4)}] - ${r.text.substring(0, 50)}...`);
        });
    } catch (e) {
        console.error('Hybrid search failed:', e);
    }

    process.exit(0);
}

test();
