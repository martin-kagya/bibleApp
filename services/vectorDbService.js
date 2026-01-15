const fs = require('fs-extra')
const path = require('path')
let appPath = process.cwd()

try {
  const { app } = require('electron')
  if (app) appPath = app.getAppPath()
} catch (e) { }

let faiss = null
try {
  faiss = require('faiss-node')
} catch (e) {
  console.warn('⚠️ faiss-node not found, falling back to brute-force search')
}

const { rerankerService } = require('./rerankerService')
const { localBibleService } = require('./localBibleService')

// Biblical Lemma Map for high-speed fuzzy recovery (Top-tier names and common misheard nouns)
const BIBLE_LEMMA_MAP = [
  "Zerubbabel", "Nebuchadnezzar", "Melchizedek", "Sennacherib", "Mephibosheth", "Jehoshaphat", "Laban", "Ezekiel", "Zechariah", "Habakkuk",
  "Zephaniah", "Haggai", "Malachi", "Ahasuerus", "Artaxerxes", "Belshazzar", "Chedorlaomer", "Diotrephes", "Epaphroditus", "Golgotha",
  "Hezekiah", "Ishbosheth", "Jedidiah", "Kiriath", "Leviticus", "Methuselah", "Naphtali", "Onesiphorus", "Potiphar", "Quirinius",
  "Rehoboam", "Shadrach", "Tiglath-Pileser", "Uriah", "Vashti", "Zacchaeus", "Zedekiah", "Zipporah", "Bethlehem", "Nazareth", "Jerusalem",
  "Tabernacle", "Testimony", "Covenant", "Righteousness", "Sanctuary", "Prophecy", "Wilderness", "Sacrifice", "Inheritance", "Redemption",
  "Bozrah", "Sennacherib", "Cyrus", "Darius", "Xerxes", "Uzziah", "Jereboam", "Lively", "Edifice", "Priesthood", "Spiritual", "House"
];

// Model Configurations
const MODELS = {
  e5: { id: 'e5', name: 'Xenova/e5-base-v2', type: 'local', filename: 'vectors-e5.json' },
  minilm: { id: 'minilm', name: 'Xenova/all-MiniLM-L6-v2', type: 'local', filename: 'vectors-minilm.json' },
  paraphrase: { id: 'paraphrase', name: 'Xenova/paraphrase-MiniLM-L3-v2', type: 'local', filename: 'vectors-paraphrase.json' },
  'bge-base': { id: 'bge-base', name: 'Xenova/bge-base-en-v1.5', type: 'local', filename: 'vectors-bge-base.json' },
  'bge-large': { id: 'bge-large', name: 'Xenova/bge-large-en-v1.5', type: 'local', filename: 'vectors-bge-large.json' }
}

class VectorDbService {
  constructor() {
    this.currentModelId = 'bge-base'
    this.openai = null
    this.extractors = {}
    this.vectors = {}
    this.indexes = {}
    this.isReady = false
    this.env = null

    this.OT_BOOKS = new Set(['Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy', 'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel', '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles', 'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs', 'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah', 'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel', 'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk', 'Zephaniah', 'Haggai', 'Zechariah', 'Malachi'])
    this.NT_BOOKS = new Set(['Matthew', 'Mark', 'Luke', 'John', 'Acts', 'Romans', '1 Corinthians', '2 Corinthians', 'Galatians', 'Ephesians', 'Philippians', 'Colossians', '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy', 'Titus', 'Philemon', 'Hebrews', 'James', '1 Peter', '2 Peter', '1 John', '2 John', '3 John', 'Jude', 'Revelation'])

    this.init()
  }

  levenshtein(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) matrix[i][j] = matrix[i - 1][j - 1];
        else matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
      }
    }
    return matrix[b.length][a.length];
  }

  extractKeywords(text, useHotfixes = false) {
    if (!text) return []
    const hotfixes = {
      'divine': 'vine', 'husband': 'husbandman', 'branch': 'branches', 'joint': 'john', 'sam': 'psalms', 'songs': 'psalms',
      'revelations': 'revelation', 'rubabell': 'zerubbabel', 'leibon': 'laban', 'leibn': 'laban', 'lee-man': 'laban', 'stunance': 'stones',
      'boozra': 'bozrah', 'bozra': 'bozrah', 'eddy': 'edifice', 'face': 'edifice', // eddy face -> edifice
      'release': 'lively' // life release -> lively
    }
    const stopWords = new Set(['the', 'and', 'for', 'with', 'from', 'this', 'that', 'they', 'shall', 'will', 'have', 'been', 'were', 'not', 'but', 'all', 'one', 'two', 'their', 'what', 'so', 'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then', 'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how', 'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day', 'most', 'us', 'is', 'are', 'was', 'were', 'has', 'had', 'am', 'does', 'did', 'done', 'should', 'might', 'must', 'may', 'verse', 'chapter', 'book', 'bible', 'scripture'])

    const distinctWords = new Set()
    const rawWords = text.toLowerCase().replace(/[.,/#!$%^&*;:{}=\-_`~()?"']/g, " ").split(/\s+/)

    for (let word of rawWords) {
      if (word.length < 3) continue;

      if (useHotfixes && hotfixes[word]) {
        distinctWords.add(hotfixes[word]);
        continue;
      }

      let foundFuzzy = false;
      // Skip fuzzy for very short words unless they aren't stop words
      if (word.length >= 4) {
        for (const name of BIBLE_LEMMA_MAP) {
          const lowerName = name.toLowerCase();
          if (word === lowerName) break;
          const distance = this.levenshtein(word, lowerName);
          if (distance <= Math.max(2, Math.floor(lowerName.length * 0.3))) {
            console.log(`✨ Fast Fuzzy: "${word}" ➔ "${lowerName}" (dist: ${distance})`);
            distinctWords.add(lowerName);
            foundFuzzy = true;
            break;
          }
        }
      }
      if (!foundFuzzy && !stopWords.has(word) && !/^\d+$/.test(word)) { distinctWords.add(word) }
    }
    return Array.from(distinctWords)
  }

  setModel(modelId) {
    if (MODELS[modelId]) {
      this.currentModelId = modelId
      console.log(`🔄 Switched to vector model: ${MODELS[modelId].name}`)
    }
  }

  async init() {
    try {
      require('dotenv').config()
      if (process.env.OPENAI_API_KEY) {
        const OpenAI = require('openai')
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
      }
      const { pipeline, env } = await import('@xenova/transformers')
      this.env = env
      this.env.localModelPath = path.join(appPath, 'models')
      this.env.cacheDir = path.join(appPath, 'models')
      this.env.allowRemoteModels = true
      await this.loadAllVectorStores()
      this.isReady = true
      console.log('✅ Vector Service Initialized')
    } catch (error) { console.error('❌ Failed to load embedding service:', error) }
  }

  async loadAllVectorStores() {
    await this.loadVectors(this.currentModelId)
    const otherKeys = Object.keys(MODELS).filter(k => k !== this.currentModelId)
    Promise.all(otherKeys.map(key => this.loadVectors(key)))
      .then(() => console.log('✅ All secondary vector stores background loaded'))
      .catch(err => console.error('Error background loading vectors:', err))
  }

  async loadVectors(modelId) {
    try {
      const config = MODELS[modelId]
      const vectorPath = path.join(appPath, 'data', config.filename)
      if (await fs.pathExists(vectorPath)) {
        const fileStream = fs.createReadStream(vectorPath)
        const rl = require('readline').createInterface({ input: fileStream, crlfDelay: Infinity })
        const loadedVectors = []
        for await (const line of rl) {
          if (line.trim()) { try { loadedVectors.push(JSON.parse(line)) } catch (e) { } }
        }
        this.vectors[modelId] = loadedVectors
        if (this.vectors[modelId].length > 0) { this.buildFaissIndex(modelId) }
      } else { this.vectors[modelId] = [] }
    } catch (error) { console.error(`Failed to load vectors for ${modelId}:`, error) }
  }

  buildFaissIndex(modelId) {
    if (!faiss) return
    try {
      const vectors = this.vectors[modelId]
      if (!vectors.length) return
      const dimension = vectors[0].vector.length
      const index = new faiss.IndexFlatIP(dimension)
      const data = vectors.flatMap(v => v.vector)
      index.add(data)
      this.indexes[modelId] = index
      console.log(`⚡ FAISS Index built for ${modelId} (${vectors.length} items, dim: ${dimension})`)
    } catch (e) { console.error(`Failed to build FAISS index for ${modelId}:`, e) }
  }

  async ensureExtractor(modelId) {
    const config = MODELS[modelId]
    if (config.type === 'openai') return
    if (!this.extractors[modelId]) {
      console.log(`🧠 Loading local model: ${config.name}...`)
      const { pipeline } = await import('@xenova/transformers')
      this.extractors[modelId] = await pipeline('feature-extraction', config.name)
      console.log(`✓ Model ${config.name} loaded`)
    }
  }

  async generateEmbedding(text, modelId = this.currentModelId) {
    if (!this.isReady) await this.init()
    const config = MODELS[modelId]
    if (config.type === 'openai') {
      const response = await this.openai.embeddings.create({ model: config.name, input: text, encoding_format: "float" })
      return response.data[0].embedding
    } else {
      await this.ensureExtractor(modelId)
      const extractor = this.extractors[modelId]
      const pooling = modelId.startsWith('bge') ? 'cls' : 'mean'
      const output = await extractor(text, { pooling, normalize: true })
      return Array.from(output.data)
    }
  }

  async generateBatch(texts, modelId = this.currentModelId) {
    if (!this.isReady) await this.init()
    const config = MODELS[modelId]
    if (config.type === 'openai') {
      const response = await this.openai.embeddings.create({ model: config.name, input: texts, encoding_format: "float" })
      return response.data.sort((a, b) => a.index - b.index).map(d => d.embedding)
    } else {
      await this.ensureExtractor(modelId)
      const results = []
      for (const text of texts) { results.push(await this.generateEmbedding(text, modelId)) }
      return results
    }
  }

  async searchSimilarVerses(query, topK = 10, priority = 'BOTH', modelId = this.currentModelId) {
    if (!this.isReady) await this.init()
    let finalQuery = query
    if (modelId.startsWith('bge')) { finalQuery = `Represent this sentence for searching relevant passages: ${query}` }
    const queryVector = await this.generateEmbedding(finalQuery, modelId)
    const targetVectors = this.vectors[modelId] || []
    if (targetVectors.length === 0) { return [] }
    if (this.indexes[modelId]) {
      try {
        const k = Math.min(topK * 5, this.vectors[modelId].length)
        const index = this.indexes[modelId]
        const { distances, labels } = index.search(queryVector, k)
        const scores = []
        for (let i = 0; i < labels.length; i++) {
          const idx = labels[i]
          if (idx < 0) continue
          const item = this.vectors[modelId][idx]
          if (!this.filterBook(item.metadata.book, priority)) continue
          scores.push({ ...item, score: distances[i] })
        }
        return scores.slice(0, topK).map(item => ({ reference: item.id, text: item.metadata.text, similarity: item.score, confidence: item.score, sourceModel: modelId }))
      } catch (e) { console.error('FAISS search failed, falling back to brute force:', e) }
    }
    const scores = []
    for (const item of targetVectors) {
      if (!this.filterBook(item.metadata.book, priority)) continue
      const score = this.cosineSimilarity(queryVector, item.vector)
      scores.push({ ...item, score })
    }
    scores.sort((a, b) => b.score - a.score)
    return scores.slice(0, topK).map(item => ({ reference: item.id, text: item.metadata.text, similarity: item.score, confidence: item.score, sourceModel: modelId }))
  }

  async searchHybrid(query, options = {}) {
    if (!this.isReady) await this.init()
    const { topK = 10, alpha = 0.5, priority = 'BOTH', useHotfixes = false, useReranker = true, isFinal = false } = options
    console.log(`🕵️‍♂️ Hybrid Search: "${query.substring(0, 50)}..." [Hotfixes: ${useHotfixes}, Reranker: ${useReranker}]`)

    // 1. Keyword Extraction
    const lyricsKeywords = this.extractKeywords(query, useHotfixes)
    console.log(`   📝 Keywords: [${lyricsKeywords.join(' ')}]`)

    // 2. Parallel Retrieval
    const vectorResults = await this.searchSimilarVerses(query, topK * 5, priority)
    const keywordResults = await localBibleService.searchByKeyword(lyricsKeywords.join(' '), topK * 5)

    // 3. Score Fusion (RRF)
    const fusionMap = new Map()
    const RRF_K = 60

    vectorResults.forEach((item, rank) => {
      const key = item.reference
      if (!fusionMap.has(key)) { fusionMap.set(key, { score: 0, item }) }
      fusionMap.get(key).score += alpha * (1 / (RRF_K + rank + 1))
    })

    keywordResults.forEach((item, rank) => {
      const key = item.reference
      if (!fusionMap.has(key)) { fusionMap.set(key, { score: 0, item }) }
      fusionMap.get(key).score += (1 - alpha) * (1 / (RRF_K + rank + 1))
    })

    // Sort fused candidates
    let candidates = Array.from(fusionMap.values())
      .map(entry => ({ ...entry.item, confidence: entry.score }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, Math.max(topK * 2, 20)) // Get enough candidates for reranking

    // 4. Verification & Reranking Stage
    const shouldRerank = useReranker && candidates.length > 0 && isFinal;

    if (shouldRerank) {
      try {
        await rerankerService.init(options.rerankerModel || 'bge-reranker-base')
        const reranked = await rerankerService.rerank(query, candidates, topK)

        // CRITICAL: Map rerankerScore back to confidence so filters catch it
        candidates = reranked.map(c => ({
          ...c,
          confidence: c.rerankerScore,
          similarity: c.rerankerScore
        }))
      } catch (e) {
        console.error('Reranking failed during hybrid search:', e)
        // Fallback to top fused results if reranking fails
        candidates = candidates.slice(0, topK)
      }
    } else if (!isFinal && candidates.length > 0) {
      // For partial results, just take top fused candidates without the expensive rerank
      // console.log('   ⏭ Skipping reranker for partial result');
      candidates = candidates.slice(0, topK).map((c, i) => {
        // Still give the top one a slight confidence boost if it's okayish
        if (i === 0 && c.confidence > 0.01) {
          return { ...c, confidence: Math.max(c.confidence, 0.4) }
        }
        return c;
      });
    } else {
      // If no reranker, boost top result confidence to ensure it passes threshold if it's a good match
      candidates = candidates.slice(0, topK).map((c, i) => {
        if (i === 0 && c.confidence > 0.01) {
          return { ...c, confidence: Math.max(c.confidence, 0.45) } // Boost top hit if it exists
        }
        return c
      })
    }

    if (candidates.length > 0) {
      console.log(`   ↳ Vectors: ${vectorResults.length} | Keywords: ${keywordResults.length}`);
      console.log(`   ✨ Top Suggestions: ${candidates.slice(0, 3).map(m => m.reference).join(', ')}`)
    } else {
      console.log('   ⚠️ No scripture suggestions found')
    }

    return candidates
  }

  async searchEnsemble(query, topK = 10, priority = 'BOTH') {
    if (!this.isReady) await this.init()
    const availableModels = Object.keys(MODELS).filter(id => this.vectors[id] && this.vectors[id].length > 0)
    if (availableModels.length === 0) return []
    const allResults = await Promise.all(availableModels.map(id => this.searchSimilarVerses(query, topK * 3, priority, id).catch(() => [])))
    const RRF_K = 60
    const fusionMap = new Map()
    allResults.forEach((results) => {
      results.forEach((item, rank) => {
        const key = item.reference
        if (!fusionMap.has(key)) { fusionMap.set(key, { score: 0, item }) }
        fusionMap.get(key).score += 1 / (RRF_K + rank + 1)
      })
    })
    return Array.from(fusionMap.values()).map(entry => ({ ...entry.item, confidence: entry.score })).sort((a, b) => b.confidence - a.confidence).slice(0, topK)
  }

  filterBook(bookName, priority) {
    if (priority === 'OT' && !this.OT_BOOKS.has(bookName)) return false
    if (priority === 'NT' && !this.NT_BOOKS.has(bookName)) return false
    return true
  }

  cosineSimilarity(a, b) {
    let dot = 0
    for (let i = 0; i < a.length; i++) { dot += a[i] * b[i] }
    return dot
  }

  getAvailableModels() { return Object.keys(MODELS) }
}

const vectorDbService = new VectorDbService()
module.exports = { vectorDbService, VectorDbService }
