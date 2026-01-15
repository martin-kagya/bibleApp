import React from 'react'
import UnifiedSearch from '../UnifiedSearch'

const ScriptureSearchTile = () => {
    return (
        <div className="bg-card text-card-foreground rounded-xl border shadow-sm h-full flex flex-col">
            <div className="p-4 border-b">
                <h3 className="font-semibold tracking-tight text-sm uppercase text-muted-foreground">Scripture Database</h3>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
                {/* Passing minimal prop to UnifiedSearch if needed, forcing simplified layout via CSS overrides if necessary, or just letting it fill */}
                <UnifiedSearch />
            </div>
        </div>
    )
}

export default ScriptureSearchTile
