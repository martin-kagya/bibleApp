const express = require('express')
const router = express.Router()
const { bibleApiService } = require('../services/bibleApiService.enhanced')
const { scriptureParser } = require('../services/scriptureParser')
const { semanticSearchService } = require('../services/semanticSearchService')

/**
 * GET /api/scriptures/:reference
 * Get scripture by reference
 */
router.get('/:reference', async (req, res) => {
  try {
    const { reference } = req.params
    const { translation } = req.query

    const scripture = await bibleApiService.getVerse(
      reference,
      translation
    )

    res.json(scripture)
  } catch (error) {
    console.error('Error fetching scripture:', error)
    res.status(404).json({ 
      error: 'Scripture not found',
      message: error.message 
    })
  }
})

/**
 * POST /api/scriptures/batch
 * Get multiple scriptures in batch
 */
router.post('/batch', async (req, res) => {
  try {
    const { references, translation } = req.body

    if (!Array.isArray(references) || references.length === 0) {
      return res.status(400).json({ error: 'References array is required' })
    }

    if (references.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 references per request' })
    }

    const results = await bibleApiService.getVerses(references, translation)

    res.json({ results })
  } catch (error) {
    console.error('Error fetching scriptures:', error)
    res.status(500).json({ 
      error: 'Failed to fetch scriptures',
      message: error.message 
    })
  }
})

/**
 * GET /api/scriptures/search
 * Search Bible text
 */
router.get('/search', async (req, res) => {
  try {
    const { q, translation, limit } = req.query

    if (!q) {
      return res.status(400).json({ error: 'Query parameter "q" is required' })
    }

    const results = await bibleApiService.searchBible(
      q,
      translation,
      parseInt(limit) || 10
    )

    res.json({ results })
  } catch (error) {
    console.error('Error searching scriptures:', error)
    res.status(500).json({ 
      error: 'Failed to search scriptures',
      message: error.message 
    })
  }
})

/**
 * POST /api/scriptures/parse
 * Parse scripture reference
 */
router.post('/parse', (req, res) => {
  try {
    const { reference } = req.body

    if (!reference) {
      return res.status(400).json({ error: 'Reference is required' })
    }

    const parsed = scriptureParser.parse(reference)

    res.json({ parsed })
  } catch (error) {
    console.error('Error parsing reference:', error)
    res.status(400).json({ 
      error: 'Invalid reference format',
      message: error.message 
    })
  }
})

/**
 * POST /api/scriptures/extract
 * Extract all scripture references from text
 */
router.post('/extract', (req, res) => {
  try {
    const { text } = req.body

    if (!text) {
      return res.status(400).json({ error: 'Text is required' })
    }

    const references = scriptureParser.extractReferences(text)

    res.json({ references })
  } catch (error) {
    console.error('Error extracting references:', error)
    res.status(500).json({ 
      error: 'Failed to extract references',
      message: error.message 
    })
  }
})

/**
 * GET /api/scriptures/book/:bookCode/chapters
 * Get all chapters for a book
 */
router.get('/book/:bookCode/chapters', async (req, res) => {
  try {
    const { bookCode } = req.params
    const { translation } = req.query

    const chapters = await bibleApiService.getChapters(bookCode, translation)

    res.json({ chapters })
  } catch (error) {
    console.error('Error fetching chapters:', error)
    res.status(500).json({ 
      error: 'Failed to fetch chapters',
      message: error.message 
    })
  }
})

/**
 * GET /api/scriptures/book/:bookCode/chapter/:chapter
 * Get all verses in a chapter
 */
router.get('/book/:bookCode/chapter/:chapter', async (req, res) => {
  try {
    const { bookCode, chapter } = req.params
    const { translation } = req.query

    const verses = await bibleApiService.getChapterVerses(
      bookCode,
      parseInt(chapter),
      translation
    )

    res.json({ verses })
  } catch (error) {
    console.error('Error fetching chapter verses:', error)
    res.status(500).json({ 
      error: 'Failed to fetch chapter verses',
      message: error.message 
    })
  }
})

/**
 * GET /api/scriptures/versions
 * Get available Bible versions
 */
router.get('/versions', async (req, res) => {
  try {
    const versions = await bibleApiService.getBibleVersions()

    res.json({ versions })
  } catch (error) {
    console.error('Error fetching versions:', error)
    res.status(500).json({ 
      error: 'Failed to fetch Bible versions',
      message: error.message 
    })
  }
})

/**
 * GET /api/scriptures/books
 * Get all books in Bible
 */
router.get('/books', async (req, res) => {
  try {
    const { translation } = req.query

    const books = await bibleApiService.getBooks(translation)

    res.json({ books })
  } catch (error) {
    console.error('Error fetching books:', error)
    res.status(500).json({ 
      error: 'Failed to fetch books',
      message: error.message 
    })
  }
})

/**
 * POST /api/scriptures/cross-references
 * Get cross-references for a verse
 */
router.post('/cross-references', async (req, res) => {
  try {
    const { reference, text, topK } = req.body

    if (!reference || !text) {
      return res.status(400).json({ error: 'Reference and text are required' })
    }

    const crossRefs = await semanticSearchService.getCrossReferences(
      reference,
      text,
      topK || 5
    )

    res.json({ crossReferences: crossRefs })
  } catch (error) {
    console.error('Error getting cross-references:', error)
    res.status(500).json({ 
      error: 'Failed to get cross-references',
      message: error.message 
    })
  }
})

module.exports = router



