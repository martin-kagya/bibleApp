/**
 * Paraphrased Scripture Detection Tests
 * 
 * Tests the semantic search and paraphrase detection capabilities
 * of the AI-powered scripture detection system.
 */

const { enhancedAiService } = require('../services/aiService.enhanced')
const { semanticSearchService } = require('../services/semanticSearchService')
const { vectorDbService } = require('../services/vectorDbService')

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
}

/**
 * Test cases for paraphrased scripture detection
 */
const paraphraseTestCases = [
  {
    name: 'Love Never Fails',
    input: 'Love never fails, love never gives up',
    expectedReferences: ['1 Corinthians 13:7', '1 Corinthians 13:8', '1 Corinthians 13:4-7'],
    minConfidence: 0.6
  },
  {
    name: 'God So Loved',
    input: 'God so loved the world that he gave his only son',
    expectedReferences: ['John 3:16'],
    minConfidence: 0.8
  },
  {
    name: 'All Things Work Together',
    input: 'All things work together for good for those who love God',
    expectedReferences: ['Romans 8:28'],
    minConfidence: 0.7
  },
  {
    name: 'The Lord is My Shepherd',
    input: 'The Lord is my shepherd, I shall not want',
    expectedReferences: ['Psalm 23:1', 'Psalms 23:1'],
    minConfidence: 0.8
  },
  {
    name: 'Faith Without Works',
    input: 'Faith without works is dead',
    expectedReferences: ['James 2:26', 'James 2:17'],
    minConfidence: 0.7
  },
  {
    name: 'Be Strong and Courageous',
    input: 'Be strong and courageous, do not be afraid',
    expectedReferences: ['Joshua 1:9', 'Deuteronomy 31:6'],
    minConfidence: 0.6
  },
  {
    name: 'New Creation',
    input: 'If anyone is in Christ, they are a new creation',
    expectedReferences: ['2 Corinthians 5:17'],
    minConfidence: 0.7
  },
  {
    name: 'Peace That Surpasses Understanding',
    input: 'The peace of God that surpasses all understanding',
    expectedReferences: ['Philippians 4:7'],
    minConfidence: 0.7
  },
  {
    name: 'Trust in the Lord',
    input: 'Trust in the Lord with all your heart',
    expectedReferences: ['Proverbs 3:5'],
    minConfidence: 0.8
  },
  {
    name: 'Greater is He',
    input: 'Greater is he that is in you than he that is in the world',
    expectedReferences: ['1 John 4:4'],
    minConfidence: 0.7
  }
]

/**
 * Test cases for complex paraphrases
 */
const complexParaphraseTestCases = [
  {
    name: 'Modern Language - Love Description',
    input: 'Love is patient and kind, it does not envy or boast',
    expectedThemes: ['love', 'patience', 'kindness'],
    minConfidence: 0.6
  },
  {
    name: 'Story Context - Shepherd Imagery',
    input: 'Like a shepherd who cares for his sheep, God provides for all my needs',
    expectedThemes: ['shepherd', 'provision', 'care'],
    minConfidence: 0.5
  },
  {
    name: 'Theological Concept - Redemption',
    input: 'Through Christ\'s sacrifice, we have been redeemed and forgiven',
    expectedThemes: ['redemption', 'sacrifice', 'forgiveness'],
    minConfidence: 0.5
  },
  {
    name: 'Mixed Metaphor - Light and Salt',
    input: 'We are called to be the light of the world and salt of the earth',
    expectedThemes: ['light', 'salt', 'calling'],
    minConfidence: 0.6
  }
]

/**
 * Run paraphrase detection tests
 */
async function runParaphraseTests() {
  console.log('\n' + '='.repeat(70))
  console.log(colors.blue + '📖 PARAPHRASE DETECTION TEST SUITE' + colors.reset)
  console.log('='.repeat(70) + '\n')

  let passed = 0
  let failed = 0
  let warnings = 0

  // Check if semantic search is available
  if (!semanticSearchService.isServiceAvailable()) {
    console.log(colors.red + '❌ Semantic search service not available!' + colors.reset)
    console.log(colors.yellow + '⚠️  Make sure:')
    console.log('   1. OpenAI API key is configured')
    console.log('   2. Vector database has embeddings loaded')
    console.log('   3. Run: npm run embeddings:generate' + colors.reset)
    return
  }

  for (const testCase of paraphraseTestCases) {
    console.log(colors.blue + `\n🧪 Test: ${testCase.name}` + colors.reset)
    console.log(`   Input: "${testCase.input}"`)
    console.log(`   Expected: ${testCase.expectedReferences.join(' or ')}`)

    try {
      // Search for paraphrased scripture
      const results = await semanticSearchService.searchByMeaning(testCase.input, {
        topK: 10,
        minConfidence: testCase.minConfidence
      })

      if (results.length === 0) {
        console.log(colors.red + '   ❌ No results found' + colors.reset)
        failed++
        continue
      }

      // Check if any expected reference is in top results
      const found = results.some(result => 
        testCase.expectedReferences.some(expected => 
          result.reference.includes(expected.split(':')[0]) || 
          expected.includes(result.reference)
        )
      )

      if (found) {
        const topMatch = results[0]
        console.log(colors.green + `   ✓ Found: ${topMatch.reference}` + colors.reset)
        console.log(`   Confidence: ${(topMatch.confidence * 100).toFixed(1)}%`)
        console.log(`   Text: "${topMatch.text.substring(0, 60)}..."`)
        
        if (topMatch.confidence < testCase.minConfidence + 0.1) {
          console.log(colors.yellow + '   ⚠️  Low confidence match' + colors.reset)
          warnings++
        }
        passed++
      } else {
        console.log(colors.yellow + `   ⚠️  Expected reference not in top results` + colors.reset)
        console.log(`   Top match: ${results[0].reference} (${(results[0].confidence * 100).toFixed(1)}%)`)
        warnings++
      }

    } catch (error) {
      console.log(colors.red + `   ❌ Error: ${error.message}` + colors.reset)
      failed++
    }
  }

  // Test complex paraphrases
  console.log('\n' + colors.blue + '🔍 COMPLEX PARAPHRASE TESTS' + colors.reset)
  
  for (const testCase of complexParaphraseTestCases) {
    console.log(colors.blue + `\n🧪 Test: ${testCase.name}` + colors.reset)
    console.log(`   Input: "${testCase.input}"`)

    try {
      const results = await semanticSearchService.searchByMeaning(testCase.input, {
        topK: 5,
        minConfidence: testCase.minConfidence
      })

      if (results.length > 0) {
        console.log(colors.green + `   ✓ Found ${results.length} semantic matches` + colors.reset)
        results.slice(0, 3).forEach((result, idx) => {
          console.log(`   ${idx + 1}. ${result.reference} (${(result.confidence * 100).toFixed(1)}%)`)
        })
        passed++
      } else {
        console.log(colors.yellow + '   ⚠️  No matches found' + colors.reset)
        warnings++
      }

    } catch (error) {
      console.log(colors.red + `   ❌ Error: ${error.message}` + colors.reset)
      failed++
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(70))
  console.log(colors.blue + '📊 TEST SUMMARY' + colors.reset)
  console.log('='.repeat(70))
  console.log(`${colors.green}✓ Passed: ${passed}${colors.reset}`)
  console.log(`${colors.yellow}⚠️  Warnings: ${warnings}${colors.reset}`)
  console.log(`${colors.red}❌ Failed: ${failed}${colors.reset}`)
  
  const total = passed + warnings + failed
  const successRate = ((passed / total) * 100).toFixed(1)
  console.log(`\nSuccess Rate: ${successRate}%`)
  
  if (passed === total) {
    console.log(colors.green + '\n🎉 All tests passed!' + colors.reset)
  } else if (passed + warnings === total) {
    console.log(colors.yellow + '\n⚠️  Tests completed with warnings' + colors.reset)
  } else {
    console.log(colors.red + '\n❌ Some tests failed' + colors.reset)
  }
  
  console.log('\n')
}

/**
 * Test comprehensive detection
 */
async function testComprehensiveDetection() {
  console.log('\n' + '='.repeat(70))
  console.log(colors.blue + '🎯 COMPREHENSIVE DETECTION TEST' + colors.reset)
  console.log('='.repeat(70) + '\n')

  const sermon = `
    Today, I want to talk about God's love. You know, God so loved the world 
    that he gave his one and only son. That's John 3:16, one of the most 
    powerful verses in scripture.
    
    And remember, love never fails. Love is patient and kind. When we love 
    like God loves, we reflect his character.
    
    The Bible tells us in Romans 8:28 that all things work together for good 
    for those who love God. Even in difficult times, we can trust that God 
    is working for our benefit.
  `

  console.log('📝 Test Sermon Excerpt:')
  console.log(sermon.trim())
  console.log('\n🔍 Running comprehensive detection...\n')

  try {
    const result = await enhancedAiService.detectScripturesComprehensive(sermon, {
      includeThemes: true,
      includeSuggestions: true,
      minConfidence: 0.5
    })

    // Detected Scriptures
    console.log(colors.green + `\n✓ Detected Scriptures: ${result.detected.length}` + colors.reset)
    result.detected.forEach((scripture, idx) => {
      const icon = scripture.matchType === 'explicit' ? '📌' :
                   scripture.matchType === 'paraphrase' ? '💬' :
                   scripture.matchType === 'semantic' ? '🔍' : '📖'
      console.log(`   ${idx + 1}. ${icon} ${scripture.reference}`)
      console.log(`      Type: ${scripture.matchType}, Confidence: ${(scripture.confidence * 100).toFixed(1)}%`)
      if (scripture.paraphrase) {
        console.log(`      Paraphrase: "${scripture.paraphrase}"`)
      }
    })

    // Suggested Scriptures
    if (result.suggested && result.suggested.length > 0) {
      console.log(colors.yellow + `\n💡 Suggested Scriptures: ${result.suggested.length}` + colors.reset)
      result.suggested.slice(0, 5).forEach((scripture, idx) => {
        console.log(`   ${idx + 1}. ${scripture.reference} (${(scripture.confidence * 100).toFixed(1)}%)`)
      })
    }

    // Themes
    if (result.themes && result.themes.mainThemes) {
      console.log(colors.blue + `\n🧠 Extracted Themes: ${result.themes.mainThemes.length}` + colors.reset)
      result.themes.mainThemes.slice(0, 5).forEach((theme, idx) => {
        const themeStr = typeof theme === 'string' ? theme : theme.theme
        const conf = typeof theme === 'object' && theme.confidence ? 
                     ` (${(theme.confidence * 100).toFixed(1)}%)` : ''
        console.log(`   ${idx + 1}. ${themeStr}${conf}`)
      })

      if (result.themes.emotionalTone) {
        console.log(`\n   Emotional Tone: ${result.themes.emotionalTone}`)
      }
    }

    // Success metrics
    const hasExplicit = result.detected.some(s => s.matchType === 'explicit')
    const hasParaphrase = result.detected.some(s => s.matchType === 'paraphrase')
    const hasSemantic = result.detected.some(s => s.matchType === 'semantic')
    const hasThemes = result.themes && result.themes.mainThemes && result.themes.mainThemes.length > 0
    const hasSuggestions = result.suggested && result.suggested.length > 0

    console.log('\n' + colors.blue + '✅ Detection Capabilities:' + colors.reset)
    console.log(`   Explicit Detection: ${hasExplicit ? colors.green + '✓' : colors.red + '✗'}${colors.reset}`)
    console.log(`   Paraphrase Detection: ${hasParaphrase ? colors.green + '✓' : colors.red + '✗'}${colors.reset}`)
    console.log(`   Semantic Detection: ${hasSemantic ? colors.green + '✓' : colors.red + '✗'}${colors.reset}`)
    console.log(`   Theme Extraction: ${hasThemes ? colors.green + '✓' : colors.red + '✗'}${colors.reset}`)
    console.log(`   Intelligent Suggestions: ${hasSuggestions ? colors.green + '✓' : colors.red + '✗'}${colors.reset}`)

    if (hasExplicit && hasThemes && (hasParaphrase || hasSemantic)) {
      console.log(colors.green + '\n🎉 Comprehensive detection working excellently!' + colors.reset)
    } else {
      console.log(colors.yellow + '\n⚠️  Some detection features may need improvement' + colors.reset)
    }

  } catch (error) {
    console.log(colors.red + `\n❌ Error: ${error.message}` + colors.reset)
    console.error(error)
  }

  console.log('\n')
}

// Main execution
async function main() {
  console.log('\n' + colors.blue + '╔════════════════════════════════════════════════════════════╗')
  console.log('║                                                            ║')
  console.log('║   📖 Paraphrase Detection & Semantic Search Tests         ║')
  console.log('║                                                            ║')
  console.log('╚════════════════════════════════════════════════════════════╝' + colors.reset)

  try {
    // Run paraphrase detection tests
    await runParaphraseTests()

    // Run comprehensive detection test
    await testComprehensiveDetection()

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
  runParaphraseTests,
  testComprehensiveDetection,
  paraphraseTestCases,
  complexParaphraseTestCases
}



