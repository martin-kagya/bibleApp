import React, { useEffect, useState } from 'react'
import { X, Monitor, AppWindow } from 'lucide-react'

const SourcePicker = ({ onSelect, onCancel }) => {
    const [sources, setSources] = useState([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchSources = async () => {
            try {
                if (window.electron && window.electron.getDesktopSources) {
                    const desktopSources = await window.electron.getDesktopSources()
                    setSources(desktopSources)
                } else {
                    console.error('Electron API not available')
                }
            } catch (err) {
                console.error('Failed to get sources:', err)
            } finally {
                setIsLoading(false)
            }
        }

        fetchSources()
    }, [])

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b">
                    <h3 className="text-xl font-bold text-gray-900">Choose Audio Source</h3>
                    <button
                        onClick={onCancel}
                        className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <X className="h-6 w-6 text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {sources.map((source) => (
                                <button
                                    key={source.id}
                                    onClick={() => onSelect(source.id)}
                                    className="group flex flex-col gap-2 p-3 rounded-lg border-2 border-transparent hover:border-primary-500 hover:bg-primary-50 transition-all text-left"
                                >
                                    <div className="aspect-video bg-gray-100 rounded overflow-hidden relative shadow-sm group-hover:shadow-md">
                                        <img
                                            src={source.thumbnail}
                                            alt={source.name}
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {source.id.includes('screen') ? (
                                            <Monitor className="h-4 w-4 text-gray-500" />
                                        ) : (
                                            <AppWindow className="h-4 w-4 text-gray-500" />
                                        )}
                                        <span className="text-sm font-medium text-gray-700 truncate block w-full">
                                            {source.name}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default SourcePicker
