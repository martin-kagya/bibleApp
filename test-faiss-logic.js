const faiss = require('faiss-node');

function testFaiss() {
    const dimension = 768;
    const numVectors = 10;

    // Create random vectors
    const vectors = Array.from({ length: numVectors }, () =>
        Array.from({ length: dimension }, () => Math.random())
    );

    console.log('--- Testing faiss-node.add ---');
    const index = new faiss.IndexFlatIP(dimension);

    // Test 1: Nested Array
    console.log('Test 1: Nested Array (number[][])');
    try {
        index.add(vectors);
        console.log('✅ Success: Nested Array accepted.');
    } catch (e) {
        console.error('❌ Failed: Nested Array:', e.message);
    }

    // Test 2: Flat Float32Array
    console.log('\nTest 2: Flat Float32Array');
    try {
        const flatData = new Float32Array(vectors.flat());
        index.add(flatData);
        console.log('✅ Success: Flat Float32Array accepted.');
    } catch (e) {
        console.error('❌ Failed: Flat Float32Array:', e.message);
    }

    // Test 3: Flat Number Array
    console.log('\nTest 3: Flat Number Array');
    try {
        const flatData = vectors.flat();
        index.add(flatData);
        console.log('✅ Success: Flat Number Array accepted.');
    } catch (e) {
        console.error('❌ Failed: Flat Number Array:', e.message);
    }
}

testFaiss();
