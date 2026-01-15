import React, { useState, useEffect } from 'react'
import { useScripture } from '../contexts/ScriptureContext'
import UnifiedSearch from './UnifiedSearch'
import { Tv, Database, BookOpen, RefreshCw } from 'lucide-react'

const ScriptureDatabase = () => {
  const { liveScripture, clearLive } = useScripture();
  const [databaseStats, setDatabaseStats] = useState(null)

  const loadDatabaseStats = async () => {
    try {
      const response = await fetch('/api/scriptures/stats')
      if (response.ok) {
        const data = await response.json()
        setDatabaseStats(data)
      }
    } catch (error) {
      console.error('Error loading database stats:', error)
    }
  }

  useEffect(() => {
    loadDatabaseStats()
  }, [])

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Scripture Search
        </h2>
        <p className="text-gray-600">
          Search by reference or meaning to find and present scriptures
        </p>
      </div>

      {/* Unified Search Component */}
      <UnifiedSearch translation="KJV" />

      {/* Live Status Indicator */}
      {liveScripture && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in-up">
          <div className="bg-gray-900 text-white rounded-lg shadow-xl p-4 border border-gray-700 max-w-sm">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center space-x-2">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-red-400">ON AIR</span>
              </div>
              <button onClick={clearLive} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="font-bold truncate">{liveScripture.reference}</div>
            <div className="text-xs text-gray-400 truncate">"{liveScripture.text}"</div>
          </div>
        </div>
      )}

      {/* Projector Control */}
      <div className="card bg-gradient-to-r from-gray-800 to-gray-900 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Tv className="w-6 h-6" />
            <div>
              <h3 className="font-bold">Projector Display</h3>
              <p className="text-sm text-gray-300">Open the live presentation window</p>
            </div>
          </div>
          <button
            onClick={() => {
              if (window.electron && window.electron.openProjector) {
                window.electron.openProjector();
              } else {
                window.open('/live', 'ProjectorWindow', 'width=1280,height=720,menubar=no,toolbar=no');
              }
            }}
            className="px-6 py-3 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transition-colors shadow-lg"
          >
            Open Projector
          </button>
        </div>
      </div>

      {/* Database Stats */}
      {databaseStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card text-center">
            <Database className="h-8 w-8 text-primary-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{databaseStats.totalBooks}</div>
            <div className="text-sm text-gray-600">Books</div>
          </div>
          <div className="card text-center">
            <BookOpen className="h-8 w-8 text-primary-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{databaseStats.totalChapters}</div>
            <div className="text-sm text-gray-600">Chapters</div>
          </div>
          <div className="card text-center">
            <RefreshCw className="h-8 w-8 text-primary-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{databaseStats.totalVerses}</div>
            <div className="text-sm text-gray-600">Verses</div>
          </div>
        </div>
      )}

      {/* Database Stats */}
      {databaseStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card text-center">
            <Database className="h-8 w-8 text-primary-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{databaseStats.totalBooks}</div>
            <div className="text-sm text-gray-600">Books</div>
          </div>
          <div className="card text-center">
            <BookOpen className="h-8 w-8 text-primary-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{databaseStats.totalChapters}</div>
            <div className="text-sm text-gray-600">Chapters</div>
          </div>
          <div className="card text-center">
            <RefreshCw className="h-8 w-8 text-primary-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{databaseStats.totalVerses}</div>
            <div className="text-sm text-gray-600">Verses</div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ScriptureDatabase
