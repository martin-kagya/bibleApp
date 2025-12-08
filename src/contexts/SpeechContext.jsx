import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { useScripture } from './ScriptureContext'

const SpeechContext = createContext()

export const useSpeech = () => {
  const context = useContext(SpeechContext)
  if (!context) {
    throw new Error('useSpeech must be used within a SpeechProvider')
  }
  return context
}

export const SpeechProvider = ({ children, onTranscriptChange }) => {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isSupported, setIsSupported] = useState(false)
  const [error, setError] = useState(null)
  const [mediaRecorder, setMediaRecorder] = useState(null)

  const { socket, isConnected } = useScripture()

  // Initialize - check support
  useEffect(() => {
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      setIsSupported(true)
    } else {
      setIsSupported(false)
      setError('Audio capture not supported in this environment')
    }
  }, [])

  // Listen for transcript updates from server
  useEffect(() => {
    if (!socket) return

    const handleTranscriptUpdate = (data) => {
      // Append text
      const text = data.transcript || data
      if (text) {
        setTranscript(prev => {
          const newTranscript = prev + ' ' + text
          // Notify parent
          if (onTranscriptChange) onTranscriptChange(newTranscript)
          return newTranscript
        })
      }
    }

    socket.on('transcript-update', handleTranscriptUpdate)

    return () => {
      socket.off('transcript-update', handleTranscriptUpdate)
    }
  }, [socket, onTranscriptChange])

  const startListening = useCallback(async () => {
    if (!isSupported) return
    setError(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream) // Default mimeType (usually webm/opus)

      recorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && socket && isConnected) {
          // Send blob directly? Socket.io supports binary
          // Or convert to specific format. 
          // For now, send blob. Server needs to handle it.
          // Electron/Node might need Buffer.
          const buffer = await event.data.arrayBuffer()
          socket.emit('audio-chunk', { audio: buffer })
        }
      }

      recorder.start(3000) // Chunk every 3 seconds
      setMediaRecorder(recorder)
      setIsListening(true)

    } catch (err) {
      console.error('Error starting recording:', err)
      setError('Failed to access microphone: ' + err.message)
      setIsListening(false)
    }
  }, [isSupported, socket, isConnected])

  const stopListening = useCallback(() => {
    if (mediaRecorder && isListening) {
      mediaRecorder.stop()
      mediaRecorder.stream.getTracks().forEach(track => track.stop())
      setMediaRecorder(null)
      setIsListening(false)
    }
  }, [mediaRecorder, isListening])

  const clearTranscript = useCallback(() => {
    setTranscript('')
  }, [])

  // Compatibility stub
  const initializeSpeechRecognition = () => { }

  const value = {
    isListening,
    transcript,
    isSupported,
    error,
    startListening,
    stopListening,
    clearTranscript,
    initializeSpeechRecognition
  }

  return (
    <SpeechContext.Provider value={value}>
      {children}
    </SpeechContext.Provider>
  )
}
