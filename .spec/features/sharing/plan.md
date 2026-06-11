# Plan — Feature: Sharing

## Fases

| # | Fase | Descripción | Estado |
|---|------|-------------|--------|
| 1 | Base de datos | Tabla `shared_links` con token, recurso, permiso y expiración | Pendiente |
| 2 | Crear y revocar | Endpoints para generar y eliminar links | Pendiente |
| 3 | Acceso público | Endpoint público que valida token y sirve el recurso | Pendiente |

---

## Fase 1 — Base de datos

### Tabla `shared_links`
```sql
CREATE TABLE shared_links (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token       TEXT NOT NULL UNIQUE,
  resource_id UUID NOT NULL REFERENCES files(id) ON DELETE CASCADE,
  permission  TEXT NOT NULL CHECK (permission IN ('view', 'download')),
  owner_id    UUID NOT NULL REFERENCES users(id),
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
- `token` → UUID opaco, es lo que se comparte externamente
- `permission` → `view` (inline) o `download` (attachment)
- `expires_at` → obligatorio, sin links eternos
- `revoked_at` → revocación manual antes del vencimiento (independiente de `expires_at`)

### Validación de un token
Un token es válido si:
1. Existe en BD
2. `expires_at > now()`
3. `revoked_at IS NULL`

---

## Fase 2 — Crear y revocar

### Crear link
- Solo el owner del archivo puede crear un link para ese archivo
- Se genera un UUID como token
- El owner define `permission` y `expires_at`
- Se pueden crear múltiples links para el mismo archivo (view + download coexisten)

### Revocar link
- Solo el owner puede revocar
- Setea `revoked_at = now()` — no elimina la fila (auditoría)

---

## Fase 3 — Acceso público

- `GET /api/sharing/public/:token` → no requiere autenticación
- Valida token (existencia, expiración, revocación)
- Según `permission`:
  - `view` → stream con `Content-Disposition: inline`
  - `download` → stream con `Content-Disposition: attachment`
- El token no revela el ID real del archivo ni su path en disco

---

## Decisiones técnicas

- Links de view y download son independientes — expiración y revocación por separado
- Sin links eternos — `expires_at` obligatorio
- Token opaco (UUID) — no firma JWT, no revela metadata del recurso
- Revocación guarda `revoked_at` en vez de eliminar la fila (para auditoría futura)
- El endpoint público no requiere JWT — el token es la credencial
