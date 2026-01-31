import React, { useEffect, useState } from 'react'
import { useSpeech } from '../contexts/SpeechContext'
import { Mic, MicOff, RotateCcw } from 'lucide-react'
import SourcePicker from './SourcePicker'

const SpeechControls = () => {
  const [showPicker, setShowPicker] = useState(false)
  const {
    isListening,
    isSupported,
    error,
    startListening,
    stopListening,
    clearTranscript,
    initializeSpeechRecognition,
    sourceType
  } = useSpeech()

  useEffect(() => {
    initializeSpeechRecognition()
  }, [initializeSpeechRecognition])

  if (!isSupported) {
    return (
      <div className="text-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md">
          <p className="text-red-700">
            Speech recognition is not supported in this browser.
            Please use Chrome, Edge, or Safari.
          </p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md">
          <p className="text-red-700">Error: {error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center space-x-4">
      <div className="flex bg-gray-100 rounded-lg p-1 mr-2">
        <button
          onClick={() => !isListening && startListening('mic')}
          disabled={isListening}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${!isListening && sourceType === 'mic' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          Microphone
        </button>
        <button
          onClick={() => !isListening && startListening('system')}
          disabled={isListening}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${!isListening && sourceType === 'system' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
        >
          System Audio
        </button>
      </div>

      <button
        onClick={() => isListening ? stopListening() : startListening(sourceType)}
        className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${isListening
          ? 'bg-red-600 hover:bg-red-700 text-white'
          : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
      >
        {isListening ? (
          <>
            <MicOff className="h-5 w-5" />
            <span>Stop Listening</span>
          </>
        ) : (
          <>
            <Mic className="h-5 w-5" />
            <span>Start {sourceType === 'system' ? 'System' : 'Mic'}</span>
          </>
        )}
      </button>

      <button
        onClick={clearTranscript}
        className="flex items-center space-x-2 px-4 py-3 rounded-lg font-medium bg-gray-200 hover:bg-gray-300 text-gray-700 transition-colors duration-200"
      >
        <RotateCcw className="h-4 w-4" />
        <span>Clear</span>
      </button>
    </div>
  )
}

export default SpeechControls
