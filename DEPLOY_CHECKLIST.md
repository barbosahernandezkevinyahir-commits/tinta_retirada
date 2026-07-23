# Checklist de Despliegue (sin subir todavia)

## 1) Preparar variables de entorno

### Backend
1. Copia `.env.example` a `.env` dentro de `backend`.
2. Llena credenciales reales de MySQL.
3. Configura un `JWT_SECRET` fuerte y largo.
4. Configura `FRONTEND_URL` con el dominio real del frontend.
5. Si usaras correo real, completa `EMAIL_*`.

### Frontend
1. Copia `.env.example` a `.env` dentro de `fronted`.
2. Configura `VITE_API_URL` apuntando al dominio del backend + `/api`.

## 2) Verificaciones locales obligatorias

Desde `fronted`:
1. `npm run lint`
2. `npm run build`

Desde `backend`:
1. `npm start`
2. Verifica que responde `GET /api/productos`.
3. Verifica login admin y endpoints de admin.

## 3) Endpoints criticos a probar antes de publicar

1. Auth: login admin y usuario.
2. Catalogo: listar productos.
3. Carrito y creacion de pedido.
4. Admin pedidos: listar, cambiar estado, eliminar envio.
5. Admin detalles: confirmar `created_at` y `updated_at`.
6. Admin productos: crear, editar, eliminar, editar tipos.

## 4) Build de produccion

### Frontend
1. Entra a `fronted`.
2. Ejecuta `npm run build`.
3. Publica contenido de `fronted/dist` en hosting estatico.

### Backend
1. Entra a `backend`.
2. Ejecuta `npm install --omit=dev`.
3. Levanta con PM2 o servicio equivalente:
   - `pm2 start server.js --name tienda-backend`
   - `pm2 save`

## 5) Proxy y CORS

1. Sirve frontend en HTTPS.
2. Expone backend por HTTPS bajo dominio propio.
3. Asegura que CORS permita el dominio del frontend.
4. Si usas reverse proxy (Nginx/Apache), redirige `/api` al backend.

## 6) Base de datos

1. Verifica conectividad MySQL desde servidor backend.
2. Confirma creacion/migracion de columnas nuevas al iniciar:
   - `created_at` y `updated_at` en `pedidos_productos`.
3. Haz backup inicial de base de datos antes de trafico real.

## 7) Seguridad minima antes de abrir publico

1. Cambia credenciales por defecto (`ADMIN_PASSWORD`, DB_PASSWORD).
2. Usa `JWT_SECRET` robusto.
3. No publiques archivos `.env` en repositorio.
4. Restringe endpoints de admin con token (ya aplicado).
5. Usa SSL (HTTPS) en frontend y backend.

## 8) Monitoreo inicial post-despliegue

1. Revisar logs de backend por 24h.
2. Probar compra completa de extremo a extremo.
3. Confirmar que correos de confirmacion salen correctamente.
4. Confirmar que dashboard admin actualiza sin errores.

## 9) Estado actual del proyecto

A la fecha, el proyecto ya pasa lint y build en frontend, y los endpoints criticos del backend responden correctamente en pruebas locales.
