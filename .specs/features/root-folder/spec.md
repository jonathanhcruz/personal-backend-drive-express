# Feature — Carpeta Raíz Explícita (Root Folder)

## Contexto

Actualmente la "raíz" del drive no existe como entidad en la base de datos. Es un concepto implícito: si `parent_id IS NULL` en `folders`, la carpeta es de nivel raíz; si `folder_id IS NULL` en `files`, el archivo está en la raíz. Esto genera casos especiales (`IS NOT DISTINCT FROM`, `if (folderId === null)`) por todo el código.

Esta feature elimina ese concepto implícito y lo reemplaza por una **carpeta raíz real** por usuario: una fila en `folders` con `parent_id = NULL` que sirve de contenedor padre de todo el contenido del usuario.

> **Nota histórica:** Ya existió una implementación anterior de root folders que fue eliminada en la migración `1749500006000_remove-root-folder.js`. Esta feature la reinstala con una implementación correcta y completa.

---

## Decisión de diseño

- La raíz se identifica por `parent_id IS NULL` en la tabla `folders`.
- Cada usuario tiene **exactamente una** carpeta con `parent_id IS NULL`. Está garantizado por un índice único parcial en la DB.
- La raíz se crea automáticamente vía un **DB trigger** en `AFTER INSERT ON users`, lo que la hace independiente del mecanismo de registro de usuarios.
- El nombre interno de la raíz es `'__root__'`. No se muestra en la UI.
- La raíz **no** aparece en el breadcrumb.
- La raíz **no** puede ser renombrada, movida ni eliminada.
- Todos los archivos y carpetas **siempre** tienen un padre real: nunca `NULL`.

---

## Reglas de negocio

**Regla central:** Ningún endpoint `/:id` opera sobre root. Si el UUID de root llega a cualquier ruta `/:id` → 404. Root solo es accesible a través de los endpoints sin ID (`GET /api/folders`, upload sin folderId, create con parentId null, move con targetParentId null).

| Operación | Sobre carpeta raíz | Sobre carpeta normal |
|-----------|-------------------|----------------------|
| Ver contenido | ✅ vía `GET /api/folders` (sin ID) | ✅ vía `GET /api/folders/:id` |
| Crear subcarpeta | ✅ — `parentId: null` → resuelve a root | ✅ |
| Subir archivo | ✅ — sin `folderId` → resuelve a root | ✅ |
| Renombrar por ID | ❌ 404 (root invisible) | ✅ |
| Mover por ID | ❌ 404 (root invisible) | ✅ (`targetParentId: null` → resuelve a root) |
| Eliminar por ID | ❌ 404 (root invisible) | ✅ |
| Breadcrumb por ID | ❌ 404 (root invisible) | ✅ — root excluido del resultado |
| ZIP download por ID | ❌ 404 (root invisible) | ✅ |

---

## Cambios en la API

### `GET /api/folders` — BREAKING CHANGE

**Antes:** Devuelve `{ data: Folder[] }` — lista de carpetas de nivel raíz.

**Después:** Devuelve `{ data: { subfolders: Folder[], files: File[] } }` — solo el contenido, sin objeto `folder`. La raíz nunca aparece en ningún campo de la respuesta.

### `GET /api/folders/:id` con el UUID de la raíz

**Antes:** No contemplado.

**Después:** 404 `FOLDER_NOT_FOUND`. La raíz no es navegable por ID. Aplica también a `/:id/breadcrumb`.

### `GET /api/folders/:id/breadcrumb`

**Antes:** Incluía el nodo raíz virtual (no existía).

**Después:** La carpeta raíz real está excluida del resultado. El breadcrumb empieza desde la primera carpeta hija de root.

### `POST /api/files/upload?folderId=` (sin folderId)

**Antes:** Archivo guardado en `storage/<userId>/root/` (literal), `folder_id = NULL` en DB.

**Después:** Archivo guardado en `storage/<userId>/<root-uuid>/`, `folder_id = <root-uuid>` en DB. El multer resuelve el root UUID automáticamente si no llega `folderId`.

### `PATCH /api/folders/:id/move` con `targetParentId: null`

**Antes:** Mueve a nivel raíz (`parent_id = NULL`).

**Después:** Resuelve `null` → root folder UUID en el service. La carpeta queda como hija de root. Mismo resultado visible para el usuario.

### `PATCH /api/files/:id/move` con `targetFolderId: null`

Igual que el caso anterior para archivos.

---

## Impacto en el frontend

El frontend debe adaptarse a estos cambios:

1. **Pantalla raíz:** El `GET /api/folders` ahora devuelve `FolderContents` (mismo shape que `/:id`). Actualizar el tipo y el estado inicial.
2. **Root ID:** Guardar el `folder.id` de la respuesta raíz — usarlo como `folderId` en uploads a root y como `targetParentId` al mover a root.
3. **Breadcrumb:** La raíz nunca aparece en la lista — sin cambio visible, pero el tipo cambia.
4. **ZIP raíz:** Si el usuario descarga la carpeta raíz, el ZIP no lleva prefijo `__root__/`. Los archivos quedan en la raíz del ZIP o en subcarpetas directamente.

---

## Impacto en el storage (disco)

| Situación | Antes | Después |
|-----------|-------|---------|
| Archivo subido a raíz | `storage/<userId>/root/<uuid>.ext` | `storage/<userId>/<root-folder-id>/<uuid>.ext` |
| Archivo subido a carpeta | `storage/<userId>/<folder-id>/<uuid>.ext` | sin cambio |

Sin datos en producción, no hay migración de archivos en disco.

---

## Archivos que cambian

| Archivo | Tipo de cambio |
|---------|---------------|
| `migrations/1749500007000_restore-root-folder.js` | Nuevo — migración DB |
| `src/modules/folders/infrastructure/folders.repository.ts` | `findRootByOwner` → `findRootFolder`, breadcrumb query |
| `src/modules/folders/domain/folders.service.ts` | `listRoot` → `getRootContents`, protección root, resolución null→root |
| `src/modules/folders/http/folders.controller.ts` | Respuesta de `listRoot` cambia a FolderContents |
| `src/modules/files/infrastructure/files.repository.ts` | `findByFolder` / `findByNameAndFolder` — quitar IS NOT DISTINCT FROM |
| `src/modules/files/domain/files.service.ts` | Resolver null→root en `listByFolder`, `upload`, `move` |
| `src/config/multer.ts` | Resolver root folder ID cuando no llega `folderId` |
