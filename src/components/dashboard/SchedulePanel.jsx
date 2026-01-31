import React from 'react';
import {
    Calendar, Play, Trash2, X, MoveUp, MoveDown, Save, FolderOpen,
    BookOpen, Music, FileText, Image as ImageIcon, Heart, Info
} from 'lucide-react';
import { useScripture } from '../../contexts/ScriptureContext';

/**
 * SchedulePanel - Manages the planned items for a service
 */
const SchedulePanel = ({ openInLexicon }) => {
    const {
        schedule,
        removeFromSchedule,
        moveScheduleItem,
        clearSchedule,
        goLive,
        setPreviewContent,
        saveScheduleToFile,
        loadScheduleFromFile
    } = useScripture();

    const getItemIcon = (type) => {
        switch (type) {
            case 'scripture': return <BookOpen className="w-4 h-4 text-blue-500" />;
            case 'song': return <Music className="w-4 h-4 text-green-500" />;
            case 'announcement': return <FileText className="w-4 h-4 text-orange-500" />;
            case 'image': return <ImageIcon className="w-4 h-4 text-purple-500" />;
            case 'prayer_request': return <Heart className="w-4 h-4 text-red-500" />;
            default: return <Info className="w-4 h-4 text-muted-foreground" />;
        }
    };

    const handleItemClick = (item, isDoubleClick = false) => {
        const previewData = {
            ...item,
            title: item.title || item.reference || 'Item',
            content: item.content || item.text || ''
        };

        if (isDoubleClick) {
            if (setPreviewContent) setPreviewContent(previewData);
            goLive(item);
        } else {
            if (setPreviewContent) setPreviewContent(previewData);
        }
    };

    const handleSave = async () => {
        const success = await saveScheduleToFile();
        if (success) {
            // Optional: Show toast
        }
    };

    const handleLoad = async () => {
        await loadScheduleFromFile();
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header / Actions */}
            <div className="flex items-center justify-between p-3 border-b border-border shrink-0 bg-background/50">
                <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Service Schedule</span>
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={handleLoad}
                        className="p-1.5 hover:bg-muted rounded text-muted-foreground"
                        title="Load Schedule"
                    >
                        <FolderOpen className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={handleSave}
                        className="p-1.5 hover:bg-muted rounded text-muted-foreground"
                        title="Save Schedule"
                    >
                        <Save className="w-3.5 h-3.5" />
                    </button>
                    {schedule.length > 0 && (
                        <button
                            onClick={() => { if (window.confirm('Clear entire schedule?')) clearSchedule(); }}
                            className="p-1.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive rounded transition-colors"
                            title="Clear All"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Schedule List */}
            <div className="flex-1 overflow-y-auto min-h-0 p-2 space-y-2 custom-scrollbar">
                {schedule.length > 0 ? (
                    schedule.map((item, idx) => (
                        <div
                            key={item.id || idx}
                            className="group relative bg-card hover:bg-muted/30 rounded-lg border border-border p-3 cursor-pointer transition-all shadow-sm"
                            onClick={() => handleItemClick(item, false)}
                            onDoubleClick={() => handleItemClick(item, true)}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex gap-3 min-w-0">
                                    <div className="mt-0.5 shrink-0">
                                        {getItemIcon(item.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-sm text-foreground truncate">
                                                {item.reference || item.title || 'Untitled'}
                                            </span>
                                            {item.translation && (
                                                <span className="text-[9px] px-1 py-0.5 bg-muted text-muted-foreground rounded uppercase">
                                                    {item.translation}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 italic">
                                            {item.text || item.content || 'No content preview'}
                                        </p>
                                    </div>
                                </div>

                                {/* Reordering & Actions */}
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <div className="flex flex-col border-r border-border pr-1 mr-1">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); moveScheduleItem(idx, idx - 1); }}
                                            disabled={idx === 0}
                                            className="p-1 hover:bg-muted rounded disabled:opacity-20"
                                        >
                                            <MoveUp className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); moveScheduleItem(idx, idx + 1); }}
                                            disabled={idx === schedule.length - 1}
                                            className="p-1 hover:bg-muted rounded disabled:opacity-20"
                                        >
                                            <MoveDown className="w-3 h-3" />
                                        </button>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleItemClick(item, true); }}
                                        className="p-2 bg-primary text-primary-foreground rounded-full hover:bg-primary/90 shadow-md"
                                        title="Go Live"
                                    >
                                        <Play className="w-3 h-3" fill="currentColor" />
                                    </button>
                                    {(item.type === 'scripture' || item.type === 'song') && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); openInLexicon(item.reference || item.songTitle || item.title); }}
                                            className="p-2 bg-muted text-muted-foreground rounded-full hover:bg-accent hover:text-accent-foreground"
                                            title="Open in Lexicon"
                                        >
                                            <BookOpen className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); removeFromSchedule(item.id); }}
                                        className="p-2 hover:bg-destructive/10 text-destructive rounded-full"
                                        title="Remove"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>

                            {/* Drag index indicator */}
                            <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-primary/30 rounded-full opacity-0 group-hover:opacity-100" />
                        </div>
                    ))
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground/60">
                        <Calendar className="w-12 h-12 mb-3 opacity-10" />
                        <p className="text-sm font-medium">Schedule is Empty</p>
                        <p className="text-xs mt-2 px-4 leading-relaxed">
                            Planned scriptures, songs, and announcements will appear here distinct from your viewing history.
                        </p>
                        <div className="mt-4 flex flex-col gap-2 w-full max-w-[200px]">
                            <button
                                onClick={handleLoad}
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-muted hover:bg-accent rounded-lg text-xs font-medium transition-all"
                            >
                                <FolderOpen className="w-3.5 h-3.5" />
                                Load Existing Service
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Summary Footer */}
            {schedule.length > 0 && (
                <div className="p-3 border-t border-border bg-muted/20 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground font-medium">
                        {schedule.length} Item{schedule.length !== 1 ? 's' : ''} in Schedule
                    </span>
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-1 text-[10px] bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 transition-all font-bold uppercase"
                    >
                        <Save className="w-3 h-3" />
                        Save Service
                    </button>
                </div>
            )}
        </div>
    );
};

export default SchedulePanel;
