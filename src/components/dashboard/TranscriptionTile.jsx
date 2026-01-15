import React, { useRef, useEffect } from 'react'
import { useSpeech } from '../../contexts/SpeechContext'

const TranscriptionTile = () => {
    const { transcript, isListening } = useSpeech()
    const endRef = useRef(null)

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [transcript])

    return (
        <div className="bg-card text-card-foreground rounded-xl border shadow-sm flex flex-col h-full overflow-hidden">
            <div className="p-6 border-b bg-muted/30 flex justify-between items-center">
                <h3 className="font-semibold tracking-tight">Live Transcript</h3>
                {isListening && <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                </span>}
            </div>
            <div className="flex-1 p-6 overflow-y-auto min-h-0 font-serif text-lg leading-relaxed text-muted-foreground">
                {transcript ? (
                    <p>
                        {transcript}
                        <span ref={endRef} />
                    </p>
                ) : (
                    <div className="h-full flex items-center justify-center text-muted-foreground/50 italic text-sm">
                        Waiting for speech...
                    </div>
                )}
            </div>
        </div>
    )
}

export default TranscriptionTile
