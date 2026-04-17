import { useEffect, useState, useRef } from 'react'
import { Card } from '@heroui/react'

interface FiltersProps {
  onFiltersChange: (filters: FilterParams) => void
  initialFilters?: FilterParams
}

interface FilterParams {
  min_price?: number | null
  max_price?: number | null
  author_ids?: number[]
}

interface Author {
  id: number
  name: string
}

function Filters({ onFiltersChange, initialFilters }: FiltersProps) {
  const [authors, setAuthors] = useState<Author[]>([])
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchInput, setSearchInput] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const [minPrice, setMinPrice] = useState(initialFilters?.min_price?.toString() ?? '')
  const [maxPrice, setMaxPrice] = useState(initialFilters?.max_price?.toString() ?? '')
  const [selectedAuthors, setSelectedAuthors] = useState<string[]>(
    initialFilters?.author_ids?.map(String) ?? []
  )
  
  // Control para no disparar onChange en el primer render
  const isFirstRenderRef = useRef(true)
  // Referencia estable para la función de callback
  const onFiltersChangeRef = useRef(onFiltersChange)

  // Actualizar la referencia cuando cambia la función
  useEffect(() => {
    onFiltersChangeRef.current = onFiltersChange
  }, [onFiltersChange])

  // 1. Cargar autores desde Odoo
  useEffect(() => {
    const fetchOptions = async () => {
      setLoadingOptions(true)
      setError(null)

      try {
        // Usar ruta relativa para que funcione el proxy de Vite
        const response = await fetch('/api/toji/authors', {
          method: 'GET',
          headers: { 
            'Accept': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error(`Error servidor Odoo: ${response.status}`)
        }

        const data = await response.json()

        if (data.success) {
          setAuthors(data.authors || [])
        } else {
          throw new Error(data.error || 'Error en la respuesta de la API')
        }
      } catch (err) {
        console.error("Fetch error:", err)
        setError(err instanceof Error ? err.message : 'No se pudo conectar con Odoo')
      } finally {
        setLoadingOptions(false)
      }
    }

    fetchOptions()
  }, [])

  // 2. Cerrar dropdown cuando se hace clic afuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const isComboboxClick = target.closest('[data-combobox]')
      if (!isComboboxClick) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // 3. Notificar cambios al padre (usando un efecto controlado)
  useEffect(() => {
    if (isFirstRenderRef.current) {
      isFirstRenderRef.current = false
      return // No dispara onChange en el primer render
    }

    const timer = setTimeout(() => {
      const filters: FilterParams = {
        min_price: minPrice.trim() ? Number(minPrice) : null,
        max_price: maxPrice.trim() ? Number(maxPrice) : null,
        author_ids: selectedAuthors.map(Number),
      }
      console.log('[FILTERS] Disparando onFiltersChange:', filters)
      onFiltersChangeRef.current(filters)
    }, 400) // Debounce de 400ms para no saturar a peticiones mientras escriben

    return () => clearTimeout(timer)
  }, [minPrice, maxPrice, selectedAuthors])

  const handleReset = () => {
    setMinPrice('')
    setMaxPrice('')
    setSelectedAuthors([])
  }

  return (
    <Card className="sticky top-4 h-fit p-8 space-y-8 shadow-md border-2 border-black rounded-xl bg-linear-to-b from-slate-50 to-white">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Filtros</h2>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-all duration-200 border border-blue-200"
          >
            Limpiar
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Precios</h3>
          
          <div className="space-y-3">
            <div>
              <label htmlFor="min_price" className="block text-sm font-medium text-slate-700 mb-2">
                Min
              </label>
              <input
                id="min_price"
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="Min"
                className="w-full rounded-lg border-2 border-slate-200 px-4 py-3 text-base font-medium text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-100 transition-all"
              />
            </div>

            <div>
              <label htmlFor="max_price" className="block text-sm font-medium text-slate-700 mb-2">
                Máx
              </label>
              <input
                id="max_price"
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="Máx"
                className="w-full rounded-lg border-2 border-slate-200 px-4 py-3 text-base font-medium text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-100 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="h-px bg-linear-to-r from-slate-200 via-slate-300 to-slate-200"></div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Autor</h3>
            {loadingOptions && (
              <span className="text-xs font-medium animate-pulse text-blue-500 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></span>
                Cargando...
              </span>
            )}
          </div>

          {error ? (
            <div className="p-3 text-xs font-medium text-red-700 bg-red-50 rounded-lg border border-red-200">
              {error}
            </div>
          ) : (
            <div className="space-y-3" data-combobox>
              {/* Combobox Input */}
              <div className="relative" data-combobox>
                <input
                  type="text"
                  placeholder="Buscar autor..."
                  disabled={loadingOptions || authors.length === 0}
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value)
                    setIsOpen(true)
                  }}
                  onFocus={() => setIsOpen(true)}
                  className="w-full px-4 py-3 text-sm font-medium text-slate-900 bg-white border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-3 focus:ring-blue-100 disabled:opacity-50 disabled:cursor-not-allowed outline-none transition-all"
                />
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg
                    className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                </div>

                {/* Dropdown List */}
                {isOpen && authors.length > 0 && (
                  <div className="absolute z-10 w-full mt-2 bg-white border-2 border-slate-200 rounded-lg shadow-lg">
                    {authors
                      .filter((author) =>
                        author.name.toLowerCase().includes(searchInput.toLowerCase())
                      )
                      .map((author) => (
                        <button
                          key={author.id}
                          type="button"
                          onClick={() => {
                            const authorId = String(author.id)
                            if (selectedAuthors.includes(authorId)) {
                              setSelectedAuthors(selectedAuthors.filter((id) => id !== authorId))
                            } else {
                              setSelectedAuthors([...selectedAuthors, authorId])
                            }
                            setSearchInput('')
                            setIsOpen(false)
                          }}
                          className={`w-full text-left px-4 py-3 text-sm font-medium border-b border-slate-100 last:border-b-0 transition-colors ${
                            selectedAuthors.includes(String(author.id))
                              ? 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                              : 'text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={selectedAuthors.includes(String(author.id))}
                              readOnly
                              className="w-4 h-4 rounded border-2 border-slate-300 text-blue-600 cursor-pointer accent-blue-600"
                            />
                            {author.name}
                          </div>
                        </button>
                      ))}
                  </div>
                )}
              </div>

              {/* Tags */}
              {selectedAuthors.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {selectedAuthors.map((authorId) => {
                    const author = authors.find((a) => String(a.id) === authorId)
                    return (
                      <span
                        key={authorId}
                        className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 rounded-full border border-blue-300"
                      >
                        {author?.name}
                        <button
                          type="button"
                          onClick={() => setSelectedAuthors(selectedAuthors.filter((id) => id !== authorId))}
                          className="ml-1 text-blue-500 hover:text-blue-700 transition-colors font-bold"
                        >
                          ✕
                        </button>
                      </span>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

export default Filters