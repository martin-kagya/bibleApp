import React, { useEffect } from 'react'
import { useSpeech } from '../contexts/SpeechContext'
import { useScripture } from '../contexts/ScriptureContext'
import SpeechControls from './SpeechControls'
import ScriptureCard from './ScriptureCard'
import SuggestedScriptures from './SuggestedScriptures'
import ThemeDisplay from './ThemeDisplay'
import SessionControls from './SessionControls'
import SemanticSearch from './SemanticSearch'
import { Mic, BookOpen, Sparkles, Lightbulb } from 'lucide-react'

const PresentationDisplay = () => {
  const { transcript, isListening } = useSpeech()
  const {
    detectedScriptures,
    suggestedScriptures,
    themes,
    currentScripture,
    isAnalyzing,
    isConnected,
    sessionId,
    sendTranscript,
    displayScripture,
    clearCurrentScripture
  } = useScripture()

  // Send transcript updates for real-time analysis
  useEffect(() => {
    if (transcript && sessionId) {
      sendTranscript(transcript)
    }
  }, [transcript, sessionId, sendTranscript])

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold mb-3 tracking-tight font-display bg-gradient-to-r from-primary-700 to-primary-500 bg-clip-text text-transparent">
          Bible Presentation App
        </h1>
        <p className="text-secondary-500 text-lg font-medium max-w-2xl mx-auto">
          AI-Powered Scripture Detection & Semantic Search
        </p>
      </div>

      {/* Top Controls Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Session Controls */}
        <SessionControls />

        {/* Speech Controls */}
        <div className="card">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Speech Recognition</h3>
          <div className="flex flex-col items-center justify-center space-y-4">
            <SpeechControls />

            {/* Status Indicators */}
            <div className="flex flex-wrap gap-2 justify-center">
              <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium ${isListening ? 'bg-red-100 text-red-700 border-2 border-red-300' : 'bg-gray-100 text-gray-600'
                }`}>
                <Mic className="h-4 w-4" />
                <span>{isListening ? 'Listening...' : 'Microphone Off'}</span>
              </div>

              {isAnalyzing && (
                <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium bg-blue-100 text-blue-700 border-2 border-blue-300">
                  <Sparkles className="h-4 w-4 animate-spin" />
                  <span>AI Analyzing...</span>
                </div>
              )}

              {sessionId && (
                <div className="flex items-center space-x-2 px-3 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-700 border-2 border-green-300">
                  <span>✓ Session Active</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Semantic Search */}
      <SemanticSearch />

      {/* Themes Display */}
      {themes && themes.mainThemes && themes.mainThemes.length > 0 && (
        <ThemeDisplay themes={themes} />
      )}

      {/* Current Scripture Display */}
      {currentScripture && (
        <div className="card max-w-4xl mx-auto border-4 border-blue-500 shadow-2xl bg-gradient-to-br from-white to-blue-50">
          <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4">
            <div>
              <h3 className="text-3xl font-bold text-gray-900 mb-2 font-display tracking-tight flex items-center gap-3">
                <span className="p-2 bg-primary-100 rounded-lg text-primary-600">
                  <BookOpen size={24} />
                </span>
                {currentScripture.reference}
              </h3>
              {currentScripture.matchType && (
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider ${currentScripture.matchType === 'explicit' ? 'bg-emerald-100 text-emerald-700' :
                    currentScripture.matchType === 'paraphrase' ? 'bg-amber-100 text-amber-700' :
                      'bg-primary-100 text-primary-700'
                    }`}>
                    {currentScripture.matchType === 'explicit' ? 'Direct Quote' :
                      currentScripture.matchType === 'paraphrase' ? 'Paraphrase' :
                        currentScripture.matchType === 'semantic' ? 'Semantic Match' :
                          'Cross-Reference'}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={clearCurrentScripture}
              className="text-gray-400 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-full"
            >
              ✕
            </button>
          </div>

          <div className="scripture-text mb-6 pl-4 border-l-4 border-primary-500 italic">
            "{currentScripture.text}"
          </div>

          {currentScripture.context && (
            <div className="text-sm text-secondary-600 bg-secondary-50 p-4 rounded-xl border border-secondary-100">
              <strong className="text-secondary-900 block mb-1 font-semibold uppercase text-xs tracking-wider">Context</strong>
              {currentScripture.context}
            </div>
          )}

          {currentScripture.confidence && (
            <div className="mt-4 flex items-center gap-2 text-xs font-medium text-secondary-400 uppercase tracking-widest">
              <span>AI Confidence</span>
              <div className="h-1 flex-1 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary-500 rounded-full transition-all duration-500"
                  style={{ width: `${currentScripture.confidence * 100}%` }}
                />
              </div>
              <span>{Math.round(currentScripture.confidence * 100)}%</span>
            </div>
          )}
        </div>
      )}

      {/* Results Section */}
      {(detectedScriptures.length > 0 || suggestedScriptures.length > 0) && (
        <div className="space-y-6">
          {/* Detected Scriptures */}
          {detectedScriptures.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                  <span>Detected Scriptures</span>
                  <span className="text-sm font-normal text-gray-600 bg-blue-100 px-3 py-1 rounded-full">
                    {detectedScriptures.length}
                  </span>
                </h3>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {detectedScriptures.map((scripture, index) => (
                  <ScriptureCard
                    key={index}
                    scripture={scripture}
                    onDisplay={displayScripture}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Suggested Scriptures */}
          {suggestedScriptures.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Lightbulb className="h-6 w-6 text-yellow-600" />
                  <span>Suggested Scriptures</span>
                  <span className="text-sm font-normal text-gray-600 bg-yellow-100 px-3 py-1 rounded-full">
                    {suggestedScriptures.length}
                  </span>
                </h3>
                <p className="text-sm text-gray-600">
                  Based on themes and context
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {suggestedScriptures.map((scripture, index) => (
                  <ScriptureCard
                    key={index}
                    scripture={scripture}
                    onDisplay={displayScripture}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Transcript Display */}
      {transcript && (
        <div className="card max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Mic className="h-5 w-5 text-gray-600" />
              Live Transcript
            </h3>
            <span className="text-xs text-gray-500">
              {transcript.length} characters
            </span>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-700 max-h-48 overflow-y-auto leading-relaxed">
            {transcript || <span className="text-gray-400 italic">Start speaking to see transcript...</span>}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!sessionId && !detectedScriptures.length && !transcript && (
        <div className="card text-center py-16 bg-gradient-to-br from-white to-primary-50/50 border-dashed border-2 border-primary-100">
          <div className="max-w-lg mx-auto">
            <div className="text-7xl mb-6 animate-pulse">🎤</div>
            <h3 className="text-3xl font-bold text-gray-900 mb-4 font-display">
              Ready to Preach?
            </h3>
            <p className="text-secondary-500 mb-8 text-lg leading-relaxed">
              Start a sermon session below and begin speaking. Our AI will listen, analyze, and display scriptures in real-time.
            </p>
            <div className="grid grid-cols-2 gap-4 text-left">
              {[
                'Real-time Recognition', 'Auto-Detection',
                'Theme Analysis', 'Smart Search'
              ].map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-secondary-600 bg-white p-3 rounded-lg shadow-sm border border-secondary-100">
                  <div className="w-2 h-2 rounded-full bg-emerald-400" />
                  {feature}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PresentationDisplay
