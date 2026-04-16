import { useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Card, CheckboxGroup, Checkbox } from '@heroui/react'
interface FiltersProps {
  onFiltersChange: (filters: FilterParams) => void
  initialFilters?: FilterParams
}

interface FilterParams {
  min_price?: number | null
  max_price?: number | null
  category_id?: number | null
  author_ids?: number[]
}

interface Category {
  id: number
  name: string
}

interface Author {
  id: number
  name: string
}

function Filters({ onFiltersChange, initialFilters }: FiltersProps) {
  const [categories, setCategories] = useState<Category[]>([])
  const [authors, setAuthors] = useState<Author[]>([])
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [minPrice, setMinPrice] = useState(initialFilters?.min_price?.toString() ?? '')
  const [maxPrice, setMaxPrice] = useState(initialFilters?.max_price?.toString() ?? '')
  const [selectedCategory, setSelectedCategory] = useState<string>(
    initialFilters?.category_id ? String(initialFilters.category_id) : ''
  )
  const [selectedAuthors, setSelectedAuthors] = useState<string[]>(
    initialFilters?.author_ids?.map(String) ?? []
  )
  const [isInitialRender, setIsInitialRender] = useState(true)

  useEffect(() => {
    const fetchOptions = async () => {
      setLoadingOptions(true)
      setError(null)

      try {
        const [categoriesResponse, authorsResponse] = await Promise.all([
          fetch('/api/toji/categories', { headers: { Accept: 'application/json' } }),
          fetch('/api/toji/authors', { headers: { Accept: 'application/json' } }),
        ])

        if (!categoriesResponse.ok) {
          throw new Error(`Error al cargar categorías: ${categoriesResponse.status}`)
        }
        if (!authorsResponse.ok) {
          throw new Error(`Error al cargar autores: ${authorsResponse.status}`)
        }

        const categoriesData = await categoriesResponse.json()
        const authorsData = await authorsResponse.json()

        if (categoriesData.success) {
          setCategories(categoriesData.categories || [])
        } else {
          throw new Error(categoriesData.error || 'Error en categories API')
        }

        if (authorsData.success) {
          setAuthors(authorsData.authors || [])
        } else {
          throw new Error(authorsData.error || 'Error en authors API')
        }
      } catch (fetchError) {
        setError((fetchError as Error).message || 'Error al cargar los filtros')
        setCategories([])
        setAuthors([])
      } finally {
        setLoadingOptions(false)
      }
    }

    fetchOptions()
  }, [])

  useEffect(() => {
    if (isInitialRender) {
      setIsInitialRender(false)
      return
    }

    const filters: FilterParams = {
      min_price: minPrice.trim() ? Number(minPrice) : null,
      max_price: maxPrice.trim() ? Number(maxPrice) : null,
      category_id: selectedCategory ? Number(selectedCategory) : null,
      author_ids: selectedAuthors.length ? selectedAuthors.map(Number) : [],
    }

    onFiltersChange(filters)
  }, [minPrice, maxPrice, selectedCategory, selectedAuthors, isInitialRender])

  const handleCategoryChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(event.target.value)
  }

  const handleReset = () => {
    setMinPrice('')
    setMaxPrice('')
    setSelectedCategory('')
    setSelectedAuthors([])
  }

  return (
    <Card className="p-6 space-y-6 shadow-sm border border-slate-200">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Filtros</h2>
          <p className="text-sm text-slate-500">Aplica filtros por precio, categoría y autor.</p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="rounded-full border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Limpiar
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="min_price" className="block text-sm font-medium text-slate-700">
            Precio mínimo
          </label>
          <input
            id="min_price"
            type="number"
            min="0"
            value={minPrice}
            onChange={(event) => setMinPrice(event.target.value)}
            placeholder="Ej. 100"
            className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="max_price" className="block text-sm font-medium text-slate-700">
            Precio máximo
          </label>
          <input
            id="max_price"
            type="number"
            min="0"
            value={maxPrice}
            onChange={(event) => setMaxPrice(event.target.value)}
            placeholder="Ej. 500"
            className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor="category_filter" className="block text-sm font-medium text-slate-700">
          Categoría
        </label>
        <select
          id="category_filter"
          value={selectedCategory}
          onChange={handleCategoryChange}
          className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          disabled={loadingOptions}
        >
          <option value="">Todas las categorías</option>
          {categories.map((category) => (
            <option key={category.id} value={String(category.id)}>
              {category.name}
            </option>
          ))}
        </select>
        {categories.length === 0 && !loadingOptions && !error && (
          <p className="text-sm text-slate-500">No hay categorías disponibles</p>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-700">Autores</p>
            <p className="text-sm text-slate-500">Selecciona uno o más autores.</p>
          </div>
          {loadingOptions && (
            <span className="text-xs text-slate-500">Cargando autores…</span>
          )}
        </div>

        <CheckboxGroup
          
          value={selectedAuthors}
          onChange={(value) => {
            const nextValues = Array.isArray(value) ? value : [String(value)]
            setSelectedAuthors(nextValues)
          }}
          className="grid gap-2"
          isDisabled={loadingOptions}
        >
          {authors.map((author) => (
            <label
              key={author.id}
              className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 transition hover:border-blue-400"
            >
              <Checkbox
                value={String(author.id)}
                aria-label={author.name}
                className="h-4 w-4 text-blue-600"
              />
              <span>{author.name}</span>
            </label>
          ))}
        </CheckboxGroup>

        {authors.length === 0 && !loadingOptions && !error && (
          <p className="text-sm text-slate-500">No hay autores disponibles</p>
        )}

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
    </Card>
  )
}

export default Filters
