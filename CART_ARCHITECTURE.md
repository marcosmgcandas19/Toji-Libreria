# Arquitectura del Carrito: Integración React + Odoo website_sale

## 📋 Resumen Ejecutivo

Este documento describe la arquitectura completa del flujo de compra en la tienda Toji, desde la selección del producto hasta la confirmación del pedido, integrando la interfaz React con los métodos nativos de e-commerce de Odoo (`website_sale`).

### Características Clave
✅ **Gestión automática de sesiones** - website_sale maneja la asociación usuario-carrito  
✅ **Cálculo nativo de precios** - Aplicación automática de impuestos y descuentos  
✅ **Sincronización estado/BD** - El pedido se persiste automáticamente en Odoo  
✅ **Estados transaccionales claros** - Presupuesto → Pedido de Venta → Orden confirmada  

---

## 🏗️ Arquitectura de Capas

```
┌─────────────────────────────────────────┐
│     FRONTEND (React + TypeScript)        │  ← Cart.tsx, ProductCard.tsx
│  • Estados UI locales (cantidad, total) │
│  • Manejo de errores y feedback         │
│  • Navegación entre vistas              │
└──────────────┬──────────────────────────┘
               │ HTTP (JSON)
┌──────────────▼──────────────────────────┐
│   API PERSONALIZADA (Odoo Python)       │  ← controler_product.py
│  • /api/toji/cart (GET)                 │
│  • /api/toji/cart/add (POST)            │
│  • /api/toji/cart/remove (POST)         │
│  • /api/toji/cart/confirm (POST)        │
└──────────────┬──────────────────────────┘
               │ request.website.sale_*()
┌──────────────▼──────────────────────────┐
│   WEBSITE_SALE (Métodos Nativos Odoo)   │  ← Módulo integrado
│  • sale_get_order() - Recovery session  │
│  • _cart_update() - Add/modify qty      │
│  • action_confirm() - Confirm order     │
│  • Gestión de sesiones                  │
└──────────────┬──────────────────────────┘
               │ ORM Queries
┌──────────────▼──────────────────────────┐
│      DATABASE (PostgreSQL)              │
│  • sale.order (pedidos)                 │
│  • sale.order.line (líneas)             │
│  • product.product (productos)          │
│  • account.tax (impuestos)              │
└─────────────────────────────────────────┘
```

---

## 🔄 Flujo de Operaciones

### 1. AGREGAR PRODUCTO AL CARRITO

**Ruta**: `POST /api/toji/cart/add`

**Payload esperado**:
```json
{
  "product_id": 5,
  "add_qty": 1,
  "set_qty": null
}
```

**Flujo interno**:
```
1. Validar que product_id existe
   └─> Si NO existe → Error 400

2. Obtener/crear carrito (sale.order)
   ├─> Si existe sesión con carrito → Recuperar
   └─> Si NO existe → Crear nuevo pedido

3. Ejecutar _cart_update() de website_sale
   ├─> add_qty: +cantidad a línea existente o crear nueva
   └─> set_qty: reemplazar cantidad exacta

4. Recalcular totales automáticamente
   ├─> Precios unitarios
   ├─> Subtotales por línea
   └─> Impuestos y total final

5. Retornar estado actualizado del carrito
```

**Respuesta exitosa**:
```json
{
  "success": true,
  "cart": {
    "order_id": 42,
    "lines": [
      {
        "id": 128,
        "product_id": 5,
        "product_name": "El Quijote",
        "quantity": 1,
        "price_unit": 15.99,
        "price_subtotal": 15.99,
        "tax_amount": 3.36,
        "image_url": "/web/image/product.template/5/image_1920"
      }
    ],
    "subtotal": 15.99,
    "tax_total": 3.36,
    "total": 19.35,
    "total_items": 1,
    "currency": "EUR"
  }
}
```

---

### 2. OBTENER CARRITO ACTUAL

**Ruta**: `GET /api/toji/cart`

**Flujo**:
```
1. Obtener sesión actual del usuario
   ├─> Usuario autenticado → get_order() de su sesión
   └─> Usuario anónimo → get_order() de cookies/session

2. Si existe carrito (sale.order)
   └─> Construir respuesta JSON

3. Si NO existe
   └─> Retornar estructura vacía (no crear carrito)
```

**Respuesta (carrito con items)**:
```json
{
  "success": true,
  "cart": {
    "order_id": 42,
    "lines": [
      {
        "id": 128,
        "product_id": 5,
        "product_name": "El Quijote",
        "quantity": 2,
        "price_unit": 15.99,
        "price_subtotal": 31.98,
        "tax_amount": 6.72,
        "image_url": "/web/image/product.template/5/image_1920"
      }
    ],
    "subtotal": 31.98,
    "tax_total": 6.72,
    "total": 38.70,
    "total_items": 2,
    "currency": "EUR"
  }
}
```

**Respuesta (carrito vacío)**:
```json
{
  "success": true,
  "cart": {
    "order_id": null,
    "lines": [],
    "subtotal": 0.0,
    "tax_total": 0.0,
    "total": 0.0,
    "total_items": 0,
    "currency": "USD"
  }
}
```

---

### 3. ELIMINAR PRODUCTO DEL CARRITO

**Ruta**: `POST /api/toji/cart/remove`

**Payload**:
```json
{
  "line_id": 128
}
```

**Flujo**:
```
1. Obtener carrito actual
   └─> Si NO existe → Error

2. Buscar sale.order.line con ID=line_id
   ├─> Si existe Y pertenece al carrito → Eliminar
   └─> Si NO existe o NO pertenece → Error (seguridad)

3. Recalcular totales
   └─> website_sale recalcula automáticamente

4. Retornar carrito actualizado
```

**Respuesta**: Misma estructura que GET /api/toji/cart

---

### 4. CONFIRMAR PEDIDO

**Ruta**: `POST /api/toji/cart/confirm`

**Transición de Estado**:
```
ANTES: sale.order.state = 'draft' (Presupuesto)
  │
  ├─ Líneas editables
  ├─ Puede eliminarse fácilmente
  ├─ No genera documentos
  │
DESPUÉS: sale.order.state = 'sale' (Pedido de Venta)
  │
  ├─ Líneas pueden estar parcialmente editables (depende de config)
  ├─ Puede generar albarán/factura
  ├─ Entra en flujo de fulfillment
  └─ Se activa sistema de almacén
```

**Flujo**:
```
1. Obtener carrito (sale.order) de sesión
   └─> Si NO existe → Error

2. Validar que tiene líneas
   └─> Si vacío → Error

3. Ejecutar action_confirm()
   ├─> Cambia estado a 'sale'
   ├─> Ejecuta validaciones configuradas
   ├─> Genera secuencias y referencias
   └─> Activa reglas de almacén (si existen)

4. Desvincularse de la sesión
   ├─> pop('sale_order_id') → Limpia sesión
   └─> Permite nuevo carrito para usuario

5. Retornar confirmación
```

**Respuesta exitosa**:
```json
{
  "success": true,
  "order_id": 42,
  "order_number": "SO000042",
  "total": 38.70,
  "message": "Pedido SO000042 confirmado exitosamente"
}
```

**Donde ver el pedido en Odoo**:
```
Ruta: Ventas → Pedidos → [SO000042]
Estado: 'Pedido de Venta' (no Presupuesto)
```

---

## 📊 Estructura de Datos

### sale.order (Pedido)
```python
{
  'id': 42,
  'name': 'SO000042',                    # Referencia del pedido
  'state': 'sale',                       # 'draft', 'sale', 'done', 'cancel'
  'date_order': '2026-04-13 10:30:00',  # Fecha de creación
  'amount_untaxed': 31.98,               # Subtotal
  'amount_tax': 6.72,                    # Impuestos (21% en este caso)
  'amount_total': 38.70,                 # Total final
  'currency_id': 'EUR',                  # Moneda
  'order_line': [<sale.order.line objects>],  # Líneas del pedido
  'partner_id': 12,                      # Cliente (res.partner)
}
```

### sale.order.line (Línea del pedido)
```python
{
  'id': 128,
  'order_id': 42,                        # FK a sale.order
  'product_id': <product.product>,       # Producto
  'product_uom_qty': 2,                  # Cantidad
  'price_unit': 15.99,                   # Precio unitario
  'price_subtotal': 31.98,               # quantity × price_unit
  'price_total': 38.70,                  # price_subtotal + impuestos
  'tax_id': [<account.tax>],            # Impuestos aplicables
}
```

---

## 💻 Implementación Frontend (React)

### Hooks y Estado

```typescript
// État del carrito
const [cart, setCart] = useState<CartData | null>(null)
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)

// Métodos
const fetchCart = async () => {
  const res = await fetch('/api/toji/cart')
  const data = await res.json()
  if (data.success) {
    setCart(data.cart)
  }
}

const addToCart = async (productId: number, qty: number = 1) => {
  const res = await fetch('/api/toji/cart/add', {
    method: 'POST',
    body: JSON.stringify({ product_id: productId, add_qty: qty })
  })
  const data = await res.json()
  if (data.success) {
    setCart(data.cart)
  } else {
    setError(data.error)
  }
}

const removeFromCart = async (lineId: number) => {
  const res = await fetch('/api/toji/cart/remove', {
    method: 'POST',
    body: JSON.stringify({ line_id: lineId })
  })
  const data = await res.json()
  if (data.success) {
    setCart(data.cart)
  }
}

const confirmOrder = async () => {
  const res = await fetch('/api/toji/cart/confirm', {
    method: 'POST'
  })
  const data = await res.json()
  if (data.success) {
    // Redirigir a página de confirmación
    navigate(`/order-confirmation/${data.order_id}`)
  } else {
    setError(data.error)
  }
}
```

---

## 🔐 Seguridad

### Validaciones Implementadas

1. **Autenticación de sesión**
   - website_sale maneja automáticamente la asociación session-carrito
   - Un usuario solo puede acceder a su propio carrito

2. **Validación de producto**
   - Se verifica que el producto_id existe antes de añadirlo
   - No se añaden productos desconocidos

3. **Validación de líneas**
   - remove_from_cart verifica que la línea pertenece al carrito actual
   - Impide que un usuario elimination líneas de otros carritos

4. **Campos protegidos**
   - Se usa `.sudo()` solo donde es necesario (búsquedas públicas)
   - Las operaciones de modificación respetan permisos de usuario

---

## 🐛 Debugging y Logs

### Puntos de Debug

```python
# En los endpoints se añaden prints para debugging:
print(f"[DEBUG] Confirmando pedido: {order.name}, estado actual: {order.state}")
print(f"[DEBUG] Pedido confirmado exitosamente: {order.name}, nuevo estado: {order.state}")

# Ver en:
# - Terminal de Odoo (si está corriendo en foreground)
# - PostgreSQL logs
# - Archivos de log de Odoo
```

### Checklist para Debugging

Si el carrito no funciona:

```
□ ¿Se creó la sesión? (website_sale debe crear una session_id)
□ ¿Se crea sale.order? (debe haber un registro en la BD)
□ ¿Se actualiza product_uom_qty? (¿incrementa la cantidad?)
□ ¿Se recalculan precios? (¿amount_total cambia?)
□ ¿Transición de estado? (¿draft → sale al confirmar?)
□ ¿Se limpia la sesión? (pop('sale_order_id') funciona?)
```

---

## 📦 Dependencias

**Módulos Odoo requeridos**:
- ✅ `base` - Sistema base
- ✅ `product` - Gestión de productos
- ✅ `website_sale` - **CRÍTICO: Debe estar en depends[]**
- ✅ `account` - Gestión de impuestos

**Archivos clave**:
- `__manifest__.py` - Debe incluir `website_sale` en `depends`
- `controllers/controler_product.py` - Endpoints API
- `models/toji_book.py` - Extensión de product.template
- `app/src/Cart.tsx` - Componente React

---

## 🚀 Flujo Completo de Compra

```
1. Usuario entra a tienda
   └─> GET /api/toji/products → Lista de libros

2. Usuario abre detalle de producto
   └─> GET /api/toji/products/<id> → Detalles

3. Usuario hace click en "Añadir al carrito"
   └─> POST /api/toji/cart/add
       {product_id: 5, add_qty: 1}

4. Se muestra badge con cantidad en carrito
   └─> GET /api/toji/cart → total_items = 1

5. Usuario navega, añade más productos
   └─> Repetir paso 3 varias veces

6. Usuario hace click en "Ver carrito"
   └─> GET /api/toji/cart → Muestra resumen completo

7. Usuario modifica cantidades (opcional)
   └─> POST /api/toji/cart/add
       {product_id: 5, set_qty: 3}

8. Usuario elimina producto (opcional)
   └─> POST /api/toji/cart/remove
       {line_id: 128}

9. Usuario hace click en "Proceder al pago"
   └─> POST /api/toji/cart/confirm

10. Pedido confirmado
    └─> Redirigir a /order-confirmation/{order_id}
        Mostrar número de referencia (SO000042)
        Enviar email de confirmación
        Se crea nuevo carrito vacío para nueva compra
```

---

## ✅ Checklist de Implementación

- [x] Dependencia `website_sale` en `__manifest__.py`
- [x] Endpoint `/api/toji/cart/add` (POST)
- [x] Endpoint `/api/toji/cart` (GET)
- [x] Endpoint `/api/toji/cart/remove` (POST)
- [x] Endpoint `/api/toji/cart/confirm` (POST)
- [x] Método helper `_get_cart_data()`
- [ ] Componente `Cart.tsx` actualizado
- [ ] Componente `ProductCard.tsx` con botón añadir
- [ ] Componente `Header.tsx` con badge de carrito
- [ ] Página de confirmación de pedido
- [ ] Tests de flujo completo

---

## 📞 Referencia Rápida

| Operación | Ruta | Método | Responsable |
|-----------|------|--------|-------------|
| Obtener carrito | `/api/toji/cart` | GET | website_sale (session) |
| Añadir producto | `/api/toji/cart/add` | POST | _cart_update() |
| Eliminar producto | `/api/toji/cart/remove` | POST | unlink() |
| Confirmar pedido | `/api/toji/cart/confirm` | POST | action_confirm() |
| Navegar al shop | `/shop` | GET | website_sale (nativo) |
| Carrito nativo | `/shop/cart` | GET | website_sale (nativo) |

---

## 📝 Notas Importantes

1. **Sesión = Carrito**: No hay múltiples carritos por usuario. Una sesión = un carrito.
2. **Draft → Sale**: Una vez confirmado (action_confirm), el pedido entra en flujo de fulfillment.
3. **Reset de sesión**: Después de confirmar, se limpia `sale_order_id` para permitir nueva compra.
4. **Impuestos**: Se calculan automáticamente según configuración en `account.tax`.
5. **Moneda**: Hereda de la configuración del website (generalmente en Company).

---

*Última actualización: 2026-04-13*
