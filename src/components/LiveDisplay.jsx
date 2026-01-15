import React, { useEffect } from 'react';
import { useScripture } from '../contexts/ScriptureContext';

const LiveDisplay = () => {
    const { liveScripture } = useScripture();

    // Ideally, this component just listens to context.
    // However, if opened in a new window, it shares the same LocalStorage/SessionStorage... 
    // BUT React Context state isn't shared across windows/tabs unless we use BroadcastChannel or LocalStorage syncing.
    // Since we are using Socket.IO in the Context, a NEW window will creating a NEW socket connection.
    // The server broadcasts 'live-update' to ALL clients. So this new window receives the event too!
    // So simply using useScripture() here is sufficient because the Provider initiates a socket connection.

    // If no scripture is live, show a "Waiting" screen or black screen.
    if (!liveScripture) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-gray-800 font-bold text-4xl animate-pulse tracking-widest uppercase">
                    Projector Ready
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-12 text-center animate-fade-in cursor-none">
            <div className="mb-12">
                <h1 className="text-7xl md:text-9xl font-bold font-display tracking-tight mb-6 text-white drop-shadow-lg">
                    {liveScripture.reference}
                </h1>
                <span className="inline-block px-6 py-2 bg-gray-900 text-gray-400 rounded-full text-2xl font-medium tracking-wider uppercase border border-gray-800">
                    {liveScripture.translation || 'KJV'}
                </span>
            </div>
            <div className="max-w-6xl mx-auto">
                <p className="text-5xl md:text-7xl leading-tight font-serif text-yellow-50 drop-shadow-md">
                    "{liveScripture.text}"
                </p>
            </div>
            {/* Optional lower third or logo */}
        </div>
    );
};

export default LiveDisplay;
