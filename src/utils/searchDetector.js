/**
 * Detects whether a search query is a scripture reference or semantic search
 * Uses simple regex patterns to avoid needing backend parser
 * @param {string} query - The search query
 * @returns {'reference' | 'semantic'} - The detected search type
 */
export const detectSearchType = (query) => {
    if (!query || typeof query !== 'string') {
        return 'semantic';
    }

    const trimmed = query.trim();

    // Empty query defaults to semantic
    if (!trimmed) {
        return 'semantic';
    }

    // Pattern to match scripture references:
    // - Book name (letters, optionally starting with a number like "1 John")
    // - Followed by chapter number
    // - Optionally followed by verse number
    // Examples: "John 3:16", "Gen3.2", "1John4:2", "Psalm 23"
    const referencePattern = /^(\d\s*)?[a-zA-Z]+(\s+[a-zA-Z]+)?\s*\d+([:.,-]\d+)?$/;

    if (referencePattern.test(trimmed)) {
        return 'reference';
    }

    // Default to semantic for natural language queries
    return 'semantic';
};

/**
 * Validates if a query is a valid scripture reference
 * @param {string} query - The search query
 * @returns {boolean} - Whether the query is a valid reference
 */
export const isValidReference = (query) => {
    return detectSearchType(query) === 'reference';
};

/**
 * Parses a scripture reference string into components
 * This is a simplified frontend version - the backend will do the actual parsing
 * @param {string} reference - The reference string
 * @returns {object} - Parsed components {book, chapter, verse}
 */
export const parseReference = (reference) => {
    if (!reference) return null;

    // Simple regex to extract book, chapter, and verse
    // Matches: "John 3:16", "Gen3.2", "1John4:2", etc.
    const match = reference.match(/^(\d\s*)?([a-zA-Z]+(?:\s+[a-zA-Z]+)?)\s*(\d+)(?:[:.,-](\d+))?$/);

    if (!match) return null;

    return {
        book: (match[1] || '') + match[2],
        chapter: parseInt(match[3]),
        verse: match[4] ? parseInt(match[4]) : null
    };
};
