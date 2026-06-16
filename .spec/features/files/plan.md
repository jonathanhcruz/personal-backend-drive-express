# Plan — Feature: Files ✅ Completado

## Fases

| # | Fase | Descripción | Estado |
|---|------|-------------|--------|
| 1 | Base de datos | Tabla `files`, StorageAdapter, upload con BD | ✅ Completado |
| 2 | Metadata | Listar y detalle de archivos | ✅ Completado |
| 3 | Download | Stream con Range requests (HTTP 206) | ✅ Completado |
| 4 | Delete | Hard delete de disco + BD | ✅ Completado |
| 5 | Duplicados | Detección nombre + carpeta → 409 | ✅ Completado |
| 6 | Share tokens | Tokens 1-uso / 8h por archivo | ✅ Completado |

---

## Fase 1 — Base de datos ✅

### Tabla `files`
```sql
CREATE TABLE files (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  mime_type    TEXT NOT NULL,
  size         BIGINT NOT NULL,
  checksum     TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  folder_id    UUID REFERENCES folders(id) ON DELETE CASCADE,
  uploaded_by  UUID NOT NULL REFERENCES users(id),
  deleted_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
> `folder_id ON DELETE CASCADE` — si se borra la carpeta, el registro de BD se borra también. El service borra el archivo del disco antes de borrar la carpeta.

### StorageAdapter
- `stream(path, { start, end })` — Node.js `ReadStream`
- `checksum(path)` — SHA-256 streaming (sin cargar en memoria)
- `remove(path)` — `unlink` silencioso si no existe

### Flujo de upload
1. multer guarda el archivo en disco: `{STORAGE_PATH}/{userId}/{folderId}/{uuid}.{ext}`
2. Si disco OK → calcula checksum → inserta en BD
3. Si BD falla → elimina archivo del disco (rollback manual)

---

## Fase 2 — Metadata ✅

- `FilesRepository.findByFolder(folderId, ownerId)` — filtro por carpeta + owner
- `FilesRepository.findById(id)` — sin filtro de owner (el service hace el check)
- `FilesService.getById(id, ownerId)` — ownership check
- `FilesService.listByFolder(folderId, ownerId)` — valida folder existe + ownership
- `FilePublicDto = Omit<FileRecord, 'storagePath'>` — nunca expone path en disco

---

## Fase 3 — Download ✅

### Streaming completo
1. Verifica ownership via `service.getById`
2. Abre `ReadStream` sin opciones
3. Pipe a respuesta con `Content-Length` y `Content-Disposition: attachment`

### Streaming parcial (Range)
1. Parsea header `Range: bytes=<start>-<end>`
2. Valida rangos (`start <= end < file.size`)
3. Si inválido → `416 Range Not Satisfiable`
4. Abre `ReadStream({ start, end })`
5. Responde `206 Partial Content` con `Content-Range`

### Errores de stream
Si el `ReadStream` emite `error` después de haber enviado headers:
- Ya no se puede cambiar el status code
- Se loguea el error pero la respuesta ya está truncada
- Si no se enviaron headers aún → `500 { error: { code: STREAM_ERROR } }`

---

## Fase 4 — Delete ✅

Hard delete (no soft-delete):
1. `FilesService.remove` verifica ownership
2. `FilesRepository.hardDelete(id)` — `DELETE FROM files WHERE id = $1`
3. `StorageAdapter.remove(storagePath)` — borra del disco
4. → `204 No Content`

> Decisión: se eligió hard delete sobre soft-delete para simplificar. Sin papelera por ahora.

---

## Fase 5 — Duplicados ✅

- `FilesRepository.findByNameAndFolder(name, folderId, ownerId)` — busca antes del upload
- Si existe → elimina archivo del disco (ya guardado por multer) y lanza `409 CONFLICT`
- No se implementó `X-Replace: true` — no hubo necesidad real del feature

---

## Fase 6 — Share Tokens ✅

### Tabla `file_share_tokens`
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

### Flujo de uso de un token
1. `POST /api/files/:id/share` → crea token con `expires_at = now() + 8h`
2. Usuario recibe `{ token: uuid, expiresAt }`
3. Comparte URL: `GET /api/share/<token>` (sin login)
4. Backend: encuentra token → valida no usado + no expirado → `markUsed` → stream archivo
5. Segunda descarga con mismo token → `403 SHARE_TOKEN_USED`

### Múltiples tokens
- Un archivo puede tener múltiples tokens activos simultáneos
- Cada token es independiente (diferente URL a compartir)
- `GET /api/files/:id/share` lista solo los no-usados y no-expirados

### Router público
- `src/modules/share/` — router separado, montado en `index.ts` sin `authMiddleware`
- `GET /api/share/:token` → `ShareController.downloadPublic`
- Misma lógica de Range que el download autenticado

---

## Decisiones técnicas

| Decisión | Razón |
|----------|-------|
| Hard delete (no soft) | Simplifica queries, sin papelera por ahora |
| No `/:id/view` (inline) | No hubo necesidad real en este momento |
| No viewUrl/downloadUrl en respuesta | El frontend construye la URL con el `id` |
| No paginación en listado | Volumen bajo para uso personal |
| `markUsed` antes del stream | Previene race conditions — si falla el stream, el token ya se consumió |
| Router público separado | Más limpio que hackear el orden de rutas en el router de files |
