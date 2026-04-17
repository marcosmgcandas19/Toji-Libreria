import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Product } from './types/cart'

interface SearchResult {
  success: boolean
  products: Product[]
  error?: string
}

function Search() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
 const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  const navigate = useNavigate()
  const searchRef = useRef<HTMLDivElement>(null)

  // Debounce search function
  const debouncedSearch = (searchQuery: string) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    const timer = setTimeout(async () => {
      if (searchQuery.trim().length > 0) {
        await performSearch(searchQuery.trim())
      } else {
        setResults([])
        setShowResults(false)
      }
    }, 300) // 300ms debounce

    setDebounceTimer(timer)
  }

  // Perform search API call
  const performSearch = async (searchQuery: string) => {
    try {
      setIsLoading(true)

      const response = await fetch(`/api/toji/search?query=${encodeURIComponent(searchQuery)}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data: SearchResult = await response.json()

      if (data.success) {
        setResults(data.products)
        setShowResults(true)
      } else {
        console.error('Search error:', data.error)
        setResults([])
        setShowResults(false)
      }
    } catch (error) {
      console.error('Search failed:', error)
      setResults([])
      setShowResults(false)
    } finally {
      setIsLoading(false)
    }
  }

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)
    debouncedSearch(value)
  }

  // Handle result click
  const handleResultClick = (product: Product) => {
    setQuery('') // Clear search input
    setShowResults(false) // Hide results
    setResults([]) // Clear results
    navigate(`/product/${product.id}`) // Navigate to product detail
  }

  // Handle click outside to close results
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
    }
  }, [debounceTimer])

  return (
    <div className="relative" ref={searchRef}>
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder="Buscar productos..."
          className="w-80 px-4 py-2 pl-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          onFocus={() => {
            if (results.length > 0) {
              setShowResults(true)
            }
          }}
        />
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        {isLoading && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      {/* Results Container */}
      {showResults && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white borderborder-2 border-black rounded-lg px-3 py-2  shadow-lg z-50 max-h-96 overflow-y-auto">
          {results.map((product) => (
            <div
              key={product.id}
              onClick={() => handleResultClick(product)}
              className="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer border border-black rounded mb-2"
            >
              {/* Product Image */}
              <div className="flex-shrink-0 w-15 h-20 mr-3">
                <img
                  src={product.image_url || '/placeholder-product.png'}
                  alt={product.name}
                  className="w-full h-full object-cover rounded"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement
                    target.src = '/placeholder-product.png'
                  }}
                />
              </div>

              {/* Product Info */}
              <div className="flex-1 min-w-0  ">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {product.name}
                </div>
                {product.authors && product.authors.length > 0 && (
                  <div className="text-xs text-black bg-gray-400 rounded-full px-2 py-1 mt-1 w-fit">
                    {product.authors.map(author => author.name).join(', ')}
                  </div>
                )}
                <div className="text-sm text-white bg-black rounded-full px-3 py-1 mt-1 w-fit">
                  ${product.price.toFixed(2)}
                </div>
              </div>

              {/* Arrow Icon */}
              <div className="flex-shrink-0 ml-2">
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No Results Message */}
      {showResults && query.trim().length > 0 && results.length === 0 && !isLoading && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-4 text-center text-gray-500 text-sm">
          No se encontraron productos para "{query}"
        </div>
      )}
    </div>
  )
}

export default Search