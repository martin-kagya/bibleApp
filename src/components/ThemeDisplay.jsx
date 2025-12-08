import React from 'react'
import { Brain, Heart, Users, Book } from 'lucide-react'

const ThemeDisplay = ({ themes }) => {
  if (!themes || !themes.mainThemes || themes.mainThemes.length === 0) {
    return null
  }

  const getEmotionalToneColor = (tone) => {
    const toneColors = {
      'encouraging': 'bg-green-100 text-green-800',
      'convicting': 'bg-red-100 text-red-800',
      'teaching': 'bg-blue-100 text-blue-800',
      'comforting': 'bg-purple-100 text-purple-800',
      'evangelistic': 'bg-orange-100 text-orange-800'
    }
    return toneColors[tone] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="card bg-gradient-to-br from-purple-50 to-blue-50">
      <div className="flex items-center gap-2 mb-4">
        <Brain className="h-6 w-6 text-purple-600" />
        <h3 className="text-xl font-bold text-gray-900">AI Theme Analysis</h3>
      </div>
      
      {/* Main Themes */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Book className="h-4 w-4 text-gray-600" />
          <h4 className="font-semibold text-gray-700">Main Themes</h4>
        </div>
        <div className="flex flex-wrap gap-2">
          {themes.mainThemes.map((theme, idx) => (
            <span
              key={idx}
              className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium shadow-sm"
              title={`Keywords: ${theme.keywords?.join(', ')}`}
            >
              {typeof theme === 'string' ? theme : theme.theme} 
              {theme.confidence && ` (${Math.round(theme.confidence * 100)}%)`}
            </span>
          ))}
        </div>
      </div>

      {/* Sub-themes */}
      {themes.subThemes && themes.subThemes.length > 0 && (
        <div className="mb-4">
          <h4 className="font-semibold text-gray-700 text-sm mb-2">Supporting Themes</h4>
          <div className="flex flex-wrap gap-1.5">
            {themes.subThemes.slice(0, 8).map((theme, idx) => (
              <span
                key={idx}
                className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs"
              >
                {typeof theme === 'string' ? theme : theme.theme}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Emotional Tone */}
      {themes.emotionalTone && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Heart className="h-4 w-4 text-gray-600" />
            <h4 className="font-semibold text-gray-700 text-sm">Emotional Tone</h4>
          </div>
          <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${getEmotionalToneColor(themes.emotionalTone)}`}>
            {themes.emotionalTone}
          </span>
        </div>
      )}

      {/* Target Audience */}
      {themes.targetAudience && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Users className="h-4 w-4 text-gray-600" />
            <h4 className="font-semibold text-gray-700 text-sm">Target Audience</h4>
          </div>
          <span className="px-3 py-1.5 bg-teal-100 text-teal-800 rounded-full text-sm font-medium">
            {themes.targetAudience}
          </span>
        </div>
      )}

      {/* Key Concepts */}
      {themes.keyConcepts && themes.keyConcepts.length > 0 && (
        <div>
          <h4 className="font-semibold text-gray-700 text-sm mb-2">Key Concepts</h4>
          <div className="flex flex-wrap gap-1.5">
            {themes.keyConcepts.slice(0, 12).map((concept, idx) => (
              <span
                key={idx}
                className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs"
              >
                {concept}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Theological Context */}
      {themes.theologicalContext && themes.theologicalContext !== 'general' && (
        <div className="mt-4 p-3 bg-white rounded-lg">
          <h4 className="font-semibold text-gray-700 text-sm mb-1">Theological Context</h4>
          <p className="text-gray-600 text-sm">{themes.theologicalContext}</p>
        </div>
      )}
    </div>
  )
}

export default ThemeDisplay



