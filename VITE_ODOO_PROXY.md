# 🔌 Configuración del Proxy Vite ↔ Odoo

## Problema
Cuando desarrollas un frontend React en Vite (puerto 5173) y tienes un backend Odoo en otro puerto (generalmente 8069 u 8000), los requests a rutas API como `/api/...` requieren un proxy.

## Solución: Vite Proxy Configuration

### Archivo: vite.config.ts
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Redireccionar /api/* al backend de Odoo
      '/api': {
        target: 'http://localhost:8069',  // ← Cambia al puerto real de Odoo
        changeOrigin: true,
        rewrite: (path) => path,
        headers: {
          'Origin': 'http://localhost:8069',
        }
      }
    }
  }
})
```

## Configuración Actual

**Frontend**: http://localhost:5173 (Vite dev server)  
**Backend**: http://localhost:8069 (Odoo server)

### Verificar Puerto de Odoo
```bash
# En terminal de Odoo:
# Si ves algo como "Listening on 0.0.0.0:8069"
# Entonces el puerto es 8069

# En Windows:
netstat -ano | findstr "8069"

# En Linux/Mac:
lsof -i :8069
```

## Flujo de Request

```
1. Frontend: fetch('/api/toji/cart/add')
2. Vite Proxy intercepta: /api/toji/cart/add
3. Proxy redirige a: http://localhost:8069/api/toji/cart/add
4. Odoo responde: { success: true, cart: {...} }
5. Browser recibe respuesta
```

## Headers Importantes

```typescript
{
  'Content-Type': 'application/json',    // Odoo espera JSON
  'Accept': 'application/json',          // Pedir response JSON
  'Origin': 'http://localhost:8069',     // Evitar CORS issues
}
```

## Endpoints Disponibles (Sin ruta `/shop/...`)

❌ ~~`/shop/cart/update_json`~~ (404 en Vite)  
✅ `/api/toji/cart/add` (proxy redirige a Odoo)

❌ ~~`/shop/cart`~~ (404 en Vite)  
✅ `/api/toji/cart` (proxy redirige a Odoo)

## Testing del Proxy

### 1. Desde Browser Console
```javascript
// Esto debería funcionar si el proxy está bien configurado
fetch('/api/toji/cart', {
  method: 'GET',
  headers: { 'Accept': 'application/json' }
})
.then(r => r.json())
.then(data => console.log('✅ Carrito:', data))
.catch(e => console.error('❌ Error:', e))
```

### 2. Verificar que Vite intercepta
```
[Abre DevTools → Network → filtrar por "toji"]
- GET /api/toji/cart → Status 200 ✅
- Si status es 404 → proxy no funciona
```

## Troubleshooting

### ❌ Error: "404 Not Found"
**Causa**: Vite no redirige al backend  
**Solución**:
1. Verificar que el proxy está en `vite.config.ts`
2. Reiniciar dev server (`npm run dev`)
3. Verificar puerto de Odoo en `vite.config.ts`

### ❌ Error: "ECONNREFUSED"
**Causa**: Backend Odoo no está ejecutándose  
**Solución**:
1. Iniciać Odoo: `./odoo-bin -d database_name`
2. Esperar que arranque (30-60 segundos)
3. Verificar http://localhost:8069 en browser

### ❌ Error: "CORS"
**Causa**: Headers de CORS no configurados  
**Solución**:
- Está manejado por `changeOrigin: true`
- Si persiste, agregar en proxy:
```typescript
headers: {
  'Origin': 'http://localhost:8069',
  'Access-Control-Allow-Origin': '*',
}
```

### ❌ Error: "JSONRPCError"
**Causa**: Odoo está retornando error  
**Solución**:
1. Revisar consola de Odoo (terminal)
2. Verificar logs en `/var/log/odoo/` si está en prod
3. Revisar permissions en módulo toji_store

## Producción

En producción, el frontend y backend generalmente están en el mismo servidor:
- Frontend: `https://ejemplo.com` (nginx/apache)
- Backend: `https://ejemplo.com/odoo` (ubicación en mismo servidor)

No necesitas proxy porque van al mismo origen.

## Referencias

- [Vite Server Proxy Documentation](https://vitejs.dev/config/server-options.html#server-proxy)
- [CORS y Same-Origin Policy](https://developer.mozilla.org/es/docs/Web/HTTP/CORS)
