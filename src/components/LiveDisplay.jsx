import React, { useEffect } from 'react';
import { MapPin } from 'lucide-react';
import { useScripture } from '../contexts/ScriptureContext';
import { useProjectionSettings } from '../contexts/ProjectionSettingsContext';
import { getFontSizeClass, getFontFamilyClass, applyDynamicFontScaling } from '../utils/projectionStyles';

const LiveDisplay = () => {
    const { liveScripture } = useScripture();
    const { getSettings } = useProjectionSettings();

    // If no content is live, show a "Waiting" screen or black screen.
    if (!liveScripture) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="text-gray-800 font-bold text-4xl animate-pulse tracking-widest uppercase">
                    Projector Ready
                </div>
            </div>
        );
    }

    // Determine content type and render accordingly
    // For prayer requests, check for PRAYER_REQUEST type specifically
    const type = liveScripture.type ||
        (liveScripture.reference && !liveScripture.type ? 'scripture' :
            liveScripture.problem ? 'PRAYER_REQUEST' :
                liveScripture.name ? 'PRAYER_REQUEST' :
                    'announcement');
    const content = String(liveScripture.content || liveScripture.text || liveScripture.problem || '');

    // Debug logging for prayer requests
    if (type === 'PRAYER_REQUEST') {
        console.log('🔴 Rendering Prayer Request:', {
            type,
            name: liveScripture.name,
            problem: liveScripture.problem,
            content,
            hasImage: !!liveScripture.image
        });
    }

    // SCRIPTURE STYLE (black background, large reference, serif text with quotes)
    if (type === 'scripture' || (liveScripture.reference && !liveScripture.type)) {
        const scriptureSettings = getSettings('scripture');
        const textStyles = applyDynamicFontScaling(scriptureSettings.fontSize, content.length, 'scripture');
        const fontFamily = getFontFamilyClass(scriptureSettings.fontFamily);
        const referenceFontSize = getFontSizeClass(scriptureSettings.fontSize, 'scripture', 'reference');

        return (
            <div
                className="flex flex-col items-center justify-center min-h-screen p-12 text-center animate-fade-in cursor-none"
                style={{ backgroundColor: scriptureSettings.backgroundColor }}
            >
                <div className="mb-12">
                    <h1
                        className={`${referenceFontSize} font-bold font-display tracking-tight mb-6 ${scriptureSettings.textShadow ? 'drop-shadow-lg' : ''}`}
                        style={{ color: scriptureSettings.fontColor }}
                    >
                        {liveScripture.reference}
                    </h1>
                    <span className="inline-block px-6 py-2 bg-gray-900 text-gray-400 rounded-full text-2xl font-medium tracking-wider uppercase border border-gray-800">
                        {liveScripture.translation || 'KJV'}
                    </span>
                </div>
                <div className="max-w-6xl mx-auto">
                    <p
                        className={`leading-tight ${fontFamily} ${scriptureSettings.textShadow ? 'drop-shadow-md' : ''}`}
                        style={{ color: scriptureSettings.fontColor, ...textStyles }}
                    >
                        "{content}"
                    </p>
                </div>
            </div>
        );
    }

    // SONG STYLE (blue/purple gradient, title at top, large lyrics)
    if (type === 'song') {
        const songSettings = getSettings('song');
        const textStyles = applyDynamicFontScaling(songSettings.fontSize, content.length, 'song');
        const fontFamily = getFontFamilyClass(songSettings.fontFamily);

        return (
            <div
                key={liveScripture.id || liveScripture.title || content}
                className={`min-h-screen bg-gradient-to-br ${songSettings.backgroundGradient} p-8 md:p-12 flex flex-col items-center justify-center text-center animate-fade-in cursor-none overflow-hidden`}
            >
                {/* Title - relative positioning (flex item) -> No Overlap */}
                {liveScripture.title && (
                    <div className="mb-8 md:mb-12 opacity-80 flex items-center justify-center gap-3 shrink-0">
                        <span className="text-2xl md:text-3xl">🎵</span>
                        <h1
                            className="text-xl md:text-3xl font-medium tracking-widest uppercase border-b border-yellow-400/30 pb-2"
                            style={{ color: songSettings.fontColor }}
                        >
                            {liveScripture.title}
                        </h1>
                    </div>
                )}
                {/* Lyrics Container - Flex grow to center vertically */}
                <div className="flex-1 flex items-center justify-center w-full max-w-7xl">
                    <pre
                        className={`font-bold whitespace-pre-wrap text-center leading-snug w-full ${fontFamily} ${songSettings.textShadow ? 'drop-shadow-xl' : ''}`}
                        style={{ color: songSettings.fontColor, ...textStyles }}
                    >
                        {content}
                    </pre>
                </div>
            </div>
        );
    }

    // ANNOUNCEMENT STYLE (dark gradient, title + content)
    if (type === 'ANNOUNCEMENT' || type === 'announcement') {
        const announcementSettings = getSettings('announcement');
        const titleFontSize = getFontSizeClass(announcementSettings.fontSize, 'announcement', 'title');
        const textFontSize = getFontSizeClass(announcementSettings.fontSize, 'announcement', 'text');
        const fontFamily = getFontFamilyClass(announcementSettings.fontFamily);

        return (
            <div className={`min-h-screen bg-gradient-to-br ${announcementSettings.backgroundGradient} p-12 flex flex-col items-center justify-center text-center animate-fade-in cursor-none`}>
                {liveScripture.title && (
                    <h1
                        className={`${titleFontSize} mb-12 font-bold ${fontFamily} ${announcementSettings.textShadow ? 'drop-shadow-md' : ''}`}
                        style={{ color: announcementSettings.fontColor }}
                    >
                        {liveScripture.title}
                    </h1>
                )}
                <div className="flex-1 flex items-center justify-center max-w-6xl">
                    <p
                        className={`${textFontSize} leading-relaxed ${fontFamily}`}
                        style={{ color: announcementSettings.fontColor }}
                    >
                        {content}
                    </p>
                </div>
            </div>
        );
    }

    // PRAYER REQUEST STYLE (dark gradient, photo + details layout)
    if (type === 'PRAYER_REQUEST' || type === 'prayer_request' || liveScripture.type === 'PRAYER_REQUEST' || liveScripture.problem || liveScripture.name) {
        const prayerSettings = getSettings('prayer_request');
        const nameFontSize = getFontSizeClass(prayerSettings.fontSize, 'prayer_request', 'name');
        const locationFontSize = getFontSizeClass(prayerSettings.fontSize, 'prayer_request', 'location');
        const topicsFontSize = getFontSizeClass(prayerSettings.fontSize, 'prayer_request', 'topics');
        const fontFamily = getFontFamilyClass(prayerSettings.fontFamily);

        const formatPrayerTopics = (text) => {
            if (!text) return [];
            // Split by dot followed by space(s) and letter to create bullet points
            const topics = text
                .split(/\.\s+(?=[A-Za-z])|\.\s*$/)
                .map(topic => topic.trim())
                .filter(topic => topic.length > 0);
            return topics.length > 0 ? topics : [text];
        };

        // Use problem field if available, otherwise use content/text
        const prayerText = liveScripture.problem || liveScripture.content || liveScripture.text || '';
        const prayerTopics = formatPrayerTopics(prayerText);
        const location = [liveScripture.city, liveScripture.country].filter(Boolean).join(', ') || 'Location not specified';

        console.log('🎨 Rendering Prayer Request Display:', {
            name: liveScripture.name,
            location,
            topicsCount: prayerTopics.length,
            hasImage: !!liveScripture.image,
            prayerText: prayerText.substring(0, 50)
        });

        return (
            <div className={`min-h-screen bg-gradient-to-br ${prayerSettings.backgroundGradient} overflow-hidden animate-fade-in cursor-none`}>
                {/* Header */}
                <div
                    className="absolute top-8 left-1/2 transform -translate-x-1/2 text-center text-xl font-semibold uppercase tracking-wider opacity-70 z-10"
                    style={{ color: prayerSettings.fontColor }}
                >
                    HEALING & MIRACLE LINE
                </div>

                {/* Main Content: Image on left (50%), Details on right (50%) */}
                <div className="flex-1 flex items-center justify-center p-8 lg:p-12 gap-12 lg:gap-20 h-full max-h-screen overflow-hidden">
                    {/* Photo - VERY LARGE on left (50% of width) */}
                    <div className="w-[45%] h-[85vh] rounded-3xl overflow-hidden bg-black/20 flex items-center justify-center flex-shrink-0 shadow-2xl border-4 border-white/10 ring-1 ring-white/20">
                        {liveScripture.image ? (
                            <img
                                src={liveScripture.image}
                                alt={liveScripture.name || 'Prayer Request'}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <span className="text-[200px] opacity-10">?</span>
                        )}
                    </div>

                    {/* Details - Right Side */}
                    <div className="w-[50%] flex flex-col justify-center h-full py-12">
                        {/* Name - Ultra Bold */}
                        <h1
                            className={`${nameFontSize} font-black mb-6 ${fontFamily} ${prayerSettings.textShadow ? 'drop-shadow-xl' : ''} leading-[1.1] tracking-tight`}
                            style={{ color: prayerSettings.fontColor }}
                        >
                            {liveScripture.name || 'Anonymous'}
                        </h1>

                        {/* Location */}
                        <div
                            className={`${locationFontSize} font-medium mb-12 flex items-center gap-4`}
                            style={{ color: prayerSettings.fontColor, opacity: 0.9 }}
                        >
                            <MapPin className="w-10 h-10 lg:w-12 lg:h-12 text-blue-400" />
                            <span>{location}</span>
                        </div>

                        {/* Prayer Need Label */}
                        <div className="text-3xl lg:text-4xl font-bold uppercase tracking-widest text-red-500 mb-6 border-b-2 border-red-500/30 pb-2 w-max">
                            PRAYER POINTS
                        </div>

                        {/* Prayer Topics as Bullets - Clean and Bold */}
                        <div className="space-y-6">
                            {prayerTopics.map((topic, idx) => (
                                <div key={idx} className="flex items-start gap-6">
                                    <div className="mt-2 w-5 h-5 rounded-full bg-red-500 shrink-0 shadow-[0_0_15px_rgba(239,68,68,0.5)]" />
                                    <span
                                        className={`${topicsFontSize} font-semibold leading-tight ${fontFamily}`}
                                        style={{ color: prayerSettings.fontColor, opacity: 0.95 }}
                                    >{topic}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // DEFAULT (fallback to scripture-style display)
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-12 text-center animate-fade-in cursor-none">
            {liveScripture.title && (
                <h1 className="text-7xl md:text-9xl font-bold font-display tracking-tight mb-12 text-white drop-shadow-lg">
                    {liveScripture.title}
                </h1>
            )}
            <div className="max-w-6xl mx-auto">
                <p className="text-5xl md:text-7xl leading-tight font-serif text-yellow-50 drop-shadow-md">
                    {content}
                </p>
            </div>
        </div>
    );
};

export default LiveDisplay;
