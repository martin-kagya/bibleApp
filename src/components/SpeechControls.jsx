import React, { useEffect } from 'react'
import { useSpeech } from '../contexts/SpeechContext'
import { Mic, MicOff, RotateCcw } from 'lucide-react'

const SpeechControls = () => {
  const {
    isListening,
    isSupported,
    error,
    startListening,
    stopListening,
    clearTranscript,
    initializeSpeechRecognition
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
      <button
        onClick={isListening ? stopListening : startListening}
        className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
          isListening
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-primary-600 hover:bg-primary-700 text-white'
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
            <span>Start Listening</span>
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
