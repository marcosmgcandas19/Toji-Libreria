import { useEffect, useState, useMemo, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PaginationRoot, PaginationContent, PaginationItem, PaginationLink, PaginationPrevious, PaginationNext, PaginationSummary } from '@heroui/react'
import Filters from './Filters'
import ProductCard from './ProductCard'

interface CatalogProduct {
  id: number
  name: string
  price: number
  image_url: string
}

interface CatalogResponse {
  success: boolean
  products: CatalogProduct[]
  total_items: number
  page?: number
  limit?: number
  error?: string
}

function Catalog() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [products, setProducts] = useState<CatalogProduct[]>([])
  const [totalItems, setTotalItems] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const pageSize = 12

  const rawPage = Number(searchParams.get('page') ?? '')
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1
  const minPrice = searchParams.get('min_price') ?? ''
  const maxPrice = searchParams.get('max_price') ?? ''
  const categoryId = searchParams.get('category_id') ?? ''
  const authorIdsParam = searchParams.get('author_ids') ?? ''

  const selectedAuthorIds = useMemo(() => {
    return authorIdsParam
      ? authorIdsParam
          .split(',')
          .map((value) => Number(value))
          .filter((value) => !Number.isNaN(value) && value > 0)
      : []
  }, [authorIdsParam])

  const initialFilters = useMemo(() => ({
    min_price: minPrice ? Number(minPrice) : null,
    max_price: maxPrice ? Number(maxPrice) : null,
    category_id: categoryId ? Number(categoryId) : null,
    author_ids: selectedAuthorIds,
  }), [minPrice, maxPrice, categoryId, selectedAuthorIds])

  useEffect(() => {
    const fetchCatalog = async () => {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(pageSize))

      if (minPrice) params.set('min_price', minPrice)
      if (maxPrice) params.set('max_price', maxPrice)
      if (categoryId) params.set('category_id', categoryId)
      if (selectedAuthorIds.length > 0) params.set('author_ids', selectedAuthorIds.join(','))

      try {
        const response = await fetch(`/api/toji/catalog?${params.toString()}`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data: CatalogResponse = await response.json()

        if (!data.success) {
          throw new Error(data.error || 'Error al cargar catálogo')
        }

        setProducts(data.products)
        setTotalItems(data.total_items)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error desconocido al cargar catálogo')
        setProducts([])
        setTotalItems(0)
      } finally {
        setLoading(false)
      }
    }

    fetchCatalog()
  }, [page, minPrice, maxPrice, categoryId, authorIdsParam])

  const handleFiltersChange = useCallback((filters: {
    min_price?: number | null
    max_price?: number | null
    category_id?: number | null
    author_ids?: number[]
  }) => {
    const params = new URLSearchParams()

    if (filters.min_price != null) {
      params.set('min_price', String(filters.min_price))
    }
    if (filters.max_price != null) {
      params.set('max_price', String(filters.max_price))
    }
    if (filters.category_id != null) {
      params.set('category_id', String(filters.category_id))
    }
    if (filters.author_ids && filters.author_ids.length > 0) {
      params.set('author_ids', filters.author_ids.join(','))
    }

    params.set('page', '1')
    setSearchParams(params)
  }, [setSearchParams])

  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize))
  const navigate = useNavigate()

  const goToPage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams)
    params.set('page', String(nextPage))
    setSearchParams(params)
  }

  return (
    <div className="max-w-7xl mx-auto grid gap-8 xl:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="space-y-6">
        <Filters onFiltersChange={handleFiltersChange} initialFilters={initialFilters} />
      </aside>

      <section className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-slate-900">Catálogo</h1>
            <p className="text-sm text-slate-500">Filtra y navega entre todos los productos publicados.</p>
          </div>
          <div className="flex flex-col items-start gap-3 sm:items-end">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-400 hover:text-blue-700"
            >
              Volver al inicio
            </button>
            <div className="text-sm text-slate-500">
              Página {page} de {pageCount}. {totalItems} productos encontrados.
            </div>
          </div>
        </div>

        {loading ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-16 text-center text-slate-500">
            Cargando catálogo…
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-center text-red-700">
            {error}
          </div>
        ) : (
          <>
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {products.length > 0 ? (
                products.map((product) => (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    nombre={product.name}
                    precio={product.price}
                    imagen={product.image_url}
                  />
                ))
              ) : (
                <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-600 sm:col-span-2 xl:col-span-3">
                  No hay productos que coincidan con los filtros.
                </div>
              )}
            </div>

            {pageCount > 1 && (
              <PaginationRoot className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-4">
                <PaginationContent className="flex flex-wrap items-center justify-center gap-2">
                  <PaginationPrevious
                    onClick={() => goToPage(Math.max(1, page - 1))}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    Anterior
                  </PaginationPrevious>

                  {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink
                        onClick={() => goToPage(pageNumber)}
                        isActive={pageNumber === page}
                        className={`rounded-lg border px-4 py-2 text-sm ${pageNumber === page ? 'border-blue-500 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'}`}
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  ))}

                  <PaginationNext
                    onClick={() => goToPage(Math.min(pageCount, page + 1))}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                  >
                    Siguiente
                  </PaginationNext>
                </PaginationContent>

                <PaginationSummary className="text-center text-sm text-slate-500">
                  Mostrando {products.length} de {totalItems} productos
                </PaginationSummary>
              </PaginationRoot>
            )}
          </>
        )}
      </section>
    </div>
  )
}

export default Catalog
