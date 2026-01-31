import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Loader2, Plus, Cloud } from 'lucide-react';
import { useScripture } from '../contexts/ScriptureContext';

const ChapterView = ({ book, chapter, highlightVerse, translation = 'KJV' }) => {
    const [verses, setVerses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isCloudFetch, setIsCloudFetch] = useState(false);
    const [error, setError] = useState(null);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const highlightRef = useRef(null);
    const selectedRef = useRef(null);
    const containerRef = useRef(null);
    const lastEnterTime = useRef(0);
    const { goLive, setPreviewContent, addToSchedule } = useScripture();

    useEffect(() => {
        const fetchChapter = async () => {
            setLoading(true);
            setError(null);

            try {
                // Check if this translation is local or cloud
                const translationsRes = await fetch('/api/translations');
                const translations = await translationsRes.json();

                // Safety check: translations should be an array
                const currentTrans = Array.isArray(translations)
                    ? translations.find(t => t.abbreviation?.toUpperCase() === translation?.toUpperCase())
                    : null;

                setIsCloudFetch(currentTrans && !currentTrans.isLocal);

                const response = await fetch(`/api/scriptures/chapter/${encodeURIComponent(book)}/${chapter}?translation=${translation}`);

                if (!response.ok) {
                    throw new Error('Failed to fetch chapter');
                }

                const data = await response.json();
                setVerses(data);
                // Reset selection when chapter changes
                setSelectedIndex(-1);
            } catch (err) {
                console.error('Error fetching chapter:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (book && chapter) {
            fetchChapter();
        }
    }, [book, chapter, translation]);

    // Set initial selection based on highlighted verse
    useEffect(() => {
        if (verses.length > 0 && highlightVerse) {
            const index = verses.findIndex(v => v.verse === highlightVerse);
            if (index !== -1) {
                setSelectedIndex(index);
            }
        }
    }, [verses, highlightVerse]);

    // Scroll to highlighted verse after verses load
    useEffect(() => {
        if (verses.length > 0 && highlightVerse && highlightRef.current) {
            setTimeout(() => {
                highlightRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
            }, 100);
        }
    }, [verses, highlightVerse]);

    // Scroll selected verse into view
    useEffect(() => {
        if (selectedRef.current) {
            selectedRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }
    }, [selectedIndex]);

    const handlePreview = useCallback((verse) => {
        const scriptureData = {
            reference: `${book} ${chapter}:${verse.verse}`,
            text: verse.text,
            book: book,
            chapter: chapter,
            verse: verse.verse,
            translation: translation
        };
        const previewData = {
            type: 'scripture',
            reference: scriptureData.reference,
            title: scriptureData.reference,
            content: verse.text,
            text: verse.text,
            translation: translation
        };
        if (setPreviewContent) {
            setPreviewContent(previewData);
        }
    }, [book, chapter, translation, setPreviewContent]);

    const handleGoLive = useCallback((verse) => {
        const scriptureData = {
            reference: `${book} ${chapter}:${verse.verse}`,
            text: verse.text,
            book: book,
            chapter: chapter,
            verse: verse.verse,
            translation: translation
        };
        // Also set preview when going live
        const previewData = {
            type: 'scripture',
            reference: scriptureData.reference,
            title: scriptureData.reference,
            content: verse.text,
            text: verse.text,
            translation: translation
        };
        if (setPreviewContent) {
            setPreviewContent(previewData);
        }
        goLive(scriptureData);
    }, [book, chapter, translation, goLive, setPreviewContent]);

    // Keyboard event handler
    const handleKeyDown = useCallback((e) => {
        if (verses.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => {
                    const next = prev < verses.length - 1 ? prev + 1 : prev;
                    return next;
                });
                break;

            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => {
                    const next = prev > 0 ? prev - 1 : 0;
                    return next;
                });
                break;

            case 'Enter':
                e.preventDefault();
                const now = Date.now();
                const timeSinceLastEnter = now - lastEnterTime.current;

                if (timeSinceLastEnter < 400 && selectedIndex >= 0) {
                    // Double Enter - Go Live!
                    handleGoLive(verses[selectedIndex]);
                } else if (selectedIndex >= 0) {
                    // Single Enter with selection - Preview
                    handlePreview(verses[selectedIndex]);
                } else if (selectedIndex < 0 && verses.length > 0) {
                    // First Enter with no selection - select and preview first verse
                    setSelectedIndex(0);
                    handlePreview(verses[0]);
                }
                lastEnterTime.current = now;
                break;

            case 'Home':
                e.preventDefault();
                setSelectedIndex(0);
                break;

            case 'End':
                e.preventDefault();
                setSelectedIndex(verses.length - 1);
                break;

            default:
                break;
        }
    }, [verses, selectedIndex, handleGoLive, handlePreview]);

    // Focus container on mount for keyboard events
    useEffect(() => {
        if (containerRef.current && verses.length > 0) {
            containerRef.current.focus();
        }
    }, [verses]);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="relative">
                    <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                    {isCloudFetch && <Cloud className="w-4 h-4 absolute -top-1 -right-1 text-blue-500 animate-pulse" />}
                </div>
                <span className="ml-3 text-gray-600">
                    {isCloudFetch ? 'Fetching from Cloud (Caching locally)...' : 'Loading chapter...'}
                </span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
                <p className="font-semibold">Error loading chapter</p>
                <p className="text-sm">{error}</p>
            </div>
        );
    }

    if (verses.length === 0) {
        return (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 text-gray-600">
                <p>No verses found for {book} {chapter}</p>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className="space-y-4 outline-none"
            tabIndex={0}
            onKeyDown={handleKeyDown}
        >
            {/* Chapter Header */}
            <div className="flex items-center justify-between px-2 pt-2">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">{book} {chapter}</h2>
                    <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
                        {translation} • {verses.length} verses
                        <span className="ml-2 text-primary/70">↑↓ to navigate • Enter×2 to project</span>
                    </p>
                </div>
            </div>

            {/* Verses List */}
            <div className="grid gap-2 pr-1">
                {verses.map((verse, index) => {
                    const isHighlighted = highlightVerse && verse.verse === highlightVerse;
                    const isSelected = index === selectedIndex;

                    return (
                        <div
                            key={verse.verse}
                            ref={isHighlighted ? highlightRef : (isSelected ? selectedRef : null)}
                            onClick={() => {
                                setSelectedIndex(index);
                                handlePreview(verse);
                            }}
                            onDoubleClick={() => handleGoLive(verse)}
                            className={`group rounded-lg border p-3 text-sm transition-all flex gap-3 cursor-pointer ${isSelected
                                ? 'bg-primary/20 border-primary/40 shadow-md ring-2 ring-primary/30'
                                : isHighlighted
                                    ? 'bg-primary/10 border-primary/20 shadow-sm'
                                    : 'bg-card hover:bg-muted/50 border-border'
                                }`}
                        >
                            {/* Verse Number */}
                            <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isSelected
                                ? 'bg-primary text-primary-foreground'
                                : isHighlighted
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground'
                                }`}>
                                {verse.verse}
                            </div>

                            {/* Verse Text */}
                            <div className="flex-1 min-w-0">
                                <p className={`leading-relaxed ${isSelected || isHighlighted
                                    ? 'text-foreground font-medium'
                                    : 'text-muted-foreground'
                                    }`}>
                                    {verse.text}
                                </p>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col gap-1 items-center self-start opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleGoLive(verse);
                                    }}
                                    className={`p-2 rounded-full transition-all ${isSelected || isHighlighted
                                        ? 'bg-primary text-primary-foreground shadow-md'
                                        : 'bg-primary/20 text-primary'
                                        }`}
                                    title="Go Live"
                                >
                                    <Play className="w-3 h-3" fill="currentColor" />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        addToSchedule({
                                            type: 'scripture',
                                            reference: `${book} ${chapter}:${verse.verse}`,
                                            text: verse.text,
                                            book,
                                            chapter,
                                            verse: verse.verse,
                                            translation
                                        });
                                    }}
                                    className="p-2 bg-muted text-muted-foreground rounded-full hover:bg-accent"
                                    title="Add to Schedule"
                                >
                                    <Plus className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default ChapterView;
