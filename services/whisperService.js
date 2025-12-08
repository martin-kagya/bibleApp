const fs = require('fs')
const path = require('path')
let appPath = process.cwd()
try {
  const { app } = require('electron')
  if (app) appPath = app.getAppPath()
} catch (e) { }

class WhisperService {
  constructor() {
    this.model = 'Xenova/whisper-tiny.en' // Tiny model for speed on CPU
    this.transcriber = null
    this.isReady = false
    this.pipeline = null
    this.env = null
    this.init()
  }

  async init() {
    try {
      // Dynamic import for ESM module
      const { pipeline, env } = await import('@xenova/transformers')
      this.pipeline = pipeline
      this.env = env

      // Configure transformers.js to use local models if downloaded, or cache them
      this.env.localModelPath = path.join(appPath, 'models')
      this.env.cacheDir = path.join(appPath, 'models') // Force download to this folder
      this.env.allowRemoteModels = true // Allow downloading on first run

      console.log('🎤 Loading local Whisper model...')
      this.transcriber = await this.pipeline('automatic-speech-recognition', this.model)
      this.isReady = true
      console.log('✓ Whisper model loaded')
    } catch (error) {
      console.error('❌ Failed to load Whisper model:', error)
    }
  }

  /**
   * Transcribe audio file/buffer
   * @param {string|Float32Array} audio - Path to file or float32 audio data
   * @returns {Promise<Object>} Transcription result
   */
  async transcribe(audio, options = {}) {
    if (!this.isReady) {
      // Try to re-init if not ready, or wait
      await this.init()
      if (!this.isReady) throw new Error('Whisper model not ready')
    }

    try {
      // transformers.js accepts file paths or raw float32 arrays
      // It handles resampling automatically for file paths.
      // For raw buffers, we might need 'wavefile' to decode if it's a buffer.

      const result = await this.transcriber(audio, {
        chunk_length_s: 30,
        stride_length_s: 5,
        language: 'english',
        task: 'transcribe',
        return_timestamps: true
      })

      return {
        text: result.text.trim(),
        language: 'en',
        segments: result.chunks || []
      }
    } catch (error) {
      console.error('Transcription error:', error)
      throw error
    }
  }

  /**
   * Correct common transcription errors specific to Bible references
   */
  correctBibleReferences(text) {
    if (!text) return ''

    const corrections = {
      'john three sixteen': 'John 3:16',
      'first corinthians': '1 Corinthians',
      'second corinthians': '2 Corinthians',
      'first john': '1 John',
      'second john': '2 John',
      'third john': '3 John',
      'first peter': '1 Peter',
      'second peter': '2 Peter',
      'first timothy': '1 Timothy',
      'second timothy': '2 Timothy',
      'first thessalonians': '1 Thessalonians',
      'second thessalonians': '2 Thessalonians',
      'first samuel': '1 Samuel',
      'second samuel': '2 Samuel',
      'first kings': '1 Kings',
      'second kings': '2 Kings',
      'first chronicles': '1 Chronicles',
      'second chronicles': '2 Chronicles',
      'romans ate twenty-eight': 'Romans 8:28',
      'philippians four thirteen': 'Philippians 4:13',
    }

    let correctedText = text
    for (const [pattern, replacement] of Object.entries(corrections)) {
      const regex = new RegExp(pattern, 'gi')
      correctedText = correctedText.replace(regex, replacement)
    }
    return correctedText
  }

  isServiceAvailable() {
    return this.isReady
  }
}

const whisperService = new WhisperService()
module.exports = { whisperService }



