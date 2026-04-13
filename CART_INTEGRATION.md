# 🛒 Integración Carrito - Toji Librería

## ✅ Requisitos Completados

- ✅ Módulo `website_sale` añadido a dependencias en `__manifest__.py`
- ✅ Endpoints API personalizados para operaciones del carrito
- ✅ Métodos nativos de website_sale integrados
- ✅ Componente React Cart.tsx actualizado
- ✅ Arquitectura de e-commerce documentada

---

## 🚀 Endpoints Disponibles

### 1. Obtener Carrito Actual
```
GET /api/toji/cart

Respuesta exitosa (200):
{
  "success": true,
  "cart": {
    "order_id": 42,
    "lines": [...],
    "subtotal": 100.00,
    "tax_total": 21.00,
    "total": 121.00,
    "total_items": 2,
    "currency": "EUR"
  }
}

Carrito vacío:
{
  "success": true,
  "cart": {
    "order_id": null,
    "lines": [],
    "subtotal": 0.0,
    "tax_total": 0.0,
    "total": 0.0,
    "total_items": 0,
    "currency": "EUR"
  }
}
```

### 2. Añadir/Modificar Producto en Carrito
```
POST /api/toji/cart/add

Request:
{
  "product_id": 5,           // ID del producto (requerido)
  "add_qty": 1,              // Cantidad a añadir (opcional, default=1)
  "set_qty": null            // Cantidad exacta a establecer (opcional)
}

Nota: Usar add_qty para incrementar o set_qty para establecer cantidad exacta

Respuesta: Same structure as GET /api/toji/cart
```

**Uso desde React:**
```typescript
const addToCart = async (productId: number, quantity: number = 1) => {
  const response = await fetch('/api/toji/cart/add', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product_id: productId,
      add_qty: quantity
    })
  })
  
  const data = await response.json()
  if (data.success) {
    // Actualizar UI con data.cart
  }
}
```

### 3. Eliminar Producto del Carrito
```
POST /api/toji/cart/remove

Request:
{
  "line_id": 128  // ID de la línea (sale.order.line)
}

Respuesta: Same structure as GET /api/toji/cart
```

### 4. Confirmar Pedido
```
POST /api/toji/cart/confirm

Request: (vacío)

Respuesta exitosa (200):
{
  "success": true,
  "order_id": 42,
  "order_number": "SO000042",
  "total": 121.00,
  "message": "Pedido SO000042 confirmado exitosamente"
}

Error:
{
  "success": false,
  "error": "El carrito está vacío, no se puede confirmar"
}
```

---

## 💻 Uso desde React

### Componente Cart.tsx

```typescript
import { useState, useEffect } from 'react'

export function ShoppingCart() {
  const [cart, setCart] = useState(null)
  const [loading, setLoading] = useState(true)

  // Cargar carrito al montar
  useEffect(() => {
    fetchCart()
  }, [])

  // Obtener carrito actual
  const fetchCart = async () => {
    const res = await fetch('/api/toji/cart')
    const data = await res.json()
    if (data.success) {
      setCart(data.cart)
    }
  }

  // Añadir producto
  const handleAddProduct = async (productId, qty) => {
    const res = await fetch('/api/toji/cart/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ product_id: productId, add_qty: qty })
    })
    const data = await res.json()
    if (data.success) {
      setCart(data.cart)
      showSuccess('Producto añadido')
    } else {
      showError(data.error)
    }
  }

  // Eliminar producto
  const handleRemoveProduct = async (lineId) => {
    const res = await fetch('/api/toji/cart/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ line_id: lineId })
    })
    const data = await res.json()
    if (data.success) {
      setCart(data.cart)
    }
  }

  // Confirmar pedido
  const handleCheckout = async () => {
    const res = await fetch('/api/toji/cart/confirm', {
      method: 'POST'
    })
    const data = await res.json()
    if (data.success) {
      navigate(`/order-confirmation/${data.order_id}`)
    } else {
      showError(data.error)
    }
  }

  // Render...
}
```

---

## 🔄 Flujo Completo de Compra

### 1. Usuario visualiza productos
```
GET /api/toji/products
↓
Muestra lista de libros con botón "Añadir al carrito"
```

### 2. Usuario añade producto
```
User Click "Añadir al carrito"
↓
POST /api/toji/cart/add { product_id: 5, add_qty: 1 }
↓
Backend crea/recupera sale.order de la sesión
↓
Backend llama _cart_update() (método nativo de website_sale)
↓
Se crea sale.order.line con el producto
↓
Se recalculan totales (precios, impuestos, descuentos)
↓
Respuesta JSON con carrito actualizado
↓
Frontend actualiza UI (total, cantidad items, preview)
```

### 3. Usuario ve carrito
```
Frontend: GET /api/toji/cart
↓
Backend: Recupera session.sale_order actual
↓
Construye JSON con detalles de líneas, totales, moneda
↓
Frontend muestra

- Listado de productos con imagen, cantidad, precio
- Subtotal + IVA calculados automáticamente
- Botón "Proceder al pago"
```

### 4. Usuario modifica cantidad
```
User change quantity select or inputs
↓
POST /api/toji/cart/add { product_id: 5, set_qty: 3 }
↓
Backend actualiza sale.order.line.product_uom_qty = 3
↓
Se recalculan totales
↓
Frontend actualiza con nuevos totales
```

### 5. Usuario elimina producto
```
User click "Eliminar"
↓
POST /api/toji/cart/remove { line_id: 128 }
↓
Backend verifica que line_id pertenece al carrito actual (seguridad)
↓
Backend elimina sale.order.line
↓
Se recalculan totales
↓
Frontend actualiza mostrando carrito sin ese producto
```

### 6. Usuario confirma pedido
```
User click "Proceder al pago"
↓
POST /api/toji/cart/confirm
↓
Backend:
  1. Recupera sale.order de sesión
  2. Llama order.action_confirm()
     └─> Cambia estado: 'draft' → 'sale'
     └─> Se activan reglas de almacén
     └─> Se genera referencia SO000042
  3. Limpia sesión: session.pop('sale_order_id')
↓
Respuesta: { order_id, order_number, total, message }
↓
Frontend redirige a /order-confirmation/42
↓
Mostrar: "Pedido SO000042 confirmado"
↓
Usuario puede volver a comprar (nueva sesión = nuevo carrito)
```

---

## 🗄️ Estructura de Base de Datos

### sale.order
```sql
SELECT id, name, state, amount_untaxed, amount_tax, amount_total, currency_id
FROM sale_order
WHERE id = 42;

-- Resultado:
id    | name      | state | untaxed | tax   | total | currency
42    | SO000042  | sale  | 100.00  | 21.00 | 121.00 | EUR
```

### sale.order.line
```sql
SELECT id, order_id, product_id, product_uom_qty, price_unit, price_subtotal
FROM sale_order_line
WHERE order_id = 42;

-- Resultado:
id  | order_id | product_id | qty | price_unit | subtotal
128 | 42       | 5          | 2   | 50.00      | 100.00
```

---

## 🛟 Troubleshooting

### ❌ Error: "Producto con ID X no existe"
**Solución:**
- Verificar que el producto_id es correcto
- Verificar que el producto existe en BD (product.product)
- Verificar que el producto está publicado (website_published=True)

### ❌ Error: "No hay carrito para confirmar"
**Solución:**
- El carrito expiró de la sesión
- Usuario nunca añadió productos
- La sesión se limpió inesperadamente

**Debug:**
```python
# En Odoo shell:
from odoo import api, SUPERUSER_ID
env = api.Environment(cr, SUPERUSER_ID, {})
# Navegar en menu: Ventas → Pedidos
# Ver todos los pedidos draft (sin confirmar) para validar
```

### ❌ Error: "Línea X no encontrada en el carrito"
**Solución:**
- El line_id no pertenece al carrito actual
- La línea ya fue eliminada
- El usuario está intentando manipular el carrito de otro usuario (¡seguridad!)

### ❌ Precios no se calculan correctamente
**Solución:**
- Verificar que los impuestos están configurados (Contabilidad → Configuración → Impuestos)
- Verificar que el producto tiene price_list aplicada
- Verificar que la moneda está configurada en la compañía

---

## 📞 Referencia Rápida

| Operación | Ruta | Parámetros |
|-----------|------|-----------|
| Ver carrito | GET /api/toji/cart | - |
| Añadir producto | POST /api/toji/cart/add | product_id, add_qty |
| Cambiar cantidad | POST /api/toji/cart/add | product_id, set_qty |
| Eliminar producto | POST /api/toji/cart/remove | line_id |
| Confirmar pedido | POST /api/toji/cart/confirm | - |

---

## 📚 Documentación Completa

Ver [CART_ARCHITECTURE.md](./CART_ARCHITECTURE.md) para:
- Arquitectura de capas detallada
- Diagramas de flujo
- Estructuras de datos completas
- Ejemplos de código
- Notas de seguridad
- Debugging avanzado

---

## ✨ Características

✅ **Sesiones automáticas** - website_sale maneja la asociación usuario-carrito  
✅ **Cálculo de precios nativo** - Impuestos y descuentos automáticos  
✅ **Estados transaccionales** - Presupuesto → Pedido de Venta  
✅ **Seguridad** - Validación que cada usuario solo accede su carrito  
✅ **Escalable** - Soporta múltiples divisas, impuestos, descuentos  

---

*Última actualización: 2026-04-13*
*Módulo: Toji Librería v0.1*
