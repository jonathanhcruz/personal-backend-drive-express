# Plan — Feature: Folders

## Fases

| # | Fase | Descripción | Estado |
|---|------|-------------|--------|
| 1 | Base de datos | Tabla `folders` + carpeta raíz en disco y seed en BD | Pendiente |
| 2 | Endpoints CRUD | Crear, listar contenido, eliminar — ownership inline | Pendiente |
| 3 | Vincular archivos | `folder_id` en upload, tabla `files` en BD | Pendiente |
| 4 | Breadcrumb | Ruta jerárquica hacia arriba desde un `folder_id` | Pendiente |

> Ownership validation va inline en cada endpoint desde el día uno — no como fase separada.

---

## Fase 1 — Base de datos

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
- `ON DELETE CASCADE` → eliminar carpeta padre elimina todo el subárbol en BD

### Carpeta raíz
- Se crea en BD y en disco en la migración/seed inicial (usuario único admin)
- Path en disco: `{STORAGE_PATH}/{userId}/` — nunca expuesto al cliente
- Si el directorio no existe en disco al momento de usarse → se crea automáticamente (lazy creation)

---

## Fase 2 — Endpoints CRUD

### Crear carpeta
- Recibe `name` + `parentId`
- Valida que `parentId` pertenece al usuario autenticado
- Si `parentId` es null → crea en raíz del usuario
- Crea directorio en disco bajo la ruta del padre
- Inserta fila en BD
- Si falla en disco → no inserta en BD

### Listar contenido
- Recibe `folderId`
- Valida ownership del folder
- Devuelve subcarpetas + archivos dentro (metadata, nunca paths reales)

### Eliminar carpeta
- Recibe `folderId`
- Valida ownership
- Dos modos: vacía (error si tiene contenido) o recursiva (elimina todo)
- Elimina en disco primero, luego en BD
- `ON DELETE CASCADE` en BD maneja el subárbol automáticamente

---

## Fase 3 — Vincular archivos

- Upload recibe `folderId` opcional (null → carpeta raíz)
- Valida que `folderId` pertenece al usuario autenticado
- Archivo se guarda en disco bajo la ruta de la carpeta
- Si upload a disco OK → inserta fila en tabla `files` con `folder_id`
- Coordinado con feature `files` Fase 1

---

## Fase 4 — Breadcrumb

Query recursiva con CTE en PostgreSQL:
```sql
WITH RECURSIVE breadcrumb AS (
  SELECT id, name, parent_id FROM folders WHERE id = $1
  UNION ALL
  SELECT f.id, f.name, f.parent_id FROM folders f
  JOIN breadcrumb b ON f.id = b.parent_id
)
SELECT * FROM breadcrumb;
```
- Retorna lista ordenada desde raíz hasta carpeta actual
- El cliente usa esto para mostrar navegación tipo `Raíz > Documentos > Trabajo`

---

## Decisiones técnicas

- El cliente nunca ve el path real en disco — solo trabaja con IDs
- Rutas en la API: `GET /api/folders/:id` — ID, nunca path
- Ownership check en cada operación: `WHERE owner_id = :userId`
- Disco y BD se mantienen sincronizados: primero disco, luego BD
