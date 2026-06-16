# Tasks — Feature: Folders ✅ Completado

## Pendiente
_Nada pendiente._

## Completado

### Fase 1 — Base de datos
- [x] Migración: tabla `folders` con `id`, `name`, `parent_id`, `owner_id`, timestamps
- [x] `ON DELETE CASCADE` en `parent_id` — subárbol eliminado en cascada

### Fase 2 — CRUD endpoints
- [x] `FoldersRepository` — findById, findRootByOwner, findChildrenWithFiles, create, rename, delete
- [x] `FoldersService` — ownership check, delete recursivo (disco + BD)
- [x] `FoldersController` — validación zod, contrato `{ data }` / `204`
- [x] `GET /api/folders/` — listar raíz
- [x] `GET /api/folders/:id` — contenido (subcarpetas + archivos)
- [x] `POST /api/folders/` — crear carpeta
- [x] `PATCH /api/folders/:id` — renombrar
- [x] `DELETE /api/folders/:id` — eliminar con `?recursive=true` → `204`
- [x] Auth middleware aplicado en todas las rutas

### Fase 3 — Vincular archivos
- [x] Upload acepta `folderId` en query param
- [x] `FilesService` valida ownership del folder destino en upload

### Fase 4 — Breadcrumb
- [x] `GET /api/folders/:id/breadcrumb` — CTE recursiva PostgreSQL
- [x] `FoldersRepository.getBreadcrumb(id, ownerId)` — retorna lista raíz→actual

---
_Actualizar al iniciar o terminar cada tarea._
