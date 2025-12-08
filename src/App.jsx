import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Header from './components/Header'
import SpeechRecognition from './components/SpeechRecognition'
import PresentationDisplay from './components/PresentationDisplay'
import ScriptureDatabase from './components/ScriptureDatabase'
import { SpeechProvider } from './contexts/SpeechContext'
import { ScriptureProvider, useScripture } from './contexts/ScriptureContext'

// Component to connect Speech and Scripture contexts
const AppContent = () => {
  const { sendTranscript, sessionId } = useScripture()

  // Create a wrapped function that respects session state
  const handleTranscriptChange = (transcript) => {
    if (sessionId && transcript) {
      sendTranscript(transcript)
    }
  }

  return (
    <SpeechProvider onTranscriptChange={handleTranscriptChange}>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-secondary-50 via-white to-primary-50">
          <Header />
          <main className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<PresentationDisplay />} />
              <Route path="/speech" element={<SpeechRecognition />} />
              <Route path="/database" element={<ScriptureDatabase />} />
            </Routes>
          </main>
        </div>
      </Router>
    </SpeechProvider>
  )
}

function App() {
  return (
    <ScriptureProvider>
      <AppContent />
    </ScriptureProvider>
  )
}

export default App
