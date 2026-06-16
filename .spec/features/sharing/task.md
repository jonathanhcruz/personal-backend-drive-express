# Tasks — Feature: Share Tokens ✅ Completado

## Pendiente
_Nada pendiente._

### Deuda técnica (baja prioridad)
- [ ] Refactorizar lógica de streaming + Range: duplicada entre `FilesController.download` y `ShareController.downloadPublic`. Extraer a helper o función compartida.

## Completado

### Fase 1 — Base de datos
- [x] Migración: tabla `file_share_tokens` con `id`, `file_id`, `created_by`, `expires_at`, `used_at`, `created_at`
- [x] `ON DELETE CASCADE` en `file_id` — tokens eliminados si se borra el archivo

### Fase 2 — CRUD tokens
- [x] `ShareTokensRepository` — create, findById, markUsed, findActiveByFileId, delete
- [x] `FilesService.createShareToken(fileId, ownerId)` — 8h expiry, ownership check
- [x] `FilesService.listShareTokens(fileId, ownerId)` — solo activos
- [x] `FilesService.revokeShareToken(tokenId, ownerId)` — ownership check + delete
- [x] `POST /api/files/:id/share` → `201 { data: { token, expiresAt } }`
- [x] `GET /api/files/:id/share` → `{ data: [{ id, expiresAt, createdAt }] }`
- [x] `DELETE /api/files/share/:tokenId` → `204`

### Fase 3 — Acceso público
- [x] `FilesService.redeemToken(tokenId)` — valida existence + used_at + expires_at → markUsed → retorna FileRecord
- [x] `ShareController.downloadPublic` — stream con Range support
- [x] `src/modules/share/http/share.routes.ts` — router sin auth
- [x] `GET /api/share/:token` — montado en `index.ts` sin auth middleware

---
_Actualizar al iniciar o terminar cada tarea._
