import { useEffect, useState, useCallback } from 'react'
import { Card, CheckboxGroup, Checkbox } from '@heroui/react'

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

  const [minPrice, setMinPrice] = useState(initialFilters?.min_price?.toString() ?? '')
  const [maxPrice, setMaxPrice] = useState(initialFilters?.max_price?.toString() ?? '')
  const [selectedAuthors, setSelectedAuthors] = useState<string[]>(
    initialFilters?.author_ids?.map(String) ?? []
  )

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

  // 2. Notificar cambios al padre (usando un efecto controlado)
  useEffect(() => {
    const timer = setTimeout(() => {
      const filters: FilterParams = {
        min_price: minPrice.trim() ? Number(minPrice) : null,
        max_price: maxPrice.trim() ? Number(maxPrice) : null,
        author_ids: selectedAuthors.map(Number),
      }
      onFiltersChange(filters)
    }, 400) // Debounce de 400ms para no saturar a peticiones mientras escriben

    return () => clearTimeout(timer)
  }, [minPrice, maxPrice, selectedAuthors, onFiltersChange])

  const handleReset = () => {
    setMinPrice('')
    setMaxPrice('')
    setSelectedAuthors([])
  }

  return (
    <Card className="sticky top-4 h-fit p-8 space-y-8 shadow-md border border-slate-200 rounded-xl bg-gradient-to-b from-slate-50 to-white">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Filtros</h2>
            <p className="text-sm text-slate-600 mt-1">Refina tu búsqueda</p>
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
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Rango de Precio</h3>
          
          <div className="space-y-3">
            <div>
              <label htmlFor="min_price" className="block text-sm font-medium text-slate-700 mb-2">
                Mínimo
              </label>
              <input
                id="min_price"
                type="number"
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="Sin mínimo"
                className="w-full rounded-lg border-2 border-slate-200 px-4 py-3 text-base font-medium text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-100 transition-all"
              />
            </div>

            <div>
              <label htmlFor="max_price" className="block text-sm font-medium text-slate-700 mb-2">
                Máximo
              </label>
              <input
                id="max_price"
                type="number"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="Sin máximo"
                className="w-full rounded-lg border-2 border-slate-200 px-4 py-3 text-base font-medium text-slate-900 placeholder-slate-400 outline-none focus:border-blue-500 focus:ring-3 focus:ring-blue-100 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-slate-200 via-slate-300 to-slate-200"></div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Autores</h3>
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
            <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
              {authors.length > 0 ? (
                <CheckboxGroup
                  defaultValue={selectedAuthors}
                  onChange={setSelectedAuthors}
                  className="gap-0 flex flex-col"
                >
                  {authors.map((author) => (
                    <div key={author.id} className="py-2">
                      <Checkbox 
                        value={String(author.id)}
                        className="w-full cursor-pointer hover:bg-blue-50 p-2 rounded-lg transition-colors"
                      >
                        <span className="text-sm font-medium text-slate-700 ml-2">{author.name}</span>
                      </Checkbox>
                    </div>
                  ))}
                </CheckboxGroup>
              ) : !loadingOptions && !error && (
                <p className="text-sm text-slate-400 italic py-4 text-center">No se encontraron autores.</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="pt-4 text-xs text-slate-500 text-center">
        Filtros actualizados automáticamente
      </div>
    </Card>
  )
}

export default Filters