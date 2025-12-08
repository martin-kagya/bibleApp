import React from 'react'
import { useSpeech } from '../contexts/SpeechContext'
import SpeechControls from './SpeechControls'
import { Mic, AlertCircle } from 'lucide-react'

const SpeechRecognition = () => {
  const { transcript, isListening, error, isSupported } = useSpeech()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Speech Recognition
        </h2>
        <p className="text-gray-600">
          Test and configure speech recognition settings
        </p>
      </div>

      {/* Speech Controls */}
      <div className="flex justify-center">
        <SpeechControls />
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            <p className="text-red-700">Error: {error}</p>
          </div>
        </div>
      )}

      {/* Support Status */}
      {!isSupported && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            <p className="text-yellow-700">
              Speech recognition is not supported in this browser.
              Please use Chrome, Edge, or Safari for the best experience.
            </p>
          </div>
        </div>
      )}

      {/* Live Transcript */}
      <div className="card">
        <div className="flex items-center space-x-2 mb-4">
          <Mic className={`h-5 w-5 ${isListening ? 'text-red-500 animate-pulse' : 'text-gray-400'}`} />
          <h3 className="text-lg font-semibold text-gray-900">
            Live Transcript
          </h3>
          {isListening && (
            <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full">
              Recording
            </span>
          )}
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg min-h-[200px] max-h-[400px] overflow-y-auto">
          {transcript ? (
            <p className="text-gray-800 leading-relaxed">{transcript}</p>
          ) : (
            <p className="text-gray-500 italic">
              {isListening 
                ? 'Start speaking to see the transcript here...' 
                : 'Click "Start Listening" to begin speech recognition'
              }
            </p>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="card bg-blue-50 border-blue-200">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">
          How to Use
        </h3>
        <ul className="space-y-2 text-blue-800">
          <li className="flex items-start space-x-2">
            <span className="text-blue-600 font-bold">1.</span>
            <span>Click "Start Listening" to begin speech recognition</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-600 font-bold">2.</span>
            <span>Speak naturally about biblical topics or quote scripture</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-600 font-bold">3.</span>
            <span>The AI will detect scripture references and paraphrases</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-blue-600 font-bold">4.</span>
            <span>View detected scriptures on the main presentation page</span>
          </li>
        </ul>
      </div>
    </div>
  )
}

export default SpeechRecognition

