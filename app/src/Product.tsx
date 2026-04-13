import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, ShoppingCart, Home, Store, Truck } from 'lucide-react'
import { Chip, Card } from '@heroui/react'

interface Author {
  id: number
  name: string
}

interface ProductData {
  id: number
  name: string
  price: number
  description: string
  synopsis: string
  authors: Author[]
  image_url: string
  website_published: boolean
}

function Product() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [product, setProduct] = useState<ProductData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isExpandedSynopsis, setIsExpandedSynopsis] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [addingToCart, setAddingToCart] = useState(false)

  useEffect(() => {
    if (!id) return

    setLoading(true)
    setError(null)

    fetch(`/api/toji/products/${id}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({})
    })
      .then((response) => {
        console.log('Response status:', response.status)
        console.log('Response headers:', response.headers.get('content-type'))
        if (!response.ok) {
          return response.text().then((text) => {
            console.error('Response body:', text)
            throw new Error(`Error HTTP ${response.status}: ${text || response.statusText}`)
          })
        }
        return response.json()
      })
      .then((data: any) => {
        console.log('API Response:', data)
        
        // La respuesta ahora es directa, NO envuelta en JSONRPC
        const result = data  // Sin .result porque type='http' retorna directo
        
        if (result.success && result.product) {
          setProduct(result.product)
        } else {
          setError(result.error || 'Producto no encontrado')
        }
      })
      .catch((error: Error) => {
        console.error('Fetch error:', error)
        setError(error.message || 'Error al cargar el producto')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [id])

  const handleAddToCart = async () => {
    if (!product) return

    try {
      setAddingToCart(true)

      // Usar el endpoint personalizado /api/toji/cart/add
      // Este endpoint está definido en controler_product.py
      const response = await fetch('/api/toji/cart/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          product_id: product.id,
          add_qty: quantity,
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Éxito: Mostrar Toast y resetear cantidad
        if (window.showToast) {
          window.showToast(
            `${product.name} añadido al carrito (${quantity} unidad${quantity > 1 ? 'es' : ''})`,
            'success',
            3000
          )
        }
        setQuantity(1)
      } else {
        throw new Error(data.error || 'Error al añadir al carrito')
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido'
      console.error('❌ Error al añadir al carrito:', errorMsg)

      if (window.showToast) {
        window.showToast(`Error al añadir al carrito: ${errorMsg}`, 'error', 4000)
      }
    } finally {
      setAddingToCart(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
          <p className="mt-4 text-gray-600">Cargando producto...</p>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-xl text-red-600 mb-6">{error || 'Producto no encontrado'}</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2 mx-auto"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver a la tienda
          </button>
        </div>
      </div>
    )
  }

  return (


    <div className="bg-gray-50">
      {/* Contenido principal */}
      <main className="max-w-7xl mx-auto px-2 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Sección de Imagen - Izquierda */}
          <div className="lg:col-span-1 flex flex-col items-center gap-4">
            {/* Breadcrumb */}
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 px-5 py-2 bg-gray-200 rounded-full hover:bg-gray-300 transition-colors text-gray-800 font-medium text-sm"
            >
              <Home className="w-5 h-5" />
              <span>Catálogo</span>
              <span className="text-gray-600">&gt;</span>
              <span className="font-semibold">{product.name}</span>
            </button>
            
            {/* Imagen */}
            <div className="bg-white rounded-3xl shadow-lg p-6 w-full flex items-center justify-center border-2 border-gray-200">
              <img
                src={product.image_url}
                alt={product.name}
                className="w-full h-auto object-contain"
              />
            </div>
          </div>

          {/* Sección de Información - Centro */}
          <div className="lg:col-span-1 flex flex-col">
            {/* Header del Producto */}
            <div className="mb-6">
              <h1 className="text-5xl font-bold text-gray-900 mb-6">
                {product.name}
              </h1>

              {/* Autores como Chips de HeroUI */}
              {product.authors.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {product.authors.map((author) => (
                    <Chip
                      key={author.id}
                      variant="soft"
                      size="lg"
                      className="font-medium bg-gray-200 text-gray-800"
                    >
                      {author.name}
                    </Chip>
                  ))}
                </div>
              )}
            </div>

            {/* Sección de Sinopsis */}
            {product.synopsis && (
              <div className="mb-6">
                <Card className={`shadow-sm overflow-hidden relative ${
                  isExpandedSynopsis ? '' : ''
                }`}>
                  <div className={`p-6 ${
                    isExpandedSynopsis ? '' : 'max-h-48'
                  }`}>
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">
                      {product.synopsis}
                    </p>
                  </div>
                  {!isExpandedSynopsis && (
                    <div className="absolute inset-x-0 bottom-0 h-20 bg-linear-to-t from-white to-transparent pointer-events-none" />
                  )}
                </Card>
                <button
                  onClick={() => setIsExpandedSynopsis(!isExpandedSynopsis)}
                  className="mt-2 px-6 py-2 bg-black text-white font-semibold rounded-full hover:bg-gray-800 transition-colors text-sm"
                >
                  {isExpandedSynopsis ? 'Leer menos' : 'Leer más'}
                </button>
              </div>
            )}

            {/* Descripción adicional */}
            {product.description && (
              <div className="mb-6">
                <p className="text-gray-600 leading-relaxed text-sm line-clamp-6">
                  {product.description}
                </p>
              </div>
            )}


          </div>

          {/* Sidebar Derecha - Precio y CTA */}
          <div className="lg:col-span-1 flex flex-col h-fit border-2 border-black rounded-3xl p-8">
            {/* Precio */}
            <div className="text-center mb-6">
              <p className="text-4xl font-bold text-black">
                {product.price.toFixed(2)} €
              </p>
            </div>

            {/* Botón Añadir al Carrito */}
            <button
              onClick={handleAddToCart}
              disabled={addingToCart}
              className="w-full bg-black text-white font-bold py-3 rounded-full hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 mb-6"
            >
              <ShoppingCart className="w-5 h-5" />
              <span>{addingToCart ? 'Añadiendo...' : 'Añadir al Carrito'}</span>
            </button>

            {/* Selector de Cantidad */}
            <div className="flex items-center justify-between bg-gray-100 rounded-lg p-3 mb-6">
              <span className="text-sm font-medium text-gray-700">Cantidad:</span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1 || addingToCart}
                  className="w-8 h-8 bg-white text-gray-800 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors flex items-center justify-center font-bold"
                >
                  −
                </button>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  disabled={addingToCart}
                  className="w-12 text-center font-semibold bg-white border border-gray-300 rounded-lg p-1 disabled:opacity-50"
                />
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  disabled={addingToCart}
                  className="w-8 h-8 bg-white text-gray-800 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors flex items-center justify-center font-bold"
                >
                  +
                </button>
              </div>
            </div>

            {/* Info de Disponibilidad */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="shrink-0 w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                  <Store className="w-6 h-6 text-gray-700" />
                </div>
                <p className="text-sm text-gray-700">
                  Consulta la disponibilidad en nuestras librerías. <span className="font-bold">Recógelo gratis</span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="shrink-0 w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                  <Truck className="w-6 h-6 text-gray-700" />
                </div>
                <p className="text-sm text-gray-700">
                  <span className="font-bold">Recibelo mañana</span> jueves 9 de abril.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>


  )
}

export default Product
