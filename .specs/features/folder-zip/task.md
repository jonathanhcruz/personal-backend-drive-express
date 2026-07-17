# Tasks — Feature: Folder ZIP Download ✅ Completado

## Pendiente
_Nada pendiente._

## Completado

### Fase 1 — Dependencia
- [x] `npm install archiver@6`
- [x] `npm install --save-dev @types/archiver@6`

### Fase 2 — Repository
- [x] `ZipEntry` interface en `folders.types.ts` — `{ id, fileName, storagePath, zipPath }`
- [x] `FoldersRepository.getSubtreeFiles(folderId, ownerId)` — CTE recursiva con `uploaded_by = $2` y `deleted_at IS NULL`

### Fase 3 — Service
- [x] `sanitizeSegment` / `sanitizeZipPath` — prevención Zip Slip (strips `/`, `\`, null bytes, segmentos `..`)
- [x] `FoldersService.downloadAsZip(folderId, ownerId)` — valida ownership + sanitiza entries

### Fase 4 — Controller + Endpoint
- [x] `FoldersController.downloadAsZip(req, res)` — streaming ZIP con `archiver`
- [x] `GET /api/folders/:id/download` en `folders.routes.ts` (antes de `GET /:id`)
- [x] Headers: `Content-Type: application/zip`, `Content-Disposition: attachment; filename*=UTF-8''<name>.zip`
- [x] `archive.on('error', ...)` con check de `res.headersSent`
- [x] `req.on('close', () => archive.abort())` — abort en desconexión del cliente

---
_Actualizar al iniciar o terminar cada tarea._
