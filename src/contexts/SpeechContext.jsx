import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { useScripture } from './ScriptureContext'

const SpeechContext = createContext()

export const useSpeech = () => {
  const context = useContext(SpeechContext)
  if (!context) {
    throw new Error('useSpeech must be used within a SpeechProvider')
  }
  return context
}

const VAD_THRESHOLD = 0.005
let lastSpeechTime = 0

export const SpeechProvider = ({ children, onTranscriptChange }) => {
  const [isListening, setIsListening] = useState(false)
  const [transcriptHistory, setTranscriptHistory] = useState([])
  const [currentSegment, setCurrentSegment] = useState('')
  const transcript = [...transcriptHistory, currentSegment].filter(Boolean).join(' ')

  const [isSupported, setIsSupported] = useState(false)
  const [error, setError] = useState(null)

  const audioStreamRef = useRef(null)
  const audioContextRef = useRef(null)
  const processorRef = useRef(null)
  const audioBufferRef = useRef([])
  const recordingIntervalRef = useRef(null)
  const finalTranscriptRef = useRef('')

  const { socket, isConnected } = useScripture()

  // Check for AudioContext support
  useEffect(() => {
    const hasAudioContext = !!(window.AudioContext || window.webkitAudioContext)
    const hasGetUserMedia = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)

    if (hasAudioContext && hasGetUserMedia) {
      setIsSupported(true)
      console.log('✅ Whisper-based speech recognition available')
    } else {
      setIsSupported(false)
      setError('Audio recording not supported in this browser')
      console.error('❌ AudioContext or getUserMedia not available')
    }
  }, [])

  // Listen for transcript updates from backend
  useEffect(() => {
    if (!socket) return

    const handleTranscriptUpdate = (data) => {
      // addDebugLog('Received transcript update', 'info', { text: data.transcript, isFinal: data.isFinal })

      // Use displayTranscript if available (Vosk sends this), otherwise fallback to fullContext/transcript
      const transcriptText = data.displayTranscript || data.fullContext || data.transcript || ''

      if (transcriptText) {
        if (data.isFinal) {
          setTranscriptHistory(prev => [...prev, transcriptText])
          setCurrentSegment('')
        } else {
          setCurrentSegment(transcriptText)
        }

        if (onTranscriptChange && data.isFinal) {
          onTranscriptChange(transcriptText)
        }
      }
    }

    const handleError = (errorMsg) => {
      console.error('❌ Backend error:', errorMsg)
      setError(errorMsg)
    }

    socket.on('transcript-update', handleTranscriptUpdate)
    socket.on('error', handleError)

    return () => {
      socket.off('transcript-update', handleTranscriptUpdate)
      socket.off('error', handleError)
    }
  }, [socket, onTranscriptChange])

  // Listen for context cleared from backend
  useEffect(() => {
    if (!socket) return

    const handleContextCleared = () => {
      setTranscriptHistory([])
      setCurrentSegment('')
      finalTranscriptRef.current = ''
    }

    socket.on('context-cleared', handleContextCleared)

    return () => {
      socket.off('context-cleared', handleContextCleared)
    }
  }, [socket])

  /**
   * Convert Float32Array PCM data to WAV format at 16kHz mono
   */
  const pcmToWav = (samples, sampleRate = 16000) => {
    const buffer = new ArrayBuffer(44 + samples.length * 2)
    const view = new DataView(buffer)

    // Write WAV header
    const writeString = (offset, string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }

    writeString(0, 'RIFF')
    view.setUint32(4, 36 + samples.length * 2, true)
    writeString(8, 'WAVE')
    writeString(12, 'fmt ')
    view.setUint32(16, 16, true) // fmt chunk size
    view.setUint16(20, 1, true) // PCM format
    view.setUint16(22, 1, true) // mono
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * 2, true) // byte rate
    view.setUint16(32, 2, true) // block align
    view.setUint16(34, 16, true) // bits per sample
    writeString(36, 'data')
    view.setUint32(40, samples.length * 2, true)

    // Write PCM samples
    let offset = 44
    for (let i = 0; i < samples.length; i++) {
      const s = Math.max(-1, Math.min(1, samples[i]))
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
      offset += 2
    }

    return buffer
  }

  /**
   * Resample audio from source rate to 16kHz
   */
  const resample = (samples, sourceSampleRate, targetSampleRate = 16000) => {
    if (sourceSampleRate === targetSampleRate) {
      return samples
    }

    const ratio = sourceSampleRate / targetSampleRate
    const newLength = Math.round(samples.length / ratio)
    const result = new Float32Array(newLength)

    for (let i = 0; i < newLength; i++) {
      const srcIndex = i * ratio
      const srcIndexInt = Math.floor(srcIndex)
      const fraction = srcIndex - srcIndexInt

      if (srcIndexInt + 1 < samples.length) {
        result[i] = samples[srcIndexInt] * (1 - fraction) + samples[srcIndexInt + 1] * fraction
      } else {
        result[i] = samples[srcIndexInt]
      }
    }

    return result
  }

  const [sourceType, setSourceType] = useState('mic') // 'mic' or 'system'

  /**
   * Start listening from Microphone or System Audio
   * @param {string} source - 'mic' or 'system' 
   */
  const startListening = useCallback(async (source = 'mic') => {
    if (!isSupported) {
      const msg = 'Audio recording not supported in this browser'
      console.error('❌', msg)
      setError(msg)
      return
    }

    if (!socket?.connected) {
      const msg = 'Not connected to server'
      console.error('❌', msg)
      setError(msg)
      return
    }

    setError(null)
    setSourceType(source)
    finalTranscriptRef.current = ''
    audioBufferRef.current = []

    try {
      console.log(`🎤 Starting recording source: ${source}...`)


      let stream;

      if (source === 'system') {
        // System Audio Capture (requires video track hack)
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true, // Required for audio in Chrome
          audio: {
            echoCancellation: false, // Don't cancel system audio!
            noiseSuppression: false,
            autoGainControl: false,
            sampleRate: 44100 // Standard
          }
        })
        console.log('🖥️ System Audio access granted')
      } else {
        // Microphone Capture
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        })
        console.log('🎤 Microphone access granted')
      }

      audioStreamRef.current = stream

      // Create AudioContext
      const AudioContextClass = window.AudioContext || window.webkitAudioContext
      const audioContext = new AudioContextClass()
      audioContextRef.current = audioContext

      if (audioContext.state === 'suspended') {
        console.log('▶️ Resuming suspended AudioContext...')
        await audioContext.resume()
      }
      console.log(`🔊 AudioContext State: ${audioContext.state}`)

      const mediaSource = audioContext.createMediaStreamSource(stream)

      // Use ScriptProcessorNode for direct PCM access
      // Note: ScriptProcessorNode is deprecated but widely supported
      // bufferSize of 4096 gives good balance between latency and processing
      const processor = audioContext.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor

      // Connect the graph: Source -> Processor -> Destination
      // We need to connect to destination to keep the processor alive in some browsers,
      // but since we don't write to outputBuffer, it should be silent.
      mediaSource.connect(processor)
      processor.connect(audioContext.destination)

      console.log('🔗 Audio graph connected: Source -> Processor -> Destination')

      setIsListening(true)

      let audioProcessCount = 0
      let maxAudioLevel = 0
      let audioLevelSamples = 0

      console.log('✅ Recording started - speak into your microphone')
      console.log('📊 Audio level monitoring enabled - watch for audio level indicators')

      // Vosk expects continuous streaming for real-time performance
      const STREAM_INTERVAL = 400 // Send data every 400ms

      // Monitor and send loop
      recordingIntervalRef.current = setInterval(() => {
        const bufferCount = audioBufferRef.current.length
        if (bufferCount > 0) {
          sendAudioChunk()
        }
      }, STREAM_INTERVAL)

      // Helper to send what we have
      const sendAudioChunk = () => {
        try {
          const bufferCount = audioBufferRef.current.length
          if (bufferCount === 0) return

          // Concatenate
          const totalLength = audioBufferRef.current.reduce((acc, arr) => acc + arr.length, 0)
          const concatenated = new Float32Array(totalLength)
          let offset = 0
          for (const arr of audioBufferRef.current) {
            concatenated.set(arr, offset)
            offset += arr.length
          }
          audioBufferRef.current = [] // Clear buffer immediately

          const timestamp = new Date().toISOString()
          console.log(`🎤 [${timestamp}] Processing ${concatenated.length} samples`)

          // Resample to 16kHz for Whisper (reduces bandwidth and server load)
          const resampled = resample(concatenated, audioContext.sampleRate, 16000)
          const wavBuffer = pcmToWav(resampled, 16000)

          console.log(`🎤 Sending ${wavBuffer.byteLength} bytes at 16000Hz`)

          if (socket?.connected) {
            socket.emit('audio-chunk', { audio: wavBuffer })
            console.log(`✅ Sent ${wavBuffer.byteLength} bytes`)
          }
        } catch (err) {
          console.error('Send error:', err)
        }
      }

      // Hook into processor to update VAD state
      // const originalOnProcess = processor.onaudioprocess; // We are replacing logic fully now
      processor.onaudioprocess = (e) => {
        if (audioProcessCount === 0) {
          console.log('🎤 Audio processing callback started')
        }
        audioProcessCount++
        const inputData = e.inputBuffer.getChannelData(0)

        let sum = 0
        let max = 0
        for (let i = 0; i < inputData.length; i++) {
          const val = inputData[i]
          sum += val * val
          if (Math.abs(val) > max) max = Math.abs(val)
        }
        const rms = Math.sqrt(sum / inputData.length)

        // VAD Check
        if (rms > VAD_THRESHOLD) {
          lastSpeechTime = Date.now()
        }

        // Log audio levels every 20 callbacks (~0.2 seconds) for better debugging
        if (audioProcessCount % 20 === 0) {
          const isSpeech = rms > VAD_THRESHOLD
          const lev = (max * 100).toFixed(1)

          if (max < 0.0001) {
            console.warn('⚠️ No audio input detected (mic muted?)')
          }
        }

        // Store data
        audioBufferRef.current.push(new Float32Array(inputData))
      }

    } catch (err) {
      console.error('❌ Failed to start recording:', err)

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('❌ Microphone access denied - please allow microphone permission')
      } else if (err.name === 'NotFoundError') {
        setError('❌ No microphone found - please connect a microphone')
      } else {
        setError('Failed to start recording: ' + err.message)
      }

      setIsListening(false)
    }
  }, [isSupported, socket])

  const stopListening = useCallback(() => {
    console.log('🛑 Stopping recording...')

    // IMMEDIATE Visual Feedback
    setIsListening(false)

    try {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
        recordingIntervalRef.current = null
      }

      if (processorRef.current) {
        processorRef.current.disconnect()
        processorRef.current.onaudioprocess = null
        processorRef.current = null
      }

      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close()
        audioContextRef.current = null
      }

      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop())
        audioStreamRef.current = null
      }

      audioBufferRef.current = []
      console.log('✅ Recording stopped (cleanup complete)')
    } catch (err) {
      console.error('Error during stopListening cleanup:', err)
      // Even if cleanup fails, we already updated state
    }
  }, [])

  const clearTranscript = useCallback(() => {
    console.log('🧹 Clearing transcript and context...')
    setTranscriptHistory([])
    setCurrentSegment('')
    finalTranscriptRef.current = ''

    // Notify backend to clear context
    if (socket?.connected) {
      socket.emit('clear-context')
    }
  }, [socket])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current)
      }
      if (processorRef.current) {
        processorRef.current.disconnect()
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close()
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach(track => track.stop())
      }
    }
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
    initializeSpeechRecognition,
    sourceType
  }

  return (
    <SpeechContext.Provider value={value}>
      {children}
    </SpeechContext.Provider>
  )
}
