const express = require('express');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');
const http = require('http');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Initialize local database via service
const { localBibleService } = require('./services/localBibleService');

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

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  const sessionId = socket.id;

  // Audio processing state
  const processingQueue = new Map();

  socket.on('audio-chunk', async (data) => {
    try {
      if (!data.audio) return;

      console.log(`🎤 Received audio chunk: ${data.audio ? data.audio.length : 0} bytes`)

      const sessionDir = path.join(process.cwd(), 'temp', sessionId);
      await require('fs-extra').ensureDir(sessionDir);

      // Save chunk to temp file
      // Assuming audio is sent as Blob/Buffer
      const chunkPath = path.join(sessionDir, `chunk_${Date.now()}.wav`);
      await require('fs-extra').writeFile(chunkPath, data.audio);
      console.log(`📁 Saved chunk to ${chunkPath}`)

      // Transcribe chunk
      // Note: In a production app, we would use a VAD or stream buffer. 
      // For this offline implementation, we transcribe chunks independently 
      // and append. This is imperfect but functional for offline prototype.
      console.log('🗣️ Transcribing chunk...')
      const result = await require('./services/whisperService').whisperService.transcribe(chunkPath);
      console.log(`📝 Transcription result: "${result.text}"`)

      if (result.text) {
        socket.emit('transcript-update', { transcript: result.text, isFinal: true });

        // Also trigger analysis
        const analysis = await enhancedAiService.analyzeSermonRealTime(result.text, sessionId);
        socket.emit('analysis-result', analysis);
      }

      // Cleanup chunk
      await require('fs-extra').remove(chunkPath);

    } catch (error) {
      console.error('Audio processing error:', error);
      socket.emit('error', 'Audio processing failed');
    }
  });

  socket.on('sermon-transcript-update', async (data) => {
    try {
      // Handle both string and object formats
      const transcript = typeof data === 'string' ? data : data.transcript;
      if (!transcript) return;

      const analysis = await enhancedAiService.analyzeSermonRealTime(transcript, sessionId);
      socket.emit('analysis-result', analysis);
    } catch (error) {
      console.error('Analysis error:', error);
      socket.emit('error', 'Failed to analyze sermon');
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', sessionId);
    enhancedAiService.clearSession(sessionId);
    // Cleanup temp dir
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

app.get('/api/scriptures/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Query required' });
    const results = await localBibleService.search(q);
    res.json(results);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/scriptures/verse/:ref', async (req, res) => {
  try {
    const verse = await localBibleService.getVerse(req.params.ref);
    res.json(verse);
  } catch (error) {
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
  try {
    const { query, topK, sessionId, priority } = req.body;
    if (!query) return res.status(400).json({ error: 'Query required' });

    // Lazy load service if needed or use the one from enhancedAiService if exposed, 
    // but better to require it directly or use enhancedAiService's internal
    // For now, let's require it locally or at top if not there.
    // Actually, semanticSearchService is strictly part of enhancedAiService in my architecture?
    // Let's check imports. enhancedAiService imports it.
    // I can stick it in server.js imports or reuse.

    const { semanticSearchService } = require('./services/semanticSearchService');
    const results = await semanticSearchService.searchByMeaning(query, { topK, sessionId, priority });
    res.json({ results });
  } catch (error) {
    console.error('Semantic search error:', error);
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
