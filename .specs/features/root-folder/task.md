# Tasks — Feature: Root Folder

## Pendiente

### Fase 1 — DB: Migración y trigger ✅
- [x] Crear `migrations/1749500007000_restore-root-folder.js`
  - [x] INSERT raíz por cada usuario existente
  - [x] UPDATE folders: re-parear top-level → hijos de root
  - [x] UPDATE files: re-anclar folder_id NULL → root UUID
  - [x] CREATE UNIQUE INDEX `folders_one_root_per_user` WHERE parent_id IS NULL
  - [x] CREATE FUNCTION + TRIGGER `trg_after_user_insert_root_folder`
  - [x] Implementar `exports.down` (rollback limpio)
- [ ] Correr migración y verificar con queries SQL que la estructura quedó correcta

### Fase 2 — Folders Repository ✅
- [x] Reemplazar `findRootByOwner(ownerId): Promise<Folder[]>` por `findRootFolder(ownerId): Promise<Folder>` (single root, lanza Error si no existe)
- [x] Actualizar `getBreadcrumb`: agregar `WHERE parent_id IS NOT NULL` al SELECT final

### Fase 3 — Folders Service ✅
- [x] Agregar helper privado `resolveParentId(parentId, ownerId): Promise<string>`
- [x] Reemplazar `listRoot` por `getRootContents(ownerId)` — devuelve `{ subfolders, files }` sin la raíz
- [x] Aplicar check `if (!folder.parentId) throw new NotFoundError('Folder not found')` en **todos** los métodos que reciben un ID externo:
  - [x] `getContents`
  - [x] `getBreadcrumb`
  - [x] `rename`
  - [x] `move` (+ bloquear mover la raíz + resolver `targetParentId: null` → root)
  - [x] `remove`
  - [x] `downloadAsZip`
- [x] Actualizar `create`: resolver `dto.parentId = null` → root

### Fase 4 — Folders Controller ✅
- [x] Actualizar `listRoot`: devolver `{ subfolders: subfolders.map(toPublic), files }` — sin campo `folder`, sin raíz visible

### Fase 5 — Files Repository ✅
- [x] Actualizar `findByFolder`: cambiar tipo a `folderId: string`, usar `= $1` en lugar de `IS NOT DISTINCT FROM $1`
- [x] Actualizar `findByNameAndFolder`: mismo cambio de tipo y query
- [x] Actualizar `move`: cambiar tipo de `targetFolderId` a `string`

### Fase 6 — Files Service ✅
- [x] Agregar helper privado `resolveRootFolderId(ownerId): Promise<string>`
- [x] Actualizar `upload`: resolver `dto.folderId = null` → root
- [x] Actualizar `listByFolder`: resolver `folderId = null` → root
- [x] Actualizar `move`: resolver `targetFolderId = null` → root

### Fase 7 — Multer ✅
- [x] Importar `pool` en `src/config/multer.ts`
- [x] Actualizar `destination`: si no llega `folderId`, query async para obtener root UUID del usuario

---

## Completado

Todas las fases implementadas. Pendiente: correr migración y verificar en DB.

---

_Actualizar al iniciar o terminar cada tarea. Implementar estrictamente en orden: Fase 1 → 2 → 3 → 4, y Fase 5 → 6 → 7 (paralelas a 3/4 pero dependen de 2)._
