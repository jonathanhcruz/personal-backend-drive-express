# Tasks — Feature: Files

## Pendiente

### Fase 1 — Base de datos
- [ ] Migración: tabla `files` con `id`, `name`, `mime_type`, `size`, `checksum`, `storage_path`, `folder_id`, `owner_id`, `deleted_at`, `created_at`
- [ ] `FilesRepository` — queries con `WHERE owner_id = :userId` y `deleted_at IS NULL`
- [ ] Adaptar upload: guardar en disco → insertar en BD → rollback en disco si BD falla
- [ ] Upload acepta `folderId` opcional, valida ownership del folder

### Fase 2 — Endpoints metadata
- [ ] `GET /api/files/` — listar con filtros y paginación
- [ ] `GET /api/files/:id` — detalle con `viewUrl` y `downloadUrl`
- [ ] `FilesService` — ownership check en cada operación
- [ ] `FilesController` — validación zod, contrato `{ data }` / `{ error }`

### Fase 3 — View y Download
- [ ] `GET /api/files/:id/view` — stream con `Content-Disposition: inline`
- [ ] `GET /api/files/:id/download` — stream con `Content-Disposition: attachment`
- [ ] Ambos validan ownership antes de abrir archivo en disco

### Fase 4 — Borrado lógico
- [ ] `DELETE /api/files/:id` — soft-delete (`deleted_at = now()`)
- [ ] `DELETE /api/files/:id/hard` — elimina disco + BD, solo admin

### Fase 5 — Duplicados
- [ ] Detección nombre + folderId en upload → `409 Conflict`
- [ ] Soporte header `X-Replace: true` → soft-delete anterior + nuevo upload

## Completado
- [x] Upload funcional a disco (`/mnt/jonathan/test`) — sin BD aún
- [x] `StorageAdapter` — checksum SHA-256 streaming, remove
- [x] `config/multer.ts` — diskStorage, límite por ENV, fileFilter

---
_Actualizar al iniciar o terminar cada tarea._
