/**
 * Scripture Reference Parsing Tests
 * 
 * Tests the scripture parser's ability to handle various
 * reference formats including ranges, lists, and complex combinations.
 */

const { scriptureParser } = require('../services/scriptureParser')
const { bibleApiService } = require('../services/bibleApiService.enhanced')

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
}

/**
 * Test cases for reference parsing
 */
const parsingTestCases = [
  // Single verse references
  {
    name: 'Simple Single Verse',
    input: 'John 3:16',
    expected: {
      book: 'John',
      chapter: 3,
      verseStart: 16,
      type: 'single'
    }
  },
  {
    name: 'Chapter Only',
    input: 'Psalm 23',
    expected: {
      book: 'Psalm',
      chapter: 23,
      type: 'chapter'
    }
  },
  // Range references
  {
    name: 'Verse Range',
    input: 'John 3:16-18',
    expected: {
      book: 'John',
      chapter: 3,
      verseStart: 16,
      verseEnd: 18,
      type: 'range'
    }
  },
  {
    name: 'Long Range',
    input: 'Romans 8:28-39',
    expected: {
      book: 'Romans',
      chapter: 8,
      verseStart: 28,
      verseEnd: 39,
      type: 'range'
    }
  },
  // Multiple verses (list)
  {
    name: 'Verse List',
    input: 'Romans 8:1,5,9',
    expectedCount: 3,
    expectedBook: 'Romans',
    expectedChapter: 8
  },
  {
    name: 'Mixed List and Range',
    input: 'Romans 8:1-3,5-7,9',
    expectedCount: 3, // Three separate references
    expectedBook: 'Romans'
  },
  // Numbered books
  {
    name: 'First Corinthians',
    input: 'First Corinthians 13:4',
    expected: {
      book: '1 Corinthians',
      chapter: 13,
      verseStart: 4
    }
  },
  {
    name: 'Second Peter',
    input: '2 Peter 3:9',
    expected: {
      book: '2 Peter',
      chapter: 3,
      verseStart: 9
    }
  },
  {
    name: '1st John',
    input: '1st John 4:4',
    expected: {
      book: '1 John',
      chapter: 4,
      verseStart: 4
    }
  },
  // Complex combinations
  {
    name: 'Multiple Books (Semicolon)',
    input: 'John 3:16; Romans 8:28',
    expectedCount: 2,
    expectedBooks: ['John', 'Romans']
  },
  {
    name: 'Complex Multi-Reference',
    input: 'John 3:16-18; Romans 8:1,5; Psalm 23',
    expectedCount: 4, // John range + 2 Romans + Psalm chapter
    expectedBooks: ['John', 'Romans', 'Psalm']
  },
  // Book name variations
  {
    name: 'Abbreviated Book',
    input: 'Rom 8:28',
    expected: {
      book: 'Romans',
      chapter: 8,
      verseStart: 28
    }
  },
  {
    name: 'Song of Songs',
    input: 'Song of Songs 2:4',
    expected: {
      book: 'Song Of Songs',
      chapter: 2,
      verseStart: 4
    }
  },
  // Edge cases
  {
    name: 'Extra Whitespace',
    input: '  John   3 : 16  ',
    expected: {
      book: 'John',
      chapter: 3,
      verseStart: 16
    }
  },
  {
    name: 'Single Chapter Book',
    input: 'Philemon 1:4',
    expected: {
      book: 'Philemon',
      chapter: 1,
      verseStart: 4
    }
  }
]

/**
 * Test cases for reference extraction from text
 */
const extractionTestCases = [
  {
    name: 'Single Reference in Sentence',
    input: 'Today we will study John 3:16 about God\'s love.',
    expectedCount: 1,
    expectedReferences: ['John 3:16']
  },
  {
    name: 'Multiple References',
    input: 'Read John 3:16 and Romans 8:28 for encouragement.',
    expectedCount: 2,
    expectedReferences: ['John 3:16', 'Romans 8:28']
  },
  {
    name: 'Mixed Formats',
    input: 'Let\'s look at First Corinthians 13:4-7 and also Philippians 4:13.',
    expectedCount: 2
  },
  {
    name: 'Natural Speech',
    input: 'As it says in John chapter 3 verse 16, God loves us.',
    expectedCount: 1
  },
  {
    name: 'Sermon Excerpt',
    input: `The Bible tells us in Romans 8:28 that all things work together for good.
            This reminds me of what James 1:2-4 says about trials and perseverance.
            And don't forget Philippians 4:13!`,
    expectedCount: 3
  }
]

/**
 * Run parsing tests
 */
async function runParsingTests() {
  console.log('\n' + '='.repeat(70))
  console.log(colors.blue + '🔍 SCRIPTURE REFERENCE PARSING TESTS' + colors.reset)
  console.log('='.repeat(70) + '\n')

  let passed = 0
  let failed = 0

  for (const testCase of parsingTestCases) {
    console.log(colors.blue + `\n🧪 Test: ${testCase.name}` + colors.reset)
    console.log(`   Input: "${testCase.input}"`)

    try {
      const results = scriptureParser.parse(testCase.input)

      if (testCase.expectedCount !== undefined) {
        // Test for count
        if (results.length === testCase.expectedCount) {
          console.log(colors.green + `   ✓ Parsed ${results.length} references` + colors.reset)
          
          // Check books if specified
          if (testCase.expectedBooks) {
            const books = results.map(r => r.book)
            const allFound = testCase.expectedBooks.every(book => 
              books.some(b => b.includes(book))
            )
            if (allFound) {
              console.log(colors.green + `   ✓ All expected books found` + colors.reset)
              passed++
            } else {
              console.log(colors.red + `   ✗ Missing expected books` + colors.reset)
              failed++
            }
          } else {
            passed++
          }
        } else {
          console.log(colors.red + `   ✗ Expected ${testCase.expectedCount} references, got ${results.length}` + colors.reset)
          failed++
        }
      } else if (testCase.expected) {
        // Test for specific structure
        const result = results[0]
        let allMatch = true

        if (testCase.expected.book && !result.book.includes(testCase.expected.book)) {
          console.log(colors.red + `   ✗ Book mismatch: expected ${testCase.expected.book}, got ${result.book}` + colors.reset)
          allMatch = false
        }
        if (testCase.expected.chapter && result.chapter !== testCase.expected.chapter) {
          console.log(colors.red + `   ✗ Chapter mismatch: expected ${testCase.expected.chapter}, got ${result.chapter}` + colors.reset)
          allMatch = false
        }
        if (testCase.expected.verseStart && result.verseStart !== testCase.expected.verseStart) {
          console.log(colors.red + `   ✗ Verse mismatch: expected ${testCase.expected.verseStart}, got ${result.verseStart}` + colors.reset)
          allMatch = false
        }
        if (testCase.expected.type && result.type !== testCase.expected.type) {
          console.log(colors.red + `   ✗ Type mismatch: expected ${testCase.expected.type}, got ${result.type}` + colors.reset)
          allMatch = false
        }

        if (allMatch) {
          console.log(colors.green + `   ✓ Parsed correctly: ${result.reference}` + colors.reset)
          console.log(`      Book: ${result.book}, Chapter: ${result.chapter}, Type: ${result.type}`)
          passed++
        } else {
          failed++
        }
      }

    } catch (error) {
      console.log(colors.red + `   ✗ Parsing failed: ${error.message}` + colors.reset)
      failed++
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(70))
  console.log(colors.blue + '📊 PARSING TEST SUMMARY' + colors.reset)
  console.log('='.repeat(70))
  console.log(`${colors.green}✓ Passed: ${passed}${colors.reset}`)
  console.log(`${colors.red}✗ Failed: ${failed}${colors.reset}`)
  console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`)
  console.log('\n')
}

/**
 * Run extraction tests
 */
async function runExtractionTests() {
  console.log('\n' + '='.repeat(70))
  console.log(colors.blue + '📝 REFERENCE EXTRACTION TESTS' + colors.reset)
  console.log('='.repeat(70) + '\n')

  let passed = 0
  let failed = 0

  for (const testCase of extractionTestCases) {
    console.log(colors.blue + `\n🧪 Test: ${testCase.name}` + colors.reset)
    console.log(`   Input: "${testCase.input.substring(0, 60)}${testCase.input.length > 60 ? '...' : ''}"`)

    try {
      const references = scriptureParser.extractReferences(testCase.input)

      if (references.length === testCase.expectedCount) {
        console.log(colors.green + `   ✓ Found ${references.length} references` + colors.reset)
        references.forEach((ref, idx) => {
          console.log(`      ${idx + 1}. ${ref}`)
        })
        
        // Check specific references if provided
        if (testCase.expectedReferences) {
          const allFound = testCase.expectedReferences.every(expected =>
            references.some(ref => ref.includes(expected.split(':')[0]))
          )
          if (allFound) {
            passed++
          } else {
            console.log(colors.yellow + '   ⚠️  Some expected references not found' + colors.reset)
            failed++
          }
        } else {
          passed++
        }
      } else {
        console.log(colors.red + `   ✗ Expected ${testCase.expectedCount} references, found ${references.length}` + colors.reset)
        if (references.length > 0) {
          console.log('   Found:', references.join(', '))
        }
        failed++
      }

    } catch (error) {
      console.log(colors.red + `   ✗ Extraction failed: ${error.message}` + colors.reset)
      failed++
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(70))
  console.log(colors.blue + '📊 EXTRACTION TEST SUMMARY' + colors.reset)
  console.log('='.repeat(70))
  console.log(`${colors.green}✓ Passed: ${passed}${colors.reset}`)
  console.log(`${colors.red}✗ Failed: ${failed}${colors.reset}`)
  console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`)
  console.log('\n')
}

/**
 * Test API fetching with parsed references
 */
async function testApiFetching() {
  console.log('\n' + '='.repeat(70))
  console.log(colors.blue + '🌐 API FETCHING WITH PARSED REFERENCES' + colors.reset)
  console.log('='.repeat(70) + '\n')

  if (!bibleApiService.apiAvailable) {
    console.log(colors.yellow + '⚠️  API.Bible key not configured, skipping API tests' + colors.reset)
    return
  }

  const testReferences = [
    'John 3:16',
    'Romans 8:28-30',
    'Psalm 23',
    '1 Corinthians 13:4-7'
  ]

  let passed = 0
  let failed = 0

  for (const reference of testReferences) {
    console.log(colors.blue + `\n📖 Fetching: ${reference}` + colors.reset)

    try {
      const verse = await bibleApiService.getVerse(reference)
      
      if (verse && verse.text) {
        console.log(colors.green + `   ✓ Successfully fetched` + colors.reset)
        console.log(`   Text: "${verse.text.substring(0, 80)}${verse.text.length > 80 ? '...' : ''}"`)
        console.log(`   Book: ${verse.bookCode}, Chapter: ${verse.chapter}`)
        passed++
      } else {
        console.log(colors.red + '   ✗ No text returned' + colors.reset)
        failed++
      }

    } catch (error) {
      console.log(colors.red + `   ✗ Error: ${error.message}` + colors.reset)
      failed++
    }

    // Small delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, 200))
  }

  // Print summary
  console.log('\n' + '='.repeat(70))
  console.log(colors.blue + '📊 API FETCHING SUMMARY' + colors.reset)
  console.log('='.repeat(70))
  console.log(`${colors.green}✓ Passed: ${passed}${colors.reset}`)
  console.log(`${colors.red}✗ Failed: ${failed}${colors.reset}`)
  console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`)
  console.log('\n')
}

// Main execution
async function main() {
  console.log('\n' + colors.blue + '╔════════════════════════════════════════════════════════════╗')
  console.log('║                                                            ║')
  console.log('║   🔍 Scripture Reference Parsing & Search Tests           ║')
  console.log('║                                                            ║')
  console.log('╚════════════════════════════════════════════════════════════╝' + colors.reset)

  try {
    // Run parsing tests
    await runParsingTests()

    // Run extraction tests
    await runExtractionTests()

    // Test API fetching
    await testApiFetching()

    console.log(colors.green + '✅ All test suites completed!\n' + colors.reset)

  } catch (error) {
    console.error(colors.red + '\n❌ Fatal error:', error.message + colors.reset)
    console.error(error)
    process.exit(1)
  }

  process.exit(0)
}

// Run if executed directly
if (require.main === module) {
  main()
}

module.exports = {
  runParsingTests,
  runExtractionTests,
  testApiFetching,
  parsingTestCases,
  extractionTestCases
}



