import { useState } from 'react';
import { useScripture } from '../contexts/ScriptureContext';

/**
 * Custom hook for semantic search functionality
 */
export const useSemanticSearch = () => {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const { searchSemantic } = useScripture();

    const search = async (query, options = {}) => {
        const { topK = 10, priority = 'BOTH' } = options;

        if (!query || !query.trim()) {
            setResults([]);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const searchResults = await searchSemantic(query, topK, priority);
            setResults(searchResults || []);
        } catch (err) {
            console.error('Semantic search error:', err);
            setError(err.message || 'Search failed');
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const clear = () => {
        setResults([]);
        setError(null);
    };

    return {
        results,
        loading,
        error,
        search,
        clear
    };
};
