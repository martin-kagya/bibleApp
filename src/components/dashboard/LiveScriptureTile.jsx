import React from 'react'
import { useScripture } from '../../contexts/ScriptureContext'
import { BookOpen, X } from 'lucide-react'
import UnifiedPreviewMonitor from './UnifiedPreviewMonitor'

const LiveScriptureTile = () => {
    const { liveScripture, previewContent, clearLive } = useScripture()

    // Determine what to display on the left info panel
    // Priority: Live Content -> Preview Content
    const displayItem = liveScripture || previewContent;
    const isLive = !!liveScripture;

    if (!displayItem) {
        return (
            <div className="bg-muted/10 border-2 border-dashed border-muted rounded-xl p-8 flex flex-col items-center justify-center text-muted-foreground min-h-[250px]">
                <div className="w-12 h-12 bg-muted/20 rounded-full flex items-center justify-center mb-3">
                    <BookOpen className="h-6 w-6 opacity-50" />
                </div>
                <p className="font-medium text-sm">Projector Empty</p>
                <p className="text-xs opacity-70">Select a verse to present</p>
            </div>
        )
    }

    return (
        <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden grid md:grid-cols-2 min-h-[250px]">

            {/* LEFT: Controls & Info */}
            <div className="p-6 flex flex-col justify-between">
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        {isLive ? (
                            <>
                                <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                </span>
                                <span className="text-xs font-bold text-red-500 uppercase tracking-widest">Live on Projector</span>
                            </>
                        ) : (
                            <>
                                <span className="relative flex h-3 w-3">
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                                </span>
                                <span className="text-xs font-bold text-blue-500 uppercase tracking-widest">Previewing</span>
                            </>
                        )}
                    </div>

                    <div>
                        <h2 className="text-3xl font-bold text-foreground font-display tracking-tight">
                            {displayItem.reference || displayItem.title}
                        </h2>
                        <p className="text-muted-foreground italic mt-2 line-clamp-2">
                            "{displayItem.text || displayItem.content}"
                        </p>
                    </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                    {isLive && (
                        <button
                            onClick={clearLive}
                            className="px-4 py-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 text-sm font-semibold rounded-lg transition-colors shadow-sm flex items-center gap-2"
                        >
                            <X className="h-4 w-4" />
                            Clear Screen
                        </button>
                    )}
                    {displayItem.confidence && (
                        <span className="text-[10px] bg-muted px-2 py-1 rounded font-mono text-muted-foreground">
                            {Math.round(displayItem.confidence * 100)}% match
                        </span>
                    )}
                </div>
            </div>



            {/* RIGHT: Mini Projector Preview */}
            <UnifiedPreviewMonitor className="border-l md:border-l border-t md:border-t-0 border-border" />
        </div>
    )
}

export default LiveScriptureTile
