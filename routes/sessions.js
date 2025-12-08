const express = require('express')
const router = express.Router()
const { query } = require('../config/database')
const { enhancedAiService } = require('../services/aiService.enhanced')

/**
 * POST /api/sessions
 * Create a new sermon session
 */
router.post('/', async (req, res) => {
  try {
    const { title, preacher } = req.body

    const result = await query(
      `INSERT INTO sermons (title, preacher, transcript, created_at)
       VALUES ($1, $2, '', NOW())
       RETURNING id, title, preacher, created_at`,
      [title || 'Untitled Sermon', preacher || 'Unknown']
    )

    const session = result.rows[0]
    const sessionId = `session-${session.id}`

    res.json({
      sessionId,
      ...session
    })
  } catch (error) {
    console.error('Error creating session:', error)
    res.status(500).json({ 
      error: 'Failed to create session',
      message: error.message 
    })
  }
})

/**
 * GET /api/sessions/:id
 * Get session by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const result = await query(
      'SELECT * FROM sermons WHERE id = $1',
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Error fetching session:', error)
    res.status(500).json({ 
      error: 'Failed to fetch session',
      message: error.message 
    })
  }
})

/**
 * PUT /api/sessions/:id
 * Update session
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { 
      title, 
      preacher, 
      transcript, 
      themes, 
      detectedScriptures, 
      suggestedScriptures 
    } = req.body

    const result = await query(
      `UPDATE sermons 
       SET title = COALESCE($1, title),
           preacher = COALESCE($2, preacher),
           transcript = COALESCE($3, transcript),
           themes = COALESCE($4, themes),
           detected_scriptures = COALESCE($5, detected_scriptures),
           suggested_scriptures = COALESCE($6, suggested_scriptures),
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [title, preacher, transcript, themes, detectedScriptures, suggestedScriptures, id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' })
    }

    res.json(result.rows[0])
  } catch (error) {
    console.error('Error updating session:', error)
    res.status(500).json({ 
      error: 'Failed to update session',
      message: error.message 
    })
  }
})

/**
 * GET /api/sessions/:id/stats
 * Get session statistics
 */
router.get('/:id/stats', (req, res) => {
  try {
    const { id } = req.params
    const sessionId = `session-${id}`

    const stats = enhancedAiService.getSessionStats(sessionId)

    if (!stats) {
      return res.status(404).json({ error: 'Session not found or inactive' })
    }

    res.json(stats)
  } catch (error) {
    console.error('Error fetching session stats:', error)
    res.status(500).json({ 
      error: 'Failed to fetch session stats',
      message: error.message 
    })
  }
})

/**
 * DELETE /api/sessions/:id
 * Delete session
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params

    const result = await query(
      'DELETE FROM sermons WHERE id = $1 RETURNING id',
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' })
    }

    // Clear from memory if active
    const sessionId = `session-${id}`
    enhancedAiService.clearSession(sessionId)

    res.json({ message: 'Session deleted successfully' })
  } catch (error) {
    console.error('Error deleting session:', error)
    res.status(500).json({ 
      error: 'Failed to delete session',
      message: error.message 
    })
  }
})

/**
 * GET /api/sessions
 * Get all sessions
 */
router.get('/', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query

    const result = await query(
      `SELECT id, title, preacher, date, created_at, updated_at
       FROM sermons
       ORDER BY created_at DESC
       LIMIT $1 OFFSET $2`,
      [parseInt(limit), parseInt(offset)]
    )

    res.json({ sessions: result.rows })
  } catch (error) {
    console.error('Error fetching sessions:', error)
    res.status(500).json({ 
      error: 'Failed to fetch sessions',
      message: error.message 
    })
  }
})

module.exports = router



