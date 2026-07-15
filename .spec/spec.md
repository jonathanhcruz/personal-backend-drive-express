# Spec — Backend Drive API

## Endpoints por módulo

### Auth (`/api/auth`) ✅ Implementado — estrategia dual cookie/body

| Método | Ruta | Descripción | Auth requerida |
|--------|------|-------------|----------------|
| POST | `/login` | Login con email + contraseña → accessToken en body + refreshToken en cookie | No |
| POST | `/refresh` | Renueva tokens leyendo cookie — devuelve nuevo accessToken en body + nueva cookie | No |
| POST | `/logout` | Revoca refresh token leyendo cookie — limpia cookie | No |

#### Decisión: refreshToken como httpOnly cookie

El `refreshToken` deja de enviarse en el body de la respuesta y pasa a setearse como cookie por el servidor. Motivación: JavaScript en el cliente nunca puede leerla — elimina el riesgo XSS sobre el token de mayor duración (7 días).

**Login — respuesta actualizada:**
```
Set-Cookie: refreshToken=<token>; HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=604800
Body: { "data": { "accessToken": "..." } }
```

**Refresh — cambio de contrato:**
- Antes: requería `{ refreshToken }` en el body
- Ahora: lee el refreshToken de la cookie automáticamente (el navegador la envía solo)
- Respuesta: nuevo `accessToken` en body + nueva cookie (rotación)

**Logout — cambio de contrato:**
- Antes: requería `{ refreshToken }` en el body
- Ahora: lee el refreshToken de la cookie — revoca en BD y limpia la cookie con `Max-Age=0`
- Respuesta: `200` `{ "data": { "message": "Session closed successfully" } }`

**Configuración de cookie:**
- `HttpOnly` — inaccesible desde JavaScript
- `Secure` — solo HTTPS (Cloudflare Tunnel garantiza esto en prod)
- `SameSite=Strict` — solo se envía en requests al mismo dominio (protección CSRF)
- `Path=/api/auth` — la cookie solo se envía a las rutas de auth, no a cada request
- `Max-Age=604800` — 7 días, igual que la expiración del JWT

### Users (`/api/users`) ✅ Decisión tomada
Rutas desactivadas — usuario único gestionado directamente en la BD via `INSERT`.
No hay endpoint de registro ni gestión de usuarios desde la API.

### Folders (`/api/folders`) ✅ Implementado
| Método | Ruta | Descripción | Auth requerida |
|--------|------|-------------|----------------|
| GET | `/` | Listar carpetas raíz del usuario | Sí |
| GET | `/:id` | Contenido de carpeta (subcarpetas + archivos) | Sí |
| GET | `/:id/breadcrumb` | Ruta jerárquica desde raíz hasta la carpeta | Sí |
| POST | `/` | Crear carpeta | Sí |
| PATCH | `/:id` | Renombrar carpeta | Sí |
| DELETE | `/:id` | Eliminar carpeta (`?recursive=true` para no vacías) | Sí |

### Files (`/api/files`) ✅ Implementado
| Método | Ruta | Descripción | Auth requerida |
|--------|------|-------------|----------------|
| POST | `/upload` | Subir archivo (`multipart/form-data`, campo `file`) | Sí |
| GET | `/` | Listar archivos del usuario por carpeta | Sí |
| GET | `/:id` | Metadata de un archivo | Sí |
| GET | `/:id/download` | Descargar archivo (soporta Range requests) | Sí |
| PATCH | `/:id` | Renombrar archivo | Sí |
| DELETE | `/:id` | Eliminar archivo de disco y BD | Sí |
| POST | `/:id/share` | Crear token de compartir (1-uso, 8h) | Sí |
| GET | `/:id/share` | Listar tokens activos del archivo | Sí |
| DELETE | `/share/:tokenId` | Revocar token de compartir | Sí |
| GET | `/shares` | Listar todos los tokens activos del usuario (todos los archivos) | Sí |

### Share público (`/api/share`) ✅ Implementado
| Método | Ruta | Descripción | Auth requerida |
|--------|------|-------------|----------------|
| GET | `/:token` | Descargar archivo vía token de un solo uso | No |

### Audit (`/api/audit`) — Pendiente Fase 8
| Método | Ruta | Descripción | Auth requerida |
|--------|------|-------------|----------------|
| GET | `/` | Listar log de acciones del sistema | Sí (admin) |

### Permisos entre usuarios — Pendiente (scope por definir)
Compartir acceso a archivos entre usuarios registrados. Scope y necesidad por definir antes de diseñar.

---

## Contratos de respuesta

### Éxito con cuerpo
```json
{ "data": { ... } }
```

### Éxito lista
```json
{ "data": [ ... ] }
```

### Éxito sin cuerpo
```
204 No Content
```
Usado en: `DELETE /api/files/:id`, `DELETE /api/folders/:id`, `DELETE /api/files/share/:tokenId`

### Éxito descarga
Stream binario directo. Headers:
- `Content-Type: <mime-type>`
- `Content-Disposition: attachment; filename*=UTF-8''<nombre>`
- `Content-Length: <bytes>`
- `Accept-Ranges: bytes`
- En Range request: `206 Partial Content` + `Content-Range: bytes <start>-<end>/<total>`

### Error
```json
{ "error": { "code": "UNAUTHORIZED", "message": "..." } }
```
El `code` es el campo estable para lógica del cliente. `message` es solo informativo.

---

## Códigos de error (`TErrorCode`)

| Código | Status | Cuándo |
|--------|--------|--------|
| `INVALID_CREDENTIALS` | 401 | Email o contraseña incorrectos en login |
| `UNAUTHORIZED` | 401 | Token inválido, ausente o revocado |
| `FORBIDDEN` | 403 | El recurso no pertenece al usuario |
| `FILE_NOT_FOUND` | 404 | Archivo no existe |
| `FOLDER_NOT_FOUND` | 404 | Carpeta no existe |
| `SHARE_TOKEN_NOT_FOUND` | 404 | Token de compartir no existe |
| `SHARE_TOKEN_USED` | 403 | Token ya fue usado (one-use) |
| `SHARE_TOKEN_EXPIRED` | 403 | Token expirado (8h) |
| `NOT_FOUND` | 404 | Recurso genérico no encontrado |
| `CONFLICT` | 409 | Nombre duplicado en la misma carpeta |
| `VALIDATION_ERROR` | 400 | Body o params inválidos |
| `FILE_TOO_LARGE` | 413 | Archivo supera `MAX_FILE_SIZE_MB` |
| `NO_FILE` | 400 | Upload sin archivo adjunto |
| `STREAM_ERROR` | 500 | Error leyendo el archivo del disco |
| `INTERNAL_ERROR` | 500 | Error no controlado |

Definidos en `src/shared/constants/error-codes.ts` como `TErrorCode`.

---

## Seguridad
- JWT access token: expiración 15 minutos
- JWT refresh token: expiración 7 días, rotación en cada uso (hash SHA-256 en BD)
- Bcrypt cost: 12
- Headers de seguridad vía `helmet`

---

## Validación
- DTOs validados con `zod` en el borde HTTP (antes del dominio)
- Tamaño máximo de archivo: `MAX_FILE_SIZE_MB` (default 100)
- Tipos de archivo permitidos: `ALLOWED_MIME_TYPES` (vacío = todos)
- Campo multipart para upload: `file`
- UUID params: validados con `z.uuid()` en el controller — error `VALIDATION_ERROR` si inválido
