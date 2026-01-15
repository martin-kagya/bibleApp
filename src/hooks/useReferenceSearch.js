import { useState } from 'react';

/**
 * Custom hook for scripture reference search functionality
 */
export const useReferenceSearch = () => {
    const [chapter, setChapter] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchChapter = async (book, chapterNum, translation = 'KJV', highlightVerse = null) => {
        if (!book || !chapterNum) {
            setChapter(null);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch(
                `/api/scriptures/chapter/${encodeURIComponent(book)}/${chapterNum}?translation=${translation}`
            );

            if (!response.ok) {
                throw new Error('Failed to fetch chapter');
            }

            const verses = await response.json();

            setChapter({
                book,
                chapter: chapterNum,
                translation,
                verses,
                highlightVerse
            });
        } catch (err) {
            console.error('Reference search error:', err);
            setError(err.message || 'Failed to fetch chapter');
            setChapter(null);
        } finally {
            setLoading(false);
        }
    };

    const clear = () => {
        setChapter(null);
        setError(null);
    };

    return {
        chapter,
        loading,
        error,
        fetchChapter,
        clear
    };
};
