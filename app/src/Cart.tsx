import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface CartItem {
  id: number
  product_id: number
  product_name: string
  quantity: number
  price_unit: number
  price_subtotal: number
  image_url: string
}

interface CartData {
  order_id: number | null
  lines: CartItem[]
  total: number
  total_items: number
  currency: string
}

function Cart() {
  const [cart, setCart] = useState<CartData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchCart()
  }, [])

  const fetchCart = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/toji/cart', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      })

      const data = await response.json()
      if (data.success) {
        setCart(data.cart)
      } else {
        setError(data.error || 'Error al cargar el carrito')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-600">Cargando carrito...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-600">Error: {error}</div>
      </div>
    )
  }

  if (!cart || cart.lines.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-4">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Carrito vacío</h2>
        <p className="text-gray-600 mb-8 text-lg">No tienes productos en tu carrito.</p>
        <button
          onClick={() => navigate('/')}
          className="bg-black text-white px-8 py-3 font-medium hover:bg-gray-900 transition"
        >
          Continuar comprando
        </button>
      </div>
    )
  }

  const subtotal = cart.lines.reduce((sum, item) => sum + item.price_subtotal, 0)
  const iva = subtotal * 0.21
  const total = subtotal + iva

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Mi Carrito</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lista de productos */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
              {cart.lines.map((item) => (
                <div key={item.id} className="flex gap-6 pb-6 border-b border-gray-200 last:border-b-0">
                  {/* Imagen */}
                  <div className="shrink-0 w-20 h-24 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.product_name}
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <div className="text-gray-400 text-xs">Sin imagen</div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-2">{item.product_name}</h3>
                    <p className="text-sm text-gray-600 mb-4">{item.price_unit.toFixed(2)} € c/u</p>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">Cantidad: {item.quantity}</span>
                    </div>
                  </div>

                  {/* Precio subtotal */}
                  <div className="text-right">
                    <p className="font-bold text-gray-900">{item.price_subtotal.toFixed(2)} €</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resumen */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Resumen</h2>

              <div className="space-y-4 mb-6 pb-6 border-b border-gray-200">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium text-gray-900">{subtotal.toFixed(2)} €</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">IVA (21%)</span>
                  <span className="font-medium text-gray-900">{iva.toFixed(2)} €</span>
                </div>
              </div>

              <div className="flex justify-between text-lg font-bold mb-6">
                <span>Total</span>
                <span>{total.toFixed(2)} €</span>
              </div>

              <button className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-900 transition">
                Proceder al pago
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Cart