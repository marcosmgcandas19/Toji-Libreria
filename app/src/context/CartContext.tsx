import { createContext, useContext, useState, ReactNode } from 'react'

interface CartContextType {
  cartCount: number
  setCartCount: (count: number) => void
  addToCartCount: (quantity: number) => void
  resetCartCount: () => void
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [cartCount, setCartCount] = useState(0)

  const addToCartCount = (quantity: number) => {
    setCartCount(prev => prev + quantity)
  }

  const resetCartCount = () => {
    setCartCount(0)
  }

  return (
    <CartContext.Provider value={{ cartCount, setCartCount, addToCartCount, resetCartCount }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart debe usarse dentro de CartProvider')
  }
  return context
}
