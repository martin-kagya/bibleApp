
const { localBibleService } = require('./services/localBibleService');

async function testsearch() {
    console.log('--- Test 1: Full Sentence ---');
    const q1 = "as a man thinks that is how he is";
    const res1 = localBibleService.searchByKeyword(q1);
    console.log(`Query: "${q1}" -> ${res1.length} results`);
    res1.forEach(r => console.log(` - ${r.reference}: ${r.text}`));

    console.log('\n--- Test 2: Keywords Only ---');
    const q2 = "man thinks heart";
    const res2 = localBibleService.searchByKeyword(q2);
    console.log(`Query: "${q2}" -> ${res2.length} results`);
    res2.forEach(r => console.log(` - ${r.reference}: ${r.text}`));

    console.log('\n--- Test 3: Stopwords Removed ---');
    const q3 = "man thinks"; // simplified
    const res3 = localBibleService.searchByKeyword(q3);
    console.log(`Query: "${q3}" -> ${res3.length} results`);
    res3.forEach(r => console.log(` - ${r.reference}: ${r.text}`));
}

testsearch();
