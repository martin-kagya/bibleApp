import React, { useState } from 'react'
import VoiceVisualizer from './VoiceVisualizer'
import TranscriptionTile from './TranscriptionTile'
import ScriptureGrid from './ScriptureGrid'
import LiveScriptureTile from './LiveScriptureTile'
import ScriptureSearchTile from './ScriptureSearchTile'
import SpeechControls from '../SpeechControls'
import SongsTab from './SongsTab'
import ProjectionTab from './ProjectionTab'
import HistoryPanel from './HistoryPanel'
import { Moon, Sun, BookOpen, Image, Music } from 'lucide-react'

const TABS = [
    { id: 'scripture', label: 'Scripture', icon: BookOpen },
    { id: 'projection', label: 'Projection', icon: Image },
    { id: 'songs', label: 'Songs', icon: Music },
];

const Dashboard = () => {
    const [activeTab, setActiveTab] = useState('scripture');

    const toggleTheme = () => {
        document.documentElement.classList.toggle('dark')
    }

    return (
        <div className="h-screen bg-background text-foreground flex flex-col font-sans transition-colors duration-300 overflow-hidden">
            {/* Top Bar */}
            <header className="h-16 shrink-0 border-b bg-card/50 backdrop-blur px-6 flex items-center justify-between z-10">
                <div className="flex items-center gap-4">
                    <h1 className="font-bold text-xl tracking-tight">Pneuma<span className="text-primary">Voice</span></h1>
                    <div className="h-6 w-px bg-border" />
                    <VoiceVisualizer />
                </div>

                {/* Tab Navigation */}
                <nav className="flex items-center gap-1 bg-muted/50 p-1 rounded-lg">
                    {TABS.map(({ id, label, icon: Icon }) => (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${activeTab === id
                                ? 'bg-background text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                                }`}
                        >
                            <Icon className="w-4 h-4" />
                            <span className="hidden sm:inline">{label}</span>
                        </button>
                    ))}
                </nav>

                <div className="flex items-center gap-4">
                    {activeTab === 'scripture' && <SpeechControls />}
                    <button onClick={toggleTheme} className="p-2 hover:bg-accent rounded-full text-muted-foreground transition-colors relative">
                        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute top-2 left-2 h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    </button>
                </div>
            </header>

            {/* Main Content - Conditional on Active Tab */}
            <main className="flex-1 p-6 min-h-0 overflow-hidden">
                {activeTab === 'scripture' && (
                    <div className="h-full grid grid-cols-12 gap-6">
                        {/* LEFT COLUMN: Transcription & Search (4 cols) */}
                        <div className="col-span-12 lg:col-span-4 h-full flex flex-col gap-6 min-h-0">
                            {/* Top: Transcription (Reduced Height ~35%) */}
                            <div className="h-[35%] shrink-0 min-h-0">
                                <TranscriptionTile />
                            </div>
                            {/* Bottom: Search (Remaining ~65%) */}
                            <div className="flex-1 min-h-0">
                                <ScriptureSearchTile />
                            </div>
                        </div>

                        {/* CENTER COLUMN: Live & Suggestions (5 cols) */}
                        <div className="col-span-12 lg:col-span-5 h-full flex flex-col gap-6 min-h-0">
                            {/* Top: Live Presentation (Compact) */}
                            <div className="shrink-0">
                                <LiveScriptureTile />
                            </div>

                            {/* Bottom: Suggestions Grid (Scrollable List) */}
                            <div className="flex-1 flex flex-col min-h-0 bg-card/50 rounded-xl border border-dashed p-4 overflow-hidden">
                                <div className="flex items-center justify-between mb-4 shrink-0">
                                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Queue & Suggestions</h2>
                                </div>
                                <div className="flex-1 overflow-y-auto pr-2 min-h-0">
                                    <ScriptureGrid />
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: History Panel (3 cols) */}
                        <div className="col-span-12 lg:col-span-3 h-full min-h-0">
                            <HistoryPanel />
                        </div>
                    </div>
                )}

                {activeTab === 'projection' && (
                    <div className="h-full bg-card/50 rounded-xl border p-6 overflow-hidden">
                        <ProjectionTab />
                    </div>
                )}

                {activeTab === 'songs' && (
                    <div className="h-full bg-card/50 rounded-xl border p-6 overflow-hidden">
                        <SongsTab />
                    </div>
                )}
            </main>
        </div>
    )
}

export default Dashboard

