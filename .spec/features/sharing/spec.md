# Spec — Feature: Sharing

## Endpoints (`/api/sharing`)

| Método | Ruta | Descripción | Auth |
|--------|------|-------------|------|
| POST | `/` | Crear link de acceso temporal | Sí (owner) |
| GET | `/` | Listar links activos del usuario | Sí |
| DELETE | `/:id` | Revocar link | Sí (owner) |
| GET | `/public/:token` | Acceder al recurso vía token | No |

---

## Contratos

### POST `/` — Crear link
Request:
```json
{
  "fileId": "uuid",
  "permission": "view | download",
  "expiresAt": "2026-06-17T00:00:00Z"
}
```
Response `201`:
```json
{
  "data": {
    "id": "uuid",
    "token": "uuid-opaco",
    "fileId": "uuid",
    "permission": "view",
    "expiresAt": "2026-06-17T00:00:00Z",
    "publicUrl": "/api/sharing/public/uuid-opaco",
    "createdAt": "..."
  }
}
```

### GET `/` — Listar links activos
```json
{
  "data": [
    {
      "id": "uuid",
      "token": "uuid-opaco",
      "fileId": "uuid",
      "fileName": "informe.pdf",
      "permission": "view",
      "expiresAt": "2026-06-17T...",
      "publicUrl": "/api/sharing/public/uuid-opaco",
      "createdAt": "..."
    }
  ]
}
```
Solo devuelve links no revocados y no expirados.

### DELETE `/:id` — Revocar
Response `200`:
```json
{ "data": { "message": "Link revoked successfully" } }
```

### GET `/public/:token` — Acceso público
- No requiere JWT
- Valida: token existe, `expires_at > now()`, `revoked_at IS NULL`
- Según `permission`:
  - `view` → stream con `Content-Disposition: inline`
  - `download` → stream con `Content-Disposition: attachment`
- El token no revela el ID del archivo ni su path en disco

Respuestas de error:
```json
{ "error": { "code": "NOT_FOUND", "message": "Link not found or expired" } }
```

---

## Reglas de negocio

- Solo el owner del archivo puede crear un link para ese archivo
- `expiresAt` es obligatorio — no hay links eternos
- Un mismo archivo puede tener múltiples links activos (view y download coexisten)
- Cada link tiene su propia expiración y revocación — son independientes entre sí
- Revocar setea `revoked_at` — no elimina la fila (trazabilidad)
- El endpoint público no requiere autenticación — el token es la credencial de acceso

---

## Errores

| Código | Status | Cuándo |
|--------|--------|--------|
| `NOT_FOUND` | 404 | Token no existe, expirado o revocado |
| `FORBIDDEN` | 403 | Intentar crear/revocar link de un archivo ajeno |
| `VALIDATION_ERROR` | 400 | Body inválido o `expiresAt` en el pasado |
