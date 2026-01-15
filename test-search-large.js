const { vectorDbService } = require('./services/vectorDbService');

async function test() {
    await vectorDbService.init();
    console.log('Current Model:', vectorDbService.currentModelId);
    console.log('Searching for "faith"...');
    const results = await vectorDbService.searchSimilarVerses('faith', 5);
    results.forEach(r => {
        console.log(`[${r.similarity.toFixed(4)}] ${r.reference}: ${r.text.substring(0, 50)}... (${r.sourceModel})`);
    });

    if (results.length > 0 && results[0].sourceModel === 'bge-large') {
        console.log('✓ Verification Passed: Using bge-large');
    } else {
        console.error('❌ Verification Failed: Not using bge-large');
    }
}

test();
