import React from 'react'
import { useSpeech } from '../../contexts/SpeechContext'

const VoiceVisualizer = () => {
    const { isListening, sourceType } = useSpeech()

    return (
        <div className="w-full h-16 flex items-center justify-center gap-1">
            {isListening ? (
                // Active State: Pulsating Bars
                Array.from({ length: 20 }).map((_, i) => (
                    <div
                        key={i}
                        className="w-1.5 bg-primary rounded-full animate-pulse-beam"
                        style={{
                            height: `${Math.random() * 100}%`,
                            animationDelay: `${i * 0.05}s`,
                            animationDuration: `${0.5 + Math.random() * 0.5}s`
                        }}
                    />
                ))
            ) : (
                // Idle State
                <div className="text-muted-foreground text-sm font-medium tracking-widest uppercase">
                    {sourceType === 'system' ? 'System Audio Ready' : 'Mic Ready'}
                </div>
            )}
        </div>
    )
}

export default VoiceVisualizer
