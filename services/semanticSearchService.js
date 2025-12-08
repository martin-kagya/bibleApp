const { vectorDbService } = require('./vectorDbService')
const { themeExtractionService } = require('./themeExtractionService')

const MAX_SUGGESTIONS = 10
const CONFIDENCE_THRESHOLD = 0.3

/**
 * Semantic Search Service
 * Combines vector similarity search with theme-based recommendations
 */
class SemanticSearchService {
  constructor() {
    this.sessionContext = new Map() // Track context for each session
    this.localCache = new Map() // Simple in-memory cache
  }

  /**
   * Search for scriptures based on semantic meaning
   */
  async searchByMeaning(query, options = {}) {
    const {
      topK = MAX_SUGGESTIONS,
      minConfidence = CONFIDENCE_THRESHOLD,
      includeThemes = true,
      sessionId = null
    } = options

    // Check memory cache
    const cacheKey = `semantic:${query}:${topK}`
    if (this.localCache.has(cacheKey)) {
      return this.localCache.get(cacheKey)
    }

    try {
      console.log(`🔍 Semantic search for: "${query}"`)

      // Get vector similarity results
      const vectorResults = await vectorDbService.searchSimilarVerses(
        query,
        topK * 2,
        options.priority || 'BOTH'
      )

      // Calculate confidence and filter
      const filtered = vectorResults
        .filter(r => r.confidence >= minConfidence)
        .slice(0, topK)

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
}

const semanticSearchService = new SemanticSearchService()
module.exports = { semanticSearchService, SemanticSearchService }



