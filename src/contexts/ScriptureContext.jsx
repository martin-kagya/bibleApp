import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import io from 'socket.io-client'

const ScriptureContext = createContext()

export const useScripture = () => {
  const context = useContext(ScriptureContext)
  if (!context) {
    throw new Error('useScripture must be used within a ScriptureProvider')
  }
  return context
}

export const ScriptureProvider = ({ children }) => {
  const [detectedScriptures, setDetectedScriptures] = useState([])
  const [suggestedScriptures, setSuggestedScriptures] = useState([])
  const [themes, setThemes] = useState(null)

  // Preview State (Local)
  const [currentScripture, setCurrentScripture] = useState(null)

  // Live State (Broadcasted)
  const [liveScripture, setLiveScripture] = useState(null)

  // Live Audio Transcript
  const [liveTranscript, setLiveTranscript] = useState('')

  // Projection History State
  const [projectionHistory, setProjectionHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('projectionHistory')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [socket, setSocket] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isSmartAnalyzing, setIsSmartAnalyzing] = useState(false)

  // Initialize Socket.io connection
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    const newSocket = io(apiUrl)

    newSocket.on('connect', () => {
      console.log('✓ Connected to server:', newSocket.id)
      setIsConnected(true)
    })

    newSocket.on('disconnect', () => {
      console.log('✗ Disconnected from server')
      setIsConnected(false)
    })

    newSocket.on('session-started', (data) => {
      console.log('✓ Session started:', data.sessionId)
      setSessionId(data.sessionId)
    })

    newSocket.on('analysis-update', (data) => {
      console.log('📊 Analysis update received')
      setDetectedScriptures(data.detected || [])
      setSuggestedScriptures(data.suggested || [])
      setThemes(data.themes || null)
    })

    newSocket.on('scriptures-detected', (data) => {
      console.log('📖 Scriptures detected')
      setDetectedScriptures(data.detected || [])
      setSuggestedScriptures(data.suggested || [])
      setThemes(data.themes || null)
    })

    // Live Presentation Updates
    newSocket.on('live-update', (data) => {
      console.log('🔴 Live Update:', data);
      setLiveScripture(data);
    })

    // Live Audio Analysis Results
    newSocket.on('analysis-result', (data) => {
      console.log('🎤 Live audio analysis:', data)

      const incomingDetections = (data.detected || []).map(d => ({
        ...d,
        isSmart: data.isSmart || d.isSmart,
        reasoning: data.reasoning || d.reasoning
      }))

      if (incomingDetections.length > 0) {
        setDetectedScriptures(prev => {
          // Create a Map for easy reference-based lookup/deduplication
          const combined = new Map();

          // Add existing ones first to preserve order (they will be overwritten if duplicate)
          prev.forEach(item => combined.set(item.reference, item));

          // Add/Update with new ones
          incomingDetections.forEach(item => {
            const existing = combined.get(item.reference);
            if (existing) {
              // Update existing item with new data (if smart lane found more info)
              combined.set(item.reference, {
                ...existing,
                ...item,
                isSmart: existing.isSmart || item.isSmart,
                reasoning: item.reasoning || existing.reasoning
              });
            } else {
              combined.set(item.reference, item);
            }
          });

          // Convert back to array and keep only the last 10 items to prevent infinite list growth
          const result = Array.from(combined.values());
          return result.slice(-10);
        });
      }

      if (data.isSmart) {
        setIsSmartAnalyzing(false) // Stop spinner
      }

      if (data.suggested) setSuggestedScriptures(data.suggested)
      if (data.themes) setThemes(data.themes)
    })

    // Status Updates (for UI spinners)
    newSocket.on('analysis-status', (data) => {
      if (data.state === 'analyzing') {
        setIsSmartAnalyzing(true)
      } else {
        setIsSmartAnalyzing(false)
      }
    })

    // Transcript Updates
    newSocket.on('transcript-update', (data) => {
      console.log('📝 Transcript:', data.transcript)
      setLiveTranscript(data.fullContext || data.transcript)
    })

    // Context Cleared
    newSocket.on('context-cleared', () => {
      console.log('🧹 Context cleared')
      setDetectedScriptures([])
      setSuggestedScriptures([])
      setThemes(null)
      setLiveTranscript('')
      setIsSmartAnalyzing(false)
    })

    newSocket.on('session-ended', (data) => {
      console.log('✓ Session ended:', data.sessionId)
      setSessionId(null)
    })

    newSocket.on('error', (data) => {
      console.error('❌ Socket error:', data.message)
      setIsSmartAnalyzing(false)
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [])

  // Start a new sermon session
  const startSession = useCallback((title, preacher) => {
    if (socket) {
      console.log('🎤 Starting session:', title)
      socket.emit('start-session', { title, preacher })
    }
  }, [socket])

  // End current session
  const endSession = useCallback(() => {
    if (socket && sessionId) {
      console.log('⏹️ Ending session:', sessionId)
      socket.emit('end-session', { sessionId })
      setSessionId(null)
      setDetectedScriptures([])
      setSuggestedScriptures([])
      setThemes(null)
    }
  }, [socket, sessionId])

  // Send transcript update (for real-time analysis)
  const sendTranscript = useCallback((transcript) => {
    if (socket && sessionId && transcript) {
      socket.emit('transcript-update', { sessionId, transcript })
    }
  }, [socket, sessionId])

  // Manual scripture detection (REST API fallback)
  const detectScriptures = useCallback(async (transcript) => {
    if (!transcript.trim()) return

    setIsAnalyzing(true)
    try {
      const response = await fetch('/api/ai/detect-scriptures', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transcript, sessionId }),
      })

      if (!response.ok) {
        throw new Error('Failed to detect scriptures')
      }

      const data = await response.json()
      setDetectedScriptures(data.detected || [])
      setSuggestedScriptures(data.suggested || [])
      setThemes(data.themes || null)
    } catch (error) {
      console.error('Error detecting scriptures:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }, [sessionId])

  // Get scripture text by reference
  const getScriptureText = useCallback(async (reference) => {
    try {
      const response = await fetch(`/api/scriptures/${encodeURIComponent(reference)}`)
      if (!response.ok) {
        throw new Error('Failed to fetch scripture')
      }
      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error fetching scripture:', error)
      return null
    }
  }, [])

  // Display scripture in presentation mode (Preview)
  const displayScripture = useCallback(async (scripture) => {
    const scriptureData = await getScriptureText(scripture.reference)
    if (scriptureData) {
      setCurrentScripture({
        ...scripture,
        text: scriptureData.text,
        context: scriptureData.context
      })
    }
  }, [getScriptureText])

  // Go Live (Broadcast)
  const goLive = useCallback((scripture) => {
    if (socket && scripture) {
      console.log('🚀 Sending go-live:', scripture.reference);
      // Optimistic Update: Update local state immediately
      setLiveScripture(scripture);
      socket.emit('go-live', scripture);

      // Add to projection history
      setProjectionHistory(prev => {
        const historyItem = {
          id: Date.now(),
          reference: scripture.reference,
          text: scripture.text,
          translation: scripture.translation || 'KJV',
          book: scripture.book,
          chapter: scripture.chapter,
          verse: scripture.verse,
          timestamp: new Date().toISOString()
        }
        // Avoid duplicates of the same reference in a row
        if (prev.length > 0 && prev[0].reference === scripture.reference) {
          return prev
        }
        const updated = [historyItem, ...prev].slice(0, 50) // Keep last 50 items
        localStorage.setItem('projectionHistory', JSON.stringify(updated))
        return updated
      })
    }
  }, [socket]);

  const clearLive = useCallback(() => {
    setLiveScripture(null); // Optimistic clear
    if (socket) {
      socket.emit('clear-live');
    }
  }, [socket]);

  // Semantic search
  const searchSemantic = useCallback(async (query, topK = 10, priority = 'BOTH') => {
    try {
      const response = await fetch('/api/ai/search-semantic', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query, topK, sessionId, priority }),
      })

      if (!response.ok) {
        throw new Error('Failed to search')
      }

      const data = await response.json()
      return Array.isArray(data) ? data : (data.results || [])
    } catch (error) {
      console.error('Error searching:', error)
      return []
    }
  }, [sessionId])

  const clearCurrentScripture = useCallback(() => {
    setCurrentScripture(null)
  }, [])

  const clearAll = useCallback(() => {
    setDetectedScriptures([])
    setSuggestedScriptures([])
    setThemes(null)
    setCurrentScripture(null)
  }, [])

  // Clear projection history
  const clearHistory = useCallback(() => {
    setProjectionHistory([])
    localStorage.removeItem('projectionHistory')
  }, [])

  // Remove single item from history
  const removeFromHistory = useCallback((id) => {
    setProjectionHistory(prev => {
      const updated = prev.filter(item => item.id !== id)
      localStorage.setItem('projectionHistory', JSON.stringify(updated))
      return updated
    })
  }, [])

  const value = {
    detectedScriptures,
    suggestedScriptures,
    themes,
    currentScripture, // Preview
    liveScripture,    // Live
    liveTranscript,   // Live audio transcript
    projectionHistory, // Projection history
    isAnalyzing,
    isSmartAnalyzing,
    isConnected,
    sessionId,
    detectScriptures,
    getScriptureText,
    displayScripture,
    goLive,
    clearLive,
    clearHistory,
    removeFromHistory,
    searchSemantic,
    clearCurrentScripture,
    clearAll,
    startSession,
    endSession,
    sendTranscript,
    socket
  }

  return (
    <ScriptureContext.Provider value={value}>
      {children}
    </ScriptureContext.Provider>
  )
}

