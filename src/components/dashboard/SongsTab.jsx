import React, { useState, useEffect } from 'react';
import { Search, Plus, Music, Play, Trash2, Edit2, X, Upload } from 'lucide-react';
import { getAllSongs, addSong, deleteSong, searchSongs, updateSong, bulkAddSongs } from '../../../services/songsService';
import { projectSong } from '../../../services/projectionWindowService';
import { useScripture } from '../../contexts/ScriptureContext';

/**
 * SongCard - Individual song display with expand/collapse
 */
const SongCard = ({ song, onProject, onDelete, onEdit }) => {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="bg-card border border-border rounded-lg overflow-hidden transition-all hover:shadow-md">
            <div
                className="p-4 flex items-center justify-between cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Music className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground">{song.title}</h3>
                        <p className="text-xs text-muted-foreground">
                            {song.lyrics.split('\n').length} lines
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); onProject(song); }}
                        className="p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors"
                        title="Project Song"
                    >
                        <Play className="w-4 h-4" fill="currentColor" />
                    </button>
                </div>
            </div>

            {expanded && (
                <div className="px-4 pb-4 border-t border-border pt-3 animate-fade-in">
                    <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed max-h-48 overflow-y-auto">
                        {song.lyrics}
                    </pre>
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                        <button
                            onClick={() => onEdit(song)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-muted hover:bg-accent rounded-md transition-colors"
                        >
                            <Edit2 className="w-3 h-3" /> Edit
                        </button>
                        <button
                            onClick={() => onDelete(song.id)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-destructive/10 text-destructive hover:bg-destructive/20 rounded-md transition-colors"
                        >
                            <Trash2 className="w-3 h-3" /> Delete
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

/**
 * AddSongModal - Modal for adding/editing songs
 */
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

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!title.trim() || !lyrics.trim()) return;
        onSave({ title, lyrics, id: editingSong?.id });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h2 className="font-semibold text-lg">
                        {editingSong ? 'Edit Song' : 'Add New Song'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-muted rounded-full transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col p-4 gap-4 overflow-hidden">
                    <div>
                        <label className="block text-sm font-medium mb-1.5">Song Title</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter song title..."
                            className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            autoFocus
                        />
                    </div>

                    <div className="flex-1 flex flex-col min-h-0">
                        <label className="block text-sm font-medium mb-1.5">Lyrics</label>
                        <textarea
                            value={lyrics}
                            onChange={(e) => setLyrics(e.target.value)}
                            placeholder="Enter song lyrics..."
                            className="flex-1 w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none min-h-[200px]"
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={!title.trim() || !lyrics.trim()}
                            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
                        >
                            {editingSong ? 'Save Changes' : 'Add Song'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/**
 * SongsTab - Main songs management component
 */
const SongsTab = () => {
    const [songs, setSongs] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSong, setEditingSong] = useState(null);
    const [isImporting, setIsImporting] = useState(false);
    const { projectContent } = useScripture?.() || {};

    useEffect(() => {
        loadSongs();
    }, []);

    const loadSongs = () => {
        const allSongs = getAllSongs();
        setSongs(allSongs);
    };

    const handleSearch = (query) => {
        setSearchQuery(query);
        if (query.trim()) {
            setSongs(searchSongs(query));
        } else {
            loadSongs();
        }
    };

    const handleSaveSong = (songData) => {
        if (songData.id) {
            updateSong(songData.id, { title: songData.title, lyrics: songData.lyrics });
        } else {
            addSong({ title: songData.title, lyrics: songData.lyrics });
        }
        loadSongs();
        setEditingSong(null);
    };

    const handleDeleteSong = (id) => {
        if (window.confirm('Are you sure you want to delete this song?')) {
            deleteSong(id);
            loadSongs();
        }
    };

    const handleEditSong = (song) => {
        setEditingSong(song);
        setIsModalOpen(true);
    };

    const handleProjectSong = (song) => {
        // Project song to live display using shared projection window
        if (projectContent) {
            projectContent({
                type: 'song',
                title: song.title,
                content: song.lyrics,
            });
        } else {
            // Use shared projection window service
            projectSong(song);
        }
    };

    const handleImportXml = async () => {
        if (!window.electron?.importXmlSongs) {
            alert('Import is only available in the desktop application.');
            return;
        }

        try {
            setIsImporting(true);
            const result = await window.electron.importXmlSongs();

            if (result.success) {
                const addedCount = bulkAddSongs(result.songs);
                if (addedCount > 0) {
                    alert(`Successfully imported ${addedCount} new songs!`);
                    loadSongs();
                } else {
                    alert('No new songs to import (they might already exist).');
                }
            } else {
                alert(`Import failed: ${result.message}`);
            }
        } catch (error) {
            console.error('Import error:', error);
            alert('An error occurred during import.');
        } finally {
            setIsImporting(false);
        }
    };

    const handleImportEasyWorship = async () => {
        if (!window.electron?.importEasyWorshipSongs) {
            alert('Import is only available in the desktop application.');
            return;
        }

        try {
            setIsImporting(true);
            const result = await window.electron.importEasyWorshipSongs();

            if (result.success) {
                const addedCount = bulkAddSongs(result.songs);
                if (addedCount > 0) {
                    alert(`Successfully imported ${addedCount} new songs!`);
                    loadSongs();
                } else {
                    alert('No new songs to import (they might already exist).');
                }
            } else if (result.message !== 'No file selected') {
                alert(`Import failed: ${result.message}`);
            }
        } catch (error) {
            console.error('Import error:', error);
            alert('An error occurred during import.');
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="h-full flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                        placeholder="Search songs by title..."
                        className="w-full pl-10 pr-4 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleImportXml}
                        disabled={isImporting}
                        className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-accent text-foreground rounded-md transition-colors text-sm font-medium disabled:opacity-50"
                        title="Import songs from data/Songs XML files"
                    >
                        <Upload className="w-4 h-4" />
                        {isImporting ? 'Importing XML...' : 'Import XML'}
                    </button>
                    <button
                        onClick={handleImportEasyWorship}
                        disabled={isImporting}
                        className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-accent text-foreground rounded-md transition-colors text-sm font-medium disabled:opacity-50"
                        title="Import songs from EasyWorship SQLite database"
                    >
                        <Upload className="w-4 h-4" />
                        {isImporting ? 'Importing EW...' : 'Import EW'}
                    </button>
                    <button
                        onClick={() => { setEditingSong(null); setIsModalOpen(true); }}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors text-sm font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        Add Song
                    </button>
                </div>
            </div>

            {/* Songs List */}
            <div className="flex-1 overflow-y-auto min-h-0 pr-1">
                {songs.length > 0 ? (
                    <div className="grid gap-3">
                        {songs.map((song) => (
                            <SongCard
                                key={song.id}
                                song={song}
                                onProject={handleProjectSong}
                                onDelete={handleDeleteSong}
                                onEdit={handleEditSong}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                        <Music className="w-12 h-12 mb-3 opacity-50" />
                        <p className="text-sm">
                            {searchQuery ? 'No songs found' : 'No songs yet. Add your first song!'}
                        </p>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            <AddSongModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingSong(null); }}
                onSave={handleSaveSong}
                editingSong={editingSong}
            />
        </div>
    );
};

export default SongsTab;
