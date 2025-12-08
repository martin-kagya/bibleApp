import React, { useState, useEffect } from 'react'
import { Search, BookOpen, Database, RefreshCw } from 'lucide-react'

const ScriptureDatabase = () => {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [databaseStats, setDatabaseStats] = useState(null)

  const searchScriptures = async () => {
    if (!searchTerm.trim()) return

    setIsSearching(true)
    try {
      const response = await fetch(`/api/scriptures/search?q=${encodeURIComponent(searchTerm)}`)
      if (response.ok) {
        const data = await response.json()
        setSearchResults(data.results || [])
      }
    } catch (error) {
      console.error('Error searching scriptures:', error)
    } finally {
      setIsSearching(false)
    }
  }

  const loadDatabaseStats = async () => {
    try {
      const response = await fetch('/api/scriptures/stats')
      if (response.ok) {
        const data = await response.json()
        setDatabaseStats(data)
      }
    } catch (error) {
      console.error('Error loading database stats:', error)
    }
  }

  useEffect(() => {
    loadDatabaseStats()
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    searchScriptures()
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Scripture Database
        </h2>
        <p className="text-gray-600">
          Search and explore the scripture database
        </p>
      </div>

      {/* Database Stats */}
      {databaseStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card text-center">
            <Database className="h-8 w-8 text-primary-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{databaseStats.totalBooks}</div>
            <div className="text-sm text-gray-600">Books</div>
          </div>
          <div className="card text-center">
            <BookOpen className="h-8 w-8 text-primary-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{databaseStats.totalChapters}</div>
            <div className="text-sm text-gray-600">Chapters</div>
          </div>
          <div className="card text-center">
            <RefreshCw className="h-8 w-8 text-primary-600 mx-auto mb-2" />
            <div className="text-2xl font-bold text-gray-900">{databaseStats.totalVerses}</div>
            <div className="text-sm text-gray-600">Verses</div>
          </div>
        </div>
      )}

      {/* Search Form */}
      <div className="card">
        <form onSubmit={handleSearch} className="flex space-x-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search for scriptures, topics, or keywords..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || !searchTerm.trim()}
            className="btn-primary flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSearching ? (
              <RefreshCw className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            <span>{isSearching ? 'Searching...' : 'Search'}</span>
          </button>
        </form>
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-gray-900">
            Search Results ({searchResults.length})
          </h3>
          <div className="space-y-3">
            {searchResults.map((result, index) => (
              <div key={index} className="card hover:shadow-md transition-shadow duration-200">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-semibold text-primary-600">
                    {result.reference}
                  </h4>
                  <span className="text-sm text-gray-500">
                    {result.book} {result.chapter}:{result.verse}
                  </span>
                </div>
                <p className="text-gray-700 mb-2">{result.text}</p>
                {result.context && (
                  <p className="text-sm text-gray-600 italic">
                    Context: {result.context}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Results */}
      {searchTerm && searchResults.length === 0 && !isSearching && (
        <div className="card text-center py-8">
          <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No Results Found
          </h3>
          <p className="text-gray-600">
            Try different keywords or check your spelling
          </p>
        </div>
      )}

      {/* Instructions */}
      <div className="card bg-green-50 border-green-200">
        <h3 className="text-lg font-semibold text-green-900 mb-3">
          Search Tips
        </h3>
        <ul className="space-y-2 text-green-800">
          <li className="flex items-start space-x-2">
            <span className="text-green-600 font-bold">•</span>
            <span>Search by book name (e.g., "John", "Romans", "Psalms")</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-green-600 font-bold">•</span>
            <span>Search by topic (e.g., "love", "faith", "salvation")</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-green-600 font-bold">•</span>
            <span>Search by reference (e.g., "John 3:16", "Romans 8:28")</span>
          </li>
          <li className="flex items-start space-x-2">
            <span className="text-green-600 font-bold">•</span>
            <span>Search by partial text or keywords</span>
          </li>
        </ul>
      </div>
    </div>
  )
}

export default ScriptureDatabase
