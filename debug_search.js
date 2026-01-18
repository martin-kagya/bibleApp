const { parallelSearchService } = require('./services/parallelSearchService');
const { localBibleService } = require('./services/localBibleService');
const { vectorDbService } = require('./services/vectorDbService');

async function test() {
    console.log('--- Testing Search Services ---');

    // 1. Check Local Bible
    try {
        const verse = await localBibleService.getVerse('John 3:16');
        console.log('✅ LocalBible John 3:16:', verse.text ? 'Found' : 'EMPTY');
    } catch (e) {
        console.error('❌ LocalBible Failed:', e);
    }

    // 2. Check Vector DB
    try {
        if (!vectorDbService.isReady) {
            console.log('Waiting for VectorDbService...');
            await new Promise(r => setTimeout(r, 2000));
        }
        const results = await vectorDbService.searchHybrid('Faith is the substance');
        console.log('✅ Vector Search Hybrid:', results.length > 0 ? `Found ${results.length} results` : 'NO RESULTS');
    } catch (e) {
        console.error('❌ Vector Search Failed:', e);
    }

    // 3. Check ParallelSearchService
    try {
        console.log('Testing ParallelSearchService...');
        await parallelSearchService.search('Faith is the substance of things hoped for', (type, data) => {
            console.log(`📡 Result [${type}]:`, data.results ? `${data.results.length} items` : 'No results');
            if (data.results && data.results.length > 0) {
                console.log(`   Top: ${data.results[0].reference} (${data.results[0].confidence})`);
            }
        }, { isFinal: true });
    } catch (e) {
        console.error('❌ ParallelSearch Failed:', e);
    }
}

test().then(() => console.log('--- Diagnostic Complete ---'));
