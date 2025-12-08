const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const { enhancedAiService } = require('../services/aiService.enhanced')

// Configure multer for audio file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'audio/mpeg',
      'audio/mp3',
      'audio/wav',
      'audio/webm',
      'audio/ogg',
      'audio/m4a',
      'audio/mp4'
    ]
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type. Please upload audio files only.'))
    }
  }
})

/**
 * POST /api/ai/detect-scriptures
 * Comprehensive scripture detection from transcript
 */
router.post('/detect-scriptures', async (req, res) => {
  try {
    const { transcript, sessionId, includeThemes, includeSuggestions } = req.body

    if (!transcript || typeof transcript !== 'string') {
      return res.status(400).json({ error: 'Transcript is required' })
    }

    if (transcript.length > parseInt(process.env.MAX_SERMON_LENGTH) || 50000) {
      return res.status(400).json({ error: 'Transcript too long' })
    }

    const result = await enhancedAiService.detectScripturesComprehensive(
      transcript,
      {
        sessionId,
        includeThemes: includeThemes !== false,
        includeSuggestions: includeSuggestions !== false
      }
    )

    res.json(result)
  } catch (error) {
    console.error('Error detecting scriptures:', error)
    res.status(500).json({ 
      error: 'Failed to detect scriptures',
      message: error.message 
    })
  }
})

/**
 * POST /api/ai/transcribe
 * Transcribe audio file using Whisper
 */
router.post('/transcribe', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Audio file is required' })
    }

    const audioPath = req.file.path

    const result = await enhancedAiService.transcribeAudio(audioPath, {
      language: req.body.language || 'en'
    })

    // Clean up uploaded file
    fs.unlinkSync(audioPath)

    res.json(result)
  } catch (error) {
    console.error('Error transcribing audio:', error)
    
    // Clean up uploaded file on error
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path)
      } catch {}
    }

    res.status(500).json({ 
      error: 'Failed to transcribe audio',
      message: error.message 
    })
  }
})

/**
 * POST /api/ai/extract-themes
 * Extract themes from transcript
 */
router.post('/extract-themes', async (req, res) => {
  try {
    const { transcript, sessionId } = req.body

    if (!transcript || typeof transcript !== 'string') {
      return res.status(400).json({ error: 'Transcript is required' })
    }

    const { themeExtractionService } = require('../services/themeExtractionService')
    
    const themes = await themeExtractionService.extractThemes(transcript, {
      sessionId
    })

    res.json(themes)
  } catch (error) {
    console.error('Error extracting themes:', error)
    res.status(500).json({ 
      error: 'Failed to extract themes',
      message: error.message 
    })
  }
})

/**
 * POST /api/ai/search-semantic
 * Semantic search for scriptures
 */
router.post('/search-semantic', async (req, res) => {
  try {
    const { query, topK, minConfidence, sessionId } = req.body

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query is required' })
    }

    const { semanticSearchService } = require('../services/semanticSearchService')
    
    const results = await semanticSearchService.searchByMeaning(query, {
      topK: topK || 10,
      minConfidence: minConfidence || 0.5,
      sessionId
    })

    res.json({ results })
  } catch (error) {
    console.error('Error in semantic search:', error)
    res.status(500).json({ 
      error: 'Failed to perform semantic search',
      message: error.message 
    })
  }
})

/**
 * POST /api/ai/find-paraphrase
 * Find scripture from paraphrased quote
 */
router.post('/find-paraphrase', async (req, res) => {
  try {
    const { paraphrase, topK } = req.body

    if (!paraphrase || typeof paraphrase !== 'string') {
      return res.status(400).json({ error: 'Paraphrase is required' })
    }

    const { semanticSearchService } = require('../services/semanticSearchService')
    
    const results = await semanticSearchService.findParaphrasedScripture(
      paraphrase,
      { topK: topK || 5 }
    )

    res.json({ results })
  } catch (error) {
    console.error('Error finding paraphrase:', error)
    res.status(500).json({ 
      error: 'Failed to find paraphrased scripture',
      message: error.message 
    })
  }
})

/**
 * POST /api/ai/recommendations
 * Get intelligent scripture recommendations
 */
router.post('/recommendations', async (req, res) => {
  try {
    const { context, sessionId, preferredStyle, topK } = req.body

    if (!context || typeof context !== 'string') {
      return res.status(400).json({ error: 'Context is required' })
    }

    const recommendations = await enhancedAiService.getIntelligentRecommendations(
      context,
      {
        sessionId,
        preferredStyle: preferredStyle || 'balanced',
        topK: topK || 10
      }
    )

    res.json({ recommendations })
  } catch (error) {
    console.error('Error getting recommendations:', error)
    res.status(500).json({ 
      error: 'Failed to get recommendations',
      message: error.message 
    })
  }
})

/**
 * GET /api/ai/service-status
 * Check AI service availability
 */
router.get('/service-status', (req, res) => {
  try {
    const status = enhancedAiService.checkServiceAvailability()
    res.json({
      status: 'ok',
      services: status
    })
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to check service status',
      message: error.message 
    })
  }
})

module.exports = router

