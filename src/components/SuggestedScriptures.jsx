import React from 'react'
import { Lightbulb, BookOpen } from 'lucide-react'
import ScriptureCard from './ScriptureCard'

const SuggestedScriptures = ({ scriptures, onDisplay }) => {
  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.8) return 'confidence-high'
    if (confidence >= 0.6) return 'confidence-medium'
    return 'confidence-low'
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold text-gray-900 flex items-center space-x-2">
        <Lightbulb className="h-5 w-5 text-yellow-500" />
        <span>Suggested Scriptures</span>
      </h3>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {scriptures.map((scripture, index) => (
          <div key={index} className="relative">
            <ScriptureCard
              scripture={scripture}
              onDisplay={() => onDisplay(scripture)}
              confidenceColor={getConfidenceColor(scripture.confidence)}
            />
            <div className="absolute -top-2 -right-2 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium">
              Suggested
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SuggestedScriptures

