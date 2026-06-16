# Plan — Feature: Folders ✅ Completado

## Fases

| # | Fase | Descripción | Estado |
|---|------|-------------|--------|
| 1 | Base de datos | Tabla `folders` + migración | ✅ Completado |
| 2 | CRUD endpoints | Crear, listar, renombrar, eliminar | ✅ Completado |
| 3 | Vincular archivos | `folder_id` en tabla `files` | ✅ Completado |
| 4 | Breadcrumb | CTE recursiva en PostgreSQL | ✅ Completado |

---

## Fase 1 — Base de datos ✅

### Tabla `folders`
```sql
CREATE TABLE folders (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  parent_id  UUID REFERENCES folders(id) ON DELETE CASCADE,
  owner_id   UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```
- `parent_id NULL` → carpeta raíz del usuario
- `ON DELETE CASCADE` → eliminar carpeta padre limpia todo el subárbol en BD

---

## Fase 2 — CRUD endpoints ✅

- `FoldersRepository` — findById, findRootByOwner, findChildrenWithFiles, create, rename, delete
- `FoldersService` — ownership check en cada operación, lógica de delete recursivo
- `FoldersController` — validación zod, `parseUuid` con error tipado

### Delete recursivo
1. Obtiene todos los archivos del subárbol via `FoldersRepository`
2. Borra cada archivo del disco (`StorageAdapter.remove`)
3. Borra la carpeta en BD → CASCADE elimina subcarpetas y filas de `files`

---

## Fase 3 — Vincular archivos ✅

- Upload de archivo acepta `folderId` en query param
- `FilesService.upload` valida que `folderId` existe y pertenece al usuario
- Archivo guardado en disco bajo `{STORAGE_PATH}/{userId}/{folderId}/`

---

## Fase 4 — Breadcrumb ✅

CTE recursiva:
```sql
WITH RECURSIVE breadcrumb AS (
  SELECT id, name, parent_id FROM folders WHERE id = $1 AND owner_id = $2
  UNION ALL
  SELECT f.id, f.name, f.parent_id FROM folders f
  JOIN breadcrumb b ON f.id = b.parent_id
)
SELECT id, name FROM breadcrumb;
```
Retorna lista desde la carpeta actual hasta la raíz; el service la invierte para mostrar raíz→actual.

---

## Decisiones técnicas

- El cliente trabaja solo con IDs — nunca ve paths en disco
- Ownership check en cada operación: `WHERE owner_id = :userId`
- Delete recursivo: disco primero, BD después — fallo en disco no deja BD inconsistente
- Respuesta `204` en delete (no `200` con mensaje)
