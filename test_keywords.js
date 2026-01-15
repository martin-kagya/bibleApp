
const { vectorDbService } = require('./services/vectorDbService');

console.log('--- Test extractKeywords ---');
const t1 = "As a man thinks that is how he is";
const k1 = vectorDbService.extractKeywords(t1);
console.log(`"${t1}" ->`, k1);

const t2 = "For God so loved the world that he gave his only begotten son";
const k2 = vectorDbService.extractKeywords(t2);
console.log(`"${t2}" ->`, k2);

const t3 = "Ezekiel  28:2";
const k3 = vectorDbService.extractKeywords(t3);
console.log(`"${t3}" ->`, k3);

if (k1.includes('man') && k1.includes('thinks') && !k1.includes('that')) {
    console.log('✓ Test 1 Passed');
} else {
    console.error('❌ Test 1 Failed');
}
