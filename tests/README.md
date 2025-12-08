# 🧪 Test Suite Documentation

## Overview

Comprehensive test suite for the Bible Presentation App, covering paraphrase detection, reference parsing, semantic search, and comprehensive scripture detection.

## Test Files

### 1. `paraphrase-detection.test.js`
Tests semantic search and paraphrase detection capabilities.

**Features Tested:**
- Paraphrased scripture recognition ("love never fails" → 1 Cor 13:7)
- Semantic similarity matching
- Complex paraphrase handling
- Comprehensive detection (explicit + semantic + theme-based)

**Test Cases:**
- 10 standard paraphrase tests
- 4 complex paraphrase tests
- 1 comprehensive sermon analysis

**Run:**
```bash
npm run test:paraphrase
```

### 2. `reference-parsing.test.js`
Tests scripture reference parsing and extraction.

**Features Tested:**
- Single verse parsing (John 3:16)
- Range parsing (John 3:16-18)
- List parsing (Romans 8:1,5,9)
- Complex combinations (John 3:16; Romans 8:28)
- Numbered books (1 Corinthians, 2 Peter)
- Reference extraction from natural text
- API fetching with parsed references

**Test Cases:**
- 18 parsing test cases
- 5 extraction test cases
- 4 API fetching tests

**Run:**
```bash
npm run test:parsing
```

### 3. `run-all-tests.js`
Runs all test suites in sequence.

**Run:**
```bash
npm test
```

## Prerequisites

### Required
- Node.js 18+
- OpenAI API key (for semantic search tests)
- API.Bible key (for API fetching tests)

### Optional
- PostgreSQL (for database tests)
- Redis (for caching tests)
- Generated embeddings (for semantic search tests)

## Setup

1. **Configure Environment:**
   ```bash
   cp config/env.example.txt .env
   # Add your API keys to .env
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Generate Embeddings (for semantic tests):**
   ```bash
   npm run embeddings:generate
   ```
   Note: This takes 1-2 hours but only needs to be done once.

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test Suites
```bash
# Paraphrase detection tests
npm run test:paraphrase

# Reference parsing tests
npm run test:parsing

# Original sermon tests
npm run test:sermon
```

### Run Individual Tests
```bash
# Paraphrase detection only
node tests/paraphrase-detection.test.js

# Reference parsing only
node tests/reference-parsing.test.js

# Run all tests
node tests/run-all-tests.js
```

## Test Results

### Output Format

Tests use color-coded output:
- 🟢 **Green**: Passed tests
- 🟡 **Yellow**: Warnings (test passed but with caveats)
- 🔴 **Red**: Failed tests
- 🔵 **Blue**: Section headers

### Success Metrics

Each test suite reports:
- ✅ Number of passed tests
- ⚠️ Number of warnings
- ❌ Number of failed tests
- 📊 Success rate percentage

## Test Cases

### Paraphrase Detection Test Cases

| Input | Expected Reference | Min Confidence |
|-------|-------------------|----------------|
| "Love never fails" | 1 Corinthians 13:7 | 60% |
| "God so loved the world" | John 3:16 | 80% |
| "All things work together for good" | Romans 8:28 | 70% |
| "The Lord is my shepherd" | Psalm 23:1 | 80% |
| "Faith without works is dead" | James 2:26 | 70% |
| "Be strong and courageous" | Joshua 1:9 | 60% |
| "New creation in Christ" | 2 Corinthians 5:17 | 70% |
| "Peace that surpasses understanding" | Philippians 4:7 | 70% |
| "Trust in the Lord with all your heart" | Proverbs 3:5 | 80% |
| "Greater is he that is in you" | 1 John 4:4 | 70% |

### Reference Parsing Test Cases

| Format | Example | Expected Result |
|--------|---------|----------------|
| Single verse | John 3:16 | ✓ Parse correctly |
| Verse range | John 3:16-18 | ✓ Identify range |
| Verse list | Romans 8:1,5,9 | ✓ Parse 3 refs |
| Multiple books | John 3:16; Romans 8:28 | ✓ Parse both |
| Numbered books | 1 Corinthians 13:4 | ✓ Normalize |
| Chapter only | Psalm 23 | ✓ Chapter ref |

## Troubleshooting

### No Semantic Search Results

**Problem:** Paraphrase tests return no results

**Solutions:**
1. Check OpenAI API key is configured:
   ```bash
   echo $OPENAI_API_KEY
   ```
2. Ensure embeddings are generated:
   ```bash
   npm run embeddings:generate
   ```
3. Verify vector database is accessible

### Parsing Failures

**Problem:** Reference parsing tests fail

**Solutions:**
1. Check scripture parser service is loaded
2. Verify book name mappings are correct
3. Review test input for typos

### API Fetching Errors

**Problem:** API.Bible requests fail

**Solutions:**
1. Verify API.Bible key is configured
2. Check rate limits (100 requests/minute)
3. Ensure internet connectivity
4. Review API error messages

### Rate Limiting

**Problem:** Tests fail due to rate limits

**Solutions:**
1. Add delays between API calls
2. Use caching for repeated tests
3. Run tests with smaller subsets
4. Check API quota usage

## Expected Results

### Paraphrase Detection
- **Expected Success Rate**: 80-90%
- **Common Issues**: 
  - Low confidence matches (<60%)
  - Alternative valid references
  - Context-dependent matches

### Reference Parsing
- **Expected Success Rate**: 95-100%
- **Common Issues**:
  - Unusual book name variations
  - Complex multi-reference formats
  - Edge case formatting

### API Fetching
- **Expected Success Rate**: 95-100%
- **Common Issues**:
  - Rate limiting
  - Network timeouts
  - Invalid reference formats

## Adding New Tests

### Create New Test File

```javascript
// tests/my-new-test.js
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
}

async function runMyTests() {
  console.log(colors.blue + '🧪 My Test Suite' + colors.reset)
  
  let passed = 0
  let failed = 0
  
  try {
    // Your test logic here
    console.log(colors.green + '✓ Test passed' + colors.reset)
    passed++
  } catch (error) {
    console.log(colors.red + '✗ Test failed' + colors.reset)
    failed++
  }
  
  console.log(`\nPassed: ${passed}, Failed: ${failed}`)
}

if (require.main === module) {
  runMyTests()
}

module.exports = { runMyTests }
```

### Add to Test Runner

Edit `tests/run-all-tests.js`:
```javascript
const myTests = require('./my-new-test')
await myTests.runMyTests()
```

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install
      - run: npm test
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
          BIBLE_API_KEY: ${{ secrets.BIBLE_API_KEY }}
```

## Performance Benchmarks

### Test Execution Times

- Parsing Tests: ~2-5 seconds
- Extraction Tests: ~3-8 seconds
- API Fetching Tests: ~5-10 seconds
- Paraphrase Tests: ~10-30 seconds
- Comprehensive Tests: ~15-45 seconds
- **Total Suite**: ~35-100 seconds

Times vary based on:
- API response times
- Network latency
- System performance
- Cache hit rates

## Best Practices

1. **Run tests regularly** - After code changes
2. **Check all suites** - Don't skip tests
3. **Review warnings** - Investigate low confidence matches
4. **Keep API keys secure** - Never commit to repo
5. **Monitor rate limits** - Respect API quotas
6. **Update test cases** - Add new scenarios
7. **Document failures** - Track recurring issues

## Support

For issues or questions:
1. Check this README
2. Review test output carefully
3. Verify prerequisites are met
4. Check API service status
5. Review main documentation

## Contributing

When adding tests:
1. Follow existing patterns
2. Include descriptive names
3. Add documentation
4. Test edge cases
5. Update this README

---

**Happy Testing!** 🧪✨



