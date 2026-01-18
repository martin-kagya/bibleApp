import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import PresentationDisplay from './components/PresentationDisplay'
import LiveDisplay from './components/LiveDisplay'
import { SpeechProvider } from './contexts/SpeechContext'
import { ScriptureProvider, useScripture } from './contexts/ScriptureContext'
import { ProjectionSettingsProvider } from './contexts/ProjectionSettingsContext'
import DebugPanel from './components/DebugPanel'

const MainLayout = () => (
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
);

const AppContent = () => {
  const { sendTranscript, sessionId } = useScripture()

  const handleTranscriptChange = (transcript) => {
    if (sessionId && transcript) {
      sendTranscript(transcript)
    }
  }

  return (
    <SpeechProvider onTranscriptChange={handleTranscriptChange}>
      <Router>
        <DebugPanel />
        <Routes>
          <Route path="/live" element={<LiveDisplay />} />
          {/* Main Route - Wraps Dashboard via PresentationDisplay */}
          <Route path="/*" element={
            <div className="min-h-screen bg-background">
              {/* No Header - Dashboard has its own */}
              <Routes>
                <Route path="/" element={<PresentationDisplay />} />
              </Routes>
            </div>
          } />
        </Routes>
      </Router>
    </SpeechProvider>
  )
}

function App() {
  return (
    <ProjectionSettingsProvider>
      <ScriptureProvider>
        <AppContent />
      </ScriptureProvider>
    </ProjectionSettingsProvider>
  )
}

export default App
