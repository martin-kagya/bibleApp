import React, { useState } from 'react'
import { Play, Square, Save, Wifi, WifiOff } from 'lucide-react'
import { useScripture } from '../contexts/ScriptureContext'

const SessionControls = () => {
  const [sessionActive, setSessionActive] = useState(false)
  const [title, setTitle] = useState('')
  const [preacher, setPreacher] = useState('')

  const { startSession, endSession, isConnected, sessionId } = useScripture()

  const handleStart = () => {
    if (!title.trim()) {
      alert('Please enter a sermon title')
      return
    }
    startSession(title, preacher || 'Unknown')
    setSessionActive(true)
  }

  const handleStop = () => {
    endSession()
    setSessionActive(false)
    // Reset form
    setTitle('')
    setPreacher('')
  }

  return (
    <div className="card border-2 border-blue-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">Session Controls</h3>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <Wifi className="h-4 w-4 text-green-500" />
              <span className="text-xs text-green-600 font-medium">Connected</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-red-500" />
              <span className="text-xs text-red-600 font-medium">Disconnected</span>
            </>
          )}
        </div>
      </div>
      
      {!sessionActive ? (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sermon Title *
            </label>
            <input
              type="text"
              placeholder="e.g., The Power of Faith"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Preacher Name
            </label>
            <input
              type="text"
              placeholder="e.g., Pastor John"
              value={preacher}
              onChange={(e) => setPreacher(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <button
            onClick={handleStart}
            disabled={!isConnected}
            className={`w-full px-4 py-3 rounded-lg flex items-center justify-center gap-2 font-semibold transition-colors ${
              isConnected 
                ? 'bg-green-500 hover:bg-green-600 text-white' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Play size={20} />
            Start Sermon Session
          </button>
          {!isConnected && (
            <p className="text-xs text-red-600 text-center">
              Waiting for server connection...
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <p className="font-semibold text-green-900">Session Active</p>
            </div>
            <p className="text-sm text-green-700 font-medium">{title}</p>
            {preacher && (
              <p className="text-xs text-green-600 mt-1">Speaker: {preacher}</p>
            )}
            {sessionId && (
              <p className="text-xs text-green-600 mt-1 font-mono">
                ID: {sessionId.split('-').pop()}
              </p>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleStop}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg flex items-center justify-center gap-2 font-semibold transition-colors"
            >
              <Square size={18} />
              End Session
            </button>
            <button
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center justify-center gap-2 font-semibold transition-colors"
              title="Save functionality coming soon"
            >
              <Save size={18} />
              Save
            </button>
          </div>

          <div className="text-xs text-gray-600 text-center mt-2">
            📊 Real-time analysis active • All scriptures are being detected
          </div>
        </div>
      )}
    </div>
  )
}

export default SessionControls



