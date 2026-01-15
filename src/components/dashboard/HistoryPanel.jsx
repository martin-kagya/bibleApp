import React from 'react';
import { History, Play, Trash2, X, Clock } from 'lucide-react';
import { useScripture } from '../../contexts/ScriptureContext';

/**
 * HistoryPanel - Right-side panel showing projected scripture history
 */
const HistoryPanel = () => {
    const { projectionHistory, goLive, clearHistory, removeFromHistory } = useScripture();

    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const handleItemClick = (item) => {
        // Re-project the scripture
        goLive({
            reference: item.reference,
            text: item.text,
            translation: item.translation,
            book: item.book,
            chapter: item.chapter,
            verse: item.verse
        });
    };

    return (
        <div className="h-full flex flex-col bg-card/50 rounded-xl border border-dashed">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
                <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-muted-foreground" />
                    <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                        History
                    </h2>
                    {projectionHistory.length > 0 && (
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-mono">
                            {projectionHistory.length}
                        </span>
                    )}
                </div>
                {projectionHistory.length > 0 && (
                    <button
                        onClick={clearHistory}
                        className="text-xs text-muted-foreground hover:text-destructive transition-colors flex items-center gap-1"
                        title="Clear all history"
                    >
                        <Trash2 className="w-3 h-3" />
                        Clear
                    </button>
                )}
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto min-h-0 p-2">
                {projectionHistory.length > 0 ? (
                    <div className="space-y-1">
                        {projectionHistory.map((item) => (
                            <div
                                key={item.id}
                                className="group relative bg-background hover:bg-muted/50 rounded-lg border border-border p-2.5 cursor-pointer transition-all"
                                onClick={() => handleItemClick(item)}
                            >
                                <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-sm text-foreground truncate">
                                                {item.reference}
                                            </span>
                                            <span className="text-[9px] px-1 py-0.5 bg-muted text-muted-foreground rounded uppercase">
                                                {item.translation}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                            {item.text}
                                        </p>
                                        <div className="flex items-center gap-1 mt-1 text-[10px] text-muted-foreground/70">
                                            <Clock className="w-2.5 h-2.5" />
                                            {formatTime(item.timestamp)}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleItemClick(item);
                                            }}
                                            className="p-1.5 bg-primary text-primary-foreground rounded-full hover:bg-primary/90"
                                            title="Project again"
                                        >
                                            <Play className="w-2.5 h-2.5" fill="currentColor" />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                removeFromHistory(item.id);
                                            }}
                                            className="p-1.5 hover:bg-destructive/10 text-destructive rounded-full"
                                            title="Remove from history"
                                        >
                                            <X className="w-2.5 h-2.5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
                        <History className="w-8 h-8 mb-2 opacity-30" />
                        <p className="text-xs">No projection history yet</p>
                        <p className="text-[10px] opacity-70 mt-1">Projected verses will appear here</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HistoryPanel;
