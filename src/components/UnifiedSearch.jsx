import React, { useState, useEffect } from 'react';
import { Search, Sparkles, BookOpen, Play, Loader2, X } from 'lucide-react';
import { detectSearchType, parseReference } from '../utils/searchDetector';
import { useSemanticSearch } from '../hooks/useSemanticSearch';
import { useReferenceSearch } from '../hooks/useReferenceSearch';
import { useScripture } from '../contexts/ScriptureContext';
import ChapterView from './ChapterView';

const UnifiedSearch = ({ translation = 'KJV' }) => {
    const [query, setQuery] = useState('');
    const [searchType, setSearchType] = useState('semantic');
    const [priority, setPriority] = useState('BOTH');
    const [selectedTranslation, setSelectedTranslation] = useState(translation);
    const [availableTranslations, setAvailableTranslations] = useState(['KJV', 'NIV', 'NLT', 'AMP']);

    const semanticSearch = useSemanticSearch();
    const referenceSearch = useReferenceSearch();
    const { goLive } = useScripture();

    // Fetch translations from API
    useEffect(() => {
        fetch('/api/translations')
            .then(res => res.json())
            .then(data => {
                if (data && data.length > 0) {
                    setAvailableTranslations(data.map(t => t.abbreviation));
                }
            })
            .catch(err => console.error('Error fetching translations:', err));
    }, []);

    // Auto-detect search type as user types
    useEffect(() => {
        if (query.trim()) {
            const detected = detectSearchType(query);
            setSearchType(detected);
        }
    }, [query]);

    const handleSearch = async () => {
        if (!query.trim()) return;

        if (searchType === 'reference') {
            // Parse and fetch reference
            const parsed = parseReference(query);
            if (parsed && parsed.book && parsed.chapter) {
                await referenceSearch.fetchChapter(
                    parsed.book,
                    parsed.chapter,
                    selectedTranslation,
                    parsed.verse
                );
                semanticSearch.clear();
            }
        } else {
            // Semantic search
            await semanticSearch.search(query, { priority, topK: 10 });
            referenceSearch.clear();
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    const handleClear = () => {
        setQuery('');
        semanticSearch.clear();
        referenceSearch.clear();
    };

    const handleSemanticResultClick = (result) => {
        goLive(result);
    };

    const isLoading = semanticSearch.loading || referenceSearch.loading;
    const hasResults = semanticSearch.results.length > 0 || referenceSearch.chapter !== null;

    return (
        <div className="h-full flex flex-col gap-4">
            {/* Search Bar Section */}
            <div className="flex-shrink-0 space-y-3">

                {/* Search Type & Translation */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        {searchType === 'reference' ? (
                            <>
                                <BookOpen className="w-4 h-4 text-primary" />
                                <span className="text-xs font-semibold text-primary uppercase tracking-wide">Ref Search</span>
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4 text-purple-600" />
                                <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">AI Search</span>
                            </>
                        )}
                    </div>

                    <select
                        value={selectedTranslation}
                        onChange={(e) => setSelectedTranslation(e.target.value)}
                        className="px-2 py-1 bg-background border border-input rounded-md text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                        {availableTranslations.map(abbrev => (
                            <option key={abbrev} value={abbrev}>{abbrev}</option>
                        ))}
                    </select>
                </div>

                {/* Main Search Input */}
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Search scripture..."
                        className="w-full pl-10 pr-20 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-1 focus:ring-primary placeholder-muted-foreground"
                        disabled={isLoading}
                    />
                    <div className="absolute inset-y-0 right-0 pr-1 flex items-center gap-1">
                        {query && (
                            <button
                                onClick={handleClear}
                                className="p-1.5 hover:bg-muted rounded-md transition-colors"
                                title="Clear"
                            >
                                <X className="w-3 h-3 text-muted-foreground" />
                            </button>
                        )}
                        <button
                            onClick={handleSearch}
                            disabled={isLoading || !query.trim()}
                            className="px-3 py-1.5 bg-primary text-primary-foreground rounded text-xs font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                        >
                            {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Go'}
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {['BOTH', 'OT', 'NT'].map((filter) => (
                        <button
                            key={filter}
                            onClick={() => setPriority(filter)}
                            className={`px-3 py-1 rounded-full text-[10px] font-bold transition-all border ${priority === filter
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background text-muted-foreground border-input hover:bg-muted'
                                }`}
                        >
                            {filter === 'BOTH' ? 'ALL' : filter}
                        </button>
                    ))}
                </div>
            </div>

            {/* Results Section - Flex Grow to scroll independently */}
            <div className="flex-1 overflow-y-auto min-h-0 pr-1">
                {hasResults && (
                    <div className="space-y-3 animate-fade-in pb-4">
                        {/* Reference Results */}
                        {referenceSearch.chapter && (
                            <ChapterView
                                book={referenceSearch.chapter.book}
                                chapter={referenceSearch.chapter.chapter}
                                highlightVerse={referenceSearch.chapter.highlightVerse}
                                translation={referenceSearch.chapter.translation}
                            />
                        )}

                        {/* Semantic Results */}
                        {semanticSearch.results.length > 0 && (
                            <div className="grid gap-2">
                                {semanticSearch.results.map((result, idx) => (
                                    <div
                                        key={idx}
                                        className="group bg-card hover:bg-muted/50 rounded-lg border border-border p-3 transition-all flex gap-3 text-sm relative"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="font-bold text-foreground">
                                                    {result.reference}
                                                </span>
                                                <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full font-mono">
                                                    {Math.round((result.rerankerScore || result.confidence || result.similarity || 0) * 100)}%
                                                </span>
                                            </div>
                                            <p className="text-muted-foreground line-clamp-2">
                                                {result.text}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => handleSemanticResultClick(result)}
                                            className="self-center p-2 bg-primary text-primary-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Go Live"
                                        >
                                            <Play className="w-3 h-3" fill="currentColor" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Empty State */}
                {!hasResults && !isLoading && (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 text-muted-foreground opacity-50">
                        <Search className="w-8 h-8 mb-2" />
                        <p className="text-xs">Search scripture by ref or meaning</p>
                    </div>
                )}

                {/* Error States */}
                {(semanticSearch.error || referenceSearch.error) && (
                    <div className="bg-destructive/10 text-destructive text-xs p-3 rounded-md">
                        {semanticSearch.error || referenceSearch.error}
                    </div>
                )}
            </div>
        </div>
    );
};

export default UnifiedSearch;
