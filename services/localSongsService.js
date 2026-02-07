const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs-extra');
const { getResourcePath } = require('./pathUtils');

const DB_PATH = getResourcePath('data/bible.sqlite');

let db = null;

class LocalSongsService {
    constructor() {
        this.initializeDb();
    }

    initializeDb() {
        if (db) return;

        try {
            db = new Database(DB_PATH, { verbose: null });
            const tableExists = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='songs'").get();
            if (!tableExists) {
                console.warn('⚠️  Songs table not found in database.');
            } else {
                console.log('✓ Local Songs database connected');
            }
        } catch (error) {
            console.error('❌ Failed to initialize local Songs database:', error);
        }
    }

    /**
     * Get all songs from the database
     */
    getAllSongs() {
        if (!db) this.initializeDb();
        try {
            return db.prepare('SELECT id, title, lyrics, author, themes FROM songs ORDER BY title').all();
        } catch (error) {
            console.error('Error fetching songs:', error);
            return [];
        }
    }

    /**
     * Search songs by title or lyrics
     */
    searchSongs(query, limit = 50) {
        if (!db) this.initializeDb();
        try {
            const stmt = db.prepare(`
                SELECT id, title, lyrics, author, themes 
                FROM songs 
                WHERE title LIKE ? OR lyrics LIKE ? 
                LIMIT ?
            `);
            const searchTerm = `%${query}%`;
            return stmt.all(searchTerm, searchTerm, limit);
        } catch (error) {
            console.error('Error searching songs:', error);
            return [];
        }
    }

    /**
     * Get a song by ID
     */
    getSongById(id) {
        if (!db) this.initializeDb();
        try {
            return db.prepare('SELECT * FROM songs WHERE id = ?').get(id);
        } catch (error) {
            console.error(`Error fetching song ${id}:`, error);
            return null;
        }
    }
}

const localSongsService = new LocalSongsService();
module.exports = { localSongsService, LocalSongsService };
