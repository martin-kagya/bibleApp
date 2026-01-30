const express = require('express');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');
const http = require('http');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Initialize local database via service
const { localBibleService } = require('./services/localBibleService');
const { bibleCacheService } = require('./services/bibleCacheService');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production'
      ? process.env.FRONTEND_URL || "http://localhost:5173"
      : ["http://localhost:3000", "http://localhost:5173"],
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

// Services
const { enhancedAiService } = require('./services/aiService.enhanced');
const { parallelSearchService } = require('./services/parallelSearchService');
const { FasterWhisperService } = require('./services/fasterWhisperService');
const { lexiconService } = require('./services/lexiconService');

// Track global live state
let currentLiveScripture = null;

io.on('connection', (socket) => {
  const sessionId = socket.id;
  console.log('User connected:', sessionId);

  // Send current live state to new connection
  if (currentLiveScripture) {
    socket.emit('live-update', currentLiveScripture);
  }

  // Session state for context management
  const sessionState = {
    analysisDebounce: null,
    lastPartialSearchTime: 0,
    transcriptWindow: [],
    detectedRefs: new Set(),
    lastProcessTime: 0,
    isProcessing: false,
    fasterWhisper: null,
    lastProcessedText: ''
  };

  // Initialize Faster-Whisper for this session
  const fasterWhisper = new FasterWhisperService();
  fasterWhisper.init();
  sessionState.fasterWhisper = fasterWhisper;

  // Setup Listener for this socket
  const onTranscript = (data) => {
    const text = (data.text || '').trim();
    if (!text) return;

    // Only skip if it's the SAME text AND same finality status
    if (text === sessionState.lastProcessedText && !data.isFinal) return;

    sessionState.lastProcessedText = text;

    sessionState.lastProcessedText = text;

    // 1. Send text to frontend for immediate display
    socket.emit('transcript-update', {
      transcript: text,
      isFinal: data.isFinal,
      source: 'faster-whisper'
    });

    const now = Date.now();

    // 2. PARTIAL: Throttled Search every ~1.5s
    if (!data.isFinal) {
      if (text.length > 5 && (now - sessionState.lastPartialSearchTime > 1500)) {
        sessionState.lastPartialSearchTime = now;
        parallelSearchService.search(text, (type, searchData) => {
          // 1. Handle Status Updates (Spinners, etc.)
          if (type === 'status') {
            socket.emit('analysis-status', searchData);
            return;
          }

          // 2. Process Results (Fast/Smart)
          const results = searchData.results || [];
          if (results.length === 0) return;

          const payload = {
            type,
            timestamp: Date.now(),
            isPartial: true,
            isFinal: false
          };

          if (type === 'fast') {
            payload.suggested = results;
          } else if (type === 'smart') {
            payload.detected = results;
            payload.isSmart = true;
            payload.reasoning = searchData.reasoning;
          }

          socket.emit('analysis-result', payload);
        }, { isFinal: false });
      }
    }
    // 3. FINAL: Full Search & Commit to session history
    else {
      console.log(`✅ [${sessionId}] Final: "${text}"`);
      sessionState.transcriptWindow.push({
        text: text,
        timestamp: now
      });

      // Keep last 5 minutes of history
      const windowStart = now - 300000;
      sessionState.transcriptWindow = sessionState.transcriptWindow
        .filter(t => t.timestamp > windowStart);

      parallelSearchService.search(text, (type, searchData) => {
        // 1. Status
        if (type === 'status') {
          socket.emit('analysis-status', searchData);
          return;
        }

        // 2. Results
        const results = searchData.results || [];
        if (results.length === 0) return;

        const payload = {
          type,
          timestamp: Date.now(),
          isPartial: false,
          isFinal: true
        };

        if (type === 'fast') {
          payload.suggested = results;
        } else if (type === 'smart') {
          payload.detected = results;
          payload.isSmart = true;
          payload.reasoning = searchData.reasoning;
        }

        socket.emit('analysis-result', payload);
      }, { isFinal: true });
    }
  };

  fasterWhisper.on('transcript', onTranscript);

  // Handle Audio Streaming
  socket.on('audio-chunk', (data) => {
    if (data.audio && sessionState.fasterWhisper) {
      sessionState.fasterWhisper.writeAudio(data.audio);
    }
  });

  // Handle Context Commands
  socket.on('clear-context', () => {
    console.log(`🧹 [${sessionId}] Clearing session context`);
    sessionState.transcriptWindow = [];
    sessionState.detectedRefs.clear();
    socket.emit('context-cleared');
  });

  socket.on('sermon-transcript-update', async (data) => {
    try {
      const transcript = typeof data === 'string' ? data : data.transcript;
      if (!transcript) return;
      const analysis = await enhancedAiService.analyzeSermonRealTime(transcript, sessionId);
      socket.emit('analysis-result', analysis);
    } catch (error) {
      console.error('Analysis error:', error);
      socket.emit('error', 'Failed to analyze sermon');
    }
  });

  // Handle Live Presentation Events
  socket.on('go-live', (data) => {
    console.log(`🔴 [${sessionId}] Going Live:`, data.reference);
    currentLiveScripture = data;
    io.emit('live-update', data);
  });

  socket.on('clear-live', () => {
    console.log(`⚪ [${sessionId}] Cleared Live Display`);
    currentLiveScripture = null;
    io.emit('live-update', null);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', sessionId);
    fasterWhisper.shutdown();
    enhancedAiService.clearSession(sessionId);
    const sessionDir = path.join(process.cwd(), 'temp', sessionId);
    require('fs-extra').remove(sessionDir).catch(console.error);
  });
});

// HTTP Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    services: enhancedAiService.checkServiceAvailability()
  });
});

app.get('/api/translations', async (req, res) => {
  try {
    const localTranslations = localBibleService.getTranslations();

    // Merge with available online mappings
    const { TRANSLATION_MAPPINGS } = require('./services/bibleCacheService');
    const allAbbrevs = Object.keys(TRANSLATION_MAPPINGS);

    const augmented = allAbbrevs.map(abbrev => {
      const local = localTranslations.find(t => t.abbreviation.toUpperCase() === abbrev.toUpperCase());
      if (local) return { ...local, isLocal: true };
      return {
        id: abbrev,
        name: abbrev,
        abbreviation: abbrev,
        language: 'en',
        isLocal: false
      };
    });

    // Add any local ones that weren't in the mapping
    localTranslations.forEach(t => {
      if (!augmented.find(a => a.abbreviation.toUpperCase() === t.abbreviation.toUpperCase())) {
        augmented.push({ ...t, isLocal: true });
      }
    });

    res.json(augmented);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/books', (req, res) => {
  try {
    const books = localBibleService.getBooks();
    res.json(books);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/books/:bookName/chapters', (req, res) => {
  try {
    const chapters = localBibleService.getChapters(req.params.bookName);
    res.json(chapters);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/scriptures/search', async (req, res) => {
  try {
    const { q, translation } = req.query;
    if (!q) return res.status(400).json({ error: 'Query required' });
    const results = await localBibleService.searchBible(q, 10, translation || 'KJV');
    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/scriptures/verse/:ref', async (req, res) => {
  try {
    const { translation } = req.query;
    const verse = await localBibleService.getVerse(req.params.ref, translation || 'KJV');
    res.json(verse);
  } catch (error) {
    res.status(404).json({ error: error.message });
  }
});

app.get('/api/scriptures/chapter/:book/:chapter', async (req, res) => {
  try {
    const { translation } = req.query;
    const { book, chapter } = req.params;

    // Use CacheService to handle on-demand fetching
    const verses = await bibleCacheService.getOrFetchChapter(book, parseInt(chapter), translation || 'KJV');
    res.json(verses);
  } catch (error) {
    console.error('Chapter fetch error:', error);
    res.status(404).json({ error: error.message });
  }
});

app.post('/api/ai/analyze', async (req, res) => {
  try {
    const { transcript } = req.body;
    const result = await enhancedAiService.detectScripturesComprehensive(transcript);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/search-semantic', async (req, res) => {
  const { query, topK, sessionId, priority, useTwoStage, embeddingModel, rerankerModel, enableKeywordFusion, keywordOperator, useHotfixes, isFinal } = req.body;
  if (!query) return res.status(400).json({ error: 'Query required' });

  try {
    const { semanticSearchService } = require('./services/semanticSearchService');

    const results = await semanticSearchService.searchByMeaning(query, {
      topK: topK || 10,
      sessionId,
      priority: priority || 'BOTH',
      algorithm: useTwoStage !== false ? 'hybrid' : 'standard',
      modelId: embeddingModel || 'bge-large',
      rerankerModel: rerankerModel || 'bge-reranker-base',
      useTwoStage: useTwoStage !== false,
      enableKeywordFusion: enableKeywordFusion, // Pass the flag from request
      keywordOperator: keywordOperator, // Pass operator from request
      useHotfixes: useHotfixes || false,     // Pass hotfixes flag
      isFinal: isFinal // Pass the final flag to enable reranking
    });

    res.json(results);
  } catch (error) {
    console.error('Semantic search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Lexicon / Dictionary Endpoints
app.get('/api/lexicon/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Query required' });
    const result = await lexiconService.search(q);
    if (!result) return res.status(404).json({ error: 'Term not found' });
    res.json(result);
  } catch (error) {
    console.error('Lexicon search error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/lexicon/interlinear/:ref', async (req, res) => {
  try {
    const { ref } = req.params;
    console.log(`[API] Interlinear Request for: "${ref}"`); // Debug log
    const decoded = decodeURIComponent(ref);
    console.log(`[API] Decoded ref: "${decoded}"`); // Debug log

    const result = await lexiconService.getInterlinearVerse(decoded);
    if (!result) {
      console.warn(`[API] Result null for: "${decoded}"`);
      return res.status(404).json({ error: 'Verse not found' });
    }
    res.json(result);
  } catch (error) {
    console.error('Interlinear error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get search configuration (models, defaults)
app.get('/api/search/config', (req, res) => {
  try {
    const { vectorDbService } = require('./services/vectorDbService');
    const config = vectorDbService.getModelsConfig();
    res.json(config);
  } catch (error) {
    console.error('Config error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

module.exports = { app, server, io };
