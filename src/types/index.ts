/**
 * Type Definitions for Bible Presentation App
 */

// Scripture Types
export interface Scripture {
  reference: string
  text?: string
  book?: string
  chapter?: number
  verse?: number
  verseStart?: number
  verseEnd?: number
  confidence: number
  matchType?: 'explicit' | 'paraphrase' | 'semantic' | 'cross-reference'
  type?: string
  paraphrase?: string
  matchingThemes?: string[]
  matchingWords?: string[]
  context?: string
  originalReference?: string
  translation?: string
  theme?: string
  themeConfidence?: number
  similarity?: number
}

// Theme Types
export interface Theme {
  theme: string
  confidence: number
  keywords?: string[]
  matchedKeywords?: string[]
  occurrences?: number
}

export interface ThemeAnalysis {
  mainThemes: Theme[]
  subThemes: Theme[]
  keyConcepts: string[]
  emotionalTone: string
  theologicalContext?: string
  targetAudience?: string
  preachingStyle?: string
  suggestedScriptureThemes?: string[]
  timestamp?: number
}

// Detection Result Types
export interface DetectionResult {
  detected: Scripture[]
  suggested: Scripture[]
  themes?: ThemeAnalysis
  sessionId?: string
  timestamp: number
  error?: string
}

// Session Types
export interface SermonSession {
  id?: number
  sessionId?: string
  title?: string
  preacher?: string
  transcript?: string
  themes?: ThemeAnalysis
  detectedScriptures?: Scripture[]
  suggestedScriptures?: Scripture[]
  duration?: number
  date?: string
  createdAt?: string
  updatedAt?: string
}

// WebSocket Event Types
export interface SocketEvents {
  // Client to Server
  'start-session': (data: { title?: string; preacher?: string; sessionId?: string }) => void
  'transcript-update': (data: { sessionId: string; transcript: string }) => void
  'detect-scriptures': (data: { sessionId: string; transcript: string }) => void
  'get-session-stats': (data: { sessionId: string }) => void
  'end-session': (data: { sessionId: string }) => void

  // Server to Client
  'connect': () => void
  'disconnect': () => void
  'session-started': (data: { sessionId: string }) => void
  'analysis-update': (data: DetectionResult) => void
  'scriptures-detected': (data: DetectionResult) => void
  'session-stats': (data: SessionStats) => void
  'session-ended': (data: { sessionId: string }) => void
  'error': (data: { message: string }) => void
}

export interface SessionStats {
  duration: number
  transcriptLength: number
  themes: Theme[]
  detectedVerses: number
  queries: number
}

// Context Types
export interface ScriptureContextValue {
  detectedScriptures: Scripture[]
  suggestedScriptures: Scripture[]
  themes: ThemeAnalysis | null
  currentScripture: Scripture | null
  isAnalyzing: boolean
  isConnected: boolean
  sessionId: string | null
  detectScriptures: (transcript: string) => Promise<void>
  getScriptureText: (reference: string) => Promise<Scripture | null>
  displayScripture: (scripture: Scripture) => Promise<void>
  searchSemantic: (query: string, topK?: number) => Promise<Scripture[]>
  clearCurrentScripture: () => void
  clearAll: () => void
  startSession: (title: string, preacher?: string) => void
  endSession: () => void
  sendTranscript: (transcript: string) => void
  socket: any
}

export interface SpeechContextValue {
  isListening: boolean
  transcript: string
  isSupported: boolean
  error: string | null
  startListening: () => void
  stopListening: () => void
  clearTranscript: () => void
  initializeSpeechRecognition: () => void
}

// API Response Types
export interface ApiResponse<T = any> {
  success?: boolean
  data?: T
  error?: string
  message?: string
}

export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy'
  timestamp: string
  services: {
    database: string
    redis: string
    whisper: boolean
    themeExtraction: boolean
    semanticSearch: boolean
    bibleApi: boolean
  }
}

// Search Types
export interface SearchOptions {
  topK?: number
  minConfidence?: number
  sessionId?: string
  translation?: string
  includeThemes?: boolean
  includeSuggestions?: boolean
}

// Bible API Types
export interface BibleVerse {
  reference: string
  text: string
  bookCode: string
  chapter: number
  verseStart: number | null
  verseEnd: number | null
  translation: string
  copyright?: string
}

export interface BibleBook {
  id: string
  name: string
  abbreviation: string
  chapters: number[]
}

export interface BibleVersion {
  id: string
  name: string
  abbreviation: string
  language: string
  description?: string
}

// Parsed Reference Types
export interface ParsedReference {
  book: string
  bookCode: string
  chapter: number
  verseStart?: number
  verseEnd?: number
  verses?: string
  type: 'chapter' | 'single' | 'range'
  reference: string
  normalized: string
}

// Component Props Types
export interface ScriptureCardProps {
  scripture: Scripture
  onDisplay?: (scripture: Scripture) => void
}

export interface ThemeDisplayProps {
  themes: ThemeAnalysis | null
}

export interface SessionControlsProps {
  // No props needed
}

export interface SemanticSearchProps {
  // No props needed
}

// Utility Types
export type MatchType = 'explicit' | 'paraphrase' | 'semantic' | 'cross-reference'
export type EmotionalTone = 'encouraging' | 'convicting' | 'teaching' | 'comforting' | 'evangelistic' | string
export type PreachingStyle = 'expository' | 'topical' | 'narrative' | 'evangelistic' | 'balanced' | string
export type SessionStatus = 'active' | 'ended' | 'paused'

// Export all types as a namespace for easier imports
export namespace BibleApp {
  export type Scripture = Scripture
  export type Theme = Theme
  export type ThemeAnalysis = ThemeAnalysis
  export type DetectionResult = DetectionResult
  export type SermonSession = SermonSession
  export type SessionStats = SessionStats
}



