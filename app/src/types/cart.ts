/**
 * types/cart.ts
 * Tipos TypeScript para la API de carrito
 */

/**
 * Respuesta genérica de la API
 */
export interface ApiResponse<T> {
  success: boolean
  error?: string
  data?: T
}

/**
 * Línea del carrito (sale.order.line)
 */
export interface CartLineItem {
  /** ID de la línea (sale.order.line.id) */
  id: number
  /** ID del producto (product.product.id) */
  product_id: number
  /** Nombre del producto */
  product_name: string
  /** Cantidad solicitada */
  quantity: number
  /** Precio unitario */
  price_unit: number
  /** Subtotal sin impuestos (quantity × price_unit) */
  price_subtotal: number
  /** Monto de impuestos */
  tax_amount: number
  /** URL de la imagen del producto */
  image_url: string
}

/**
 * Datos del carrito (sale.order)
 */
export interface ShoppingCart {
  /** ID del pedido (sale.order.id, null si no existe carrito) */
  order_id: number | null
  /** Líneas del carrito */
  lines: CartLineItem[]
  /** Subtotal (sin impuestos) */
  subtotal: number
  /** Total de impuestos */
  tax_total: number
  /** Total final (subtotal + tax_total) */
  total: number
  /** Cantidad total de artículos */
  total_items: number
  /** Código de moneda (EUR, USD, etc) */
  currency: string
}

/**
 * Respuesta de carrito desde la API
 */
export interface CartApiResponse extends ApiResponse<never> {
  success: boolean
  error?: string
  cart?: ShoppingCart
}

/**
 * Respuesta de confirmación de pedido
 */
export interface OrderConfirmationResponse extends ApiResponse<never> {
  success: boolean
  error?: string
  order_id?: number
  order_number?: string
  total?: number
  message?: string
}

/**
 * Parámetros para añadir producto al carrito
 */
export interface AddToCartParams {
  /** ID del producto (product.product.id) */
  product_id: number
  /** Cantidad a añadir (incrementa la cantidad existente) */
  add_qty?: number
  /** Cantidad exacta a establecer (reemplaza cantidad) */
  set_qty?: number
}

/**
 * Parámetros para eliminar producto del carrito
 */
export interface RemoveFromCartParams {
  /** ID de la línea a eliminar (sale.order.line.id) */
  line_id: number
}

/**
 * Producto en la tienda
 */
export interface Product {
  id: number
  name: string
  price: number
  image_url: string
}

/**
 * Detalle completo de un producto
 */
export interface ProductDetail extends Product {
  description: string
  synopsis: string
  authors: Array<{
    id: number
    name: string
  }>
  website_published: boolean
}

/**
 * Error de la API
 */
export interface ApiError {
  success: false
  error: string
}

/**
 * Configuración del carrito
 */
export interface CartConfig {
  /** URL base de la API */
  apiBaseUrl: string
  /** Timeout para requests en ms */
  requestTimeout: number
  /** Si mostrar logs en consola */
  debug: boolean
}
