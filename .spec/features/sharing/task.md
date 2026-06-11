# Tasks — Feature: Sharing

## Pendiente

### Fase 1 — Base de datos
- [ ] Migración: tabla `shared_links` con `id`, `token`, `resource_id`, `permission`, `owner_id`, `expires_at`, `revoked_at`, `created_at`
- [ ] Índice en `token` (único, búsquedas frecuentes)

### Fase 2 — Crear y revocar
- [ ] `SharingRepository` — `create`, `findByOwner`, `findByToken`, `revoke`
- [ ] `SharingService` — validar ownership del archivo, validar `expiresAt` no en pasado
- [ ] `SharingController` — validación zod, contrato `{ data }` / `{ error }`
- [ ] `POST /api/sharing/` — crear link con `permission` y `expiresAt`
- [ ] `GET /api/sharing/` — listar links activos del usuario
- [ ] `DELETE /api/sharing/:id` — revocar (setea `revoked_at`)

### Fase 3 — Acceso público
- [ ] `GET /api/sharing/public/:token` — sin auth middleware
- [ ] Validar token: existencia + `expires_at > now()` + `revoked_at IS NULL`
- [ ] Stream según `permission`: inline (view) o attachment (download)
- [ ] Ruta pública montada antes del auth middleware en el router

## Completado
_Nada completado aún._

---
_Actualizar al iniciar o terminar cada tarea._
