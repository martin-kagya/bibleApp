/**
 * Run All Tests Suite
 * 
 * Comprehensive test runner for all test suites
 */

require('dotenv').config()

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m'
}

async function runAllTests() {
  console.log('\n' + colors.magenta + '╔════════════════════════════════════════════════════════════╗')
  console.log('║                                                            ║')
  console.log('║   🧪 BIBLE PRESENTATION APP - COMPREHENSIVE TEST SUITE    ║')
  console.log('║                                                            ║')
  console.log('╚════════════════════════════════════════════════════════════╝' + colors.reset + '\n')

  const startTime = Date.now()

  try {
    // Test 1: Reference Parsing & Searching
    console.log(colors.cyan + '═══════════════════════════════════════════════════════════════')
    console.log('  TEST SUITE 1: Reference Parsing & Searching')
    console.log('═══════════════════════════════════════════════════════════════' + colors.reset)
    
    const referenceTests = require('./reference-parsing.test')
    await referenceTests.runParsingTests()
    await referenceTests.runExtractionTests()
    await referenceTests.testApiFetching()

    // Test 2: Paraphrase Detection
    console.log('\n' + colors.cyan + '═══════════════════════════════════════════════════════════════')
    console.log('  TEST SUITE 2: Paraphrase Detection & Semantic Search')
    console.log('═══════════════════════════════════════════════════════════════' + colors.reset)
    
    const paraphraseTests = require('./paraphrase-detection.test')
    await paraphraseTests.runParaphraseTests()
    await paraphraseTests.testComprehensiveDetection()

    // Final Summary
    const endTime = Date.now()
    const duration = ((endTime - startTime) / 1000).toFixed(2)

    console.log('\n' + colors.magenta + '╔════════════════════════════════════════════════════════════╗')
    console.log('║                                                            ║')
    console.log('║   🎉 ALL TESTS COMPLETED                                  ║')
    console.log('║                                                            ║')
    console.log('╚════════════════════════════════════════════════════════════╝' + colors.reset)
    
    console.log(`\n${colors.blue}⏱️  Total Execution Time: ${duration}s${colors.reset}`)
    console.log(`\n${colors.green}✅ Test suites executed successfully!${colors.reset}\n`)

    // Recommendations
    console.log(colors.yellow + '📋 Next Steps:' + colors.reset)
    console.log('   1. Review any warnings or failed tests')
    console.log('   2. Ensure embeddings are generated: npm run embeddings:generate')
    console.log('   3. Check API keys are properly configured')
    console.log('   4. Run tests periodically to ensure system health')
    console.log('')

  } catch (error) {
    console.error(colors.red + '\n❌ Test suite failed:', error.message + colors.reset)
    console.error(error)
    process.exit(1)
  }

  process.exit(0)
}

// Run all tests
runAllTests()



