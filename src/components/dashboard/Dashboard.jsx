import React, { useState } from 'react'
import VoiceVisualizer from './VoiceVisualizer'
import TranscriptionTile from './TranscriptionTile'
import ScriptureGrid from './ScriptureGrid'
import LiveScriptureTile from './LiveScriptureTile'
import ScriptureSearchTile from './ScriptureSearchTile'
import SpeechControls from '../SpeechControls'
import SongsTab from './SongsTab'
import ProjectionTab from './ProjectionTab'
import StudyCenter from './StudyCenter'
import SettingsModal from '../SettingsModal'
import { Moon, Sun, BookOpen, Image, Music, Settings } from 'lucide-react'

const TABS = [
    { id: 'scripture', label: 'Scripture', icon: BookOpen },
    { id: 'projection', label: 'Projection', icon: Image },
    { id: 'songs', label: 'Songs', icon: Music },
];

const Dashboard = () => {
    const [activeTab, setActiveTab] = useState('scripture');
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const containerRef = React.useRef(null);

    // Resizing logic for Scripture Tab (Left, Center, Right columns)
    const [ratios, setRatios] = useState([28, 42, 30]);

    const handleMouseDown = (index, e) => {
        e.preventDefault();
        const startX = e.clientX;
        const startRatios = [...ratios];
        const containerWidth = containerRef.current?.offsetWidth || window.innerWidth;

        const onMouseMove = (moveEvent) => {
            const deltaX = moveEvent.clientX - startX;
            const deltaRatio = (deltaX / containerWidth) * 100;

            const newRatios = [...startRatios];

            // Adjust both sides of the handle with a minimum size safeguard
            const minSize = 15;
            const totalAvailable = startRatios[index] + startRatios[index + 1];

            let nextVal = startRatios[index] + deltaRatio;
            let nextNeighborVal = startRatios[index + 1] - deltaRatio;

            if (nextVal < minSize) {
                nextVal = minSize;
                nextNeighborVal = totalAvailable - minSize;
            } else if (nextNeighborVal < minSize) {
                nextNeighborVal = minSize;
                nextVal = totalAvailable - minSize;
            }

            newRatios[index] = nextVal;
            newRatios[index + 1] = nextNeighborVal;

            setRatios(newRatios);
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

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
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-2 hover:bg-accent rounded-full text-muted-foreground transition-colors"
                        title="Projection Settings"
                    >
                        <Settings className="h-5 w-5" />
                    </button>
                    <button onClick={toggleTheme} className="p-2 hover:bg-accent rounded-full text-muted-foreground transition-colors relative">
                        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute top-2 left-2 h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    </button>
                </div>
            </header>

            {/* Main Content - Conditional on Active Tab */}
            <main className="flex-1 p-6 min-h-0 overflow-hidden">
                {activeTab === 'scripture' && (
                    <div ref={containerRef} className="h-full flex flex-col lg:flex-row gap-0 overflow-hidden">
                        {/* LEFT COLUMN: Transcription & Search */}
                        <div
                            style={{ flex: `0 0 ${ratios[0]}%` }}
                            className="flex flex-col gap-6 min-h-0 lg:pr-3 overflow-hidden min-w-[250px]"
                        >
                            {/* Top: Transcription (Reduced Height ~35%) */}
                            <div className="h-[35%] shrink-0 min-h-0">
                                <TranscriptionTile />
                            </div>
                            {/* Bottom: Search (Remaining ~65%) */}
                            <div className="flex-1 min-h-0">
                                <ScriptureSearchTile />
                            </div>
                        </div>

                        {/* Resizer 1 */}
                        <div
                            onMouseDown={(e) => handleMouseDown(0, e)}
                            className="hidden lg:flex w-2 h-full cursor-col-resize hover:bg-primary/10 transition-colors items-center justify-center group z-20"
                        >
                            <div className="w-0.5 h-12 bg-border group-hover:bg-primary/40 rounded-full transition-colors" />
                        </div>

                        {/* CENTER COLUMN: Live & Suggestions */}
                        <div
                            style={{ flex: `0 0 ${ratios[1]}%` }}
                            className="flex flex-col gap-6 min-h-0 lg:px-3 overflow-hidden min-w-[300px]"
                        >
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

                        {/* Resizer 2 */}
                        <div
                            onMouseDown={(e) => handleMouseDown(1, e)}
                            className="hidden lg:flex w-2 h-full cursor-col-resize hover:bg-primary/10 transition-colors items-center justify-center group z-20"
                        >
                            <div className="w-0.5 h-12 bg-border group-hover:bg-primary/40 rounded-full transition-colors" />
                        </div>

                        {/* RIGHT COLUMN: History Panel */}
                        <div
                            style={{ flex: `0 0 ${ratios[2]}%` }}
                            className="h-full min-h-0 lg:pl-3 min-w-[200px]"
                        >
                            <StudyCenter />
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

            {/* Settings Modal */}
            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </div>
    )
}

export default Dashboard

