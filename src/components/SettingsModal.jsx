import React, { useState, useRef } from 'react';
import { X, Settings as SettingsIcon, Download, Upload, RotateCcw } from 'lucide-react';
import { useProjectionSettings } from '../contexts/ProjectionSettingsContext';

const TABS = [
    { id: 'scripture', label: 'Scripture' },
    { id: 'song', label: 'Songs' },
    { id: 'announcement', label: 'Announcements' },
    { id: 'prayer_request', label: 'Prayer Requests' }
];

const FONT_SIZES = [
    { value: 'small', label: 'Small' },
    { value: 'medium', label: 'Medium' },
    { value: 'large', label: 'Large' },
    { value: 'xlarge', label: 'Extra Large' }
];

const FONT_FAMILIES = [
    { value: 'serif', label: 'Serif' },
    { value: 'sans', label: 'Sans Serif' },
    { value: 'mono', label: 'Monospace' },
    { value: 'display', label: 'Display' }
];

const GRADIENT_PRESETS = [
    { value: 'from-indigo-950 via-purple-950 to-indigo-950', label: 'Purple Dream' },
    { value: 'from-slate-900 via-blue-950 to-slate-900', label: 'Deep Ocean' },
    { value: 'from-gray-900 via-gray-800 to-black', label: 'Dark Night' },
    { value: 'from-emerald-950 via-teal-950 to-emerald-950', label: 'Forest Green' },
    { value: 'from-rose-950 via-pink-950 to-rose-950', label: 'Rose Garden' }
];

const SettingsPanel = ({ contentType, settings, onUpdate }) => {
    const hasGradient = contentType !== 'scripture';

    return (
        <div className="space-y-6">
            {/* Font Size */}
            <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                    Font Size
                </label>
                <div className="grid grid-cols-4 gap-2">
                    {FONT_SIZES.map(size => (
                        <button
                            key={size.value}
                            onClick={() => onUpdate({ fontSize: size.value })}
                            className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${settings.fontSize === size.value
                                    ? 'bg-primary text-primary-foreground shadow-sm'
                                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                }`}
                        >
                            {size.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Font Family */}
            <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                    Font Family
                </label>
                <select
                    value={settings.fontFamily}
                    onChange={(e) => onUpdate({ fontFamily: e.target.value })}
                    className="w-full px-3 py-2 rounded-md bg-muted border border-border text-foreground"
                >
                    {FONT_FAMILIES.map(font => (
                        <option key={font.value} value={font.value}>
                            {font.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Font Color */}
            <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                    Font Color
                </label>
                <div className="flex gap-2">
                    <input
                        type="color"
                        value={settings.fontColor}
                        onChange={(e) => onUpdate({ fontColor: e.target.value })}
                        className="h-10 w-16 rounded border border-border cursor-pointer"
                    />
                    <input
                        type="text"
                        value={settings.fontColor}
                        onChange={(e) => onUpdate({ fontColor: e.target.value })}
                        className="flex-1 px-3 py-2 rounded-md bg-muted border border-border text-foreground font-mono text-sm"
                        placeholder="#FFFFFF"
                    />
                </div>
            </div>

            {/* Background */}
            {hasGradient ? (
                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                        Background Gradient
                    </label>
                    <select
                        value={settings.backgroundGradient}
                        onChange={(e) => onUpdate({ backgroundGradient: e.target.value })}
                        className="w-full px-3 py-2 rounded-md bg-muted border border-border text-foreground"
                    >
                        {GRADIENT_PRESETS.map(gradient => (
                            <option key={gradient.value} value={gradient.value}>
                                {gradient.label}
                            </option>
                        ))}
                    </select>
                    <div className={`mt-2 h-16 rounded-md bg-gradient-to-br ${settings.backgroundGradient}`} />
                </div>
            ) : (
                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                        Background Color
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="color"
                            value={settings.backgroundColor}
                            onChange={(e) => onUpdate({ backgroundColor: e.target.value })}
                            className="h-10 w-16 rounded border border-border cursor-pointer"
                        />
                        <input
                            type="text"
                            value={settings.backgroundColor}
                            onChange={(e) => onUpdate({ backgroundColor: e.target.value })}
                            className="flex-1 px-3 py-2 rounded-md bg-muted border border-border text-foreground font-mono text-sm"
                            placeholder="#000000"
                        />
                    </div>
                </div>
            )}

            {/* Text Shadow Toggle */}
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">
                    Text Shadow
                </label>
                <button
                    onClick={() => onUpdate({ textShadow: !settings.textShadow })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.textShadow ? 'bg-primary' : 'bg-muted'
                        }`}
                >
                    <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.textShadow ? 'translate-x-6' : 'translate-x-1'
                            }`}
                    />
                </button>
            </div>

            {/* Preview */}
            <div className="mt-6">
                <label className="block text-sm font-medium text-foreground mb-2">
                    Preview
                </label>
                <div
                    className={`rounded-lg overflow-hidden border border-border ${hasGradient ? `bg-gradient-to-br ${settings.backgroundGradient}` : ''
                        }`}
                    style={!hasGradient ? { backgroundColor: settings.backgroundColor } : {}}
                >
                    <div className="p-8 flex items-center justify-center min-h-[120px]">
                        <p
                            className={`text-center ${settings.fontFamily === 'serif' ? 'font-serif' : settings.fontFamily === 'sans' ? 'font-sans' : settings.fontFamily === 'mono' ? 'font-mono' : 'font-display'}`}
                            style={{
                                color: settings.fontColor,
                                fontSize: settings.fontSize === 'small' ? '1rem' : settings.fontSize === 'medium' ? '1.25rem' : settings.fontSize === 'large' ? '1.5rem' : '2rem',
                                textShadow: settings.textShadow ? '0 2px 10px rgba(0, 0, 0, 0.3)' : 'none'
                            }}
                        >
                            Sample Preview Text
                        </p>
                    </div>
                </div>
            </div>

            {/* Reset Button */}
            <button
                onClick={() => {
                    const { DEFAULT_SETTINGS } = useProjectionSettings();
                    onUpdate(DEFAULT_SETTINGS[contentType]);
                }}
                className="w-full px-4 py-2 rounded-md bg-muted text-muted-foreground hover:bg-muted/80 transition-colors flex items-center justify-center gap-2"
            >
                <RotateCcw className="w-4 h-4" />
                Reset to Defaults
            </button>
        </div>
    );
};

const SettingsModal = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState('scripture');
    const fileInputRef = useRef(null);
    const { settings, updateSettings, resetSettings, exportSettings, importSettings } = useProjectionSettings();

    if (!isOpen) return null;

    const handleImport = (event) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const success = importSettings(e.target?.result);
                if (success) {
                    alert('Settings imported successfully!');
                } else {
                    alert('Failed to import settings. Please check the file format.');
                }
            };
            reader.readAsText(file);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-background rounded-xl shadow-2xl border border-border w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <SettingsIcon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-foreground">Projection Settings</h2>
                            <p className="text-sm text-muted-foreground">Customize your projection display</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="border-b border-border px-6">
                    <div className="flex gap-1 -mb-px">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <SettingsPanel
                        contentType={activeTab}
                        settings={settings[activeTab]}
                        onUpdate={(updates) => updateSettings(activeTab, updates)}
                    />
                </div>

                {/* Footer */}
                <div className="border-t border-border p-4 bg-muted/30 flex items-center justify-between gap-4">
                    <div className="flex gap-2">
                        <button
                            onClick={exportSettings}
                            className="px-4 py-2 rounded-md bg-background border border-border text-foreground hover:bg-muted transition-colors flex items-center gap-2 text-sm"
                        >
                            <Download className="w-4 h-4" />
                            Export
                        </button>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="px-4 py-2 rounded-md bg-background border border-border text-foreground hover:bg-muted transition-colors flex items-center gap-2 text-sm"
                        >
                            <Upload className="w-4 h-4" />
                            Import
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".json"
                            onChange={handleImport}
                            className="hidden"
                        />
                    </div>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsModal;
