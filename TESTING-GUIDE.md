# 🧪 Testing Guide - Bible Presentation App

## Quick Start

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:paraphrase    # Paraphrase detection & semantic search
npm run test:parsing       # Reference parsing & extraction
npm run test:sermon        # Full sermon analysis
```

## 📋 Test Suites

### 1. Paraphrase Detection Tests (`tests/paraphrase-detection.test.js`)

Tests the AI's ability to recognize scripture content even when paraphrased or spoken in natural language.

**What it tests:**
- Semantic similarity matching
- Natural language scripture recognition
- Theme-based suggestions
- Confidence scoring
- Complex paraphrase handling

**Example Test Cases:**

```javascript
Input: "Love never fails, love never gives up"
Expected: 1 Corinthians 13:7-8
Min Confidence: 60%

Input: "God so loved the world that he gave his only son"
Expected: John 3:16
Min Confidence: 80%

Input: "All things work together for good for those who love God"
Expected: Romans 8:28
Min Confidence: 70%
```

**Run:**
```bash
npm run test:paraphrase
```

**Expected Output:**
```
╔════════════════════════════════════════════════════════════╗
║   📖 PARAPHRASE DETECTION TEST SUITE                      ║
╚════════════════════════════════════════════════════════════╝

🧪 Test: Love Never Fails
   Input: "Love never fails, love never gives up"
   Expected: 1 Corinthians 13:7 or 1 Corinthians 13:8
   ✓ Found: 1 Corinthians 13:7
   Confidence: 87.3%
   Text: "Love never fails. Love never gives up, never loses..."

📊 TEST SUMMARY
✓ Passed: 10
⚠️  Warnings: 2
❌ Failed: 0
Success Rate: 100%
```

---

### 2. Reference Parsing Tests (`tests/reference-parsing.test.js`)

Tests the parser's ability to understand various scripture reference formats.

**What it tests:**
- Single verse parsing (John 3:16)
- Range parsing (John 3:16-18)
- List parsing (Romans 8:1,5,9)
- Multiple books (John 3:16; Romans 8:28)
- Numbered books (1 Corinthians, 2 Peter)
- Book abbreviations (Rom, Gen, Phil)
- Natural speech extraction ("As John chapter 3 verse 16 says...")
- API fetching with parsed references

**Example Test Cases:**

```javascript
// Simple formats
"John 3:16" → { book: "John", chapter: 3, verse: 16 }
"Psalm 23" → { book: "Psalm", chapter: 23, type: "chapter" }

// Ranges
"John 3:16-18" → { book: "John", chapter: 3, verseStart: 16, verseEnd: 18 }

// Lists
"Romans 8:1,5,9" → 3 separate references

// Complex
"John 3:16; Romans 8:28" → 2 separate book references
"Romans 8:1-3,5-7,9" → 3 separate references
```

**Run:**
```bash
npm run test:parsing
```

**Expected Output:**
```
╔════════════════════════════════════════════════════════════╗
║   🔍 SCRIPTURE REFERENCE PARSING TESTS                    ║
╚════════════════════════════════════════════════════════════╝

🧪 Test: Simple Single Verse
   Input: "John 3:16"
   ✓ Parsed correctly: John 3:16
   Book: John, Chapter: 3, Type: single

🧪 Test: Verse Range
   Input: "John 3:16-18"
   ✓ Parsed correctly: John 3:16-18
   Book: John, Chapter: 3, Type: range

📊 PARSING TEST SUMMARY
✓ Passed: 18
✗ Failed: 0
Success Rate: 100%
```

---

### 3. Comprehensive Detection Test

Tests all detection capabilities working together on a full sermon excerpt.

**What it tests:**
- Explicit scripture references
- Paraphrased content
- Semantic matches
- Theme extraction
- Intelligent suggestions
- Confidence scoring across types

**Example Sermon:**
```text
Today, I want to talk about God's love. You know, God so loved the world 
that he gave his one and only son. That's John 3:16, one of the most 
powerful verses in scripture.

And remember, love never fails. Love is patient and kind. When we love 
like God loves, we reflect his character.

The Bible tells us in Romans 8:28 that all things work together for good 
for those who love God. Even in difficult times, we can trust that God 
is working for our benefit.
```

**Expected Detections:**
- ✅ Explicit: John 3:16, Romans 8:28
- ✅ Paraphrase: 1 Corinthians 13:4-7 (love is patient and kind)
- ✅ Themes: Love, Trust, God's Character
- ✅ Suggestions: John 13:34, 1 John 4:7-8, Romans 5:8

---

## 🎯 Test Metrics

### Success Criteria

| Test Suite | Expected Success Rate | Avg Duration |
|------------|----------------------|--------------|
| Paraphrase Detection | 80-90% | 10-30s |
| Reference Parsing | 95-100% | 2-8s |
| Reference Extraction | 95-100% | 3-8s |
| API Fetching | 95-100% | 5-10s |
| **Total Suite** | **85-95%** | **35-100s** |

### Confidence Levels

| Confidence Range | Meaning | Color |
|-----------------|---------|-------|
| 90-100% | Excellent match | 🟢 Green |
| 70-89% | Good match | 🟡 Yellow |
| 50-69% | Fair match | 🟠 Orange |
| <50% | Low confidence | 🔴 Red |

---

## 🛠️ Setup & Prerequisites

### Required Configuration

1. **Environment Variables** (`.env`):
   ```bash
   OPENAI_API_KEY=sk-...              # Required for all AI features
   BIBLE_API_KEY=your_bible_api_key   # Required for API.Bible
   POSTGRES_URL=postgresql://...       # Optional for DB tests
   REDIS_URL=redis://...              # Optional for cache tests
   ```

2. **Generate Embeddings** (First-time only):
   ```bash
   npm run embeddings:generate
   ```
   ⏱️ Takes ~1-2 hours, only needs to be done once

3. **Install Dependencies**:
   ```bash
   npm install
   ```

### Optional Setup

For full test coverage:
- PostgreSQL database (for persistence tests)
- Redis server (for caching tests)
- Vector database (Pinecone or ChromaDB)

---

## 🚨 Troubleshooting

### Problem: "Semantic search service not available"

**Solutions:**
```bash
# 1. Check API key
echo $OPENAI_API_KEY

# 2. Generate embeddings
npm run embeddings:generate

# 3. Verify vector database is running
# For Pinecone: Check dashboard
# For ChromaDB: Check server status
```

### Problem: "No results found" for paraphrases

**Possible Causes:**
- Embeddings not generated
- OpenAI API key invalid
- Vector database not accessible
- Network connectivity issues

**Debug Steps:**
```bash
# Test OpenAI connection
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Check embeddings exist
ls -lh data/embeddings/

# Test vector database
npm run test:db-connection
```

### Problem: Rate limiting errors

**Solutions:**
- Add delays between requests
- Use caching for repeated tests
- Reduce test batch size
- Check API quota usage

### Problem: Parsing failures

**Common Issues:**
- Unusual book name variations
- Missing book mappings
- Typos in test inputs
- Edge case formatting

**Fix:**
```javascript
// Check book name mapping
const { scriptureParser } = require('./services/scriptureParser')
console.log(scriptureParser.normalizeBookName('1st Corinthians'))
// Should return: "1 Corinthians"
```

---

## 📊 Understanding Test Results

### Color-Coded Output

Tests use ANSI colors for clear visual feedback:

- 🔵 **Blue**: Section headers and test names
- 🟢 **Green**: Passed tests
- 🟡 **Yellow**: Warnings (test passed but with caveats)
- 🔴 **Red**: Failed tests

### Example Output Breakdown

```
🧪 Test: Love Never Fails                    ← Test name (Blue)
   Input: "Love never fails"                 ← Test input
   Expected: 1 Corinthians 13:7              ← Expected result
   ✓ Found: 1 Corinthians 13:7               ← Success (Green)
   Confidence: 87.3%                         ← Confidence score
   Text: "Love never fails..."               ← Matched text
```

### Warning vs. Failure

**Warning** (⚠️ Yellow):
- Test found a result, but:
  - Confidence is lower than ideal
  - Alternative valid reference found
  - Partial match instead of exact

**Failure** (❌ Red):
- No result found
- Incorrect result
- Error during execution
- API unavailable

---

## 🎓 Adding Custom Tests

### Create a New Test File

```javascript
// tests/my-custom-test.js

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
}

async function runMyTests() {
  console.log('\n' + colors.blue + '🧪 My Custom Tests' + colors.reset)
  
  let passed = 0
  let failed = 0
  
  const testCases = [
    {
      name: 'Test Case 1',
      input: 'Test input',
      expected: 'Expected result'
    }
  ]
  
  for (const test of testCases) {
    console.log(colors.blue + `\n🧪 Test: ${test.name}` + colors.reset)
    console.log(`   Input: "${test.input}"`)
    
    try {
      // Your test logic here
      const result = await myFunction(test.input)
      
      if (result === test.expected) {
        console.log(colors.green + `   ✓ Passed` + colors.reset)
        passed++
      } else {
        console.log(colors.red + `   ✗ Failed` + colors.reset)
        failed++
      }
    } catch (error) {
      console.log(colors.red + `   ✗ Error: ${error.message}` + colors.reset)
      failed++
    }
  }
  
  // Summary
  console.log('\n' + colors.blue + '📊 TEST SUMMARY' + colors.reset)
  console.log(`${colors.green}✓ Passed: ${passed}${colors.reset}`)
  console.log(`${colors.red}✗ Failed: ${failed}${colors.reset}`)
}

if (require.main === module) {
  runMyTests()
}

module.exports = { runMyTests }
```

### Add to Test Runner

Edit `tests/run-all-tests.js`:

```javascript
// Add at the top
const myTests = require('./my-custom-test')

// Add in main function
await myTests.runMyTests()
```

### Add NPM Script

Edit `package.json`:

```json
"scripts": {
  "test:custom": "node tests/my-custom-test.js"
}
```

---

## 📈 Performance Monitoring

### Benchmarking Tests

Add timing to your tests:

```javascript
const startTime = Date.now()

// Run tests...

const duration = (Date.now() - startTime) / 1000
console.log(`⏱️  Completed in ${duration.toFixed(2)}s`)
```

### Memory Usage

Monitor memory for large datasets:

```javascript
const used = process.memoryUsage()
console.log(`Memory: ${Math.round(used.heapUsed / 1024 / 1024)}MB`)
```

---

## 🔄 Continuous Integration

### GitHub Actions Example

```yaml
# .github/workflows/tests.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm install
      
      - name: Run tests
        run: npm test
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          BIBLE_API_KEY: ${{ secrets.BIBLE_API_KEY }}
      
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: test-results/
```

---

## 🎯 Best Practices

1. **Run tests regularly** - After any code changes
2. **Review warnings** - Investigate low confidence matches
3. **Keep API keys secure** - Use environment variables
4. **Monitor rate limits** - Respect API quotas
5. **Update test cases** - Add new scenarios as needed
6. **Document failures** - Track and fix recurring issues
7. **Use caching** - Reduce API calls during development

---

## 📚 Resources

- **Tests Directory**: `/tests/`
- **Test README**: `/tests/README.md`
- **Main README**: `/README.md`
- **API Documentation**: See service files in `/services/`

---

## 🆘 Getting Help

If tests fail:

1. ✅ Check prerequisites are met
2. ✅ Verify API keys are configured
3. ✅ Review error messages carefully
4. ✅ Check service status (OpenAI, API.Bible)
5. ✅ Review test output logs
6. ✅ Consult `/tests/README.md`

---

**Happy Testing!** 🧪✨



