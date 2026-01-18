import React from 'react'
import { useScripture } from '../../contexts/ScriptureContext'
import { Play, Eye, BookOpen, Sparkles } from 'lucide-react'

const ScriptureGrid = () => {
    const {
        detectedScriptures,
        suggestedScriptures,
        displayScripture,
        goLive,
        previewContent,
        liveScripture
    } = useScripture()
    const [selectedIndex, setSelectedIndex] = React.useState(-1)
    const itemRefs = React.useRef([])
    const containerRef = React.useRef(null)

    // 1. Deduplicate & Sort Logic
    const detectedRefs = new Set(detectedScriptures.map(s => s.reference))
    const filteredSuggested = suggestedScriptures.filter(s => !detectedRefs.has(s.reference))

    const allScriptures = React.useMemo(() => {
        return [...detectedScriptures, ...filteredSuggested].sort((a, b) => {
            if (a.isSmart && !b.isSmart) return -1
            if (!a.isSmart && b.isSmart) return 1
            return (b.confidence || 0) - (a.confidence || 0)
        })
    }, [detectedScriptures, filteredSuggested])

    // Refs for stable access in event listeners
    const selectedIndexRef = React.useRef(selectedIndex)
    const allScripturesRef = React.useRef(allScriptures)
    const liveScriptureRef = React.useRef(liveScripture)
    const previewContentRef = React.useRef(previewContent)

    // Sync refs
    React.useEffect(() => { selectedIndexRef.current = selectedIndex }, [selectedIndex])
    React.useEffect(() => { allScripturesRef.current = allScriptures }, [allScriptures])
    React.useEffect(() => { liveScriptureRef.current = liveScripture }, [liveScripture])
    React.useEffect(() => { previewContentRef.current = previewContent }, [previewContent])

    // Helper to scroll item into view
    const scrollIntoView = (index) => {
        if (itemRefs.current[index]) {
            itemRefs.current[index].scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            })
        }
    }

    // Keyboard Navigation - Smart Follow Mode
    React.useEffect(() => {
        const handleKeyDown = (e) => {
            if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return

            const currentAll = allScripturesRef.current
            const currentIdx = selectedIndexRef.current
            const currentLive = liveScriptureRef.current

            if (currentAll.length === 0) return

            // Helper to determine next action based on current state
            const triggerAction = (scripture) => {
                // Check if the PREVIOUSLY selected item (or effectively the "System State") implies we are Live
                // Use a simpler heuristic: If there is a Live Scripture, and it matches the item we *just moved from* (or just current state broadly),
                // we might assume "Live Mode".
                // Better yet: Check if the *currently displayed* Live item is in our list.
                // If the user *was* on the Live item, they probably want to drag "Live" status to the next one.

                let isDrivingLive = false;

                // Detection Logic: 
                // If we have a current live item, and it matches the scripture at the *previous* index (currentIdx), 
                // then we are moving *away* from the live item, implying we want to carry the live token forward.
                if (currentLive && currentIdx >= 0 && currentIdx < currentAll.length) {
                    if (currentAll[currentIdx].reference === currentLive.reference) {
                        isDrivingLive = true;
                    }
                }

                if (isDrivingLive) {
                    goLive(scripture);
                } else {
                    displayScripture(scripture);
                }
            }

            if (e.key === 'ArrowDown') {
                e.preventDefault()
                const nextIdx = currentIdx + 1
                if (nextIdx < currentAll.length) {
                    setSelectedIndex(nextIdx);
                    triggerAction(currentAll[nextIdx]);
                    scrollIntoView(nextIdx);
                }
            } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                const nextIdx = currentIdx - 1
                if (nextIdx >= 0) {
                    setSelectedIndex(nextIdx);
                    triggerAction(currentAll[nextIdx]);
                    scrollIntoView(nextIdx);
                } else if (currentIdx === -1) {
                    // Start at 0
                    setSelectedIndex(0);
                    triggerAction(currentAll[0]);
                    scrollIntoView(0);
                }
            } else if (e.key === 'Enter') {
                e.preventDefault()
                if (currentIdx >= 0 && currentIdx < currentAll.length) {
                    goLive(currentAll[currentIdx])
                }
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [goLive, displayScripture])


    if (allScriptures.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 border-2 border-dashed border-muted rounded-xl bg-muted/10">
                <BookOpen className="h-12 w-12 mb-4 opacity-20" />
                <p className="text-center">No high-confidence scriptures detected yet. Keep speaking...</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-3 pb-4" ref={containerRef}>
            {allScriptures.map((s, idx) => {
                const isSelected = idx === selectedIndex

                // Determine Status
                // Check if this specific item is currently Live or Previewed
                // We compare references.
                const isLive = liveScripture && liveScripture.reference === s.reference;
                const isPreview = previewContent && previewContent.reference === s.reference;

                // Dynamic Styles
                let borderClass = 'border-border'; // Default
                let ringClass = '';
                let bgClass = 'bg-card';

                if (isLive) {
                    borderClass = 'border-red-500';
                    bgClass = 'bg-red-500/5';
                    if (isSelected) ringClass = 'ring-2 ring-red-500 ring-offset-2';
                } else if (isPreview) {
                    borderClass = 'border-blue-500';
                    bgClass = 'bg-blue-500/5';
                    if (isSelected) ringClass = 'ring-2 ring-blue-500 ring-offset-2';
                } else if (isSelected) {
                    borderClass = 'border-primary';
                    ringClass = 'ring-2 ring-primary/50';
                }

                return (
                    <div
                        key={`${s.reference}-${idx}`}
                        ref={el => itemRefs.current[idx] = el}
                        onClick={() => setSelectedIndex(idx)} // Allow click to select too
                        className={`group ${bgClass} text-card-foreground border rounded-lg shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row overflow-hidden min-h-[100px] cursor-pointer ${borderClass} ${ringClass}`}
                    >
                        <div className={`p-4 flex-1 flex flex-col justify-center border-l-4 ${isLive ? 'border-l-red-500' : isPreview ? 'border-l-blue-500' : 'border-l-primary'}`}>
                            <div className="flex justify-between items-center mb-1">
                                <h4 className="font-bold text-base flex items-center gap-2">
                                    {s.reference}
                                    {s.isSmart && <Sparkles className="h-3 w-3 text-purple-500" />}
                                    {isLive && <span className="text-[10px] font-bold uppercase bg-red-500 text-white px-1.5 py-0.5 rounded animate-pulse">Live</span>}
                                    {isPreview && !isLive && <span className="text-[10px] font-bold uppercase bg-blue-500 text-white px-1.5 py-0.5 rounded">Preview</span>}
                                </h4>
                                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
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
                                onClick={(e) => { e.stopPropagation(); goLive(s); }}
                                className={`flex-1 px-4 py-3 sm:py-0 flex items-center justify-center gap-2 transition-colors ${isLive ? 'bg-red-100 text-red-600' : 'hover:bg-red-100 hover:text-red-600'}`}
                                title="Present (Enter)"
                            >
                                <Play className={`h-4 w-4 ${isLive ? 'fill-current' : ''}`} />
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); displayScripture(s); }}
                                className={`flex-1 px-4 py-3 sm:py-0 flex items-center justify-center transition-colors ${isPreview ? 'bg-blue-100 text-blue-600' : 'hover:bg-blue-100 hover:text-blue-600'}`}
                                title="Preview"
                            >
                                <Eye className={`h-4 w-4 ${isPreview ? 'fill-current' : ''}`} />
                            </button>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

export default ScriptureGrid
