const { vectorDbService } = require('./vectorDbService')
const { themeExtractionService } = require('./themeExtractionService')

const MAX_SUGGESTIONS = 10
const CONFIDENCE_THRESHOLD = 0.3

/**
 * Semantic Search Service
 * Combines vector similarity search with theme-based recommendations
 * Now supports two-stage RAG with reranking
 */
class SemanticSearchService {
  constructor() {
    this.sessionContext = new Map() // Track context for each session
    this.localCache = new Map() // Simple in-memory cache
  }

  /**
   * Search for scriptures based on semantic meaning
   * Now supports two-stage search with reranking by default
   */
  async searchByMeaning(query, options = {}) {
    const {
      topK = MAX_SUGGESTIONS,
      minConfidence = CONFIDENCE_THRESHOLD,
      includeThemes = true,
      sessionId = null,
      algorithm = 'hybrid', // 'standard', 'ensemble', 'two-stage', or 'hybrid'
      modelId = 'bge-base', // embedding model
      useTwoStage = true, // Enable two-stage by default
      rerankerModel = 'bge-reranker-base'
    } = options

    // Check memory cache
    const cacheKey = `semantic:${query}:${topK}:${algorithm}:${modelId}`
    if (this.localCache.has(cacheKey)) {
      return this.localCache.get(cacheKey)
    }

    try {
      console.log(`🔍 Semantic search for: "${query}" [${algorithm}]`)

      let vectorResults = []

      if (algorithm === 'two-stage' && useTwoStage) {
        // Two-Stage Search with Reranking
        vectorResults = await vectorDbService.searchTwoStage(query, {
          embeddingModel: modelId,
          rerankerModel,
          retrievalK: Math.min(topK * 5, 100),
          finalK: topK,
          useReranker: true,
          priority: options.priority || 'BOTH'
        })
      } else if (algorithm === 'ensemble') {
        // Use Ensemble Search (RRF)
        vectorResults = await vectorDbService.searchEnsemble(
          query,
          topK * 2, // Fetch more for filtering
          options.priority || 'BOTH'
        )
      } else if (algorithm === 'hybrid') {
        // Use Hybrid Search (Vector + FTS + RRF + Reranking)
        vectorResults = await vectorDbService.searchHybrid(query, {
          topK,
          vectorK: topK * 5,
          keywordK: topK * 5,
          rerankerModel: options.rerankerModel || 'bge-reranker-base',
          useReranker: options.useReranker !== false,
          useHotfixes: options.useHotfixes || false, // Explicitly pass hotfixes option
          priority: options.priority || 'BOTH'
        })
      } else {
        // Standard Single-Model Search
        vectorResults = await vectorDbService.searchSimilarVerses(
          query,
          topK * 2,
          options.priority || 'BOTH',
          modelId
        )
      }

      // Calculate confidence and filter with Adaptive Threshold
      // 1. First Pass: Strict Filter (High Confidence)
      let filtered = vectorResults.filter(r => {
        const finalScore = r.rerankerScore !== undefined ? r.rerankerScore : (r.confidence !== undefined ? r.confidence : r.score);
        return finalScore >= minConfidence;
      });

      // 2. Second Pass: Rescue Mode (Safety Floor) if no strict matches found
      if (filtered.length === 0) {
        console.log(`⚠️ No results found above ${minConfidence}. Attempting rescue with safety floor 0.05...`);
        filtered = vectorResults.filter(r => {
          const finalScore = r.rerankerScore !== undefined ? r.rerankerScore : (r.confidence !== undefined ? r.confidence : r.score);
          return finalScore >= 0.05;
        });
      }

      filtered = filtered.slice(0, topK);

      // 📊 DETAILED LOGGING: Show all results with rankings and scores
      console.log(`\n📊 Search Results for "${query}" (${algorithm} mode):`);
      console.log(`   Total candidates: ${vectorResults.length}, Filtered: ${filtered.length}`);
      console.log(`   Threshold: ${minConfidence}\n`);

      // If no filtered results, show all candidates to help debug
      const resultsToShow = filtered.length > 0 ? filtered : vectorResults.slice(0, topK);
      const showingAll = filtered.length === 0 && vectorResults.length > 0;

      if (resultsToShow.length > 0) {
        if (showingAll) {
          console.log('   ⚠️  No results passed threshold - showing top candidates for debugging:\n');
        }
        console.log('   Rank | Reference          | Score    | Type       | Text Preview');
        console.log('   -----|-------------------|----------|------------|------------------');
        resultsToShow.forEach((result, index) => {
          const finalScore = result.rerankerScore !== undefined ? result.rerankerScore :
            (result.confidence !== undefined ? result.confidence : result.score);
          const scoreType = result.rerankerScore !== undefined ? 'Reranker' :
            (result.confidence !== undefined ? 'Confidence' : 'Raw Score');
          const preview = (result.text || '').substring(0, 40).replace(/\n/g, ' ');
          const passedThreshold = finalScore >= minConfidence ? '✓' : '✗';
          console.log(`   ${passedThreshold} ${String(index + 1).padStart(2)} | ${(result.reference || 'N/A').padEnd(17)} | ${finalScore.toFixed(4)} | ${scoreType.padEnd(10)} | ${preview}...`);
        });
        console.log('');
      } else {
        console.log('   ❌ No results found at all\n');
      }

      // Cache results
      this.localCache.set(cacheKey, filtered)

      // Clear cache if too big
      if (this.localCache.size > 1000) this.localCache.clear()

      return filtered
    } catch (error) {
      console.error('Semantic search error:', error)
      return []
    }
  }

  /**
   * Find verses that match a paraphrased quote
   */
  async findParaphrasedScripture(paraphrase, options = {}) {
    return this.searchByMeaning(paraphrase, {
      ...options,
      topK: 5,
      minConfidence: 0.35
    })
  }

  async getSuggestionsByThemes(themes, options = {}) {
    const { topK = MAX_SUGGESTIONS, excludeReferences = [] } = options
    const allSuggestions = []

    for (const theme of themes.slice(0, 5)) {
      const query = typeof theme === 'string' ? theme : theme.theme
      try {
        const results = await vectorDbService.searchSimilarVerses(query, 3)
        results.forEach(result => {
          if (!excludeReferences.includes(result.reference)) {
            allSuggestions.push({
              ...result,
              theme: query
            })
          }
        })
      } catch (error) { }
    }

    return this.deduplicateResults(allSuggestions).slice(0, topK)
  }

  async getCrossReferences(reference, verseText, topK = 5) {
    const results = await vectorDbService.searchSimilarVerses(verseText, topK + 1)
    return results.filter(r => r.reference !== reference).slice(0, topK)
  }

  deduplicateResults(results) {
    const seen = new Set()
    return results.filter(result => {
      if (seen.has(result.reference)) return false
      seen.add(result.reference)
      return true
    })
  }

  // Session context stubs
  updateSessionContext(sid, query, results) { }
  getSessionContext(sid) { return null }
  clearSession(sid) { }

  isServiceAvailable() {
    return vectorDbService.isServiceAvailable()
  }

  /**
   * Get available search configuration
   */
  getConfig() {
    return vectorDbService.getModelsConfig();
  }
}

const semanticSearchService = new SemanticSearchService()
module.exports = { semanticSearchService, SemanticSearchService }
