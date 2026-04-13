import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, Plus, Minus } from 'lucide-react'

interface CartItem {
  id: number
  product_id: number
  product_name: string
  authors?: string
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
  const [updating, setUpdating] = useState<number | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [activeTab, setActiveTab] = useState<'cart' | 'address' | 'confirmation'>('cart')
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
        console.log('[DEBUG] Carrito cargado:', data.cart)
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
   * Actualiza la cantidad de un item en el carrito
   * Si la cantidad llega a 0, elimina el item
   * Usa set_qty para establecer cantidad exacta (no suma/resta)
   */
  const updateQuantity = async (lineId: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      await removeItem(lineId)
      return
    }

    try {
      setUpdating(lineId)
      setError(null)

      // PASO 1: Actualización optimista local (feedback inmediato al usuario)
      const updatedCart = { ...cart! }
      const lineIndex = updatedCart.lines.findIndex((l) => l.id === lineId)
      
      if (lineIndex !== -1) {
        const oldQuantity = updatedCart.lines[lineIndex].quantity
        const item = updatedCart.lines[lineIndex]
        
        console.log(`[ACTUALIZACIÓN] Línea ${lineId}: ${oldQuantity} → ${newQuantity}`)
        
        // Actualizar el item con la nueva cantidad
        item.quantity = newQuantity
        item.price_subtotal = item.price_unit * newQuantity
        // Calcular impuestos (asumiendo 21% de IVA)
        item.tax_amount = item.price_subtotal * 0.21
        
        // Recalcular totales del carrito
        updatedCart.subtotal = updatedCart.lines.reduce((sum, line) => sum + (line.price_unit * line.quantity), 0)
        updatedCart.tax_total = updatedCart.lines.reduce((sum, line) => sum + line.tax_amount, 0)
        updatedCart.total = updatedCart.subtotal + updatedCart.tax_total
        updatedCart.total_items = updatedCart.lines.reduce((sum, line) => sum + line.quantity, 0)
        
        console.log(`[TOTALES] Subtotal: ${updatedCart.subtotal.toFixed(2)} | Tax: ${updatedCart.tax_total.toFixed(2)} | Total: ${updatedCart.total.toFixed(2)}`)
        
        // Aplicar cambios locales inmediatamente (sin esperar al servidor)
        setCart(updatedCart)
      }

      // PASO 2: Sincronizar con el servidor usando set_qty (cantidad exacta)
      try {
        const response = await fetch('/api/toji/cart/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            product_id: updatedCart.lines[lineIndex].product_id,
            set_qty: newQuantity,  // Establecer cantidad exacta, no suma
          }),
        })

        if (!response.ok) {
          throw new Error(`Error HTTP: ${response.status}`)
        }

        const data = await response.json()
        
        if (data.success) {
          console.log(`[SINCRONIZADO] Servidor confirmó actualización`)
          // Cambiar esto: reemplazar el carrito completo con la respuesta del servidor
          setCart(data.cart)
          console.log('[RESPUESTA SERVIDOR]', {
            subtotal: data.cart.subtotal,
            tax_total: data.cart.tax_total,
            total: data.cart.total,
            total_items: data.cart.total_items
          })
        } else {
          throw new Error(data.error || 'Error al actualizar la cantidad')
        }
      } catch (syncErr) {
        // Si falla la sincronización, recargar el carrito del servidor
        console.error('[ERROR SINCRONIZACIÓN]', syncErr)
        console.log('[RECARGANDO] Carrito desde el servidor...')
        await fetchCart()
        setError('Error al actualizar la cantidad. Carrito recargado desde el servidor.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar la cantidad')
      console.error('[ERROR]', err)
      // Recargar el carrito desde el servidor si algo falla
      await fetchCart()
    } finally {
      setUpdating(null)
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

        {/* Pestañas de sección */}
        <div className="flex gap-6 mb-8 border-b border-gray-300">
          <button
            onClick={() => setActiveTab('cart')}
            className={`pb-4 font-medium transition ${
              activeTab === 'cart'
                ? 'text-black border-b-2 border-black'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Carrito
          </button>
          <button
            onClick={() => setActiveTab('address')}
            className={`pb-4 font-medium transition ${
              activeTab === 'address'
                ? 'text-black border-b-2 border-black'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Dirección
          </button>
          <button
            onClick={() => setActiveTab('confirmation')}
            className={`pb-4 font-medium transition ${
              activeTab === 'confirmation'
                ? 'text-black border-b-2 border-black'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Confirmación
          </button>
        </div>

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

        {/* Contenido de la pestaña Carrito */}
        {activeTab === 'cart' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lista de productos */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
              {cart.lines.map((item) => {
                // Logging detallado de cada item
                console.log(`[RENDERIZADO] Item ID: ${item.id}`, {
                  product_id: item.product_id,
                  product_name: item.product_name,
                  authors: item.authors || '(sin autores)',
                  quantity: item.quantity,
                  price_unit: item.price_unit,
                  price_subtotal: item.price_subtotal,
                  tax_amount: item.tax_amount,
                  image_url: item.image_url ? 'Presente' : 'Ausente'
                })
                
                return (
                <div
                  key={item.id}
                  className="flex items-center gap-4 pb-4 border-b border-gray-200 last:border-b-0"
                >
                  {/* Imagen del producto */}
                  <div className="shrink-0 w-16 h-20 bg-gray-100 rounded flex items-center justify-center overflow-hidden">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.product_name}
                        className="w-full h-full object-contain p-1"
                      />
                    ) : (
                      <div className="text-gray-400 text-xs text-center">Sin imagen</div>
                    )}
                  </div>

                  {/* Información del producto - Nombre, Precio y Autor */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900">
                      {item.product_name}
                    </h3>
                    {item.authors ? (
                      <p className="text-sm text-gray-500">
                        {item.authors}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-400 italic">Sin autores asignados</p>
                    )}
                    <div className="bg-black text-white px-3 py-1 rounded-full font-bold text-sm inline-block my-2">
                      {item.price_subtotal.toFixed(2)} €
                    </div>
                    
                  </div>

                  {/* Controles de cantidad */}
                  <div className="flex items-center gap-2 border-2 border-black rounded-full px-3 py-1">
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      disabled={updating === item.id}
                      className="p-1 bg-black text-white hover:bg-gray-900 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="mx-2 text-sm font-medium min-w-4 text-center">
                      {item.quantity}
                    </span>
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      disabled={updating === item.id}
                      className="p-1 bg-black text-white hover:bg-gray-900 rounded-full transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  {/* Botón eliminar */}
                  <button
                    onClick={() => removeItem(item.id)}
                    disabled={removing === item.id}
                    className="shrink-0 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition disabled:cursor-not-allowed border border-gray-200"
                    title="Eliminar producto"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                )
              })}
            </div>
          </div>

          {/* Resumen del carrito */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-4xl shadow-md p-6 sticky top-4 border-2 border-black">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Resumen</h2>

              {/* Lista de productos en el resumen */}
              <div className="space-y-3 mb-6 pb-6 border-b border-gray-200">
                {cart.lines.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm gap-2">
                    <div className="flex-1">
                      <div className="text-gray-700 font-medium">{item.product_name}</div>
                      {item.authors && (
                        <div className="text-xs text-gray-500">{item.authors}</div>
                      )}
                    </div>
                    <span className="font-medium text-gray-900 whitespace-nowrap">
                      {item.price_subtotal.toFixed(2)} €
                    </span>
                  </div>
                ))}
              </div>

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
                    <span className="text-gray-600">IVA</span>
                    <span className="font-medium text-gray-900">
                      {cart.tax_total.toFixed(2)} {cart.currency}
                    </span>
                  </div>
                )}
              </div>

              {/* Total final */}
              <div className="flex justify-between text-lg font-bold mb-6">
                <span>Total</span>
                <span>
                  {cart.total.toFixed(2)} {cart.currency}
                </span>
              </div>

              {/* Botones de acción */}
              <div className="space-y-3">
                <button
                  onClick={() => setActiveTab('address')}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition"
                >
                  Desempaquetado
                </button>
                <button
                  onClick={confirmOrder}
                  disabled={confirming || cart.lines.length === 0}
                  className="w-full bg-black text-white py-3 rounded-lg font-medium hover:bg-gray-900 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                >
                  {confirming ? 'Confirmando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Contenido de la pestaña Dirección */}
        {activeTab === 'address' && (
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Dirección de Entrega</h2>
            <p className="text-gray-600 mb-4">Sección de dirección - En desarrollo</p>
            <button
              onClick={() => setActiveTab('confirmation')}
              className="bg-black text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-900 transition"
            >
              Continuar a Confirmación
            </button>
          </div>
        )}

        {/* Contenido de la pestaña Confirmación */}
        {activeTab === 'confirmation' && (
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Confirmación del Pedido</h2>
            <p className="text-gray-600 mb-4">Sección de confirmación - En desarrollo</p>
            <button
              onClick={() => setActiveTab('cart')}
              className="bg-black text-white px-8 py-3 rounded-lg font-medium hover:bg-gray-900 transition"
            >
              Volver al Carrito
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default Cart