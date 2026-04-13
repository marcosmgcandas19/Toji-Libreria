# ✅ Checklist: Debugging Error 404 en /api/toji/cart/add

## Paso 1: Verificar que Odoo está corriendo

**En PowerShell:**
```powershell
# Ver si hay algún proceso de Python escuchando en puerto 8069
netstat -ano | findstr ":8069"

# O probar acceso directo (reemplaza 8069 si es otro puerto)
curl http://localhost:8069

# Debería retornar HTML de Odoo, no error
```

**Esperado:**
```
PID: 12345  (algún número de proceso)
ResponseStatus: 200 (no error de conexión)
```

---

## Paso 2: Verificar Puerto Correcto de Odoo

**¿Cuál es el puerto real de Odoo?**

Busca en la consola donde ejecutas Odoo una línea como:
```
Listening on 0.0.0.0:8069
```

O en logs:
```bash
grep -i "listening\|port" logfile.log | head -5
```

**Si el puerto es distinto (ej: 8000, 8888):**
- Actualiza `vite.config.ts` línea 12:
```typescript
target: 'http://localhost:8000',  // Cambiar aquí
```

---

## Paso 3: Reiniciar Dev Server de Vite

Después de cambiar `vite.config.ts`:

```bash
# Terminar proceso actual (Ctrl+C en la terminal)
# Luego reiniciar
npm run dev

# Verifica que salga algo como:
# > toji-libreria@1.0.0 dev
# > vite
# VITE v5.x.x  ready in xxx ms
#   ➜  Local:   http://localhost:5173/
#   ➜  press h to show help
```

---

## Paso 4: Verificar Proxy en Console

**Abre DevTools (F12) → Network tab**

1. Haz click en "Añadir al carrito"
2. Busca la request a `/api/toji/cart/add`
3. Revisa:

| Campo | Valor esperado |
|-------|-----------------|
| **Method** | POST ✅ |
| **Status** | 200 ✅ (no 404) |
| **Content-Type** | application/json ✅ |
| **Request URL** | http://localhost:5173/api/toji/cart/add |

**Si Status es 404:**
- El proxy NO está funcionando
- Odoo NO responde
- El endpoint NO existe

---

## Paso 5: Verificar Endpoint en Odoo

**En Python shell de Odoo:**
```python
import odoo
# O en archivo de terminal:
python manage.py shell
```

**O directamente:**
```bash
# Navega en Odoo:
Developer Mode → View Routes
# Busca rutas que contengan "toji"
# Deberías ver: /api/toji/cart/add, etc.
```

**O desde consola:**
```bash
curl -X POST http://localhost:8069/api/toji/cart/add \
  -H "Content-Type: application/json" \
  -d '{"product_id": 5, "add_qty": 1}'

# Esperado: respuesta JSON, NO 404
```

---

## Paso 6: Logs de Odoo

**En la terminal donde corre Odoo:**

Busca mensajes de error como:
```
[DEBUG] Buscando producto...
[ERROR] Error en add_to_cart: ...
```

**O en archivos de log:**
```bash
# Linux/Mac:
tail -f ~/.local/share/Odoo/logs/odoo.log

# Windows:
# Ver carpeta: C:\Users\[USER]\AppData\Local\Odoo\logs\
```

---

## Paso 7: Verificar Módulo Instalado

**En Odoo:**
1. Ir a **Aplicaciones** 
2. Buscar "toji_store"
3. Debe estar **Marcado** (installed)

**Si NO está:**
```bash
# Instalar módulo
odoo --install toji_store --database your_db_name
```

---

## El Flujo Correcto de Request

```
1. User: Click "Añadir al carrito"
   ↓
2. ProductCard.tsx: 
   fetch('/api/toji/cart/add', {...})
   ↓
3. Vite Proxy: 
   Intercepta /api/toji/cart/add
   ↓
4. Redirige a:
   http://localhost:8069/api/toji/cart/add
   ↓
5. Odoo Router:
   Encuentra @http.route('/api/toji/cart/add', ...)
   ↓
6. TojiProductAPI.add_to_cart():
   Ejecuta lógica
   ↓
7. Respuesta JSON:
   {"success": true, "cart": {...}}
   ↓
8. Browser recibe respuesta
   ↓
9. ProductCard se actualiza
```

---

## Error Específicos y Soluciones

### ❌ 404 Not Found
```
Causa 1: Proxy no redirige
→ Solución: Reiniciar vite con Ctrl+C y npm run dev

Causa 2: Puerto Odoo incorrecto  
→ Solución: Actualizar vite.config.ts con puerto correcto

Causa 3: Endpoint no existe en Odoo
→ Solución: Verificar controler_product.py tiene @http.route('/api/toji/cart/add')
```

### ❌ CORS Error
```
Causa: Browser bloquea request por origen diferente
→ Solución: vite.config.ts proxy debe tener changeOrigin: true
```

### ❌ Connection Refused
```
Causa: Odoo no está ejecutándose
→ Solución: Iniciar Odoo: odoo-bin -d database_name
```

### ❌ 500 Internal Server Error
```
Causa: Error en controler_product.py
→ Solución: Ver logs de Odoo terminal
```

---

## Comandos Rápidos para Verificar

```bash
# ¿Está Odoo ejecutándose?
curl http://localhost:8069 -I

# ¿Está Vite ejecutándose?
curl http://localhost:5173 -I

# ¿Funciona el proxy?
curl http://localhost:5173/api/toji/cart -I

# ¿Responde Odoo directamente?
curl http://localhost:8069/api/toji/cart -I

# ¿El módulo está instalado?
grep -r "toji_store\|toji_store" ~/.local/share/Odoo/
```

---

## Última Solución: Debugging Paso a Paso

### En ProductCard.tsx, reemplaza handleAddToCart con version verbose:

```typescript
const handleAddToCart = async (e: React.MouseEvent) => {
  e.preventDefault()
  e.stopPropagation()

  if (!id) return

  try {
    setAddingToCart(true)

    console.log('🔍 [DEBUG] Iniciando request a /api/toji/cart/add')
    console.log('   - product_id:', id)
    console.log('   - add_qty: 1')

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

    console.log('📡 [DEBUG] Response status:', response.status)
    console.log('📡 [DEBUG] Response headers:', response.headers)

    const data = await response.json()
    console.log('✅ [DEBUG] Response data:', data)

    if (data.success) {
      if (window.showToast) {
        window.showToast(`${nombre} añadido al carrito`, 'success', 3000)
      }
    } else {
      throw new Error(data.error || 'Error al añadir al carrito')
    }
  } catch (err) {
    console.error('❌ [ERROR]', err)
    const errorMsg = err instanceof Error ? err.message : 'Error desconocido'

    if (window.showToast) {
      window.showToast(`Error: ${errorMsg}`, 'error', 4000)
    }
  } finally {
    setAddingToCart(false)
  }
}
```

Ahora abre DevTools (F12) y haz click en "Añadir al carrito" - verás todos los logs.

---

## Resumen Rápido

✅ Verificar Odoo está en puerto correcto  
✅ Actualizar vite.config.ts si es necesario  
✅ Reiniciar `npm run dev`  
✅ Verificar módulo toji_store está instalado  
✅ Revisar DevTools Network tab  
✅ Ver logs de Odoo en terminal  
✅ Usar código verbose para debugging  

*¿Cuál error específico ves en DevTools?*
