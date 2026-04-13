import { Link } from 'react-router-dom'
import { useState } from 'react'

interface ProductCardProps {
  id?: number
  nombre: string
  precio: number
  imagen: string
}

function ProductCard({ id, nombre, precio, imagen }: ProductCardProps) {
  const [addingToCart, setAddingToCart] = useState(false)

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!id) return

    try {
      setAddingToCart(true)

      console.log('🛒 [DEBUG] Iniciando POST /api/toji/cart/add')
      console.log('   Body:', { product_id: id, add_qty: 1 })

      const response = await fetch('/api/toji/cart/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          product_id: id,
          add_qty: 1,
        }),
      })

      console.log('📡 Response status:', response.status)
      console.log('📡 Response headers:', {
        'content-type': response.headers.get('content-type'),
      })

      // Verificar HTTP status
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ HTTP Error:', response.status, errorText)
        throw new Error(
          `Error HTTP ${response.status}: ${errorText || response.statusText}`
        )
      }

      // Parsear respuesta JSON (JSON directo, sin JSONRPC)
      let data
      try {
        data = await response.json()
        console.log('✅ Response JSON:', data)
      } catch (parseError) {
        console.error('❌ Error parsing JSON:', parseError)
        throw new Error('Respuesta inválida del servidor')
      }

      // Verificar si fue exitoso
      if (data.success) {
        console.log('✅ ¡Producto añadido al carrito!')
        if (window.showToast) {
          window.showToast(
            `${nombre} añadido al carrito`,
            'success',
            3000
          )
        }
      } else {
        const errorMsg = data.error || 'Error desconocido'
        console.error('❌ API Error:', errorMsg)
        throw new Error(errorMsg)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Error desconocido'
      console.error('❌ [CATCH] Error al añadir:', errorMsg)

      if (window.showToast) {
        window.showToast(
          `Error: ${errorMsg}`,
          'error',
          4000
        )
      }
    } finally {
      setAddingToCart(false)
    }
  }
  const cardContent = (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden 
    hover:shadow-2xl transition-shadow duration-300 w-full border-black border-2 flex flex-col items-center cursor-pointer h-full">
      
      {/* Imagen del producto */}
      <div className="overflow-hidden bg-gray-100 aspect-square m-10 w-4/5 flex items-center justify-center">
        <img
          src={imagen}
          alt={nombre}
          className="w-full h-full object-contain "
        />
      </div>

      {/* Contenido */}
      <div className="p-4 relative w-full flex flex-col items-center">
        {/* Nombre */}
        <h3 className="text-lg font-semibold text-gray-800 mb-8 text-center">
          {nombre}
        </h3>

        {/* Precio y Botón */}
        <div className="flex items-center justify-center gap-4 bg-[#e3e3e3] rounded-full 
        px-4 py-2 w-full">
          <span className="text-2xl font-bold text-gray-900">
            {precio.toFixed(2)} €
          </span>
          <button 
            onClick={handleAddToCart}
            disabled={addingToCart || !id}
            className="bg-black text-white rounded-full px-10 py-4 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center justify-center shrink-0">
            <svg
              className="w-7 h-7"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 9m10 0l2-9m-10 9h12m0 0H9"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )

  if (id) {
    return (
      <Link to={`/product/${id}`} className="no-underline">
        {cardContent}
      </Link>
    )
  }

  return cardContent
}

export default ProductCard
