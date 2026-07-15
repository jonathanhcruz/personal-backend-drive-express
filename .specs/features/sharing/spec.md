# Spec — Feature: Share Tokens ✅ Implementado

> Esta feature se implementó integrada en el módulo `files`, no como módulo `sharing` separado.
> El diseño original (tabla `shared_links`, permisos view/download, revocación con `revoked_at`) fue simplificado.

## Endpoints

### Gestión de tokens — requieren auth (`/api/files`)
| Método | Ruta | Descripción | Estado |
|--------|------|-------------|--------|
| POST | `/:id/share` | Crear token para un archivo | ✅ |
| GET | `/:id/share` | Listar tokens activos del archivo | ✅ |
| DELETE | `/share/:tokenId` | Revocar (eliminar) un token | ✅ |
| GET | `/shares` | Listar todos los tokens activos del usuario (todos los archivos) | ✅ |

### Acceso público — sin auth (`/api/share`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/:token` | Descargar archivo vía token (1-uso) |

---

## Contratos

### POST `/api/files/:id/share` — Crear token
Solo el owner del archivo puede crear tokens.

Response `201`:
```json
{
  "data": {
    "token": "550e8400-e29b-41d4-a716-446655440000",
    "expiresAt": "2026-06-15T22:00:00.000Z"
  }
}
```

### GET `/api/files/:id/share` — Listar tokens activos
Solo devuelve tokens no usados y no expirados.

Response `200`:
```json
{
  "data": [
    {
      "id": "uuid",
      "expiresAt": "2026-06-15T22:00:00.000Z",
      "createdAt": "2026-06-15T14:00:00.000Z"
    }
  ]
}
```

### DELETE `/api/files/share/:tokenId` — Revocar
Solo el owner del archivo puede revocar.
Elimina el token de la BD.

Response: `204 No Content`

---

### GET `/api/files/shares` — Listar todos los tokens activos del usuario

Devuelve todos los tokens activos (no usados, no expirados) creados por el usuario autenticado, en todos sus archivos. Incluye el nombre del archivo para que el cliente pueda mostrarlo sin hacer requests adicionales.

Response `200`:
```json
{
  "data": [
    {
      "id": "uuid",
      "fileId": "uuid",
      "fileName": "documento.pdf",
      "expiresAt": "2026-07-08T10:00:00.000Z",
      "createdAt": "2026-07-07T02:00:00.000Z"
    }
  ]
}
```

**Implementación:**
- `ShareTokensRepository.findActiveByOwner(ownerId)` — JOIN con `files` para traer `file_name`
- `FilesService.listAllShareTokens(ownerId)` — delega al repo sin validación adicional
- `FilesController.listAllShares(req, res)`
- Ruta `GET /shares` registrada antes de `/:id` en `files.routes.ts` para evitar conflicto de parámetro

### GET `/api/share/:token` — Descarga pública
- No requiere JWT
- El `token` es el `id` UUID del token en BD
- Valida: token existe → no usado → no expirado
- Marca como usado (`used_at = now()`) antes de iniciar el stream
- Devuelve stream binario del archivo

Response: stream con `Content-Disposition: attachment`
- Soporta Range requests (HTTP 206)

Errores:
```json
{ "error": { "code": "SHARE_TOKEN_NOT_FOUND", "message": "Token not found" } }
{ "error": { "code": "SHARE_TOKEN_USED", "message": "Token already used" } }
{ "error": { "code": "SHARE_TOKEN_EXPIRED", "message": "Token expired" } }
```

---

## Reglas de negocio

- Solo el owner del archivo puede crear y revocar tokens
- Un archivo puede tener múltiples tokens activos simultáneos (cada uno es una URL de compartir diferente)
- Tokens expiran automáticamente a las **8 horas** de creación
- Tokens son de **un solo uso** — se marcan como usados en la primera descarga exitosa
- `markUsed` se llama antes de iniciar el stream (previene race conditions)
- Revocar elimina el token de BD (no soft-delete — no hay trazabilidad de revocaciones)
- `GET /api/files/:id/share` solo lista tokens activos (no usados, no expirados) de un archivo
- `GET /api/files/shares` solo lista tokens activos (no usados, no expirados) de todos los archivos del usuario

---

## Tabla `file_share_tokens`
```sql
CREATE TABLE file_share_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id    UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Errores

| Código | Status | Cuándo |
|--------|--------|--------|
| `FILE_NOT_FOUND` | 404 | Archivo no existe al crear/listar tokens |
| `FORBIDDEN` | 403 | El archivo no pertenece al usuario |
| `SHARE_TOKEN_NOT_FOUND` | 404 | Token no existe en revocación o redención |
| `SHARE_TOKEN_USED` | 403 | Token ya fue usado |
| `SHARE_TOKEN_EXPIRED` | 403 | Token expirado (> 8h) |
| `VALIDATION_ERROR` | 400 | UUID inválido en params |
| `STREAM_ERROR` | 500 | Error leyendo el archivo del disco |
