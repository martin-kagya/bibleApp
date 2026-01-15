const { scriptureParser } = require('./services/scriptureParser');

const testCases = [
    // Standard matches
    { input: "John 3:16", expected: ["John 3:16"] },

    // Fuzzy matches (typos)
    { input: "Joe 3:16", expected: ["Joel 3:16"] }, // or Job, depending on logic
    { input: "Jon 3:16", expected: ["John 3:16"] }, // Jonah is also minimal, but John is common
    { input: "Revalations 3:20", expected: ["Revelation 3:20"] },
    { input: "Genisis 1:1", expected: ["Genesis 1:1"] },

    // Spoken style
    { input: "John chapter 3 verse 16", expected: ["John 3:16"] },
    { input: "First John chapter 4 verse 8", expected: ["1 John 4:8"] },

    // Mixed text
    { input: "The pastor read from Phil 4:13 regarding strength.", expected: ["Philippians 4:13"] }
];

console.log("Running Fuzzy Matching Tests...\n");

testCases.forEach(({ input, expected }, index) => {
    const results = scriptureParser.extractReferences(input);
    const passed = results.some(r => expected.includes(r.replace(/\s+/g, ' '))); // loose check

    console.log(`Test ${index + 1}: "${input}"`);
    console.log(`Expected: ${JSON.stringify(expected)}`);
    console.log(`Got:      ${JSON.stringify(results)}`);
    console.log(`Result:   ${passed ? "✅ PASS" : "❌ FAIL"}`);
    console.log("-------------------");
});
