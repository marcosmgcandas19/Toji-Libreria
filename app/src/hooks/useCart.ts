/**
 * hooks/useCart.ts
 * Custom hook para gestionar el carrito de compras
 * 
 * Proporciona una interfaz limpia para:
 * - Obtener carrito actual
 * - Añadir/modificar productos
 * - Eliminar productos
 * - Confirmar pedido
 */

import { useState, useCallback } from 'react'

export interface CartItem {
  id: number
  product_id: number
  product_name: string
  quantity: number
  price_unit: number
  price_subtotal: number
  tax_amount: number
  image_url: string
}

export interface CartData {
  order_id: number | null
  lines: CartItem[]
  subtotal: number
  tax_total: number
  total: number
  total_items: number
  currency: string
}

export interface UseCartResult {
  cart: CartData | null
  loading: boolean
  error: string | null
  fetchCart: () => Promise<void>
  addToCart: (productId: number, quantity?: number) => Promise<void>
  updateCartQuantity: (productId: number, quantity: number) => Promise<void>
  removeFromCart: (lineId: number) => Promise<void>
  confirmOrder: () => Promise<{ order_id: number; order_number: string }>
}

/**
 * Hook para gestionar el carrito
 * 
 * Uso:
 * ```typescript
 * const { cart, loading, error, addToCart, removeFromCart } = useCart()
 * 
 * // Obtener carrito
 * useEffect(() => {
 *   fetchCart()
 * }, [])
 * 
 * // Añadir producto
 * await addToCart(5, 2)
 * 
 * // Remover producto
 * await removeFromCart(128)
 * ```
 */
export function useCart(): UseCartResult {
  const [cart, setCart] = useState<CartData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Obtener carrito actual
  const fetchCart = useCallback(async () => {
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
        throw new Error(`HTTP Error: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        setCart(data.cart)
      } else {
        throw new Error(data.error || 'Error fetching cart')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Error fetching cart:', errorMessage)
    } finally {
      setLoading(false)
    }
  }, [])

  // Añadir producto al carrito
  const addToCart = useCallback(
    async (productId: number, quantity: number = 1) => {
      try {
        setError(null)

        const response = await fetch('/api/toji/cart/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            product_id: productId,
            add_qty: quantity,
          }),
        })

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`)
        }

        const data = await response.json()

        if (data.success) {
          setCart(data.cart)
        } else {
          throw new Error(data.error || 'Error adding to cart')
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        console.error('Error adding to cart:', errorMessage)
        throw err // Re-throw para que el componente pueda manejarlo
      }
    },
    []
  )

  // Actualizar cantidad exacta de un producto
  const updateCartQuantity = useCallback(
    async (productId: number, quantity: number) => {
      try {
        setError(null)

        const response = await fetch('/api/toji/cart/add', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify({
            product_id: productId,
            set_qty: quantity,
          }),
        })

        if (!response.ok) {
          throw new Error(`HTTP Error: ${response.status}`)
        }

        const data = await response.json()

        if (data.success) {
          setCart(data.cart)
        } else {
          throw new Error(data.error || 'Error updating quantity')
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        setError(errorMessage)
        console.error('Error updating quantity:', errorMessage)
        throw err
      }
    },
    []
  )

  // Eliminar producto del carrito
  const removeFromCart = useCallback(async (lineId: number) => {
    try {
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
        throw new Error(`HTTP Error: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        setCart(data.cart)
      } else {
        throw new Error(data.error || 'Error removing from cart')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Error removing from cart:', errorMessage)
      throw err
    }
  }, [])

  // Confirmar pedido
  const confirmOrder = useCallback(async () => {
    try {
      setError(null)

      const response = await fetch('/api/toji/cart/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`)
      }

      const data = await response.json()

      if (data.success) {
        // Limpiar carrito después de confirmación
        setCart(null)
        return {
          order_id: data.order_id,
          order_number: data.order_number,
        }
      } else {
        throw new Error(data.error || 'Error confirming order')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      setError(errorMessage)
      console.error('Error confirming order:', errorMessage)
      throw err
    }
  }, [])

  return {
    cart,
    loading,
    error,
    fetchCart,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    confirmOrder,
  }
}

/**
 * Ejemplo de uso en un componente:
 * 
 * function MyComponent() {
 *   const { cart, loading, error, fetchCart, addToCart, removeFromCart } = useCart()
 * 
 *   // Cargar carrito al montar
 *   useEffect(() => {
 *     fetchCart()
 *   }, [fetchCart])
 * 
 *   return (
 *     <>
 *       {error && <div className="error">{error}</div>}
 *       {loading && <div>Cargando...</div>}
 *       {cart && (
 *         <div>
 *           <p>Total: {cart.total} {cart.currency}</p>
 *           <button onClick={() => addToCart(5, 2)}>Añadir producto</button>
 *         </div>
 *       )}
 *     </>
 *   )
 * }
 */
