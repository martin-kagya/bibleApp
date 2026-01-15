/**
 * Songs Service
 * Manages CRUD operations for the song database
 * Uses localStorage for persistence
 */

const STORAGE_KEY = 'pneumavoice_songs';

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
export const searchSongs = (query) => {
    const songs = getAllSongs();
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery) return songs;

    return songs.filter(song =>
        song.title.toLowerCase().includes(lowerQuery)
    );
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

export default {
    getAllSongs,
    addSong,
    updateSong,
    deleteSong,
    searchSongs,
    getSongById,
    bulkAddSongs,
};
