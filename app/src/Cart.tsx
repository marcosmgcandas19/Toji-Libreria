import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

interface CartItem {
  id: number
  product_id: number
  product_name: string
  quantity: number
  price_unit: number
  price_subtotal: number
  tax_amount: number
  image_url: string
}

interface CartData {
  order_id: number | null
  lines: CartItem[]
  subtotal: number
  tax_total: number
  total: number
  total_items: number
  currency: string
}

function Cart() {
  const [cart, setCart] = useState<CartData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [removing, setRemoving] = useState<number | null>(null)
  const [confirming, setConfirming] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchCart()
  }, [])

  /**
   * Obtiene el carrito actual del usuario desde el servidor
   * GET /api/toji/cart
   */
  const fetchCart = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/toji/cart', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        setCart(data.cart)
      } else {
        setError(data.error || 'Error al cargar el carrito')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido al cargar el carrito')
      console.error('Error fetching cart:', err)
    } finally {
      setLoading(false)
    }
  }

  /**
   * Elimina un item del carrito
   * POST /api/toji/cart/remove
   */
  const removeItem = async (lineId: number) => {
    try {
      setRemoving(lineId)
      setError(null)

      const response = await fetch('/api/toji/cart/remove', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ line_id: lineId }),
      })

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        setCart(data.cart)
      } else {
        setError(data.error || 'Error al eliminar el producto')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar el producto')
      console.error('Error removing item:', err)
    } finally {
      setRemoving(null)
    }
  }

  /**
   * Confirma el pedido y lo transiciona a "Pedido de Venta"
   * POST /api/toji/cart/confirm
   */
  const confirmOrder = async () => {
    try {
      setConfirming(true)
      setError(null)

      const response = await fetch('/api/toji/cart/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.success) {
        // Redirigir a página de confirmación
        navigate(`/order-confirmation/${data.order_id}`, {
          state: {
            orderNumber: data.order_number,
            total: data.total,
            message: data.message,
          }
        })
      } else {
        setError(data.error || 'Error al confirmar el pedido')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al confirmar el pedido')
      console.error('Error confirming order:', err)
    } finally {
      setConfirming(false)
    }
  }

  // Estado: Cargando
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-600">Cargando carrito...</div>
      </div>
    )
  }

  // Estado: Carrito vacío
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Mi Carrito</h1>

        {/* Mostrar errores si existen */}
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
            <button
              onClick={() => setError(null)}
              className="ml-4 text-sm underline"
            >
              Cerrar
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lista de productos */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
              {cart.lines.map((item) => (
                <div
                  key={item.id}
                  className="flex gap-6 pb-6 border-b border-gray-200 last:border-b-0"
                >
                  {/* Imagen del producto */}
                  <div className="shrink-0 w-20 h-24 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.product_name}
                        className="w-full h-full object-contain p-2"
                      />
                    ) : (
                      <div className="text-gray-400 text-xs text-center">Sin imagen</div>
                    )}
                  </div>

                  {/* Información del producto */}
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 mb-2">
                      {item.product_name}
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      {item.price_unit.toFixed(2)} € c/u
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium">
                        Cantidad: {item.quantity}
                      </span>
                    </div>
                  </div>

                  {/* Precio subtotal y botón eliminar */}
                  <div className="text-right flex flex-col items-end justify-between">
                    <div>
                      <p className="font-bold text-gray-900">
                        {item.price_subtotal.toFixed(2)} €
                      </p>
                      {item.tax_amount > 0 && (
                        <p className="text-xs text-gray-500">
                          +{item.tax_amount.toFixed(2)} € IVA
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => removeItem(item.id)}
                      disabled={removing === item.id}
                      className="mt-2 text-sm text-red-600 hover:text-red-800 disabled:text-gray-400 disabled:cursor-not-allowed transition"
                    >
                      {removing === item.id ? 'Eliminando...' : 'Eliminar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Resumen del carrito */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-6 sticky top-4">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Resumen</h2>

              <div className="space-y-4 mb-6 pb-6 border-b border-gray-200">
                {/* Subtotal */}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium text-gray-900">
                    {cart.subtotal.toFixed(2)} {cart.currency}
                  </span>
                </div>

                {/* Impuestos */}
                {cart.tax_total > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">IVA (21%)</span>
                    <span className="font-medium text-gray-900">
                      {cart.tax_total.toFixed(2)} {cart.currency}
                    </span>
                  </div>
                )}

                {/* Total de items */}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Artículos</span>
                  <span className="font-medium text-gray-900">
                    {cart.total_items}
                  </span>
                </div>
              </div>

              {/* Total final */}
              <div className="flex justify-between text-lg font-bold mb-6">
                <span>Total</span>
                <span>
                  {cart.total.toFixed(2)} {cart.currency}
                </span>
              </div>

              {/* Botón confirmar pedido */}
              <button
                onClick={confirmOrder}
                disabled={confirming || cart.lines.length === 0}
                className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-900 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
              >
                {confirming ? 'Confirmando pedido...' : 'Proceder al pago'}
              </button>

              {/* Botón continuar comprando */}
              <button
                onClick={() => navigate('/')}
                className="w-full mt-3 bg-gray-100 text-gray-900 py-3 rounded-lg font-medium hover:bg-gray-200 transition"
              >
                Continuar comprando
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Cart