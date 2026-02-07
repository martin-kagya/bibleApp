import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import io from 'socket.io-client'

// Helper to open live display window on extended display
const openLiveDisplayWindow = () => {
  console.log('🔍 openLiveDisplayWindow called');
  console.log('🔍 window.electron exists?', !!window.electron);
  console.log('🔍 window.electron.openProjector exists?', !!(window.electron && window.electron.openProjector));

  try {
    if (window.electron && window.electron.openProjector) {
      console.log('✅ Using Electron projector window (supports extended displays)');
      window.electron.openProjector();
      console.log('✅ window.electron.openProjector() called successfully');
      return;
    }

    console.log('⚠️ Falling back to browser window.open()');
    let windowFeatures = 'width=1920,height=1080,menubar=no,toolbar=no,location=no,status=no,scrollbars=no';

    try {
      const x = screen.width - 200;
      const y = 0;
      windowFeatures += `,left=${x},top=${y}`;
    } catch (e) {
      console.warn('Could not calculate extended display position:', e);
    }

    const liveUrl = window.location.origin + '/live';
    console.log('🔍 Opening window with URL:', liveUrl);
    const liveWindow = window.open(liveUrl, 'pneumavoice_live_display', windowFeatures);

    if (liveWindow) {
      liveWindow.focus();
      setTimeout(() => {
        try {
          if (liveWindow && !liveWindow.closed) {
            try {
              const targetX = screen.width + 100;
              liveWindow.moveTo(targetX, 0);
            } catch (moveError) {
              console.log('Could not move window:', moveError);
              liveWindow.resizeTo(1920, 1080);
            }
            liveWindow.focus();
          }
        } catch (e) {
          console.log('Could not position live display window:', e);
        }
      }, 500);
      return liveWindow;
    } else {
      console.error('Failed to open live display window. Check if popups are blocked.');
    }
  } catch (e) {
    console.warn('Could not open live display window:', e);
  }
  return null;
};

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
  // Lexicon Sync State (Background)
  const [lexiconScripture, setLexiconScripture] = useState(null)
  // Live State (Broadcasted)
  const [liveScripture, setLiveScripture] = useState(null)
  // Live Audio Transcript
  const [liveTranscript, setLiveTranscript] = useState('')
  // Unified Preview State
  const [previewContent, setPreviewContent] = useState(null)

  // Projection History State
  const [projectionHistory, setProjectionHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('projectionHistory')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  // Service Schedule State
  const [schedule, setSchedule] = useState(() => {
    try {
      const saved = localStorage.getItem('serviceSchedule')
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

  useEffect(() => {
    const initSocket = async () => {
      let port = 8000;
      if (window.electron && window.electron.getServerPort) {
        port = await window.electron.getServerPort();
        console.log('📡 Fetched server port from Electron:', port);
      }

      const apiUrl = import.meta.env.VITE_API_URL || (window.electron ? `http://127.0.0.1:${port}` : 'http://localhost:8000');
      console.log('🔗 Connecting socket to:', apiUrl);
      const newSocket = io(apiUrl);

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

      newSocket.on('live-update', (data) => {
        console.log('🔴 Live Update received:', data);
        if (data === null) {
          setLiveScripture(null);
        } else if (data) {
          setLiveScripture(data);
        }
      })

      newSocket.on('analysis-result', (data) => {
        const incomingDetections = (data.detected || []).map(d => ({
          ...d,
          isSmart: data.isSmart || d.isSmart,
          reasoning: data.reasoning || d.reasoning
        }));

        if (incomingDetections.length > 0) {
          setDetectedScriptures(prev => {
            const combined = new Map();
            prev.forEach(item => combined.set(item.reference, item));
            incomingDetections.forEach(item => {
              const existing = combined.get(item.reference);
              if (existing) {
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
            const result = Array.from(combined.values());
            return result.slice(-10);
          });
        }

        if (data.isSmart) {
          setIsSmartAnalyzing(false)
        }
        if (data.suggested) setSuggestedScriptures(data.suggested)
        if (data.themes) setThemes(data.themes)
      })

      newSocket.on('analysis-status', (data) => {
        if (data.state === 'analyzing') {
          setIsSmartAnalyzing(true)
        } else {
          setIsSmartAnalyzing(false)
        }
      })

      newSocket.on('transcript-update', (data) => {
        console.log('📝 Transcript:', data.transcript)
        setLiveTranscript(data.fullContext || data.transcript)
      })

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
    }

    initSocket();

    return () => {
      // Cleanup will happen when the component unmounts
    }
  }, []);

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

  // --- Schedule Management ---
  const addToSchedule = useCallback((item) => {
    setSchedule(prev => {
      // Ensure unique ID
      const newItem = {
        ...item,
        id: item.id || Date.now() + Math.random(),
        timestamp: new Date().toISOString()
      }
      const updated = [...prev, newItem]
      localStorage.setItem('serviceSchedule', JSON.stringify(updated))
      return updated
    })
  }, [])

  const removeFromSchedule = useCallback((id) => {
    setSchedule(prev => {
      const updated = prev.filter(item => item.id !== id)
      localStorage.setItem('serviceSchedule', JSON.stringify(updated))
      return updated
    })
  }, [])

  const moveScheduleItem = useCallback((fromIndex, toIndex) => {
    if (toIndex < 0 || toIndex >= schedule.length) return;
    setSchedule(prev => {
      const result = Array.from(prev);
      const [removed] = result.splice(fromIndex, 1);
      result.splice(toIndex, 0, removed);
      localStorage.setItem('serviceSchedule', JSON.stringify(result))
      return result;
    });
  }, [schedule.length]);

  const clearSchedule = useCallback(() => {
    setSchedule([]);
    localStorage.removeItem('serviceSchedule');
  }, []);

  const saveScheduleToFile = useCallback(async () => {
    if (window.electron && window.electron.saveSessionFile) {
      const success = await window.electron.saveSessionFile(schedule);
      return success;
    }
    return false;
  }, [schedule]);

  const loadScheduleFromFile = useCallback(async () => {
    if (window.electron && window.electron.loadSessionFile) {
      const data = await window.electron.loadSessionFile();
      if (data && Array.isArray(data)) {
        setSchedule(data);
        localStorage.setItem('serviceSchedule', JSON.stringify(data));
        return true;
      }
    }
    return false;
  }, []);

  // Manual scripture detection (REST API fallback)
  const detectScriptures = useCallback(async (transcript) => {
    if (!transcript.trim()) return

    setIsAnalyzing(true)
    try {
      const response = await fetch('/api/ai/detect-scriptures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const response = await fetch(`/api/scriptures/verse/${encodeURIComponent(reference)}`)
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

  // Display Scripture (Preview)
  const displayScripture = useCallback(async (scripture) => {
    const optimisticContent = {
      type: 'scripture',
      reference: scripture.reference,
      text: scripture.text,
      content: scripture.text,
      translation: scripture.translation || 'KJV',
      confidence: scripture.confidence
    };

    setCurrentScripture(optimisticContent);
    setPreviewContent(optimisticContent);
    setLexiconScripture(optimisticContent); // Sync to Lexicon

    const scriptureData = await getScriptureText(scripture.reference)
    if (scriptureData) {
      const content = {
        type: 'scripture',
        reference: scripture.reference,
        title: scripture.reference,
        text: scriptureData.text,
        content: scriptureData.text,
        context: scriptureData.context,
        translation: scripture.translation || 'KJV'
      };
      setCurrentScripture(content);
      setPreviewContent(content);
      setLexiconScripture(content);
    }
  }, [getScriptureText])

  // Go Live (Broadcast)
  const goLive = useCallback(async (scripture) => {
    if (socket && scripture) {
      let finalScripture = { ...scripture };

      // Sync with Lexicon (only for scriptures)
      if (finalScripture.type === 'scripture' || (finalScripture.reference && !finalScripture.type)) {
        setLexiconScripture(finalScripture);
      }

      // Ensure type is distinct
      if (finalScripture.reference && !finalScripture.type) {
        finalScripture.type = 'scripture';
      }

      // Fetch canonical text from local DB
      if (finalScripture.type === 'scripture') {
        const fullData = await getScriptureText(finalScripture.reference);
        if (fullData) {
          finalScripture = {
            ...finalScripture,
            ...fullData,
            content: fullData.text
          };
          setLexiconScripture(finalScripture);
        }
      }

      // Optimistic Update
      setLiveScripture(finalScripture);
      socket.emit('go-live', finalScripture);

      // Auto-open live display window
      setTimeout(() => {
        openLiveDisplayWindow();
      }, 200);

      // Add to projection history (Only if it's a scripture)
      if (finalScripture.type === 'scripture' && finalScripture.reference) {
        setProjectionHistory(prev => {
          const filtered = prev.filter(item => item.reference !== finalScripture.reference)
          const historyItem = {
            id: Date.now(),
            reference: finalScripture.reference,
            text: finalScripture.text || finalScripture.content,
            translation: finalScripture.translation || 'KJV',
            book: finalScripture.book,
            chapter: finalScripture.chapter,
            verse: finalScripture.verse,
            timestamp: new Date().toISOString()
          }
          const updated = [historyItem, ...filtered].slice(0, 50)
          localStorage.setItem('projectionHistory', JSON.stringify(updated))
          return updated
        })
      }
    }
  }, [socket, getScriptureText]);

  const clearLive = useCallback(() => {
    setLiveScripture(null);
    if (socket) {
      socket.emit('clear-live');
    }
  }, [socket]);

  // Semantic search
  const searchSemantic = useCallback(async (query, topK = 10, priority = 'BOTH', options = {}) => {
    try {
      const response = await fetch('/api/ai/search-semantic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, topK, sessionId, priority, ...options }),
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

  return (
    <ScriptureContext.Provider value={{
      detectedScriptures,
      suggestedScriptures,
      themes,
      currentScripture,
      setCurrentScripture,
      previewContent,
      setPreviewContent,
      lexiconScripture,
      setLexiconScripture,
      liveScripture,
      liveTranscript,
      projectionHistory,
      schedule,
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
      addToSchedule,
      removeFromSchedule,
      moveScheduleItem,
      clearSchedule,
      saveScheduleToFile,
      loadScheduleFromFile,
      searchSemantic,
      clearCurrentScripture,
      clearAll,
      startSession,
      endSession,
      sendTranscript,
      socket
    }}>
      {children}
    </ScriptureContext.Provider>
  )
}
