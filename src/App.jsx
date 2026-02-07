import React, { useState, useEffect } from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import PresentationDisplay from './components/PresentationDisplay'
import LiveDisplay from './components/LiveDisplay'
import { SpeechProvider } from './contexts/SpeechContext'
import { ScriptureProvider, useScripture } from './contexts/ScriptureContext'
import { ProjectionSettingsProvider } from './contexts/ProjectionSettingsContext'


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

const MainAppContent = () => {
  const { sendTranscript, sessionId } = useScripture()

  const handleTranscriptChange = (transcript) => {
    if (sessionId && transcript) {
      sendTranscript(transcript)
    }
  }

  return (
    <SpeechProvider onTranscriptChange={handleTranscriptChange}>
      <div className="min-h-screen bg-background">
        <Routes>
          <Route path="/" element={<PresentationDisplay />} />
        </Routes>
      </div>
    </SpeechProvider>
  )
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Live Display Route - WITH CONTEXT PROVIDERS (for receiving live updates) */}
        {/* but NOT the SpeechProvider (which would trigger window opening) */}
        <Route path="/live" element={
          <ProjectionSettingsProvider>
            <ScriptureProvider>
              <LiveDisplay />
            </ScriptureProvider>
          </ProjectionSettingsProvider>
        } />

        {/* Main App Routes - WITH ALL CONTEXT PROVIDERS */}
        <Route path="/*" element={
          <ProjectionSettingsProvider>
            <ScriptureProvider>
              <MainAppContent />
            </ScriptureProvider>
          </ProjectionSettingsProvider>
        } />
      </Routes>
    </Router>
  )
}

export default App
