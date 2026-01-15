import React from 'react'
import { BookOpen, Link as LinkIcon, MessageSquare, Search, Eye } from 'lucide-react'

const ScriptureCard = ({ scripture, onDisplay }) => {
  const formatConfidence = (confidence) => {
    return Math.round(confidence * 100)
  }

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.9) return 'bg-green-100 text-green-800 border-green-300'
    if (confidence >= 0.7) return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    if (confidence >= 0.5) return 'bg-orange-100 text-orange-800 border-orange-300'
    return 'bg-red-100 text-red-800 border-red-300'
  }

  const getMatchTypeIcon = (type) => {
    switch (type) {
      case 'explicit': return { icon: BookOpen, label: 'Direct Quote', color: 'text-blue-600' }
      case 'paraphrase': return { icon: MessageSquare, label: 'Paraphrase', color: 'text-purple-600' }
      case 'semantic': return { icon: Search, label: 'Semantic Match', color: 'text-indigo-600' }
      case 'cross-reference': return { icon: LinkIcon, label: 'Cross-Reference', color: 'text-teal-600' }
      default: return { icon: BookOpen, label: 'Reference', color: 'text-gray-600' }
    }
  }

  const getBorderColor = (type) => {
    switch (type) {
      case 'explicit': return 'border-l-blue-500'
      case 'paraphrase': return 'border-l-purple-500'
      case 'semantic': return 'border-l-indigo-500'
      case 'cross-reference': return 'border-l-teal-500'
      default: return 'border-l-gray-500'
    }
  }

  const matchType = getMatchTypeIcon(scripture.matchType || scripture.type)
  const MatchIcon = matchType.icon
  const borderColor = getBorderColor(scripture.matchType || scripture.type)
  const confidenceColor = getConfidenceColor(scripture.confidence)

  return (
    <div className={`card border-l-4 ${borderColor} hover:shadow-lg transition-all duration-200 cursor-pointer`}
      onClick={() => onDisplay && onDisplay(scripture)}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <MatchIcon className={`h-4 w-4 ${matchType.color}`} />
          <h4 className="font-semibold text-gray-900">
            {scripture.reference}
          </h4>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-medium border ${confidenceColor}`}>
          {formatConfidence(scripture.confidence)}%
        </span>
      </div>

      {/* Match Type Badge */}
      <div className="mb-2 flex gap-2">
        <span className={`text-xs px-2 py-0.5 rounded ${matchType.color} bg-opacity-10`}>
          {matchType.label}
        </span>
        {scripture.isSmart && (
          <span className="text-xs px-2 py-0.5 rounded bg-purple-100 text-purple-700 border border-purple-200 flex items-center gap-1">
            <span className="text-xs">✨</span> Smart Match
          </span>
        )}
      </div>

      {scripture.reasoning && (
        <div className="mb-3 p-2 bg-gradient-to-r from-purple-50 to-white border-l-2 border-purple-300 rounded-r text-xs text-purple-800">
          <strong>AI Insight:</strong> {scripture.reasoning}
        </div>
      )}

      {scripture.text && (
        <p className="text-gray-700 text-sm mb-3 leading-relaxed">
          {scripture.text}
        </p>
      )}

      {/* Paraphrase indicator */}
      {scripture.matchType === 'paraphrase' && scripture.paraphrase && (
        <div className="mb-3 p-2 bg-purple-50 rounded text-sm">
          <span className="font-semibold text-purple-900">Matched phrase: </span>
          <span className="text-purple-700 italic">"{scripture.paraphrase}"</span>
        </div>
      )}

      {/* Original reference for cross-references */}
      {scripture.matchType === 'cross-reference' && scripture.originalReference && (
        <div className="mb-3 p-2 bg-teal-50 rounded text-sm">
          <span className="font-semibold text-teal-900">Related to: </span>
          <span className="text-teal-700">{scripture.originalReference}</span>
        </div>
      )}

      {/* Matching themes */}
      {scripture.matchingThemes && scripture.matchingThemes.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {scripture.matchingThemes.map((theme, idx) => (
            <span key={idx} className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs">
              {typeof theme === 'string' ? theme : theme.theme || theme}
            </span>
          ))}
        </div>
      )}

      {/* Matching keywords */}
      {scripture.matchingWords && scripture.matchingWords.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
          {scripture.matchingWords.slice(0, 5).map((word, idx) => (
            <span key={idx} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">
              {word}
            </span>
          ))}
        </div>
      )}

      {scripture.context && (
        <p className="text-gray-600 text-xs italic border-t border-gray-200 pt-2">
          {scripture.context}
        </p>
      )}

      {onDisplay && (
        <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onDisplay(scripture)
            }}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
          >
            <Eye className="h-4 w-4" />
            <span>Display in Presentation</span>
          </button>
        </div>
      )}
    </div>
  )
}

export default ScriptureCard

