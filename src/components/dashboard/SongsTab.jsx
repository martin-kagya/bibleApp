import React, { useState, useEffect } from 'react';
import { Search, Music, Play, Eye, Plus, Edit2, Trash2, X, PlusCircle, Save } from 'lucide-react';
import { getAllSongs, addSong, deleteSong, searchSongs, updateSong, bulkAddSongs, syncFromDatabase } from '../../../services/songsService';
import { projectSong } from '../../../services/projectionWindowService';
import { useScripture } from '../../contexts/ScriptureContext';
import UnifiedPreviewMonitor from './UnifiedPreviewMonitor';

// Helper: Split lyrics into stanzas
const getStanzas = (lyrics) => {
    return lyrics.split(/\n\s*\n/).filter(s => s.trim().length > 0);
};

const AddSongModal = ({ isOpen, onClose, onSave, editingSong }) => {
    const [title, setTitle] = useState('');
    const [lyrics, setLyrics] = useState('');

    useEffect(() => {
        if (editingSong) {
            setTitle(editingSong.title);
            setLyrics(editingSong.lyrics);
        } else {
            setTitle('');
            setLyrics('');
        }
    }, [editingSong, isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h2 className="font-semibold text-lg">{editingSong ? 'Edit Song' : 'Add New Song'}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors"><X className="w-4 h-4" /></button>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); onSave({ title, lyrics, id: editingSong?.id }); onClose(); }} className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
                    <div>
                        <label className="block text-sm font-medium mb-1.5">Song Title</label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter song title..." className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary" autoFocus />
                    </div>
                    <div className="flex-1 flex flex-col min-h-0">
                        <label className="block text-sm font-medium mb-1.5">Lyrics</label>
                        <textarea value={lyrics} onChange={(e) => setLyrics(e.target.value)} placeholder="Enter song lyrics separated by double newlines..." className="flex-1 w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none min-h-[200px]" />
                    </div>
                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors">Cancel</button>
                        <button type="submit" disabled={!title.trim() || !lyrics.trim()} className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors">{editingSong ? 'Save Changes' : 'Add Song'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const SongsTab = () => {
    // Data States
    const [songs, setSongs] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');

    // UI States
    const [selectedSong, setSelectedSong] = useState(null);
    const [previewIndex, setPreviewIndex] = useState(-1); // Blue Border (Preview)
    const [liveIndex, setLiveIndex] = useState(-1);       // Red Border (Live)
    // Local live content fallback for immediate interaction
    const [localLiveContent, setLocalLiveContent] = useState(null);

    // Editing States
    const [isEditing, setIsEditing] = useState(false);
    const [editedLyrics, setEditedLyrics] = useState('');

    // Modal States
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSong, setEditingSong] = useState(null);

    // Layout States (Flex Ratios)
    // Using ratios instead of % allow gap handling to work naturally
    const [ratios, setRatios] = useState([20, 25, 30, 25]);

    // Context
    const {
        goLive,
        setPreviewContent,
        projectContent,
        addToSchedule,
        liveScripture
    } = useScripture();

    // Initial Load
    useEffect(() => {
        const initialLoad = async () => {
            let currentSongs = getAllSongs();
            if (currentSongs.length === 0) {
                console.log('Library empty, auto-syncing from database...');
                try {
                    await syncFromDatabase();
                    currentSongs = getAllSongs();
                } catch (error) {
                    console.error('Auto-sync failed:', error);
                }
            }
            setSongs(currentSongs);
        };
        initialLoad();
    }, []);

    // Sync edited lyrics when selection changes
    useEffect(() => {
        if (selectedSong) {
            setEditedLyrics(selectedSong.lyrics);
            setIsEditing(false); // Reset edit mode on song switch
        }
    }, [selectedSong]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!selectedSong) return;

            // Allow typing in inputs, BUT allow Enter key to work from the Search Input
            const isInput = e.target.tagName === 'INPUT';
            if ((isInput && e.key !== 'Enter') || e.target.tagName === 'TEXTAREA') return;

            const stanzas = getStanzas(selectedSong.lyrics);

            if (e.key === 'ArrowDown') {
                e.preventDefault();
                const nextIndex = Math.min((previewIndex !== -1 ? previewIndex : liveIndex !== -1 ? liveIndex : -1) + 1, stanzas.length - 1);

                // If we are already live, moving selection moves the live state immediately (Auto-Live)
                if (liveIndex !== -1) {
                    handleGoLive(stanzas[nextIndex], nextIndex);
                    setPreviewIndex(nextIndex); // Keep preview synced
                } else {
                    setPreviewIndex(nextIndex);
                }

            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const nextIndex = Math.max((previewIndex !== -1 ? previewIndex : liveIndex !== -1 ? liveIndex : 0) - 1, 0);

                if (liveIndex !== -1) {
                    handleGoLive(stanzas[nextIndex], nextIndex);
                    setPreviewIndex(nextIndex);
                } else {
                    setPreviewIndex(nextIndex);
                }

            } else if (e.key === 'Enter') {
                e.preventDefault();
                // 1st Press: Select first if none (Preview)
                if (previewIndex === -1 && liveIndex === -1 && stanzas.length > 0) {
                    setPreviewIndex(0);
                }
                // 2nd Press (or if ready): Go Live
                else {
                    const targetIndex = previewIndex !== -1 ? previewIndex : 0;
                    handleGoLive(stanzas[targetIndex], targetIndex);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedSong, previewIndex, liveIndex]); // Added liveIndex to dependencies

    const loadSongs = () => {
        setSongs(getAllSongs());
    };

    const handlePreviewStanza = (song, index) => {
        if (!song) return;
        const stanzas = getStanzas(song.lyrics);
        const stanza = stanzas[index];
        if (stanza && setPreviewContent) {
            setPreviewContent({
                type: 'song',
                title: song.title,
                content: stanza
            });
        }
    };

    const handleSearch = (query) => {
        setSearchQuery(query);
        const allSongs = getAllSongs();

        if (query.trim()) {
            const results = searchSongs(query, allSongs);
            setSongs(results);

            // "Instant Search" - Auto-select first match and preview first stanza
            if (results.length > 0) {
                const bestMatch = results[0];
                if (bestMatch.id !== selectedSong?.id) {
                    handleSelectSong(bestMatch);
                    // Automatically preview the first stanza
                    setPreviewIndex(0);
                    handlePreviewStanza(bestMatch, 0);
                }
            }
        } else {
            setSongs(allSongs);
        }
    };

    const handleSelectSong = (song) => {
        setSelectedSong(song);
        setPreviewIndex(-1);
        setLiveIndex(-1);
        setIsEditing(false);
    };

    const handleImportXML = async () => {
        if (!window.electron || !window.electron.importXmlSongs) {
            alert('XML import is only available in the Electron app');
            return;
        }

        try {
            const result = await window.electron.importXmlSongs();
            if (result.success) {
                // Add imported songs to localStorage
                const addedCount = bulkAddSongs(result.songs);
                loadSongs();
                alert(`Successfully imported ${addedCount} songs!`);
            } else {
                alert(`Import failed: ${result.message}`);
            }
        } catch (error) {
            console.error('Import error:', error);
            alert(`Import failed: ${error.message}`);
        }
    };

    const handleGoLive = (stanzaText, index) => {
        console.log('Going Live:', index);
        setLiveIndex(index);
        setPreviewIndex(index); // Sync preview so removing live doesn't lose place

        // Immediate local update for UI responsiveness
        const livePayload = {
            type: 'song',
            title: selectedSong.title,
            content: stanzaText,
        };
        setLocalLiveContent(livePayload);

        // Push to global preview (keep monitor synced)
        if (setPreviewContent) setPreviewContent(livePayload);

        // Broadcast via Socket.IO (opens live display window automatically)
        if (goLive) {
            // Use goLive to send via Socket.IO - this will auto-open the live display window
            goLive({
                type: 'song',
                reference: selectedSong.title,
                title: selectedSong.title,
                text: stanzaText,
                content: stanzaText
            });
        } else if (projectContent) {
            projectContent(livePayload);
        } else {
            // Fallback: use direct projection service
            projectSong({ ...selectedSong, lyrics: stanzaText });
        }
    };

    const handleStanzaClick = (stanza, index) => {
        // 1. If we are already live, clicking ANY stanza switches live immediately (Follow Mode)
        if (liveIndex !== -1) {
            handleGoLive(stanza, index);
            return;
        }

        // 2. If this stanza is ALREADY the preview (and we are not live), go Live
        if (previewIndex === index) {
            handleGoLive(stanza, index);
            return;
        }

        // 3. Otherwise, just Preview it
        setPreviewIndex(index);
        handlePreviewStanza(selectedSong, index);
    };

    const handleClearProjection = () => {
        setLiveIndex(-1);
        setLocalLiveContent(null);
        if (projectContent) projectContent(null);
        if (setPreviewContent) setPreviewContent(null);
    };

    const handleDelete = (id) => {
        if (window.confirm('Delete this song?')) {
            deleteSong(id);
            if (selectedSong?.id === id) {
                setSelectedSong(null);
                setPreviewIndex(-1);
                setLiveIndex(-1);
            }
            loadSongs();
        }
    };

    const handleEdit = (song) => {
        setEditingSong(song);
        setIsModalOpen(true);
    };

    // Inline Edit Button Handler
    const toggleEdit = () => {
        if (isEditing) {
            // Start Save Process
            handleSaveInline();
        } else {
            setIsEditing(true);
        }
    };

    const handleSaveInline = () => {
        if (!selectedSong) return;
        const updatedSong = { ...selectedSong, lyrics: editedLyrics };
        updateSong(selectedSong.id, updatedSong);

        // Refresh Lists
        loadSongs();
        setSelectedSong(updatedSong); // important to keep selection valid
        setIsEditing(false);
    };

    const handleSaveModal = (data) => {
        if (data.id) updateSong(data.id, data);
        else addSong(data);
        loadSongs();
        setEditingSong(null);
    };

    // --- Resizing Logic (Flex-Grow) ---
    const handleMouseDown = (index, e) => {
        e.preventDefault();
        const startX = e.clientX;
        const startRatios = [...ratios];
        const containerWidth = e.target.parentElement.parentElement.offsetWidth; // Grandparent is container

        const onMouseMove = (moveEvent) => {
            const deltaX = moveEvent.clientX - startX;
            // Convert pixel delta to ratio delta (approximate, since flex isn't perfect linear without basis)
            // But sufficient for resizing feel.
            const deltaRatio = (deltaX / containerWidth) * 100;

            const newRatios = [...startRatios];
            newRatios[index] = Math.max(5, startRatios[index] + deltaRatio); // Min size 5
            newRatios[index + 1] = Math.max(5, startRatios[index + 1] - deltaRatio);

            setRatios(newRatios);
        };

        const onMouseUp = () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    // Resize Handle Component
    const ResizeHandle = ({ index }) => (
        <div
            className="w-2 hover:w-3 cursor-col-resize transition-all z-20 flex flex-col justify-center items-center group -ml-1 -mr-1 select-none py-2"
            onMouseDown={(e) => handleMouseDown(index, e)}
        >
            <div className="h-full w-1 rounded-full group-hover:bg-primary/50 transition-colors" />
        </div>
    );

    // Determine what to show in Panel 4 (Monitor)
    let monitorContent = null;
    let monitorStatus = 'OFF'; // 'OFF', 'PREVIEW', 'LIVE'

    const stanzas = selectedSong ? getStanzas(selectedSong.lyrics) : [];

    // 1. Local Selection Priority
    if (selectedSong && previewIndex !== -1 && stanzas[previewIndex]) {
        monitorContent = {
            title: selectedSong.title,
            content: stanzas[previewIndex]
        };

        // If the previewed stanza is effectively the Live one
        if (liveIndex === previewIndex) {
            monitorStatus = 'LIVE';
        } else {
            monitorStatus = 'PREVIEW';
        }
    }
    // 2. Fallback to global projection if nothing selected locally (e.g. initial load)
    else if (liveScripture) {
        monitorContent = {
            title: liveScripture.reference || liveScripture.title,
            content: liveScripture.text || liveScripture.content
        };
        monitorStatus = 'LIVE';
    }

    return (
        <div className="h-full flex gap-4 overflow-hidden select-none bg-muted/20 p-2 rounded-xl">

            {/* PANEL 1: Song Library */}
            <div style={{ flex: `${ratios[0]} 1 0px` }} className="flex flex-col gap-3 min-w-[200px] bg-background/50 rounded-lg border border-border/50 shadow-sm p-3">
                <div className="flex flex-col gap-2 shrink-0">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                            placeholder="Find..."
                            className="w-full pl-8 pr-3 py-1.5 bg-background border border-input rounded-md focus:ring-1 focus:ring-primary text-xs shadow-sm"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => { setEditingSong(null); setIsModalOpen(true); }} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-md text-xs font-medium transition-colors border border-primary/20 shadow-sm">
                            <Plus className="w-3.5 h-3.5" /> Add New
                        </button>
                        {window.electron && (
                            <button onClick={handleImportXML} className="flex items-center justify-center gap-1.5 py-1.5 px-3 bg-green-500/10 hover:bg-green-500/20 text-green-700 dark:text-green-400 rounded-md text-xs font-medium transition-colors border border-green-500/20 shadow-sm" title="Import XML Songs from data/Songs folder">
                                <Music className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto space-y-1 custom-scrollbar">
                    {songs.map(song => (
                        <div
                            key={song.id}
                            onClick={() => handleSelectSong(song)}
                            className={`px-3 py-2 rounded-md cursor-pointer transition-all border text-sm ${selectedSong?.id === song.id
                                ? 'bg-primary border-primary text-primary-foreground font-semibold shadow-md translate-x-1'
                                : 'bg-transparent hover:bg-muted border-transparent hover:border-border/50'
                                }`}
                        >
                            <div className="truncate">{song.title}</div>
                        </div>
                    ))}
                </div>
            </div>

            <ResizeHandle index={0} />

            {/* PANEL 2: Full Lyrics (Inline Edit) */}
            <div style={{ flex: `${ratios[1]} 1 0px` }} className={`flex flex-col min-w-[200px] rounded-lg border shadow-sm transition-colors ${isEditing ? 'bg-background ring-2 ring-primary/20 border-primary' : 'bg-gray-100/50 dark:bg-gray-900/50 border-gray-200/60 dark:border-gray-800'}`}>
                {selectedSong ? (
                    <div className="flex flex-col h-full">
                        <div className="flex items-center justify-between p-3 border-b border-border/40 bg-transparent">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                <Music className="w-3 h-3" /> Full Lyrics
                            </span>
                            <button
                                onClick={toggleEdit}
                                className={`p-1.5 rounded-md transition-all border shadow-sm flex items-center gap-1.5 text-xs font-medium
                                    ${isEditing
                                        ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
                                        : 'bg-white dark:bg-zinc-800 hover:bg-gray-50 text-foreground border-border/60'}
                                `}
                                title={isEditing ? "Save Changes" : "Edit Lyrics"}
                            >
                                {isEditing ? (
                                    <>
                                        <Save className="w-3.5 h-3.5" />
                                        <span>Save</span>
                                    </>
                                ) : (
                                    <Edit2 className="w-3.5 h-3.5" />
                                )}
                            </button>
                        </div>
                        {isEditing ? (
                            <textarea
                                value={editedLyrics}
                                onChange={(e) => setEditedLyrics(e.target.value)}
                                className="flex-1 w-full p-4 resize-none bg-transparent border-0 focus:ring-0 text-sm leading-relaxed font-mono text-foreground"
                                autoFocus
                            />
                        ) : (
                            <div className="flex-1 overflow-y-auto p-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground font-serif custom-scrollbar">
                                {selectedSong.lyrics}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground/40 text-xs">
                        Select a song
                    </div>
                )}
            </div>

            <ResizeHandle index={1} />

            {/* PANEL 3: Stanzas Grid */}
            <div style={{ flex: `${ratios[2]} 1 0px` }} className="flex flex-col min-w-[250px] bg-background/50 rounded-lg border border-border/50 shadow-sm p-2 relative">
                {selectedSong ? (
                    <>
                        <div className="flex items-center justify-between mb-3 px-1 shrink-0">
                            <h2 className="font-bold text-base truncate pr-2 text-foreground/90">{selectedSong.title}</h2>
                            <button onClick={() => handleDelete(selectedSong.id)} className="p-1.5 hover:bg-destructive/10 text-destructive rounded transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-3 p-1 custom-scrollbar">
                            {getStanzas(selectedSong.lyrics).map((stanza, idx) => {
                                // STRICT LOGIC: Live trumps Preview
                                const isLive = liveIndex === idx;
                                const isPreview = previewIndex === idx && !isLive; // Only blue if NOT live

                                return (
                                    <div
                                        key={idx}
                                        onClick={() => handleStanzaClick(stanza, idx)}
                                        onDoubleClick={() => handleGoLive(stanza, idx)}
                                        className={`
                                            relative p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ease-out
                                            ${isLive
                                                ? 'border-red-500 bg-red-50/10 dark:bg-red-900/10 shadow-[0_0_20px_rgba(220,38,38,0.25)] scale-[1.02] z-10'
                                                : isPreview
                                                    ? 'border-blue-500 bg-blue-50/10 dark:bg-blue-900/10 shadow-md scale-[1.01] z-10'
                                                    : 'border-border/60 bg-card hover:border-primary/30 hover:shadow-sm'}
                                        `}
                                    >
                                        <div className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-center pointer-events-none select-none">
                                            {stanza}
                                        </div>
                                        <div className={`absolute top-2 left-3 text-[9px] font-bold uppercase tracking-wider ${isLive ? 'text-red-500' : isPreview ? 'text-blue-500' : 'text-muted-foreground/50'}`}>
                                            {idx + 1}
                                        </div>

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                addToSchedule({
                                                    type: 'song',
                                                    title: `${selectedSong.title} (${idx + 1})`,
                                                    text: stanza,
                                                    content: stanza,
                                                    id: `${selectedSong.id}-${idx}`, // Unique ID for schedule
                                                });
                                            }}
                                            className="absolute top-2 right-2 p-1.5 bg-muted text-muted-foreground rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-accent"
                                            title="Add to Schedule"
                                        >
                                            <Plus className="w-3.5 h-3.5" />
                                        </button>

                                        {/* Live Beacon */}
                                        {isLive && (
                                            <div className="mt-3 flex items-center justify-center gap-1.5 animate-in fade-in zoom-in duration-300">
                                                <span className="relative flex h-2.5 w-2.5">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                                                </span>
                                                <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest shadow-red-500/50 drop-shadow-sm">Live</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground opacity-50">
                        <Music className="w-10 h-10 mb-2 opacity-20" />
                        <p className="text-xs">Stanzas will appear here</p>
                    </div>
                )}
            </div>

            <ResizeHandle index={2} />

            {/* PANEL 4: Unified Monitor */}
            <div style={{ flex: `${ratios[3]} 1 0px` }} className="flex flex-col border-l-0 min-w-[200px]">
                <UnifiedPreviewMonitor className="h-full border-0 shadow-none bg-transparent" />
                <div className="flex-1 bg-muted/30 rounded p-4 text-center flex flex-col items-center justify-center border border-dashed border-border/40 mt-2">
                    <p className="text-[10px] text-muted-foreground leading-loose">
                        <span className="font-bold text-foreground">Arrow Keys</span> &nbsp; Navigate Preview<br />
                        <span className="font-bold text-foreground">Enter</span> &nbsp; Go Live
                    </p>
                </div>
            </div>

            <AddSongModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveModal}
                editingSong={editingSong}
            />
        </div>
    );
};

export default SongsTab;
