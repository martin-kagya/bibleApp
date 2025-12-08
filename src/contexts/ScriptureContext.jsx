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
  const [currentScripture, setCurrentScripture] = useState(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [socket, setSocket] = useState(null)
  const [sessionId, setSessionId] = useState(null)
  const [isConnected, setIsConnected] = useState(false)

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

    newSocket.on('session-ended', (data) => {
      console.log('✓ Session ended:', data.sessionId)
      setSessionId(null)
    })

    newSocket.on('error', (data) => {
      console.error('❌ Socket error:', data.message)
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

  // Display scripture in presentation mode
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
      return data.results || []
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

  const value = {
    detectedScriptures,
    suggestedScriptures,
    themes,
    currentScripture,
    isAnalyzing,
    isConnected,
    sessionId,
    detectScriptures,
    getScriptureText,
    displayScripture,
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

