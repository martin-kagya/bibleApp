import React, { useState, useEffect } from 'react';
import { History, BookOpen, Clock, Play, Trash2, X, Search, Book, Calendar } from 'lucide-react';
import { useScripture } from '../../contexts/ScriptureContext';
import SchedulePanel from './SchedulePanel';
import { apiUrl } from '../../utils/api';

/**
 * StudyCenter - Combined History and Lexicon/Study Panel
 */
const StudyCenter = () => {
    const [activeTab, setActiveTab] = useState('schedule'); // Default to schedule now as it's the "Daily" focus

    const { projectionHistory, goLive, clearHistory, removeFromHistory, setPreviewContent, lexiconScripture } = useScripture();

    // Study Mode States
    const [searchQuery, setSearchQuery] = useState('');
    const [studyResults, setStudyResults] = useState(null);
    const [selectedWord, setSelectedWord] = useState(null);

    // Auto-sync with global lexicon state (from Search/Preview/Live)
    useEffect(() => {
        if (lexiconScripture && lexiconScripture.reference) {
            // Automatically fetch interlinear for the synced scripture
            const fetchInterlinear = async () => {
                try {
                    const url = await apiUrl(`/api/lexicon/interlinear/${encodeURIComponent(lexiconScripture.reference)}`);
                    const response = await fetch(url);
                    if (!response.ok) return;
                    const data = await response.json();

                    console.log('[StudyCenter] Interlinear data received:', data);

                    let parsedWords = [];
                    if (data.words && Array.isArray(data.words)) {
                        // Structured data from API - use directly
                        parsedWords = data.words
                            .filter(w => w && w.text) // Filter out null/empty entries
                            .map(w => ({
                                text: w.text,
                                strong: w.strong || null,
                                originalWord: w.originalWord || null,
                                definition: 'Click to load...'
                            }));
                    } else if (data.text) {
                        // Fallback to legacy text parsing
                        parsedWords = data.text.split(' ')
                            .filter(token => token.trim()) // Filter empty tokens
                            .map(token => {
                                const match = token.match(/^(.+?)\s*\[([GH]\d+)\]$/);
                                if (match) {
                                    return { text: match[1], strong: match[2], definition: 'Click to load...' };
                                }
                                // Word without Strong's number
                                return { text: token.replace(/\[.*?\]/g, ''), strong: null };
                            });
                    }

                    console.log('[StudyCenter] Parsed words:', parsedWords.length);

                    setSearchQuery(lexiconScripture.reference);
                    setStudyResults({
                        reference: data.reference || lexiconScripture.reference,
                        words: parsedWords
                    });
                } catch (err) {
                    console.error('Lexicon auto-sync error:', err);
                }
            };
            fetchInterlinear();
        }
    }, [lexiconScripture]);

    // --- History Logic ---
    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const handleHistoryItemClick = (item, isDoubleClick = false) => {
        const scriptureData = {
            reference: item.reference,
            text: item.text,
            translation: item.translation,
            book: item.book,
            chapter: item.chapter,
            verse: item.verse
        };
        const previewData = {
            type: 'scripture',
            reference: item.reference,
            title: item.reference,
            content: item.text,
            text: item.text,
            translation: item.translation || 'KJV'
        };

        if (isDoubleClick) {
            // Double click: Go live
            if (setPreviewContent) setPreviewContent(previewData);
            goLive(scriptureData);
        } else {
            // Single click: Preview
            if (setPreviewContent) setPreviewContent(previewData);
        }
    };

    const openInLexicon = (reference) => {
        if (!reference) return;
        setSearchQuery(reference);
        setActiveTab('study');
        // Trigger the search logic
        const fakeEvent = { preventDefault: () => { } };
        handleStudySearch(fakeEvent, reference);
    };

    // --- Study Logic ---
    const handleStudySearch = async (e, forcedQuery = null) => {
        if (e) e.preventDefault();
        const activeQuery = forcedQuery || searchQuery;
        if (!activeQuery.trim()) return;

        try {
            // Determine if it's a verse ref
            const isRef = /\d+[:.,]\d+/.test(activeQuery) || activeQuery.split(' ').length > 1;

            if (isRef) {
                // Fetch Interlinear
                const url = await apiUrl(`/api/lexicon/interlinear/${encodeURIComponent(activeQuery)}`);
                const response = await fetch(url);
                if (!response.ok) throw new Error('Verse not found');
                const data = await response.json();

                let parsedWords = [];
                if (data.words && Array.isArray(data.words)) {
                    parsedWords = data.words.map(w => ({
                        text: w.text,
                        strong: w.strong,
                        definition: 'Loading...'
                    }));
                } else {
                    // Fallback to legacy parsing
                    parsedWords = (data.text || '').split(' ').map(token => {
                        const match = token.match(/(.+)\[([GH]\d+)\]/);
                        if (match) {
                            return { text: match[1], strong: match[2], definition: 'Loading...' };
                        }
                        return { text: token, strong: null };
                    });
                }

                setActiveTab('study');
                setStudyResults({
                    reference: data.reference || activeQuery,
                    words: parsedWords
                });
            } else {
                // Dictionary Search
                setActiveTab('dictionary');
                const url = await apiUrl(`/api/lexicon/search?q=${encodeURIComponent(activeQuery)}`);
                const response = await fetch(url);
                if (!response.ok) throw new Error('Term not found');
                const data = await response.json();

                // Auto-show definition
                setSelectedWord({
                    original: data.word,
                    definition: data.definition,
                    strong: data.strong_number
                });
            }
        } catch (error) {
            console.error('Study search error:', error);
            alert('Could not find that reference or term. Please ensure the app is running correctly.');
        }
    };

    const fetchDefinition = async (word) => {
        if (!word.strong) return;

        // Switch immediately to show responsiveness
        setActiveTab('dictionary');

        // Set loading state
        const loadingWord = {
            ...word,
            original: 'Loading...',
            definition: 'Fetching definition...'
        };
        setSelectedWord(loadingWord);

        // Set preview with loading state
        if (setPreviewContent) {
            setPreviewContent({
                type: 'definition',
                reference: `Dictionary: ${word.strong}`,
                title: `Dictionary: ${word.strong}`,
                content: 'Fetching definition...',
                text: 'Fetching definition...',
                translation: 'Lexicon'
            });
        }

        try {
            const url = await apiUrl(`/api/lexicon/search?q=${word.strong}`);
            const response = await fetch(url);
            let finalWord;
            if (response.ok) {
                const data = await response.json();
                finalWord = {
                    ...word,
                    original: data.word,
                    definition: data.definition,
                    source: data.source // Capture source
                };
            } else {
                finalWord = {
                    ...word,
                    original: word.strong,
                    definition: 'Definition not available in local lexicon.',
                    source: 'System'
                };
            }
            setSelectedWord(finalWord);

            // Update preview with fetched definition
            if (setPreviewContent) {
                setPreviewContent({
                    type: 'definition',
                    reference: `Dictionary: ${finalWord.strong || finalWord.original}`,
                    title: `Dictionary: ${finalWord.strong || finalWord.original}`,
                    content: finalWord.definition,
                    text: finalWord.definition,
                    translation: finalWord.source || 'Lexicon'
                });
            }
        } catch (e) {
            console.error(e);
            const errorWord = {
                ...word,
                original: word.strong,
                definition: 'Error loading definition.',
                source: 'System'
            };
            setSelectedWord(errorWord);

            // Update preview with error
            if (setPreviewContent) {
                setPreviewContent({
                    type: 'definition',
                    reference: `Dictionary: ${errorWord.strong || errorWord.original}`,
                    title: `Dictionary: ${errorWord.strong || errorWord.original}`,
                    content: errorWord.definition,
                    text: errorWord.definition,
                    translation: errorWord.source || 'Lexicon'
                });
            }
        }
    };

    const presentDefinition = () => {
        if (!selectedWord) return;
        const liveData = {
            reference: `Dictionary: ${selectedWord.strong || selectedWord.original}`,
            text: selectedWord.definition,
            translation: selectedWord.source || 'Lexicon',
            type: 'definition'
        };
        const previewData = {
            type: 'definition',
            reference: `Dictionary: ${selectedWord.strong || selectedWord.original}`,
            title: `Dictionary: ${selectedWord.strong || selectedWord.original}`,
            content: selectedWord.definition,
            text: selectedWord.definition,
            translation: selectedWord.source || 'Lexicon'
        };
        // Set preview and go live
        if (setPreviewContent) {
            setPreviewContent(previewData);
        }
        goLive(liveData);
    };


    return (
        <div className="h-full flex bg-card/50 rounded-xl border border-dashed overflow-hidden">
            {/* Vertical Navigation Rail */}
            <div className="w-14 shrink-0 bg-muted/30 border-r border-border flex flex-col items-center py-4 gap-4">
                <button
                    onClick={() => setActiveTab('schedule')}
                    className={`p-3 rounded-xl transition-all ${activeTab === 'schedule'
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-110'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                    title="Service Schedule"
                >
                    <Calendar className="w-5 h-5" />
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`p-3 rounded-xl transition-all ${activeTab === 'history'
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-110'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                    title="Projection History"
                >
                    <History className="w-5 h-5" />
                </button>
                <div className="w-8 h-px bg-border my-2" />
                <button
                    onClick={() => setActiveTab('study')}
                    className={`p-3 rounded-xl transition-all ${activeTab === 'study'
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-110'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                    title="Lexicon (Interlinear)"
                >
                    <BookOpen className="w-5 h-5" />
                </button>
                <button
                    onClick={() => setActiveTab('dictionary')}
                    className={`p-3 rounded-xl transition-all ${activeTab === 'dictionary'
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-110'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        }`}
                    title="Dictionary"
                >
                    <Book className="w-5 h-5" />
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative flex flex-col">
                {/* --- SCHEDULE TAB --- */}
                {activeTab === 'schedule' && (
                    <SchedulePanel openInLexicon={openInLexicon} />
                )}

                {/* --- HISTORY TAB --- */}
                {activeTab === 'history' && (
                    <div className="h-full flex flex-col">
                        <div className="flex items-center justify-between p-3 border-b border-border shrink-0 bg-background/50">
                            <span className="text-[10px] uppercase text-muted-foreground font-medium">Recent Projections</span>
                            {projectionHistory.length > 0 && (
                                <button
                                    onClick={clearHistory}
                                    className="text-[10px] text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                                >
                                    <Trash2 className="w-3 h-3" /> Clear
                                </button>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-1">
                            {projectionHistory.length > 0 ? (
                                projectionHistory.map((item) => (
                                    <div
                                        key={item.id}
                                        className="group relative bg-background hover:bg-muted/50 rounded-lg border border-border p-2.5 cursor-pointer transition-all"
                                        onClick={() => handleHistoryItemClick(item, false)}
                                        onDoubleClick={() => handleHistoryItemClick(item, true)}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-sm text-foreground truncate">{item.reference}</span>
                                                    <span className="text-[9px] px-1 py-0.5 bg-muted text-muted-foreground rounded uppercase">{item.translation}</span>
                                                </div>
                                                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{item.text}</p>
                                                <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground/70">
                                                    <Clock className="w-2.5 h-2.5" /> {formatTime(item.timestamp)}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={(e) => { e.stopPropagation(); openInLexicon(item.reference); }} className="p-1.5 hover:bg-primary/10 text-primary rounded-full transition-colors" title="Open in Lexicon">
                                                    <BookOpen className="w-3.5 h-3.5" />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); handleHistoryItemClick(item, true); }} className="p-1.5 bg-primary text-primary-foreground rounded-full hover:bg-primary/90" title="Go Live">
                                                    <Play className="w-2.5 h-2.5" fill="currentColor" />
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); removeFromHistory(item.id); }} className="p-1.5 hover:bg-destructive/10 text-destructive rounded-full">
                                                    <X className="w-2.5 h-2.5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
                                    <History className="w-8 h-8 mb-2 opacity-30" />
                                    <p className="text-xs">No history yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* --- DICTIONARY TAB --- */}
                {activeTab === 'dictionary' && (
                    <div className="h-full flex flex-col bg-background/30 p-4">
                        {selectedWord ? (
                            <div className="flex flex-col h-full animate-in fade-in zoom-in-95 duration-200">
                                <div className="flex flex-col gap-4 mb-4 pb-4 border-b border-border border-dashed">
                                    <div className="flex flex-col gap-2">
                                        <h3 className="text-xl font-bold font-serif text-primary tracking-tight leading-tight">{selectedWord.original}</h3>
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                {selectedWord.strong && (
                                                    <span className="text-xs font-mono bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">
                                                        {selectedWord.strong}
                                                    </span>
                                                )}
                                                <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                                                    {selectedWord.source || 'Lexicon definition'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        onClick={presentDefinition}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:bg-primary/90 transition-all shadow-md active:scale-[0.98]"
                                    >
                                        <Play className="w-4 h-4 fill-current" />
                                        Present Now
                                    </button>
                                </div>

                                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                    <div className="prose prose-sm dark:prose-invert max-w-none">
                                        <div className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap font-serif">
                                            {selectedWord.definition}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground opacity-60">
                                <Book className="w-12 h-12 mb-3 opacity-30" />
                                <p className="text-sm font-medium">No Word Selected</p>
                                <p className="text-xs mt-1">Select a word from the Lexicon tab to view its definition here.</p>
                            </div>
                        )}
                    </div>
                )}


                {/* --- STUDY / LEXICON TAB --- */}
                {activeTab === 'study' && (
                    <div className="h-full flex flex-col bg-background/30">
                        {/* Search Bar */}
                        <form onSubmit={handleStudySearch} className="p-3 border-b border-border bg-background/50">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Enter reference (e.g. John 3:16)..."
                                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
                                />
                            </div>
                        </form>

                        {/* Results Area */}
                        <div className="flex-1 overflow-hidden flex flex-col">
                            {studyResults ? (
                                <div className="flex-1 flex flex-col min-h-0">
                                    {/* Interlinear View - Compact Inline Design */}
                                    <div className="flex-1 overflow-y-auto p-4">
                                        <h3 className="font-serif font-bold text-lg mb-4 text-center text-foreground/90">{studyResults.reference}</h3>
                                        <div className="flex flex-wrap gap-1 justify-start leading-normal">
                                            {studyResults.words.map((word, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => fetchDefinition(word)}
                                                    className={`group flex flex-col items-center px-1.5 py-1 rounded transition-all duration-150 ${selectedWord === word
                                                        ? 'bg-primary/15 ring-1 ring-primary'
                                                        : 'hover:bg-muted/50'
                                                        }`}
                                                >
                                                    {/* Word Text */}
                                                    <span className="text-base text-foreground font-serif leading-tight">{word.text}</span>
                                                    {/* Strong's Number - Below the word */}
                                                    {word.strong && (
                                                        <span className="text-[9px] font-mono text-muted-foreground/60 group-hover:text-primary mt-0.5 transition-colors">
                                                            {word.strong}
                                                        </span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted-foreground opacity-60">
                                    <BookOpen className="w-10 h-10 mb-2 opacity-30" />
                                    <p className="text-xs">Search for a scripture to view interlinear analysis.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudyCenter;
