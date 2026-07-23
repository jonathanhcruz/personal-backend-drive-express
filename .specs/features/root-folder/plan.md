# Plan de acción — Root Folder

## Fase 1 — DB: Migración y trigger

**Archivo:** `migrations/1749500007000_restore-root-folder.js`

Crea la estructura de raíz en la base de datos. No toca código de aplicación.

```javascript
/** @type {import('node-pg-migrate').MigrationBuilder} */
exports.up = (pgm) => {
  pgm.sql(`
    -- 1. Crear raíz para cada usuario existente
    INSERT INTO folders (name, parent_id, owner_id)
    SELECT '__root__', NULL, id FROM users
    ON CONFLICT DO NOTHING;

    -- 2. Re-parear carpetas de nivel raíz (parent_id IS NULL excepto la raíz misma)
    --    Asignamos como padre la raíz del mismo owner
    UPDATE folders AS f
    SET parent_id = (
      SELECT id FROM folders
      WHERE owner_id = f.owner_id
        AND parent_id IS NULL
        AND name = '__root__'
    )
    WHERE f.parent_id IS NULL
      AND f.name != '__root__';

    -- 3. Re-anclar archivos sin carpeta (folder_id IS NULL) a la raíz del usuario
    UPDATE files AS fi
    SET folder_id = (
      SELECT id FROM folders
      WHERE owner_id = fi.uploaded_by
        AND parent_id IS NULL
    )
    WHERE fi.folder_id IS NULL;

    -- 4. Índice único parcial: solo una raíz por usuario
    CREATE UNIQUE INDEX folders_one_root_per_user
      ON folders (owner_id)
      WHERE parent_id IS NULL;

    -- 5. Trigger: crear raíz automáticamente en cada nuevo usuario
    CREATE OR REPLACE FUNCTION create_root_folder_for_user()
    RETURNS TRIGGER AS $func$
    BEGIN
      INSERT INTO folders (name, parent_id, owner_id)
      VALUES ('__root__', NULL, NEW.id);
      RETURN NEW;
    END;
    $func$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_after_user_insert_root_folder
    AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION create_root_folder_for_user();
  `);
};

exports.down = (pgm) => {
  pgm.sql(`
    DROP TRIGGER IF EXISTS trg_after_user_insert_root_folder ON users;
    DROP FUNCTION IF EXISTS create_root_folder_for_user();
    DROP INDEX IF EXISTS folders_one_root_per_user;

    -- Promover hijos directos de root a nivel raíz (parent_id = NULL)
    UPDATE folders AS f
    SET parent_id = NULL
    WHERE f.parent_id IN (
      SELECT id FROM folders WHERE parent_id IS NULL AND name = '__root__'
    );

    -- Desanclar archivos de la raíz (folder_id = root_id → NULL)
    UPDATE files AS fi
    SET folder_id = NULL
    WHERE fi.folder_id IN (
      SELECT id FROM folders WHERE parent_id IS NULL AND name = '__root__'
    );

    -- Eliminar carpetas raíz
    DELETE FROM folders WHERE parent_id IS NULL AND name = '__root__';
  `);
};
```

**Verificar después de correr la migración:**
```sql
-- Debe haber exactamente una raíz por usuario
SELECT owner_id, COUNT(*) FROM folders WHERE parent_id IS NULL GROUP BY owner_id;
-- Ningún archivo debe tener folder_id NULL
SELECT COUNT(*) FROM files WHERE folder_id IS NULL;
-- Ninguna carpeta (excepto root) debe tener parent_id NULL
SELECT COUNT(*) FROM folders WHERE parent_id IS NULL AND name != '__root__';
```

---

## Fase 2 — Folders Repository

**Archivo:** `src/modules/folders/infrastructure/folders.repository.ts`

### 2a. Reemplazar `findRootByOwner`

**Antes:** Devuelve `Folder[]` — todas las carpetas con `parent_id IS NULL`.

**Después:** Devuelve `Folder` — la única carpeta raíz del usuario.

```typescript
// ELIMINAR:
async findRootByOwner(ownerId: string): Promise<Folder[]> { ... }

// AGREGAR:
async findRootFolder(ownerId: string): Promise<Folder> {
  const result = await this.db.query<FolderRow>(
    `SELECT id, name, parent_id, owner_id, created_at, updated_at,
      EXISTS(SELECT 1 FROM folders sub WHERE sub.parent_id = folders.id) AS has_children
     FROM folders
     WHERE owner_id = $1 AND parent_id IS NULL`,
    [ownerId],
  );
  const row = result.rows[0];
  if (!row) throw new Error(`Root folder not found for user ${ownerId}`);
  return toFolder(row);
}
```

### 2b. Actualizar `getBreadcrumb`

Excluir la carpeta raíz del resultado (no debe aparecer en el breadcrumb).

**Cambio:** Agregar `WHERE parent_id IS NOT NULL` al SELECT final.

```typescript
async getBreadcrumb(folderId: string): Promise<BreadcrumbItem[]> {
  const result = await this.db.query<{ id: string; name: string }>(
    `WITH RECURSIVE breadcrumb AS (
      SELECT id, name, parent_id, 0 AS depth FROM folders WHERE id = $1
      UNION ALL
      SELECT f.id, f.name, f.parent_id, b.depth + 1
      FROM folders f
      INNER JOIN breadcrumb b ON f.id = b.parent_id
    )
    SELECT id, name FROM breadcrumb
    WHERE parent_id IS NOT NULL   -- excluir la raíz
    ORDER BY depth DESC`,
    [folderId],
  );
  return result.rows;
}
```

---

## Fase 3 — Folders Service

**Archivo:** `src/modules/folders/domain/folders.service.ts`

### 3a. Reemplazar `listRoot` por `getRootContents`

```typescript
// ELIMINAR:
async listRoot(ownerId: string): Promise<Folder[]> {
  return this.repo.findRootByOwner(ownerId);
}

// AGREGAR:
async getRootContents(ownerId: string): Promise<{ subfolders: Folder[]; files: FolderContents['files'] }> {
  const root = await this.repo.findRootFolder(ownerId);
  const { subfolders, files } = await this.repo.getContents(root.id);
  return { subfolders, files };  // la raíz nunca se devuelve como entidad
}
```

### 3b. Regla universal: ningún endpoint `/:id` opera sobre root

**Regla:** Si el folder recuperado tiene `parentId === null` (es root), cualquier método del service que reciba un `id` por parámetro devuelve 404. Sin excepciones. Root solo existe como contenedor interno — no es navegable, no es operable, no es descargable por UUID.

Esto aplica a: `getContents`, `getBreadcrumb`, `rename`, `move`, `remove`, `downloadAsZip`.

Helper de verificación a usar en todos esos métodos después de `findById`:

```typescript
// Patrón a repetir en cada método que recibe un folderId externo:
const folder = await this.repo.findById(id);
if (!folder) throw new NotFoundError('Folder not found');
if (folder.ownerId !== ownerId) throw new ForbiddenError();
if (!folder.parentId) throw new NotFoundError('Folder not found');  // root → 404
```

**Métodos afectados y su check:**

```typescript
async getContents(id: string, ownerId: string): Promise<FolderContents> {
  const folder = await this.repo.findById(id);
  if (!folder) throw new NotFoundError('Folder not found');
  if (folder.ownerId !== ownerId) throw new ForbiddenError();
  if (!folder.parentId) throw new NotFoundError('Folder not found');
  return this.repo.getContents(id);
}

async getBreadcrumb(id: string, ownerId: string): Promise<BreadcrumbItem[]> {
  const folder = await this.repo.findById(id);
  if (!folder) throw new NotFoundError('Folder not found');
  if (folder.ownerId !== ownerId) throw new ForbiddenError();
  if (!folder.parentId) throw new NotFoundError('Folder not found');
  return this.repo.getBreadcrumb(id);
}

// rename, move, remove, downloadAsZip → mismo check después de findById
// (ver secciones 3f, 3g, 3h, 3i)
```

### 3d. Helper interno para resolver null → root

Agregar este método privado al servicio (se usa en create, move, etc.):

```typescript
private async resolveParentId(parentId: string | null, ownerId: string): Promise<string> {
  if (parentId !== null) return parentId;
  const root = await this.repo.findRootFolder(ownerId);
  return root.id;
}
```

### 3e. Actualizar `create`

Resolver `parentId: null` → root. El parent siempre existe (root está garantizado), pero igualmente validamos ownership para parentId explícitos.

```typescript
async create(ownerId: string, dto: CreateFolderDto): Promise<Folder> {
  const effectiveParentId = await this.resolveParentId(dto.parentId, ownerId);

  if (dto.parentId !== null) {
    // Solo validar ownership si el parent viene del cliente (no es root implícito)
    const parent = await this.repo.findById(effectiveParentId);
    if (!parent) throw new NotFoundError('Parent folder not found');
    if (parent.ownerId !== ownerId) throw new ForbiddenError();
  }

  const existing = await this.repo.findByNameAndParent(dto.name, effectiveParentId, ownerId);
  if (existing) throw new ConflictError(`A folder named "${dto.name}" already exists here`);

  const folder = await this.repo.create(ownerId, { ...dto, parentId: effectiveParentId });
  try {
    await this.storage.createFolderDir(ownerId, folder.id);
  } catch (err) {
    await this.repo.remove(folder.id);
    throw err;
  }
  return folder;
}
```

### 3f. Actualizar `rename` — proteger root

```typescript
async rename(id: string, ownerId: string, dto: UpdateFolderDto): Promise<Folder> {
  const folder = await this.repo.findById(id);
  if (!folder) throw new NotFoundError('Folder not found');
  if (folder.ownerId !== ownerId) throw new ForbiddenError();
  if (!folder.parentId) throw new ForbiddenError('Cannot rename root folder');  // ← NUEVO
  return this.repo.rename(id, dto);
}
```

### 3g. Actualizar `move` — proteger root y resolver null

```typescript
async move(id: string, ownerId: string, targetParentId: string | null): Promise<Folder> {
  const folder = await this.repo.findById(id);
  if (!folder) throw new NotFoundError('Folder not found');
  if (folder.ownerId !== ownerId) throw new ForbiddenError();
  if (!folder.parentId) throw new ForbiddenError('Cannot move root folder');  // ← NUEVO

  const effectiveTarget = await this.resolveParentId(targetParentId, ownerId);  // ← NUEVO

  if (folder.parentId === effectiveTarget) return folder;

  const target = await this.repo.findById(effectiveTarget);
  if (!target) throw new NotFoundError('Target folder not found');
  if (target.ownerId !== ownerId) throw new ForbiddenError();

  const descendants = await this.repo.findAllDescendantIds(id);
  if (descendants.includes(effectiveTarget)) {
    throw new ValidationError('Cannot move a folder into one of its own descendants');
  }

  const existing = await this.repo.findByNameAndParent(folder.name, effectiveTarget, ownerId);
  if (existing) throw new ConflictError(`A folder named "${folder.name}" already exists in the target location`);

  return this.repo.move(id, effectiveTarget);
}
```

### 3h. Actualizar `remove` — proteger root

```typescript
async remove(id: string, ownerId: string, recursive: boolean): Promise<void> {
  const folder = await this.repo.findById(id);
  if (!folder) throw new NotFoundError('Folder not found');
  if (folder.ownerId !== ownerId) throw new ForbiddenError();
  if (!folder.parentId) throw new ForbiddenError('Cannot delete root folder');  // ← NUEVO
  // ... resto igual
}
```

### 3i. Actualizar `downloadAsZip` — bloquear root

Mismo patrón que el resto: si el folder es root → 404. Sin caso especial.

```typescript
async downloadAsZip(folderId: string, ownerId: string): Promise<{ folderName: string; entries: ZipEntry[] }> {
  const folder = await this.repo.findById(folderId);
  if (!folder) throw new NotFoundError('Folder not found');
  if (folder.ownerId !== ownerId) throw new ForbiddenError();
  if (!folder.parentId) throw new NotFoundError('Folder not found');  // root → 404
  const raw = await this.repo.getSubtreeFiles(folderId, ownerId);
  const entries = raw.map((e) => ({ ...e, zipPath: sanitizeZipPath(e.zipPath) }));
  return { folderName: folder.name, entries };
}
```

> Si en el futuro se quiere descargar todo el drive como ZIP, se implementa `GET /api/folders/download` (sin `:id`) como feature separada.

---

## Fase 4 — Folders Controller

**Archivo:** `src/modules/folders/http/folders.controller.ts`

### 4a. Reemplazar `listRoot`

```typescript
// ANTES:
async listRoot(req: Request, res: Response): Promise<void> {
  const folders = await this.service.listRoot(req.user!.id);
  res.json({ data: folders.map(toPublic) });
}

// DESPUÉS:
async listRoot(req: Request, res: Response): Promise<void> {
  const { subfolders, files } = await this.service.getRootContents(req.user!.id);
  res.json({
    data: {
      subfolders: subfolders.map(toPublic),
      files,
    },
  });
}
```

La raíz **nunca** aparece en la respuesta — ni como `folder`, ni en ningún campo.
La ruta `GET /` no cambia.

---

## Fase 5 — Files Repository

**Archivo:** `src/modules/files/infrastructure/files.repository.ts`

### 5a. `findByFolder` — quitar IS NOT DISTINCT FROM

```typescript
// ANTES:
async findByFolder(folderId: string | null, uploadedBy: string): Promise<FileRecord[]> {
  const result = await this.db.query<FileRow>(
    `SELECT * FROM files
     WHERE folder_id IS NOT DISTINCT FROM $1 AND uploaded_by = $2 AND deleted_at IS NULL
     ORDER BY name`,
    [folderId, uploadedBy],
  );
  return result.rows.map(toFileRecord);
}

// DESPUÉS:
async findByFolder(folderId: string, uploadedBy: string): Promise<FileRecord[]> {
  const result = await this.db.query<FileRow>(
    `SELECT * FROM files
     WHERE folder_id = $1 AND uploaded_by = $2 AND deleted_at IS NULL
     ORDER BY name`,
    [folderId, uploadedBy],
  );
  return result.rows.map(toFileRecord);
}
```

### 5b. `findByNameAndFolder` — quitar IS NOT DISTINCT FROM

```typescript
// ANTES:
async findByNameAndFolder(name: string, folderId: string | null, uploadedBy: string): Promise<FileRecord | null> {
  const result = await this.db.query<FileRow>(
    `SELECT * FROM files
     WHERE name = $1 AND folder_id IS NOT DISTINCT FROM $2 AND uploaded_by = $3 AND deleted_at IS NULL`,
    [name, folderId, uploadedBy],
  );
  ...
}

// DESPUÉS: folderId siempre es string (nunca null — resuelto en service)
async findByNameAndFolder(name: string, folderId: string, uploadedBy: string): Promise<FileRecord | null> {
  const result = await this.db.query<FileRow>(
    `SELECT * FROM files
     WHERE name = $1 AND folder_id = $2 AND uploaded_by = $3 AND deleted_at IS NULL`,
    [name, folderId, uploadedBy],
  );
  ...
}
```

### 5c. `move` — cambiar tipo de folderId

```typescript
// Antes: targetFolderId: string | null
// Después: targetFolderId: string  (resuelto en service antes de llegar aquí)
async move(id: string, targetFolderId: string): Promise<FileRecord> { ... }
```

---

## Fase 6 — Files Service

**Archivo:** `src/modules/files/domain/files.service.ts`

`FilesService` ya tiene `private readonly foldersRepo: FoldersRepository`. Agregar helper y actualizar métodos.

### 6a. Helper interno

```typescript
private async resolveRootFolderId(ownerId: string): Promise<string> {
  const root = await this.foldersRepo.findRootFolder(ownerId);
  return root.id;
}
```

### 6b. Actualizar `upload`

```typescript
async upload(ownerId: string, dto: UploadFileDto): Promise<FileRecord> {
  // Resolver folderId null → root
  const effectiveFolderId = dto.folderId ?? await this.resolveRootFolderId(ownerId);  // ← NUEVO

  if (dto.folderId !== null) {
    const folder = await this.foldersRepo.findById(effectiveFolderId);
    if (!folder) {
      await this.storage.remove(dto.storagePath);
      throw new NotFoundError('Folder not found', ErrorCode.FOLDER_NOT_FOUND);
    }
    if (folder.ownerId !== ownerId) {
      await this.storage.remove(dto.storagePath);
      throw new ForbiddenError();
    }
  }

  const existing = await this.repo.findByNameAndFolder(dto.name, effectiveFolderId, ownerId);
  if (existing) {
    await this.storage.remove(dto.storagePath);
    throw new ConflictError(`A file named "${dto.name}" already exists in this folder`);
  }

  try {
    const checksum = await this.storage.checksum(dto.storagePath);
    return await this.repo.create({
      ...dto,
      folderId: effectiveFolderId,  // ← siempre un UUID real
      checksum,
      uploadedBy: ownerId,
      deletedAt: null,
    });
  } catch (err) {
    await this.storage.remove(dto.storagePath);
    throw err;
  }
}
```

### 6c. Actualizar `listByFolder`

```typescript
async listByFolder(folderId: string | null, ownerId: string): Promise<FileRecord[]> {
  const effectiveFolderId = folderId ?? await this.resolveRootFolderId(ownerId);  // ← NUEVO

  if (folderId !== null) {
    const folder = await this.foldersRepo.findById(effectiveFolderId);
    if (!folder) throw new NotFoundError('Folder not found', ErrorCode.FOLDER_NOT_FOUND);
    if (folder.ownerId !== ownerId) throw new ForbiddenError();
  }

  return this.repo.findByFolder(effectiveFolderId, ownerId);
}
```

### 6d. Actualizar `move`

```typescript
async move(id: string, ownerId: string, targetFolderId: string | null): Promise<FileRecord> {
  const file = await this.repo.findById(id);
  if (!file) throw new NotFoundError('File not found', ErrorCode.FILE_NOT_FOUND);
  if (file.uploadedBy !== ownerId) throw new ForbiddenError();

  const effectiveTarget = targetFolderId ?? await this.resolveRootFolderId(ownerId);  // ← NUEVO

  if (file.folderId === effectiveTarget) return file;

  if (targetFolderId !== null) {
    const targetFolder = await this.foldersRepo.findById(effectiveTarget);
    if (!targetFolder) throw new NotFoundError('Target folder not found', ErrorCode.FOLDER_NOT_FOUND);
    if (targetFolder.ownerId !== ownerId) throw new ForbiddenError();
  }

  const existing = await this.repo.findByNameAndFolder(file.name, effectiveTarget, ownerId);
  if (existing) throw new ConflictError(`A file named "${file.name}" already exists in the target folder`);

  return this.repo.move(id, effectiveTarget);
}
```

### 6e. Actualizar `rename`

`rename` usa `findByNameAndFolder(name, file.folderId, ownerId)`. `file.folderId` ahora siempre es un UUID (nunca null) — no hay cambio en la lógica, solo en el tipo. ✓

---

## Fase 7 — Multer

**Archivo:** `src/config/multer.ts`

Cuando no llega `folderId` en la query, resolver el root folder del usuario con una query directa al pool.

```typescript
import multer from 'multer';
import { mkdirSync } from 'fs';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { env } from './env';
import { pool } from './database';  // ← NUEVO import

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const userId = (req as Express.Request).user!.id;
    const folderId = req.query['folderId'] as string | undefined;

    if (folderId) {
      const dest = `${env.storagePath}/${userId}/${folderId}`;
      mkdirSync(dest, { recursive: true });
      cb(null, dest);
      return;
    }

    // Sin folderId → resolver la carpeta raíz del usuario
    pool
      .query<{ id: string }>(
        'SELECT id FROM folders WHERE owner_id = $1 AND parent_id IS NULL',
        [userId],
      )
      .then((result) => {
        const rootId = result.rows[0]?.id;
        if (!rootId) { cb(new Error('Root folder not found for user')); return; }
        const dest = `${env.storagePath}/${userId}/${rootId}`;
        mkdirSync(dest, { recursive: true });
        cb(null, dest);
      })
      .catch(cb);
  },
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname);
    cb(null, `${randomUUID()}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: env.maxFileSizeMb * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (env.allowedMimeTypes.length === 0 || env.allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  },
});
```

---

## Decisiones tomadas

| Decisión | Razón |
|----------|-------|
| Nombre interno `'__root__'` | Distinguible en queries, no conflicta con nombres de usuario |
| Root creada por DB trigger | Las rutas de users están comentadas — el trigger garantiza creación en cualquier mecanismo de registro |
| Índice único parcial `WHERE parent_id IS NULL` | Garantía a nivel DB de que solo existe una raíz por usuario |
| `onDelete: 'SET NULL'` en `files.folder_id` no cambia | Root nunca se elimina (bloqueado en app). Cambiar a `CASCADE` o `RESTRICT` requeriría otra migración sin ganancia real |
| `folderName = 'drive'` para ZIP de raíz | `'__root__'` no es un nombre útil para el usuario |
| Null → root resuelto en service, no en controller | El controller no conoce el concepto de raíz — es lógica de negocio |
| `findRootFolder` lanza Error (no retorna null) | La raíz siempre existe si el trigger funciona. Si no existe, es un error del sistema, no del usuario |

---

## Orden estricto de implementación

```
Fase 1 (DB) → Fase 2 (Repo) → Fase 3 (Service folders) → Fase 4 (Controller folders)
                                                         → Fase 5 (Repo files)
                                                         → Fase 6 (Service files)
                                                         → Fase 7 (Multer)
```

Fase 2 debe ir antes que 3 (el service depende del repo). Fases 5 y 6 son independientes entre sí pero ambas dependen de que el tipo `findRootFolder` esté disponible (Fase 2).
