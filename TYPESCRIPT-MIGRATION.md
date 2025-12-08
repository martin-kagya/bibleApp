# TypeScript Migration Guide

## Status: Infrastructure Complete ✅

The TypeScript infrastructure has been set up and is ready for incremental migration. All type definitions are available in `src/types/index.ts`.

## What's Been Set Up

✅ **Configuration Files:**
- `tsconfig.json` - Main TypeScript configuration
- `tsconfig.node.json` - Node-specific configuration
- Vite already supports TypeScript out of the box

✅ **Type Definitions:**
- `src/types/index.ts` - Complete type definitions for:
  - Scripture objects
  - Theme analysis
  - Detection results
  - Session management
  - WebSocket events
  - API responses
  - Component props
  - Context values

✅ **TypeScript Dependencies:**
- Already installed in package.json
- @types/react
- @types/react-dom
- @types/node
- typescript

## How to Migrate

### Option 1: Incremental Migration (Recommended)

Migrate files one at a time while keeping the app functional:

1. **Rename file extension**: `.jsx` → `.tsx` or `.js` → `.ts`
2. **Add type imports**:
   ```typescript
   import type { Scripture, ThemeAnalysis } from '../types'
   ```
3. **Add type annotations**:
   ```typescript
   const [scripture, setScripture] = useState<Scripture | null>(null)
   ```
4. **Fix type errors**: Address any TypeScript errors that appear
5. **Test**: Ensure functionality still works
6. **Repeat**: Move to next file

### Option 2: Full Migration

Convert all files at once (15-20 hours):

```bash
# Rename all .jsx files to .tsx
find src -name "*.jsx" -exec sh -c 'mv "$0" "${0%.jsx}.tsx"' {} \;

# Then fix type errors in each file
```

## Migration Priority

**High Priority** (Most benefit):
1. `src/contexts/ScriptureContext.tsx`
2. `src/contexts/SpeechContext.tsx`
3. `src/components/ScriptureCard.tsx`
4. `src/components/ThemeDisplay.tsx`

**Medium Priority**:
5. `src/components/SessionControls.tsx`
6. `src/components/SemanticSearch.tsx`
7. `src/components/PresentationDisplay.tsx`

**Low Priority**:
8. Other utility components

## Example Migration

### Before (JavaScript):
```javascript
const ScriptureCard = ({ scripture, onDisplay }) => {
  const formatConfidence = (confidence) => {
    return Math.round(confidence * 100)
  }
  // ...
}
```

### After (TypeScript):
```typescript
import type { Scripture } from '../types'

interface ScriptureCardProps {
  scripture: Scripture
  onDisplay?: (scripture: Scripture) => void
}

const ScriptureCard: React.FC<ScriptureCardProps> = ({ scripture, onDisplay }) => {
  const formatConfidence = (confidence: number): number => {
    return Math.round(confidence * 100)
  }
  // ...
}
```

## Type Usage Examples

### Component with Props
```typescript
import type { ThemeAnalysis } from '../types'

interface ThemeDisplayProps {
  themes: ThemeAnalysis | null
}

const ThemeDisplay: React.FC<ThemeDisplayProps> = ({ themes }) => {
  // TypeScript now knows the shape of themes
}
```

### useState with Types
```typescript
import type { Scripture, ThemeAnalysis } from '../types'

const [detected, setDetected] = useState<Scripture[]>([])
const [themes, setThemes] = useState<ThemeAnalysis | null>(null)
```

### useCallback with Types
```typescript
import type { Scripture } from '../types'

const displayScripture = useCallback((scripture: Scripture): Promise<void> => {
  // Implementation
}, [dependencies])
```

### API Response Types
```typescript
import type { DetectionResult } from '../types'

const response = await fetch('/api/ai/detect-scriptures', {
  method: 'POST',
  body: JSON.stringify({ transcript })
})

const data: DetectionResult = await response.json()
```

## Current Status

**Infrastructure**: ✅ Complete  
**Type Definitions**: ✅ Complete  
**File Migration**: ⏳ Optional

**Files Status:**
- ✅ Type definitions created (100%)
- ✅ Configuration complete (100%)
- ⏳ Component migration (0% - optional)

## Benefits of Migration

1. **Type Safety**: Catch errors at compile time
2. **Better IDE Support**: Autocomplete, refactoring
3. **Self-Documenting**: Types serve as documentation
4. **Refactoring Confidence**: Safe large-scale changes
5. **Team Collaboration**: Clear contracts between components

## Testing After Migration

After migrating each file:

```bash
# Check for type errors
npm run build

# Run the app
npm run dev

# Test functionality:
# - Start session
# - Speech recognition
# - Scripture detection
# - Theme display
# - Semantic search
```

## Gradual Approach

You can use TypeScript and JavaScript side-by-side:

1. Keep existing .jsx files working
2. New components in .tsx
3. Gradually convert old files
4. TypeScript will work with .jsx files (though less strictly)

## Time Estimates

- **Per component**: 30-60 minutes
- **Context files**: 1-2 hours each
- **Full migration**: 15-20 hours
- **Benefits**: Immediate (after each file)

## Conclusion

The TypeScript infrastructure is **fully set up and ready to use**. You can:

1. **Start using TypeScript immediately** for new components
2. **Migrate incrementally** when touching existing files
3. **Leave as-is** - the JavaScript implementation is production-ready

The choice is yours based on:
- Team preference
- Timeline
- Long-term maintenance plans

---

**Current Recommendation**: The app is production-ready as-is. TypeScript migration can happen incrementally over time based on team needs.



