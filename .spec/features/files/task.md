# Tasks — Feature: Files ✅ Completado

## Pendiente
_Nada pendiente._

## Completado

### Fase 1 — Base de datos
- [x] Migración: tabla `files` con `id`, `name`, `mime_type`, `size`, `checksum`, `storage_path`, `folder_id`, `uploaded_by`, `deleted_at`, `created_at`
- [x] `StorageAdapter` — checksum SHA-256 streaming, remove, stream con Range
- [x] `FilesRepository` — findById, findByFolder, findByNameAndFolder, create, hardDelete
- [x] Upload funcional: disk-first + rollback en BD si falla

### Fase 2 — Metadata
- [x] `FilesService.getById(id, ownerId)` — ownership check
- [x] `FilesService.listByFolder(folderId, ownerId)` — valida carpeta + ownership
- [x] `GET /api/files/` — listar por `?folderId`
- [x] `GET /api/files/:id` — metadata (sin storagePath)
- [x] `FilePublicDto = Omit<FileRecord, 'storagePath'>`

### Fase 3 — Download
- [x] `GET /api/files/:id/download` — streaming completo `200 OK`
- [x] Range requests → `206 Partial Content` + `Content-Range`
- [x] `416 Range Not Satisfiable` en rangos inválidos
- [x] Stream errors → `500 STREAM_ERROR` si headers no enviados

### Fase 4 — Delete
- [x] `DELETE /api/files/:id` — hard delete disco + BD → `204`
- [x] `FilesRepository.hardDelete(id)`

### Fase 5 — Duplicados
- [x] `FilesRepository.findByNameAndFolder` antes del upload
- [x] Si existe → cleanup del disco + `409 CONFLICT`

### Fase 6 — Share Tokens
- [x] Migración: tabla `file_share_tokens`
- [x] `ShareTokensRepository` — create, findById, markUsed, findActiveByFileId, delete
- [x] `FilesService` — createShareToken (8h), redeemToken (1-uso), listShareTokens, revokeShareToken
- [x] `POST /api/files/:id/share` → `201 { data: { token, expiresAt } }`
- [x] `GET /api/files/:id/share` → `{ data: [{ id, expiresAt, createdAt }] }`
- [x] `DELETE /api/files/share/:tokenId` → `204`
- [x] `src/modules/share/` — router público sin auth
- [x] `GET /api/share/:token` — redeem + stream con Range

---
_Actualizar al iniciar o terminar cada tarea._
