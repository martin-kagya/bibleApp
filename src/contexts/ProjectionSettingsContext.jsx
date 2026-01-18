import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

// Default settings for each content type
const DEFAULT_SETTINGS = {
    scripture: {
        fontSize: 'large',
        fontColor: '#FFFEF0',
        backgroundColor: '#000000',
        textShadow: true,
        fontFamily: 'serif'
    },
    song: {
        fontSize: 'large',
        fontColor: '#FFFFFF',
        backgroundGradient: 'from-indigo-950 via-purple-950 to-indigo-950',
        textShadow: true,
        fontFamily: 'sans'
    },
    announcement: {
        fontSize: 'medium',
        fontColor: '#FFFFFF',
        backgroundGradient: 'from-slate-900 via-blue-950 to-slate-900',
        textShadow: true,
        fontFamily: 'sans'
    },
    prayer_request: {
        fontSize: 'medium',
        fontColor: '#FFFFFF',
        backgroundGradient: 'from-slate-900 via-blue-950 to-slate-900',
        textShadow: true,
        fontFamily: 'sans'
    }
};

const STORAGE_KEY = 'pneumavoice_projection_settings';

const ProjectionSettingsContext = createContext();

export const useProjectionSettings = () => {
    const context = useContext(ProjectionSettingsContext);
    if (!context) {
        throw new Error('useProjectionSettings must be used within a ProjectionSettingsProvider');
    }
    return context;
};

export const ProjectionSettingsProvider = ({ children }) => {
    // Initialize settings from localStorage or use defaults
    const [settings, setSettings] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                // Merge with defaults to ensure all properties exist
                return {
                    scripture: { ...DEFAULT_SETTINGS.scripture, ...parsed.scripture },
                    song: { ...DEFAULT_SETTINGS.song, ...parsed.song },
                    announcement: { ...DEFAULT_SETTINGS.announcement, ...parsed.announcement },
                    prayer_request: { ...DEFAULT_SETTINGS.prayer_request, ...parsed.prayer_request }
                };
            }
        } catch (error) {
            console.error('Error loading projection settings:', error);
        }
        return DEFAULT_SETTINGS;
    });

    // Persist settings to localStorage whenever they change
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
        } catch (error) {
            console.error('Error saving projection settings:', error);
        }
    }, [settings]);

    // Get settings for a specific content type
    const getSettings = useCallback((contentType) => {
        // Normalize content type
        const type = contentType?.toLowerCase() || 'scripture';
        return settings[type] || settings.scripture;
    }, [settings]);

    // Update settings for a specific content type
    const updateSettings = useCallback((contentType, updates) => {
        setSettings(prev => ({
            ...prev,
            [contentType]: {
                ...prev[contentType],
                ...updates
            }
        }));
    }, []);

    // Reset settings for a specific content type
    const resetSettings = useCallback((contentType) => {
        setSettings(prev => ({
            ...prev,
            [contentType]: { ...DEFAULT_SETTINGS[contentType] }
        }));
    }, []);

    // Reset all settings to defaults
    const resetAllSettings = useCallback(() => {
        setSettings({ ...DEFAULT_SETTINGS });
    }, []);

    // Export settings as JSON
    const exportSettings = useCallback(() => {
        const dataStr = JSON.stringify(settings, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `pneumavoice-settings-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
    }, [settings]);

    // Import settings from JSON
    const importSettings = useCallback((jsonString) => {
        try {
            const imported = JSON.parse(jsonString);
            // Validate and merge with defaults
            const validated = {
                scripture: { ...DEFAULT_SETTINGS.scripture, ...imported.scripture },
                song: { ...DEFAULT_SETTINGS.song, ...imported.song },
                announcement: { ...DEFAULT_SETTINGS.announcement, ...imported.announcement },
                prayer_request: { ...DEFAULT_SETTINGS.prayer_request, ...imported.prayer_request }
            };
            setSettings(validated);
            return true;
        } catch (error) {
            console.error('Error importing settings:', error);
            return false;
        }
    }, []);

    const value = {
        settings,
        getSettings,
        updateSettings,
        resetSettings,
        resetAllSettings,
        exportSettings,
        importSettings,
        DEFAULT_SETTINGS
    };

    return (
        <ProjectionSettingsContext.Provider value={value}>
            {children}
        </ProjectionSettingsContext.Provider>
    );
};
