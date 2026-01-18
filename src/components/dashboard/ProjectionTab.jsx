import React, { useState, useEffect, useRef } from 'react';
import { Plus, Image, Type, Trash2, Play, Upload, X, FileText, Heart, MapPin, Globe, User, Edit2 } from 'lucide-react';
import {
    getAllProjections,
    addProjection,
    deleteProjection,
    updateProjection,
    PROJECTION_TYPES,
    fileToBase64
} from '../../../services/projectionService';
import {
    projectImage,
    projectAnnouncement,
    projectPrayerRequest
} from '../../../services/projectionWindowService';
import { useScripture } from '../../contexts/ScriptureContext';
import UnifiedPreviewMonitor from './UnifiedPreviewMonitor';

/**
 * PrayerRequestItem - Display prayer request with image and details
 */
const PrayerRequestItem = ({ item, onProject, onDelete, onEdit, onPreview }) => {
    return (
        <div className="bg-card border border-border rounded-lg overflow-hidden group hover:shadow-md transition-all">
            <div className="aspect-[4/3] bg-muted relative overflow-hidden">
                {item.image ? (
                    <img
                        src={item.image}
                        alt={item.name || 'Prayer request'}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                        <User className="w-16 h-16 text-primary/30" />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                    <h3 className="font-semibold text-lg truncate">{item.name || 'Anonymous'}</h3>
                    <div className="flex items-center gap-2 text-sm opacity-90">
                        <MapPin className="w-3 h-3" />
                        <span>{item.city}{item.city && item.country ? ', ' : ''}{item.country}</span>
                    </div>
                </div>
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                        onClick={() => onEdit(item)}
                        className="p-2 bg-accent text-foreground rounded-full hover:bg-accent/80"
                        title="Edit"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    {onPreview && (
                        <button
                            onClick={() => onPreview(item)}
                            className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700"
                            title="Preview"
                        >
                            <Type className="w-4 h-4" />
                        </button>
                    )}
                    <button
                        onClick={() => onProject(item)}
                        className="p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90"
                        title="Project"
                    >
                        <Play className="w-4 h-4" fill="currentColor" />
                    </button>
                    <button
                        onClick={() => onDelete(item.id)}
                        className="p-2 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                        title="Delete"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
            <div className="p-3 border-t border-border">
                <div className="flex items-start gap-2">
                    <Heart className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground line-clamp-2">{item.problem}</p>
                </div>
            </div>
        </div>
    );
};

/**
 * ProjectionItem - Individual projection item display
 */
const ProjectionItem = ({ item, onProject, onDelete, onEdit, onPreview }) => {
    const isImage = item.type === PROJECTION_TYPES.IMAGE;
    const isPrayerRequest = item.type === PROJECTION_TYPES.PRAYER_REQUEST;

    if (isPrayerRequest) {
        return <PrayerRequestItem item={item} onProject={onProject} onDelete={onDelete} onEdit={onEdit} onPreview={onPreview} />;
    }

    return (
        <div 
            className="bg-card border border-border rounded-lg overflow-hidden group hover:shadow-md transition-all cursor-pointer"
            onDoubleClick={() => onProject(item)}
        >
            {isImage ? (
                <div className="aspect-video bg-muted relative overflow-hidden">
                    <img
                        src={item.content}
                        alt={item.title || 'Projection image'}
                        className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        {onPreview && (
                            <button
                                onClick={() => onPreview(item)}
                                className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700"
                                title="Preview"
                            >
                                <Type className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            onClick={() => onProject(item)}
                            className="p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90"
                            title="Project"
                        >
                            <Play className="w-4 h-4" fill="currentColor" />
                        </button>
                        <button
                            onClick={() => onDelete(item.id)}
                            className="p-2 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                            title="Delete"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            ) : (
                <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 rounded-full bg-accent flex items-center justify-center shrink-0">
                                <Type className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-foreground truncate">
                                    {item.title || 'Announcement'}
                                </h3>
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                    {item.content}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            {onPreview && (
                                <button
                                    onClick={() => onPreview(item)}
                                    className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Preview"
                                >
                                    <Type className="w-3 h-3" />
                                </button>
                            )}
                            <button
                                onClick={() => onProject(item)}
                                className="p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Project"
                            >
                                <Play className="w-3 h-3" fill="currentColor" />
                            </button>
                            <button
                                onClick={() => onDelete(item.id)}
                                className="p-2 hover:bg-destructive/10 text-destructive rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Delete"
                            >
                                <Trash2 className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

/**
 * AddAnnouncementModal - Modal for adding text announcements
 */
const AddAnnouncementModal = ({ isOpen, onClose, onSave }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');

    useEffect(() => {
        if (isOpen) {
            setTitle('');
            setContent('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!content.trim()) return;
        onSave({
            type: PROJECTION_TYPES.ANNOUNCEMENT,
            title: title.trim() || 'Announcement',
            content: content.trim()
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg">
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h2 className="font-semibold text-lg">Add Announcement</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-muted rounded-full transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1.5">Title (optional)</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Announcement title..."
                            className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-1.5">Content</label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Enter announcement text..."
                            rows={4}
                            className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                            autoFocus
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
                            disabled={!content.trim()}
                            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
                        >
                            Add Announcement
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/**
 * AddPrayerRequestModal - Modal for adding/editing healing/miracle line requests
 */
const AddPrayerRequestModal = ({ isOpen, onClose, onSave, editingItem }) => {
    const [name, setName] = useState('');
    const [country, setCountry] = useState('');
    const [city, setCity] = useState('');
    const [problem, setProblem] = useState('');
    const [image, setImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            if (editingItem) {
                setName(editingItem.name || '');
                setCountry(editingItem.country || '');
                setCity(editingItem.city || '');
                setProblem(editingItem.problem || '');
                setImage(editingItem.image || null);
                setImagePreview(editingItem.image || null);
            } else {
                setName('');
                setCountry('');
                setCity('');
                setProblem('');
                setImage(null);
                setImagePreview(null);
            }
        }
    }, [isOpen, editingItem]);

    if (!isOpen) return null;

    const handleImageSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const base64 = await fileToBase64(file);
            setImage(base64);
            setImagePreview(base64);
        } catch (error) {
            console.error('Error loading image:', error);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!problem.trim()) return;

        onSave({
            id: editingItem?.id, // Pass id if editing
            type: PROJECTION_TYPES.PRAYER_REQUEST,
            name: name.trim() || 'Anonymous',
            country: country.trim(),
            city: city.trim(),
            problem: problem.trim(),
            image: image,
            title: name.trim() || 'Prayer Request', // For filtering compatibility
            content: problem.trim(), // For filtering compatibility
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
                    <div className="flex items-center gap-2">
                        <Heart className="w-5 h-5 text-destructive" />
                        <h2 className="font-semibold text-lg">{editingItem ? 'Edit Prayer Request' : 'Healing & Miracle Line'}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-muted rounded-full transition-colors"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    {/* Image Upload */}
                    <div>
                        <label className="block text-sm font-medium mb-1.5">Photo</label>
                        <div className="flex items-center gap-4">
                            <div
                                className="w-24 h-24 rounded-lg border-2 border-dashed border-input bg-muted/50 flex items-center justify-center overflow-hidden cursor-pointer hover:border-primary transition-colors"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-8 h-8 text-muted-foreground" />
                                )}
                            </div>
                            <div className="flex-1">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-accent rounded-md transition-colors text-sm"
                                >
                                    <Upload className="w-4 h-4" />
                                    {imagePreview ? 'Change Photo' : 'Upload Photo'}
                                </button>
                                <p className="text-xs text-muted-foreground mt-1">Optional: Add person's photo</p>
                            </div>
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageSelect}
                            className="hidden"
                        />
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium mb-1.5">Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Person's name (optional)..."
                            className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                    </div>

                    {/* Location */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium mb-1.5">
                                <Globe className="w-3 h-3 inline mr-1" />
                                Country
                            </label>
                            <input
                                type="text"
                                value={country}
                                onChange={(e) => setCountry(e.target.value)}
                                placeholder="e.g., Ghana"
                                className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1.5">
                                <MapPin className="w-3 h-3 inline mr-1" />
                                City
                            </label>
                            <input
                                type="text"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                placeholder="e.g., Accra"
                                className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                        </div>
                    </div>

                    {/* Problem/Prayer Need */}
                    <div>
                        <label className="block text-sm font-medium mb-1.5">
                            <Heart className="w-3 h-3 inline mr-1 text-destructive" />
                            Prayer Need / Problem
                        </label>
                        <textarea
                            value={problem}
                            onChange={(e) => setProblem(e.target.value)}
                            placeholder="Describe the prayer request or problem..."
                            rows={3}
                            className="w-full px-3 py-2 bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                            autoFocus
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
                            disabled={!problem.trim()}
                            className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
                        >
                            {editingItem ? 'Save Changes' : 'Add Prayer Request'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/**
 * ProjectionTab - Main projection management component
 */
const ProjectionTab = () => {
    const [items, setItems] = useState([]);
    const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
    const [isPrayerRequestModalOpen, setIsPrayerRequestModalOpen] = useState(false);
    const [editingPrayerRequest, setEditingPrayerRequest] = useState(null);
    const [filter, setFilter] = useState('all');
    const fileInputRef = useRef(null);
    const { projectContent, setPreviewContent, goLive } = useScripture?.() || {};

    useEffect(() => {
        loadItems();
    }, []);

    const loadItems = () => {
        const allItems = getAllProjections();
        setItems(allItems);
    };

    const handleAddImage = async (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        for (const file of files) {
            if (!file.type.startsWith('image/')) continue;

            try {
                const base64 = await fileToBase64(file);
                addProjection({
                    type: PROJECTION_TYPES.IMAGE,
                    title: file.name,
                    content: base64,
                });
            } catch (error) {
                console.error('Error adding image:', error);
            }
        }

        loadItems();
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleAddProjection = (data) => {
        if (data.id) {
            // Editing existing item
            updateProjection(data.id, data);
        } else {
            // Adding new item
            addProjection(data);
        }
        loadItems();
        setEditingPrayerRequest(null);
    };

    const handleEditPrayerRequest = (item) => {
        setEditingPrayerRequest(item);
        setIsPrayerRequestModalOpen(true);
    };

    const handleDeleteItem = (id) => {
        if (window.confirm('Are you sure you want to delete this item?')) {
            deleteProjection(id);
            loadItems();
        }
    };

    const handlePreviewItem = (item) => {
        const previewData = {
            type: item.type,
            title: item.title || item.name || 'Announcement',
            content: item.content || item.problem || '',
            image: item.image || null,
            ...item
        };
        if (setPreviewContent) {
            setPreviewContent(previewData);
        }
    };

    const handleProjectItem = (item) => {
        // First set preview
        const previewData = {
            type: item.type,
            title: item.title || item.name || 'Announcement',
            content: item.content || item.problem || '',
            image: item.image || null,
            ...item
        };
        if (setPreviewContent) {
            setPreviewContent(previewData);
        }

        // Then go live/project via Socket.IO (opens live display window automatically)
        if (goLive) {
            // Use goLive to send via Socket.IO - this will auto-open the live display window
            // Ensure all prayer request fields are included
            const liveData = {
                type: item.type,
                reference: item.title || item.name || 'Announcement',
                title: item.title || item.name || 'Announcement',
                text: item.content || item.problem || '',
                content: item.content || item.problem || '',
                translation: item.source || 'Announcement',
                // Include all prayer request specific fields
                name: item.name,
                city: item.city,
                country: item.country,
                problem: item.problem,
                image: item.image,
                // Spread rest of item to ensure nothing is missed
                ...item,
            };
            console.log('🎯 Sending prayer request to live:', liveData);
            goLive(liveData);
        } else if (projectContent) {
            projectContent({
                type: item.type,
                title: item.title || item.name,
                content: item.content || item.problem,
                ...item,
            });
        } else {
            // Fallback: Use shared projection window service
            if (item.type === PROJECTION_TYPES.PRAYER_REQUEST) {
                projectPrayerRequest(item);
            } else if (item.type === PROJECTION_TYPES.IMAGE) {
                projectImage(item);
            } else {
                projectAnnouncement(item);
            }
        }
    };

    const filteredItems = filter === 'all'
        ? items
        : items.filter(item => item.type === filter);

    return (
        <div className="h-full flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-4 flex-wrap shrink-0">
                {/* Filters */}
                <div className="flex items-center gap-2 flex-wrap">
                    {[
                        { key: 'all', label: 'All' },
                        { key: PROJECTION_TYPES.IMAGE, label: 'Images', icon: Image },
                        { key: PROJECTION_TYPES.ANNOUNCEMENT, label: 'Announcements', icon: FileText },
                        { key: PROJECTION_TYPES.PRAYER_REQUEST, label: 'Prayer Requests', icon: Heart },
                    ].map(({ key, label, icon: Icon }) => (
                        <button
                            key={key}
                            onClick={() => setFilter(key)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${filter === key
                                ? 'bg-primary text-primary-foreground border-primary'
                                : 'bg-background text-muted-foreground border-input hover:bg-muted'
                                }`}
                        >
                            {Icon && <Icon className="w-3 h-3" />}
                            {label}
                        </button>
                    ))}
                </div>

                {/* Add Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleAddImage}
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-accent text-foreground rounded-md transition-colors text-sm font-medium"
                    >
                        <Upload className="w-4 h-4" />
                        Image
                    </button>
                    <button
                        onClick={() => setIsAnnouncementModalOpen(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-muted hover:bg-accent text-foreground rounded-md transition-colors text-sm font-medium"
                    >
                        <Type className="w-4 h-4" />
                        Announcement
                    </button>
                    <button
                        onClick={() => setIsPrayerRequestModalOpen(true)}
                        className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-primary to-destructive text-primary-foreground rounded-md hover:opacity-90 transition-all text-sm font-medium"
                    >
                        <Heart className="w-4 h-4" />
                        Prayer Request
                    </button>
                </div>
            </div>

            {/* Main Content: Large Preview Monitor + Items Grid */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-0 overflow-hidden">
                {/* Large Preview Monitor - Takes 2/3 on large screens, full width on smaller */}
                <div className="lg:col-span-2 flex items-center justify-center min-h-0">
                    <div className="w-full h-full max-h-full flex items-center justify-center">
                        <UnifiedPreviewMonitor className="w-full max-w-full h-full max-h-full scale-100" />
                    </div>
                </div>

                {/* Items Grid - Takes 1/3 on large screens */}
                <div className="lg:col-span-1 overflow-y-auto min-h-0 pr-1">
                    {filteredItems.length > 0 ? (
                        <div className="grid grid-cols-1 gap-4">
                            {filteredItems.map((item) => (
                                <ProjectionItem
                                    key={item.id}
                                    item={item}
                                    onProject={handleProjectItem}
                                    onPreview={handlePreviewItem}
                                    onDelete={handleDeleteItem}
                                    onEdit={handleEditPrayerRequest}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                            <Image className="w-12 h-12 mb-3 opacity-50" />
                            <p className="text-sm">
                                No projection items yet. Add images, announcements, or prayer requests!
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <AddAnnouncementModal
                isOpen={isAnnouncementModalOpen}
                onClose={() => setIsAnnouncementModalOpen(false)}
                onSave={handleAddProjection}
            />
            <AddPrayerRequestModal
                isOpen={isPrayerRequestModalOpen}
                onClose={() => { setIsPrayerRequestModalOpen(false); setEditingPrayerRequest(null); }}
                onSave={handleAddProjection}
                editingItem={editingPrayerRequest}
            />
        </div>
    );
};

export default ProjectionTab;
