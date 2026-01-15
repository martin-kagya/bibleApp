import React from 'react'
import { useScripture } from '../../contexts/ScriptureContext'
import { Play, Eye, BookOpen, Sparkles } from 'lucide-react'

const ScriptureGrid = () => {
    const { detectedScriptures, suggestedScriptures, displayScripture, goLive } = useScripture()

    // 1. Deduplicate across the two lists: 
    // If a reference is in 'detected', don't show it in 'suggested'
    const detectedRefs = new Set(detectedScriptures.map(s => s.reference))
    const filteredSuggested = suggestedScriptures.filter(s => !detectedRefs.has(s.reference))

    // 2. Combine and Sort
    // Priority: 1. isSmart (LLM confirmed), 2. isPartial (ongoing), 3. Confidence
    const allScriptures = [...detectedScriptures, ...filteredSuggested].sort((a, b) => {
        if (a.isSmart && !b.isSmart) return -1
        if (!a.isSmart && b.isSmart) return 1
        return (b.confidence || 0) - (a.confidence || 0)
    })

    if (allScriptures.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 border-2 border-dashed border-muted rounded-xl bg-muted/10">
                <BookOpen className="h-12 w-12 mb-4 opacity-20" />
                <p className="text-center">No high-confidence scriptures detected yet. Keep speaking...</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-3 pb-4">
            {allScriptures.map((s, idx) => (
                <div key={idx} className="group bg-card text-card-foreground border rounded-lg shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row overflow-hidden min-h-[100px]">
                    <div className="p-4 flex-1 flex flex-col justify-center border-l-4 border-l-primary">
                        <div className="flex justify-between items-center mb-1">
                            <h4 className="font-bold text-base flex items-center gap-2">
                                {s.reference}
                                {s.isSmart && <Sparkles className="h-3 w-3 text-purple-500" />}
                            </h4>
                            <span className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.5 bg-muted rounded">
                                {Math.round(s.confidence * 100)}%
                            </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                            {s.text}
                        </p>
                    </div>
                    {/* Actions */}
                    <div className="flex sm:flex-col border-t sm:border-t-0 sm:border-l border-border divide-x sm:divide-x-0 sm:divide-y divide-border bg-muted/20">
                        <button
                            onClick={() => goLive(s)}
                            className="flex-1 px-4 py-3 sm:py-0 flex items-center justify-center gap-2 hover:bg-primary hover:text-primary-foreground transition-colors group-hover:bg-primary/5 sm:group-hover:bg-transparent sm:hover:bg-primary"
                            title="Present"
                        >
                            <Play className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => displayScripture(s)}
                            className="flex-1 px-4 py-3 sm:py-0 flex items-center justify-center hover:bg-secondary hover:text-secondary-foreground transition-colors"
                            title="Preview"
                        >
                            <Eye className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    )
}

export default ScriptureGrid
