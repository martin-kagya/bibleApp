const fs = require('fs-extra')
const path = require('path')
let appPath = process.cwd()
try {
  const { app } = require('electron')
  if (app) appPath = app.getAppPath()
} catch (e) { }

class VectorDbService {
  constructor() {
    this.modelName = 'Xenova/all-MiniLM-L6-v2' // Small, fast embedding model
    this.extractor = null
    this.vectors = [] // In-memory store: { id, vector, metadata }
    this.isReady = false
    this.pipeline = null
    this.env = null
    // OT/NT Book Definitions
    this.OT_BOOKS = new Set([
      'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth',
      '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra',
      'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon',
      'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos',
      'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi'
    ])

    this.NT_BOOKS = new Set([
      'Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians',
      'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians',
      '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter',
      '1 John', '2 John', '3 John', 'Jude', 'Revelation'
    ])

    this.init()
  }

  async init() {
    try {
      // Dynamic import for ESM module
      const { pipeline, env } = await import('@xenova/transformers')
      this.pipeline = pipeline
      this.env = env

      // Configure transformers
      this.env.localModelPath = path.join(appPath, 'models')
      this.env.cacheDir = path.join(appPath, 'models')
      this.env.allowRemoteModels = true

      console.log('🧠 Loading local embedding model...')
      this.extractor = await this.pipeline('feature-extraction', this.modelName)
      this.isReady = true
      console.log('✓ Embedding model loaded')

      // Load vectors from disk
      await this.loadVectors()
    } catch (error) {
      console.error('❌ Failed to load embedding model:', error)
    }
  }

  async loadVectors() {
    try {
      const vectorPath = path.join(appPath, 'data', 'vectors.json')
      if (await fs.pathExists(vectorPath)) {
        console.log('📂 Loading vector store from disk...')
        const data = await fs.readJson(vectorPath)
        if (Array.isArray(data)) {
          this.vectors = data
          console.log(`✓ Loaded ${this.vectors.length} vectors`)
        }
      }
    } catch (error) {
      console.error('Failed to load vectors:', error)
    }
  }

  /**
   * Generate embedding for text
   * @param {string} text 
   * @returns {Promise<Array>} Normalized embedding
   */
  async generateEmbedding(text) {
    if (!this.isReady) await this.init()

    // Mean pooling and normalization
    const output = await this.extractor(text, { pooling: 'mean', normalize: true })
    return Array.from(output.data)
  }

  /**
   * Store verse (In-memory for now, could persist to JSON/SQLite)
   */
  async storeVerse(verse) {
    const embedding = await this.generateEmbedding(verse.text)
    this.vectors.push({
      id: verse.reference,
      vector: embedding,
      metadata: verse
    })
    return true
  }

  /**
   * Search for similar verses using Cosine Similarity
   */


  // ... (existing helper methods)

  /**
   * Search for similar verses using Cosine Similarity
   * @param {string} query
   * @param {number} topK
   * @param {string} priority 'OT', 'NT', or 'BOTH'
   */
  async searchSimilarVerses(query, topK = 10, priority = 'BOTH') {
    if (!this.isReady) await this.init()

    const queryVector = await this.generateEmbedding(query)

    // Compute cosine similarity for all vectors
    const scores = []

    for (const item of this.vectors) {
      // Filtering Logic
      if (priority === 'OT') {
        if (!this.OT_BOOKS.has(item.metadata.book)) continue
      } else if (priority === 'NT') {
        if (!this.NT_BOOKS.has(item.metadata.book)) continue
      }

      const score = this.cosineSimilarity(queryVector, item.vector)
      scores.push({ ...item, score })
    }

    // Sort and topK
    scores.sort((a, b) => b.score - a.score)

    return scores.slice(0, topK).map(item => ({
      reference: item.id,
      text: item.metadata.text,
      similarity: item.score,
      confidence: item.score
    }))
  }

  cosineSimilarity(a, b) {
    let dot = 0
    // Normalized vectors, so just dot product
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i]
    }
    return dot
  }

  isServiceAvailable() {
    return this.isReady
  }
}

const vectorDbService = new VectorDbService()
module.exports = { vectorDbService, VectorDbService }
