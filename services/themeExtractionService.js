const { LocalBibleService } = require('./localBibleService')

class ThemeExtractionService {
  constructor() {
    this.sessionThemes = new Map()
  }

  /**
   * Extract themes from sermon transcript using rule-based keywords
   */
  async extractThemes(transcript, options = {}) {
    const { sessionId = null } = options

    // Offline keyword extraction
    const result = this.extractThemesRuleBased(transcript)

    // Update session themes if sessionId provided
    if (sessionId) {
      this.updateSessionThemes(sessionId, result)
    }

    return result
  }

  extractThemesRuleBased(transcript) {
    if (!transcript) return { mainThemes: [] }

    const words = transcript.toLowerCase().split(/\s+/)

    // Expanded theological theme keywords
    const themeKeywords = {
      'salvation': ['salvation', 'saved', 'redeem', 'redemption', 'forgiveness', 'grace', 'cross', 'blood'],
      'faith': ['faith', 'believe', 'trust', 'confidence', 'assurance', 'belief'],
      'love': ['love', 'loving', 'beloved', 'charity', 'agape', 'compassion'],
      'hope': ['hope', 'expectation', 'promise', 'future', 'eternity'],
      'prayer': ['prayer', 'pray', 'intercession', 'supplication', 'ask'],
      'worship': ['worship', 'praise', 'adoration', 'glorify', 'sing'],
      'holiness': ['holy', 'sanctification', 'righteous', 'pure', 'clean'],
      'power': ['power', 'mighty', 'strength', 'authority', 'miracle'],
      'kingdom': ['kingdom', 'reign', 'king', 'throne', 'sovereign'],
      'spirit': ['spirit', 'holy spirit', 'ghost', 'spiritual', 'anointing'],
      'obedience': ['obey', 'obedience', 'follow', 'submit', 'commandment'],
      'wisdom': ['wisdom', 'wise', 'understanding', 'knowledge', 'discernment'],
      'peace': ['peace', 'peaceful', 'calm', 'rest', 'shalom'],
      'joy': ['joy', 'joyful', 'rejoice', 'gladness', 'happiness'],
      'suffering': ['suffer', 'suffering', 'trial', 'persecution', 'tribulation', 'pain'],
      'victory': ['victory', 'overcome', 'conquer', 'triumph', 'win'],
      'justice': ['justice', 'just', 'fair', 'equity', 'judgment'],
      'mercy': ['mercy', 'merciful', 'kindness', 'pity']
    }

    const themes = []
    for (const [theme, keywords] of Object.entries(themeKeywords)) {
      const matchCount = keywords.filter(keyword =>
        words.some(word => word.includes(keyword))
      ).length

      if (matchCount > 0) {
        themes.push({
          theme,
          confidence: Math.min(matchCount / (keywords.length * 0.5), 1.0), // Approximate confidence
          keywords: keywords.filter(k => words.some(w => w.includes(k)))
        })
      }
    }

    // Sort by confidence
    themes.sort((a, b) => b.confidence - a.confidence)

    return {
      mainThemes: themes.slice(0, 5),
      subThemes: themes.slice(5, 15).map(t => ({ theme: t.theme, confidence: t.confidence })),
      keyConcepts: themes.slice(0, 10).flatMap(t => t.keywords),
      emotionalTone: 'neutral', // Could implement simple sentiment analysis later
      theologicalContext: 'general',
      targetAudience: 'believers',
      preachingStyle: 'topical',
      suggestedScriptureThemes: themes.slice(0, 5).map(t => t.theme),
      timestamp: Date.now()
    }
  }

  updateSessionThemes(sessionId, newThemes) {
    if (!this.sessionThemes.has(sessionId)) {
      this.sessionThemes.set(sessionId, {
        themes: [],
        concepts: new Set(),
        startTime: Date.now()
      })
    }
    // Simple merging logic can be added here
  }

  getSessionThemes(sessionId) {
    return this.sessionThemes.get(sessionId)
  }

  clearSession(sessionId) {
    this.sessionThemes.delete(sessionId)
  }

  isServiceAvailable() {
    return true
  }
}

const themeExtractionService = new ThemeExtractionService()
module.exports = { themeExtractionService, ThemeExtractionService }
