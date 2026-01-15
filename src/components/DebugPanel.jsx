import React, { useEffect, useRef } from 'react'
import { useSpeech } from '../contexts/SpeechContext'

const DebugPanel = () => {
    const { isListening, transcript, debugLog } = useSpeech()
    const logRef = useRef(null)

    // Auto-scroll to bottom of log
    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight
        }
    }, [debugLog])

    if (!isListening && !transcript && (!debugLog || debugLog.length === 0)) {
        return null
    }

    return (
        <div className="fixed bottom-4 right-4 w-96 max-h-96 bg-black/80 text-green-400 p-4 rounded-lg font-mono text-xs shadow-xl backdrop-blur-sm z-50 border border-green-500/30">
            <div className="flex justify-between items-center mb-2 border-b border-green-500/30 pb-2">
                <h3 className="font-bold">🎤 Semantic Debug</h3>
                <div className={`px-2 py-0.5 rounded-full text-[10px] ${isListening ? 'bg-green-500/20 text-green-400 animate-pulse' : 'bg-red-500/20 text-red-400'}`}>
                    {isListening ? 'LISTENING' : 'OFFLINE'}
                </div>
            </div>

            <div className="mb-2">
                <div className="text-gray-400 mb-1">Current Transcript:</div>
                <div className="bg-white/5 p-2 rounded text-white min-h-[3em]">
                    {transcript || <span className="text-gray-600 italic">waiting for speech...</span>}
                </div>
            </div>

            <div className="text-gray-400 mb-1">Event Log:</div>
            <div
                ref={logRef}
                className="h-40 overflow-y-auto space-y-1 bg-black/40 p-2 rounded"
            >
                {debugLog && debugLog.map((log, i) => (
                    <div key={i} className="border-l-2 border-green-600 pl-2">
                        <span className="text-gray-500">[{new Date(log.timestamp).toLocaleTimeString().split(' ')[0]}]</span>{' '}
                        <span className={log.type === 'error' ? 'text-red-400' : 'text-green-300'}>{log.message}</span>
                        {log.details && (
                            <div className="text-gray-500 ml-4 truncate" title={JSON.stringify(log.details)}>{JSON.stringify(log.details)}</div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}

export default DebugPanel
