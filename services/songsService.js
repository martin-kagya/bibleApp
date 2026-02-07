/**
 * Songs Service
 * Manages CRUD operations for the song database
 * Uses localStorage for persistence
 */

const STORAGE_KEY = 'pneumavoice_songs';

const STOP_WORDS = new Set(['i', 'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now', 'you', 'your', 'my', 'me', 'our']);

/**
 * Get all songs from storage
 * @returns {Array} Array of song objects
 */
export const getAllSongs = () => {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error reading songs:', error);
        return [];
    }
};

/**
 * Save all songs to storage
 * @param {Array} songs - Array of song objects
 */
const saveSongs = (songs) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(songs));
    } catch (error) {
        console.error('Error saving songs:', error);
        throw error;
    }
};

/**
 * Add a new song
 * @param {Object} song - Song object with title and lyrics
 * @returns {Object} The created song with ID
 */
export const addSong = (song) => {
    const songs = getAllSongs();
    const newSong = {
        id: Date.now().toString(),
        title: song.title.trim(),
        lyrics: song.lyrics.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    songs.push(newSong);
    saveSongs(songs);
    return newSong;
};

/**
 * Update an existing song
 * @param {string} id - Song ID
 * @param {Object} updates - Fields to update
 * @returns {Object|null} Updated song or null if not found
 */
export const updateSong = (id, updates) => {
    const songs = getAllSongs();
    const index = songs.findIndex(s => s.id === id);
    if (index === -1) return null;

    songs[index] = {
        ...songs[index],
        ...updates,
        updatedAt: new Date().toISOString(),
    };
    saveSongs(songs);
    return songs[index];
};

/**
 * Delete a song
 * @param {string} id - Song ID
 * @returns {boolean} True if deleted, false if not found
 */
export const deleteSong = (id) => {
    const songs = getAllSongs();
    const filtered = songs.filter(s => s.id !== id);
    if (filtered.length === songs.length) return false;
    saveSongs(filtered);
    return true;
};

/**
 * Search songs by title
 * @param {string} query - Search query
 * @returns {Array} Matching songs
 */
export const searchSongs = (query, songs) => {
    if (!songs) return [];
    const lowerQuery = (query || '').toLowerCase().trim();
    if (!lowerQuery) return songs;

    const allWords = lowerQuery.split(/\s+/).filter(Boolean);
    const significantWords = allWords.filter(w => !STOP_WORDS.has(w) && w.length > 2);

    // Fallback to all words if searching exclusively for common terms
    const searchWords = significantWords.length > 0 ? significantWords : allWords;
    const isPhrase = allWords.length > 1;

    const results = songs
        .map(song => {
            let score = 0;
            const title = (song.title || '').toLowerCase();
            const lyrics = (song.lyrics || '').toLowerCase();

            // 1. PHRASE MATCHING (CRITICAL)
            if (title === lowerQuery) {
                score += 1000000; // Perfect match
            } else if (title.startsWith(lowerQuery)) {
                score += 500000; // Start match
            } else if (title.includes(lowerQuery)) {
                score += 200000; // Phrase contains
            }

            // Lyrics phrase match
            if (lowerQuery.length >= 4 && lyrics.includes(lowerQuery)) {
                score += 100000;
            }

            // 2. KEYWORD MATCHING
            let titleHits = 0;
            searchWords.forEach(w => { if (title.includes(w)) titleHits++; });

            let lyricsHits = 0;
            searchWords.forEach(w => { if (lyrics.includes(w)) lyricsHits++; });

            // Title weighted matches
            score += (titleHits / searchWords.length) * 50000;

            // Lyrics matches - require higher density for multi-word queries
            if (isPhrase) {
                if (lyricsHits === searchWords.length) {
                    score += 20000;
                } else if (lyricsHits >= searchWords.length * 0.75) {
                    score += 10000;
                }
            } else if (lyricsHits > 0) {
                score += 5000;
            }

            return { ...song, searchScore: score };
        })
        .filter(song => song.searchScore >= 10000); // Strict filter to eliminate noise

    return results
        .sort((a, b) => {
            if (b.searchScore !== a.searchScore) return b.searchScore - a.searchScore;
            // Shorter titles rank higher for same score (more precise)
            if (a.title.length !== b.title.length) return a.title.length - b.title.length;
            return a.title.localeCompare(b.title);
        })
        .map(({ searchScore, ...song }) => song);
};

/**
 * Get a song by ID
 * @param {string} id - Song ID
 * @returns {Object|null} Song or null if not found
 */
export const getSongById = (id) => {
    const songs = getAllSongs();
    return songs.find(s => s.id === id) || null;
};

/**
 * Add multiple songs at once (bulk import)
 * @param {Array} newSongs - Array of song objects {title, lyrics}
 * @returns {number} Number of songs added
 */
export const bulkAddSongs = (newSongs) => {
    if (!Array.isArray(newSongs) || newSongs.length === 0) return 0;

    const existingSongs = getAllSongs();
    const existingTitles = new Set(existingSongs.map(s => s.title.toLowerCase().trim()));

    const songsToAdd = newSongs
        .filter(s => s.title && s.lyrics && !existingTitles.has(s.title.toLowerCase().trim()))
        .map(s => ({
            id: (Date.now() + Math.random()).toString(), // Unique ID even in high frequency
            title: s.title.trim(),
            lyrics: s.lyrics.trim(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }));

    if (songsToAdd.length === 0) return 0;

    saveSongs([...existingSongs, ...songsToAdd]);
    return songsToAdd.length;
};

/**
 * Sync songs from the local SQLite database via API
 * @returns {Promise<number>} Number of new songs added
 */
export const syncFromDatabase = async () => {
    try {
        // Use relative URL as it will be proxied or handled by the local server
        const response = await fetch('/api/songs');
        if (!response.ok) throw new Error('Failed to fetch songs from database');

        const songs = await response.json();
        return bulkAddSongs(songs);
    } catch (error) {
        console.error('Sync error:', error);
        throw error;
    }
};

export default {
    getAllSongs,
    addSong,
    updateSong,
    deleteSong,
    searchSongs,
    getSongById,
    bulkAddSongs,
};
