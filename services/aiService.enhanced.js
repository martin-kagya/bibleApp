/**
 * Enhanced AI Service
 * Combines all offline AI capabilities:
 * - Transformers.js (Whisper) for speech-to-text
 * - Rule-based theme extraction
 * - Transformers.js + Cosine Sim for semantic search
 * - Local SQLite for Bible text
 */

const { whisperService } = require('./whisperService')
const { themeExtractionService } = require('./themeExtractionService')
const { semanticSearchService } = require('./semanticSearchService')
const { scriptureParser } = require('./scriptureParser')
const { localBibleService } = require('./localBibleService')

class EnhancedAiService {
  constructor() {
    this.activeSessions = new Map()
  }

  async detectScripturesComprehensive(transcript, options = {}) {
    const {
      sessionId = null,
      includeThemes = true,
      includeSuggestions = true,
      minConfidence = 0.5
    } = options

    console.log('🔍 Starting comprehensive scripture detection...')

    try {
      // 1. Extract explicit references
      const explicitRefs = this.extractExplicitReferences(transcript)

      // 2. Extract themes
      let themes = null
      if (includeThemes) {
        themes = await themeExtractionService.extractThemes(transcript, { sessionId })
      }

      // 3. Semantic search (paraphrase)
      // Note: This calls vectorDbService underneath
      const semanticMatches = await semanticSearchService.findParaphrasedScripture(
        transcript,
        { sessionId, minConfidence }
      )

      // 4. Enrich references with text from Local DB
      const allDetected = await this.enrichReferences([
        ...explicitRefs,
        ...semanticMatches
      ])

      const result = {
        detected: this.deduplicateReferences(allDetected),
        suggested: [], // Implement advanced suggestions later if needed
        themes: themes || {},
        sessionId,
        timestamp: Date.now()
      }

      return result
    } catch (error) {
      console.error('❌ Detection error:', error)
      return { detected: [], suggested: [], themes: {}, error: error.message }
    }
  }

  extractExplicitReferences(text) {
    const references = scriptureParser.extractReferences(text)
    return references.map(ref => {
      try {
        const parsed = scriptureParser.parse(ref)[0]
        return {
          reference: parsed.reference,
          normalized: parsed.normalized,
          book: parsed.book,
          chapter: parsed.chapter,
          verses: parsed.verses,
          confidence: 0.95,
          type: 'explicit',
          matchType: 'explicit'
        }
      } catch (error) {
        return null
      }
    }).filter(Boolean)
  }

  async enrichReferences(references) {
    const enriched = []
    for (const ref of references) {
      if (ref.text) {
        enriched.push(ref)
        continue
      }
      try {
        const verse = await localBibleService.getVerse(ref.reference)
        enriched.push({ ...ref, text: verse.text })
      } catch (error) {
        enriched.push(ref)
      }
    }
    return enriched
  }

  deduplicateReferences(references) {
    const seen = new Map()
    references.forEach(ref => {
      const key = ref.reference || ref.normalized
      if (!seen.has(key)) {
        seen.set(key, ref)
      } else {
        const existing = seen.get(key)
        if (ref.confidence > existing.confidence) {
          seen.set(key, ref)
        }
      }
    })
    return Array.from(seen.values())
  }

  async transcribeAudio(audioFile, options = {}) {
    // Forward to local Whisper
    return whisperService.transcribe(audioFile, options)
  }

  async analyzeSermonRealTime(transcript, sessionId) {
    // Just wrapper for detection
    return this.detectScripturesComprehensive(transcript, { sessionId })
  }

  checkServiceAvailability() {
    return {
      whisper: whisperService.isServiceAvailable(),
      themeExtraction: themeExtractionService.isServiceAvailable(),
      semanticSearch: semanticSearchService.isServiceAvailable(),
      bibleApi: true // Local DB always "available" (or throws)
    }
  }

  // Stubs for compatibility
  clearSession(sid) { }
  getSessionStats(sid) { return {} }
}

const enhancedAiService = new EnhancedAiService()
module.exports = { enhancedAiService, EnhancedAiService }



