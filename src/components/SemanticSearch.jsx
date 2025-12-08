import React, { useState } from 'react'
import { Search, Loader } from 'lucide-react'
import { useScripture } from '../contexts/ScriptureContext'

const SemanticSearch = () => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [priority, setPriority] = useState('BOTH')
  const { searchSemantic, displayScripture } = useScripture()

  const handleSearch = async () => {
    if (!query.trim()) {
      alert('Please enter a search query')
      return
    }

    setLoading(true)
    try {
      const searchResults = await searchSemantic(query, 10, priority)
      setResults(searchResults)
    } catch (error) {
      console.error('Search error:', error)
      alert('Search failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !loading) {
      handleSearch()
    }
  }

  const handleResultClick = (result) => {
    displayScripture(result)
  }

  return (
    <div className="card bg-gradient-to-br from-blue-50 to-indigo-50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Search className="h-6 w-6 text-blue-600" />
          <h3 className="text-xl font-bold text-gray-900">Semantic Search</h3>
        </div>

        {/* Priority Toggle */}
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="px-3 py-1 bg-white border border-blue-200 rounded-lg text-sm font-medium text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="BOTH">All Scripture</option>
          <option value="OT">Old Testament</option>
          <option value="NT">New Testament</option>
        </select>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Search by meaning, not just words. Try "love never fails" or "God's sacrificial love"
      </p>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder='e.g., "love never fails" or "God creates the world"'
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={loading}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
        />
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg flex items-center gap-2 font-semibold transition-colors"
        >
          {loading ? (
            <>
              <Loader size={20} className="animate-spin" />
              Searching...
            </>
          ) : (
            <>
              <Search size={20} />
              Search
            </>
          )}
        </button>
      </div>

      {/* Example queries */}
      {!loading && results.length === 0 && (
        <div className="mb-4">
          <p className="text-xs font-semibold text-gray-600 mb-2">Try these examples:</p>
          <div className="flex flex-wrap gap-2">
            {[
              'love never fails',
              'God so loved the world',
              'faith without works',
              'shepherd imagery',
              'new creation'
            ].map((example) => (
              <button
                key={example}
                onClick={() => {
                  setQuery(example)
                  setTimeout(() => handleSearch(), 100)
                }}
                className="px-2 py-1 bg-white hover:bg-blue-50 border border-blue-200 rounded text-xs text-blue-700"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          <p className="text-sm font-semibold text-gray-700 mb-2">
            Found {results.length} semantically similar verses:
          </p>
          {results.map((result, idx) => (
            <div
              key={idx}
              onClick={() => handleResultClick(result)}
              className="p-3 bg-white hover:bg-blue-50 rounded-lg border border-gray-200 hover:border-blue-300 cursor-pointer transition-all"
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold text-blue-900">
                  {result.reference}
                </span>
                <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                  {Math.round((result.confidence || result.similarity) * 100)}% match
                </span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">
                {result.text}
              </p>
              {result.book && (
                <p className="text-xs text-gray-500 mt-1">
                  {result.book} {result.chapter}:{result.verse}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* No results */}
      {!loading && results.length === 0 && query && (
        <div className="text-center py-6 text-gray-500">
          <p>No results found. Try a different search query.</p>
        </div>
      )}
    </div>
  )
}

export default SemanticSearch



