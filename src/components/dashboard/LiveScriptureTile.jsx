import React from 'react'
import { useScripture } from '../../contexts/ScriptureContext'
import { BookOpen, X } from 'lucide-react'

const LiveScriptureTile = () => {
    const { liveScripture, clearLive } = useScripture()

    if (!liveScripture) {
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
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                        <span className="text-xs font-bold text-red-500 uppercase tracking-widest">Live on Projector</span>
                    </div>

                    <div>
                        <h2 className="text-3xl font-bold text-foreground font-display tracking-tight">
                            {liveScripture.reference}
                        </h2>
                        <p className="text-muted-foreground italic mt-2 line-clamp-2">
                            "{liveScripture.text}"
                        </p>
                    </div>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-3">
                    <button
                        onClick={clearLive}
                        className="px-4 py-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 text-sm font-semibold rounded-lg transition-colors shadow-sm flex items-center gap-2"
                    >
                        <X className="h-4 w-4" />
                        Clear Screen
                    </button>
                    {liveScripture.confidence && (
                        <span className="text-[10px] bg-muted px-2 py-1 rounded font-mono text-muted-foreground">
                            {Math.round(liveScripture.confidence * 100)}% match
                        </span>
                    )}
                </div>
            </div>

            {/* RIGHT: Mini Projector Preview */}
            <div className="bg-black p-6 flex flex-col items-center justify-center text-center border-l md:border-l border-t md:border-t-0 border-border relative">
                <div className="absolute top-3 right-3 text-[9px] text-zinc-500 font-mono uppercase tracking-wider border border-zinc-800 px-1.5 py-0.5 rounded">
                    Preview Output
                </div>

                <div className="w-full max-w-[200px]">
                    <div className="mb-2">
                        <h1 className="text-xl font-bold text-white tracking-tight">
                            {liveScripture.reference}
                        </h1>
                        <span className="text-[10px] text-zinc-400 uppercase tracking-widest">
                            {liveScripture.translation || 'KJV'}
                        </span>
                    </div>
                    <p className="text-sm font-serif text-yellow-50/90 leading-tight">
                        "{liveScripture.text}"
                    </p>
                </div>
            </div>
        </div>
    )
}

export default LiveScriptureTile
