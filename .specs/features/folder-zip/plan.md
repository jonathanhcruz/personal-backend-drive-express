# Plan — Feature: Folder ZIP Download

## Fases

| # | Fase | Descripción | Estado |
|---|------|-------------|--------|
| 1 | Dependencia | Instalar `archiver` + `@types/archiver` | Pendiente |
| 2 | Repository | CTE recursiva para obtener subárbol de archivos con rutas ZIP | Pendiente |
| 3 | Service | `downloadAsZip` — validación ownership + sanitización de rutas ZIP | Pendiente |
| 4 | Controller + Endpoint | Streaming ZIP hacia el cliente, manejo de errores y desconexión | Pendiente |

---

## Fase 1 — Dependencia

```bash
npm install archiver
npm install --save-dev @types/archiver
```

`archiver` maneja el ZIP como un `Transform` stream — se pipea directamente a `res` sin disco temporal.

---

## Fase 2 — Repository

### Query CTE recursiva

`FoldersRepository.getSubtreeFiles(folderId: string, ownerId: string)` — devuelve todos los archivos no eliminados del subárbol con su ruta relativa dentro del ZIP.

```sql
WITH RECURSIVE folder_tree AS (
  SELECT id, name, parent_id, name AS zip_prefix
  FROM folders
  WHERE id = $1 AND owner_id = $2

  UNION ALL

  SELECT f.id, f.name, f.parent_id, ft.zip_prefix || '/' || f.name
  FROM folders f
  JOIN folder_tree ft ON f.parent_id = ft.id
  WHERE f.owner_id = $2
)
SELECT
  fi.id,
  fi.name         AS file_name,
  fi.storage_path AS storage_path,
  ft.zip_prefix || '/' || fi.name AS zip_path
FROM folder_tree ft
JOIN files fi ON fi.folder_id = ft.id
             AND fi.uploaded_by = $2
             AND fi.deleted_at IS NULL;
```

**Filtros en el JOIN de `files`:**
- `fi.uploaded_by = $2` — defensa en profundidad: aunque la carpeta sea del usuario, solo incluye archivos que él mismo subió
- `fi.deleted_at IS NULL` — excluye archivos eliminados que puedan tener `deleted_at` seteado

**Tipo retornado:**
```typescript
interface ZipEntry {
  id: string;
  fileName: string;
  storagePath: string;
  zipPath: string;  // sin sanitizar — se sanitiza en el service antes de pasar a archiver
}
```

Carpeta sin archivos (o con solo subcarpetas vacías) → array vacío (no es error, devuelve ZIP vacío).

---

## Fase 3 — Service

`FoldersService.downloadAsZip(folderId: string, ownerId: string)`

1. `FoldersRepository.findById(folderId)` — valida existencia
2. Ownership check: `folder.ownerId !== ownerId` → `FORBIDDEN`
3. `FoldersRepository.getSubtreeFiles(folderId, ownerId)` → `ZipEntry[]`
4. Sanitiza cada `zipPath` para prevenir Zip Slip
5. Retorna `{ folderName: string, entries: ZipEntry[] }`

### Sanitización de rutas ZIP (Zip Slip)

Los nombres de carpetas y archivos no tienen restricción de caracteres (validación: `z.string().min(1).max(255)`). Sin sanitización, un nombre como `../../etc` construye un `zipPath = "../../etc/passwd"` que al extraerse puede escribir fuera del directorio destino del usuario.

```typescript
function sanitizeZipSegment(segment: string): string {
  return segment
    .replace(/\//g, '_')   // separadores de path Unix
    .replace(/\\/g, '_')   // separadores de path Windows
    .replace(/\0/g, '_')   // null bytes
    .replace(/^\.+$/, '_') // segmentos que son solo puntos (".", "..")
    || '_';                 // segmento vacío después de sanitizar
}

function sanitizeZipPath(zipPath: string): string {
  return zipPath
    .split('/')
    .map(sanitizeZipSegment)
    .join('/');
}
```

La sanitización se aplica en el service después de recibir las entries del repositorio — el `zipPath` crudo del repositorio nunca llega al controller ni a `archiver`.

El service no crea el stream — eso lo hace el controller para poder manejar headers HTTP.

---

## Fase 4 — Controller + Endpoint

### Nuevo endpoint
```
GET /api/folders/:id/download
```
Registrado en `folders.routes.ts` **antes** de `GET /:id` para evitar conflictos de ruta.

### Flujo del controller

```typescript
async downloadAsZip(req: Request, res: Response): Promise<void> {
  const id = parseUuid(req.params['id']);
  const userId = req.user!.id;

  const { folderName, entries } = await this.service.downloadAsZip(id, userId);

  const safeName = encodeURIComponent(folderName);
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${safeName}.zip`);

  const archive = archiver('zip', { zlib: { level: 6 } });

  archive.on('error', (err) => {
    console.error('[zip-stream]', err);
    archive.abort();
    if (!res.headersSent) {
      res.status(500).json({ error: { code: 'STREAM_ERROR' } });
    } else {
      res.destroy();
    }
  });

  req.on('close', () => archive.abort());

  archive.pipe(res);

  for (const entry of entries) {
    archive.file(entry.storagePath, { name: entry.zipPath });
  }

  await archive.finalize();
}
```

### Manejo de errores

| Momento | Situación | Comportamiento |
|---------|-----------|----------------|
| Antes de `archive.pipe(res)` | `FOLDER_NOT_FOUND`, `FORBIDDEN`, `VALIDATION_ERROR` | El error handler global responde `404`/`403`/`400` normalmente |
| Durante el stream, headers no enviados aún | Error de archiver muy temprano | `500 { error: { code: 'STREAM_ERROR' } }` |
| Durante el stream, headers ya enviados | Error de disco, archivo no encontrado, etc. | `archive.abort()` + `res.destroy()` — ZIP truncado, el cliente recibe error de descarga |
| Cliente desconectado | `req` emite `close` | `archive.abort()` — deja de procesar archivos restantes |

---

## Decisiones técnicas

| Decisión | Razón |
|----------|-------|
| Sin `Content-Length` | El tamaño del ZIP no se conoce hasta completar el stream; calcularlo requeriría leer todos los archivos dos veces |
| CTE recursiva en una sola query | Evita N+1 queries al recorrer el árbol de carpetas en el application layer |
| `zlib level 6` (default) | Balance entre velocidad y compresión |
| Service retorna `entries[]`, no el stream | Mantiene separación de responsabilidades: service valida y sanitiza, controller maneja HTTP |
| `archive.file()` en lugar de `archive.append()` | `file()` abre el `ReadStream` internamente solo cuando `archiver` lo necesita (lazy), evita abrir cientos de file descriptors simultáneos |
| Sanitización en el service, no en el repositorio | La query devuelve el `zipPath` crudo; el service es el lugar correcto para aplicar reglas de dominio |
| `fi.uploaded_by = $2` en el JOIN | Defensa en profundidad — la BD no tiene constraint que impida un archivo con `uploaded_by` diferente al `owner_id` de la carpeta |
| `fi.deleted_at IS NULL` en el JOIN | La columna existe en la tabla; excluir archivos eliminados es consistente con todos los demás endpoints |
| Subcarpetas vacías no incluidas | Si no tienen archivos, no aportan contenido descargable |
| `req.on('close', archive.abort)` | Evita I/O desperdiciado si el cliente cancela la descarga antes de que termine |
| Error en stream → `archive.abort()` + `res.destroy()` | `abort()` detiene el procesamiento de entradas pendientes; `destroy()` cierra el socket |
