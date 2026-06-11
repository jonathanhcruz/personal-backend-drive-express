# Plan — Feature: Files

## Fases

| # | Fase | Descripción | Estado |
|---|------|-------------|--------|
| 1 | Base de datos | Tabla `files`, vincular upload con BD y `folder_id` | Pendiente |
| 2 | Endpoints metadata | Listar, detalle — metadata + URLs de acceso | Pendiente |
| 3 | View y Download | Endpoints separados para visualizar y descargar | Pendiente |
| 4 | Borrado lógico | Soft-delete con `deleted_at`, hard-delete admin | Pendiente |
| 5 | Duplicados | Detección por nombre + carpeta, header `X-Replace` | Pendiente |

---

## Fase 1 — Base de datos

### Tabla `files`
```sql
CREATE TABLE files (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  mime_type    TEXT NOT NULL,
  size         BIGINT NOT NULL,
  checksum     TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  folder_id    UUID REFERENCES folders(id) ON DELETE SET NULL,
  owner_id     UUID NOT NULL REFERENCES users(id),
  deleted_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
- `storage_path` → solo visible internamente, nunca expuesto al cliente
- `deleted_at NULL` → archivo activo; con valor → en papelera
- `folder_id NULL` → archivo en raíz del usuario

### Flujo de upload
1. Archivo llega al endpoint vía `multipart/form-data`
2. Se guarda en disco bajo `{STORAGE_PATH}/{userId}/{folderId}/`
3. Si disco OK → inserta fila en `files`
4. Si BD falla → elimina el archivo del disco (rollback manual)
5. Si disco falla → no toca BD

---

## Fase 2 — Endpoints de metadata

- `GET /api/files/` → lista archivos del usuario (activos)
- `GET /api/files/:id` → detalle de un archivo
- Respuesta incluye `viewUrl` y `downloadUrl` — el cliente nunca recibe `storage_path`
- Filtros en listado: `folderId`, `mimeType`, paginación

---

## Fase 3 — View y Download

### Dos endpoints separados, mismo archivo — diferente `Content-Disposition`:
- `GET /api/files/:id/view` → `Content-Disposition: inline` → el browser renderiza (PDF, imagen)
- `GET /api/files/:id/download` → `Content-Disposition: attachment` → el browser descarga

### Ambos:
- Validan ownership antes de abrir el archivo
- Leen desde `storage_path` (solo el backend lo conoce)
- Hacen stream del archivo, nunca lo cargan entero en memoria

---

## Fase 4 — Borrado lógico

- `DELETE /api/files/:id` → soft-delete: setea `deleted_at = now()`
- `DELETE /api/files/:id/hard` → elimina físicamente del disco + fila en BD (solo admin)
- Listados nunca devuelven archivos con `deleted_at` presente

---

## Fase 5 — Duplicados

- Mismo nombre + misma carpeta → `409 Conflict` con metadata del archivo existente
- Header `X-Replace: true` en el upload → soft-delete del anterior + sube el nuevo

---

## Decisiones técnicas

- `storage_path` es un detalle interno del backend — nunca sale en ninguna respuesta
- El cliente trabaja con IDs opacos
- View y Download son endpoints separados para permitir permisos distintos (futuro sharing)
- Disco primero, BD después — fallo en disco cancela todo
- Stream directo a disco via multer `diskStorage` — sin buffer en memoria
