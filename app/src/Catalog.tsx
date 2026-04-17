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

  const pageSize = 9

  const rawPage = Number(searchParams.get('page') ?? '')
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1
  const minPrice = searchParams.get('min_price') ?? ''
  const maxPrice = searchParams.get('max_price') ?? ''
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
    author_ids: selectedAuthorIds,
  }), [minPrice, maxPrice, selectedAuthorIds])

  useEffect(() => {
    const fetchCatalog = async () => {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(pageSize))

      if (minPrice) params.set('min_price', minPrice)
      if (maxPrice) params.set('max_price', maxPrice)
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
  }, [page, minPrice, maxPrice, authorIdsParam])

  const handleFiltersChange = useCallback((filters: {
    min_price?: number | null
    max_price?: number | null
    author_ids?: number[]
  }) => {
    setSearchParams((prevParams) => {
      const params = new URLSearchParams(prevParams)

      if (filters.min_price != null) {
        params.set('min_price', String(filters.min_price))
      } else {
        params.delete('min_price')
      }
      if (filters.max_price != null) {
        params.set('max_price', String(filters.max_price))
      } else {
        params.delete('max_price')
      }
      if (filters.author_ids && filters.author_ids.length > 0) {
        params.set('author_ids', filters.author_ids.join(','))
      } else {
        params.delete('author_ids')
      }

      params.set('page', '1')
      return params
    })
  }, [setSearchParams])

  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize))
  const navigate = useNavigate()

  const goToPage = (nextPage: number) => {
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev)
      params.set('page', String(nextPage))
      return params
    })
    // Scroll to top cuando se cambia de página
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
          <aside className="order-2 lg:order-1">
            <Filters onFiltersChange={handleFiltersChange} initialFilters={initialFilters} />
          </aside>

          <section className="order-1 lg:order-2 space-y-6">
            

            {loading ? (
              <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-20 text-center">
                <div className="inline-block mb-4">
                  <div className="animate-spin h-12 w-12 border-4 border-slate-300 border-t-blue-600 rounded-full"></div>
                </div>
                <p className="text-slate-600 font-medium text-lg">Cargando catálogo…</p>
              </div>
            ) : error ? (
              <div className="rounded-xl border-2 border-red-300 bg-red-50 p-8 text-center">
                <p className="text-red-700 font-semibold text-base">{error}</p>
              </div>
            ) : (
              <>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
                    <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-16 text-center sm:col-span-2 lg:col-span-3">
                      <p className="text-slate-600 font-semibold text-lg mb-2">No hay productos</p>
                      <p className="text-slate-500 text-sm">Intenta ajustar los filtros o vuelve más tarde.</p>
                    </div>
                  )}
                </div>

                {pageCount > 1 && (
                  <PaginationRoot className="flex flex-col gap-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <PaginationContent className="flex flex-wrap items-center justify-center gap-2">
                      <PaginationPrevious
                        onClick={() => goToPage(Math.max(1, page - 1))}
                        isDisabled={page === 1}
                        className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-all duration-200 ${page === 1 ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 cursor-pointer'}`}
                      >
                        ← Anterior
                      </PaginationPrevious>

                      {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
                        <PaginationItem key={pageNumber}>
                          <PaginationLink
                            onClick={() => goToPage(pageNumber)}
                            isActive={pageNumber === page}
                            className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer ${pageNumber === page ? 'border-blue-600 bg-blue-600 text-white shadow-md' : 'border-slate-300 bg-white text-slate-700 hover:border-blue-400 hover:bg-blue-50'}`}
                          >
                            {pageNumber}
                          </PaginationLink>
                        </PaginationItem>
                      ))}

                      <PaginationNext
                        onClick={() => page < pageCount && goToPage(Math.min(pageCount, page + 1))}
                        isDisabled={page >= pageCount}
                        className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-all duration-200 ${page >= pageCount ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-100 cursor-pointer'}`}
                      >
                        Siguiente →
                      </PaginationNext>
                    </PaginationContent>

                    <PaginationSummary className="text-center text-sm font-medium text-slate-600 py-2">
                      Mostrando {products.length} de {totalItems} productos
                    </PaginationSummary>
                  </PaginationRoot>
                )}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

export default Catalog
