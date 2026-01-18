import React from 'react';
import { Monitor, MapPin } from 'lucide-react';
import { useScripture } from '../../contexts/ScriptureContext';
import { useProjectionSettings } from '../../contexts/ProjectionSettingsContext';
import { getFontFamilyClass } from '../../utils/projectionStyles';

/**
 * UnifiedPreviewMonitor
 * A standardized monitor component that displays the current Global Preview
 * or Global Live content.
 * 
 * Logic: 
 * - If `previewContent` exists, show it as PREVIEW (Blue).
 * - If `previewContent` matches `liveScripture` (by value), show as LIVE (Red).
 * - If only `liveScripture` exists, show it as LIVE (Red).
 */
const UnifiedPreviewMonitor = ({ className = "" }) => {
    const { previewContent, liveScripture, clearLive, setPreviewContent } = useScripture();
    const { getSettings } = useProjectionSettings();

    // Determine what to display
    // Priority: Preview Content -> Live Content
    // However, we want to know the *Status* (Blue or Red)
    let displayContent = null;
    let status = 'OFF';

    // Helper to compare content
    const isSameContent = (a, b) => {
        if (!a || !b) return false;
        // Compare by reference/title + text
        return a.title === b.title && a.content === b.content; // Generic
        // || (a.reference && b.reference && a.reference === b.reference); // Scripture specific
    };

    if (previewContent) {
        displayContent = previewContent;
        // Check if this preview IS the live content
        // Note: liveScripture format might differ slightly from generic previewContent, normalize if needed
        // Assuming pushToLive sets similar structure or we compare fields
        const liveEquivalent = liveScripture ? {
            title: liveScripture.reference || liveScripture.title,
            content: liveScripture.text || liveScripture.content
        } : null;

        if (isSameContent(previewContent, liveEquivalent)) {
            status = 'LIVE';
        } else {
            status = 'PREVIEW';
        }
    } else if (liveScripture) {
        displayContent = {
            title: liveScripture.reference || liveScripture.title,
            content: liveScripture.text || liveScripture.content
        };
        status = 'LIVE';
    }

    const handleClear = (e) => {
        e.stopPropagation();
        setPreviewContent(null);
        clearLive(); // Now explicitly clears the live projector too
    };

    return (
        <div className={`flex flex-col gap-2 min-w-[200px] bg-background/50 rounded-lg border border-border/50 shadow-sm p-3 ${className}`}>
            <div className="flex items-center justify-between shrink-0 h-8">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                    <Monitor className="w-3.5 h-3.5" /> Monitor
                </span>
                {displayContent && (
                    <button
                        onClick={handleClear}
                        className="text-[10px] px-2 py-1 bg-muted text-muted-foreground hover:bg-muted/80 rounded transition-colors font-medium border border-border"
                    >
                        Clear All
                    </button>
                )}
            </div>

            {/* 16:9 Preview Box */}
            <div className="w-full aspect-video rounded-lg overflow-hidden shadow-2xl border border-border/50 relative group outline outline-1 outline-border/20">
                {displayContent ? (
                    // Render different types with their original styling
                    (() => {
                        const type = displayContent.type || (displayContent.reference ? 'scripture' : displayContent.title ? 'song' : 'announcement');

                        // SCRIPTURE STYLE (black background, large reference, serif text with quotes)
                        // Only match if explicitly 'scripture' OR (has reference AND is not another known type)
                        const isScripture = type === 'scripture' || (displayContent.reference && !['song', 'announcement', 'image', 'prayer_request', 'PRAYER_REQUEST'].includes(type));

                        if (isScripture) {
                            const scriptureSettings = getSettings('scripture');
                            const fontFamily = getFontFamilyClass(scriptureSettings.fontFamily);
                            const textContent = displayContent.content || displayContent.text || '';
                            const textLength = textContent.length;

                            // Calculate optimal font size based on container and text length
                            // Using clamp for responsive sizing that adapts to container
                            const getTextSizeStyle = () => {
                                // Base size on text length, but let CSS clamp handle scaling to container
                                let baseSize = 12; // base in pixels
                                if (textLength > 300) baseSize = 9;
                                else if (textLength > 200) baseSize = 10;
                                else if (textLength > 100) baseSize = 11;
                                else if (textLength > 50) baseSize = 12;
                                else baseSize = 14;

                                // Use clamp to scale with container, with minimum and maximum bounds
                                const minSize = baseSize;
                                const preferredSize = baseSize * 1.2; // Slightly larger for better readability
                                const maxSize = Math.min(baseSize * 2.5, 20); // Cap at reasonable max

                                return {
                                    fontSize: `clamp(${minSize}px, ${preferredSize}px, ${maxSize}px)`,
                                    lineHeight: '1.3',
                                    maxHeight: '100%',
                                    overflow: 'auto',
                                    color: scriptureSettings.fontColor
                                };
                            };

                            const getReferenceSizeStyle = () => {
                                return {
                                    fontSize: `clamp(10px, 1.2vw, 16px)`,
                                    lineHeight: '1.2',
                                    color: scriptureSettings.fontColor
                                };
                            };

                            return (
                                <div
                                    className="absolute inset-0 flex flex-col items-center justify-center min-h-full p-2 md:p-3 text-center animate-in fade-in zoom-in-95 duration-200 overflow-hidden"
                                    style={{ backgroundColor: scriptureSettings.backgroundColor }}
                                >
                                    <div className="shrink-0 mb-1 md:mb-2 w-full">
                                        <h1
                                            className={`font-bold font-display tracking-tight mb-1 md:mb-2 ${scriptureSettings.textShadow ? 'drop-shadow-lg' : ''} leading-tight px-2`}
                                            style={getReferenceSizeStyle()}
                                        >
                                            {displayContent.reference || displayContent.title}
                                        </h1>
                                        {displayContent.translation && (
                                            <span className="inline-block px-1.5 md:px-2 py-0.5 md:py-1 bg-gray-900 text-gray-400 rounded-full text-[8px] md:text-[9px] font-medium tracking-wider uppercase border border-gray-800">
                                                {displayContent.translation}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1 flex items-center justify-center w-full px-2 md:px-4 min-h-0 overflow-auto">
                                        <p
                                            className={`${fontFamily} ${scriptureSettings.textShadow ? 'drop-shadow-md' : ''} break-words hyphens-auto w-full text-center`}
                                            style={getTextSizeStyle()}
                                        >
                                            "{textContent}"
                                        </p>
                                    </div>
                                </div>
                            );
                        }

                        // SONG STYLE (blue/purple gradient, title at top, large lyrics)
                        if (type === 'song') {
                            const songSettings = getSettings('song');
                            const fontFamily = getFontFamilyClass(songSettings.fontFamily);
                            const textLength = displayContent.content.length;
                            // Dynamic font sizing for preview - scaled down
                            let fontSizeClass = 'text-[22px] md:text-[28px]';
                            if (textLength > 300) fontSizeClass = 'text-[12px] md:text-[14px]';
                            else if (textLength > 200) fontSizeClass = 'text-[14px] md:text-[18px]';
                            else if (textLength > 100) fontSizeClass = 'text-[16px] md:text-[22px]';
                            else if (textLength > 50) fontSizeClass = 'text-[18px] md:text-[26px]';

                            return (
                                <div className={`absolute inset-0 flex flex-col items-center justify-center min-h-full bg-gradient-to-br ${songSettings.backgroundGradient} p-2 md:p-4 animate-in fade-in zoom-in-95 duration-200 overflow-hidden`}>
                                    {displayContent.title && (
                                        <div className="mb-2 opacity-80 flex items-center justify-center gap-2 shrink-0">
                                            <span className="text-xs">🎵</span>
                                            <h3
                                                className="text-[10px] md:text-xs font-medium tracking-widest uppercase border-b border-yellow-400/30 pb-1"
                                                style={{ color: songSettings.fontColor }}
                                            >
                                                {displayContent.title}
                                            </h3>
                                        </div>
                                    )}
                                    <div className="flex-1 flex items-center justify-center w-full">
                                        <pre
                                            className={`${fontSizeClass} font-bold whitespace-pre-wrap text-center leading-snug w-full ${fontFamily} ${songSettings.textShadow ? 'drop-shadow-md' : ''}`}
                                            style={{ color: songSettings.fontColor }}
                                        >
                                            {displayContent.content}
                                        </pre>
                                    </div>
                                </div>
                            );
                        }

                        // IMAGE STYLE (black background, centered image)
                        if (type === 'IMAGE') {
                            return (
                                <div className="absolute inset-0 bg-black flex items-center justify-center animate-in fade-in zoom-in-95 duration-200">
                                    <img
                                        src={displayContent.image || displayContent.content}
                                        alt={displayContent.title || 'Preview'}
                                        className="max-w-full max-h-full object-contain"
                                    />
                                </div>
                            );
                        }

                        // PRAYER REQUEST STYLE (dark gradient, photo + details layout)
                        if (type === 'PRAYER_REQUEST' || type === 'prayer_request' || displayContent.problem || (displayContent.name && displayContent.type?.includes('prayer'))) {
                            // Format prayer topics: split by dot delimiter for bullet points
                            const formatPrayerTopics = (text) => {
                                if (!text) return [];
                                // Split by dot followed by space(s) and letter to create bullet points
                                // This handles patterns like "Topic 1. Topic 2. Topic 3"
                                const topics = text
                                    .split(/\.\s+(?=[A-Za-z])|\.\s*$/)
                                    .map(topic => topic.trim())
                                    .filter(topic => topic.length > 0);
                                return topics.length > 0 ? topics : [text]; // Return topics or original text as single item
                            };

                            const prayerTopics = formatPrayerTopics(displayContent.problem || displayContent.content);
                            const location = [displayContent.city, displayContent.country].filter(Boolean).join(', ') || 'Location not specified';

                            return (
                                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white p-2 md:p-3 overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col">
                                    {/* Header */}
                                    <div className="text-center text-[6px] md:text-[8px] lg:text-[10px] font-semibold uppercase tracking-wider opacity-70 mb-1 shrink-0">
                                        HEALING & MIRACLE LINE
                                    </div>

                                    {/* Main Content: Image on left, details on right */}
                                    <div className="flex-1 flex gap-2 md:gap-3 items-stretch min-h-0 px-2 lg:px-4 pb-2">
                                        {/* Photo - Large on left (45%) */}
                                        <div className="w-[45%] h-full rounded-md lg:rounded-lg overflow-hidden bg-black/20 flex items-center justify-center flex-shrink-0 shadow-lg border border-white/10">
                                            {displayContent.image ? (
                                                <img
                                                    src={displayContent.image}
                                                    alt={displayContent.name || 'Prayer Request'}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <span className="text-4xl lg:text-6xl opacity-10">?</span>
                                            )}
                                        </div>

                                        {/* Details - Right Side */}
                                        <div className="w-[55%] flex flex-col justify-center min-w-0 pl-1">
                                            {/* Name - Ultra Bold */}
                                            <div className="text-xs md:text-sm lg:text-base xl:text-lg font-black mb-1 lg:mb-2 text-white leading-tight">
                                                {displayContent.name || 'Anonymous'}
                                            </div>

                                            {/* Location */}
                                            <div className="text-[6px] md:text-[8px] lg:text-[10px] font-medium text-blue-200/90 mb-2 flex items-center gap-1">
                                                <MapPin className="w-2 h-2 text-blue-400" />
                                                <span>{location}</span>
                                            </div>

                                            {/* Prayer Need Label */}
                                            <div className="text-[5px] md:text-[6px] lg:text-[7px] font-bold uppercase tracking-widest text-red-500 mb-1 lg:mb-2 border-b border-red-500/30 pb-0.5 w-max">
                                                PRAYER POINTS
                                            </div>

                                            {/* Prayer Topics as Bullets */}
                                            <div className="space-y-1 lg:space-y-1.5 overflow-auto max-h-[60%]">
                                                {prayerTopics.map((topic, idx) => (
                                                    <div key={idx} className="flex items-start gap-1.5 lg:gap-2">
                                                        <div className="mt-0.5 w-1 h-1 rounded-full bg-red-500 shrink-0" />
                                                        <span className="text-[6px] md:text-[7px] lg:text-[8px] font-semibold leading-snug text-white/95">{topic}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        }

                        // ANNOUNCEMENT STYLE (dark gradient, title + content)
                        if (type === 'ANNOUNCEMENT' || type === 'announcement') {
                            const announcementSettings = getSettings('announcement');
                            const fontFamily = getFontFamilyClass(announcementSettings.fontFamily);

                            return (
                                <div className={`absolute inset-0 flex flex-col items-center justify-center min-h-full bg-gradient-to-br ${announcementSettings.backgroundGradient} p-3 md:p-6 text-center animate-in fade-in zoom-in-95 duration-200`}>
                                    {displayContent.title && (
                                        <h1
                                            className={`text-xl md:text-3xl lg:text-4xl mb-3 md:mb-6 font-bold ${fontFamily} ${announcementSettings.textShadow ? 'drop-shadow-md' : ''} shrink-0`}
                                            style={{ color: announcementSettings.fontColor }}
                                        >
                                            {displayContent.title}
                                        </h1>
                                    )}
                                    <div className="flex-1 flex items-center justify-center">
                                        <p
                                            className={`text-sm md:text-xl lg:text-2xl leading-relaxed max-w-full px-2 ${fontFamily}`}
                                            style={{ color: announcementSettings.fontColor }}
                                        >
                                            {displayContent.content}
                                        </p>
                                    </div>
                                </div>
                            );
                        }

                        // DEFINITION/LEXICON STYLE (similar to announcement but with title emphasis)
                        if (type === 'definition') {
                            return (
                                <div className="absolute inset-0 flex flex-col items-center justify-center min-h-full bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white p-3 md:p-6 text-center animate-in fade-in zoom-in-95 duration-200">
                                    {displayContent.title && (
                                        <h1 className="text-lg md:text-2xl lg:text-3xl mb-3 md:mb-6 font-bold drop-shadow-md shrink-0 border-b border-white/20 pb-2 w-full">
                                            {displayContent.title}
                                        </h1>
                                    )}
                                    <div className="flex-1 flex items-center justify-center overflow-auto">
                                        <p className="text-xs md:text-base lg:text-lg leading-relaxed max-w-full px-2 font-serif">
                                            {displayContent.content || displayContent.text}
                                        </p>
                                    </div>
                                </div>
                            );
                        }

                        // DEFAULT (fallback to generic styling)
                        return (
                            <div className="absolute inset-0 flex flex-col items-center justify-center min-h-full bg-black text-white p-4 text-center animate-in fade-in zoom-in-95 duration-200">
                                {displayContent.title && (
                                    <h3 className="text-xs md:text-sm font-bold tracking-widest uppercase mb-2 truncate">
                                        {displayContent.title}
                                    </h3>
                                )}
                                <div className="flex-1 flex items-center justify-center">
                                    <p className="text-xs md:text-sm leading-relaxed whitespace-pre-wrap break-words">
                                        {displayContent.content || displayContent.text}
                                    </p>
                                </div>
                            </div>
                        );
                    })()
                ) : (
                    // OFF AIR STATE
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black opacity-30">
                        <div className="w-10 h-10 border-2 border-white/20 rounded-full flex items-center justify-center mb-2">
                            <div className="w-2 h-2 bg-white/50 rounded-full" />
                        </div>
                        <span className="text-[9px] font-mono tracking-widest text-white">OFF AIR</span>
                    </div>
                )}

                {/* Status Badge */}
                {status !== 'OFF' && (
                    <div className={`absolute top-3 right-3 px-2 py-0.5 text-white text-[9px] font-bold rounded shadow-lg animate-pulse backdrop-blur-sm border 
                        ${status === 'LIVE'
                            ? 'bg-red-600/90 border-red-500/50'
                            : 'bg-blue-600/90 border-blue-500/50'
                        }`}>
                        {status}
                    </div>
                )}
            </div>

            {status === 'LIVE' && (
                <div className="mt-1 flex items-center justify-center gap-2 text-[10px] text-red-500 font-bold uppercase tracking-widest animate-pulse">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    Live Output
                </div>
            )}
        </div>
    );
};

export default UnifiedPreviewMonitor;
