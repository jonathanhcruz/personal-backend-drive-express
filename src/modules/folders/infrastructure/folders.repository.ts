import type { Pool } from 'pg';
import { pool as defaultPool } from '../../../config/database';
import type {
  Folder,
  FolderContents,
  BreadcrumbItem,
  ZipEntry,
  CreateFolderDto,
  UpdateFolderDto,
} from '../domain/folders.types';

type FolderRow = {
  id: string;
  name: string;
  parent_id: string | null;
  owner_id: string;
  has_children: boolean;
  created_at: Date;
  updated_at: Date;
};

function toFolder(row: FolderRow): Folder {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
    ownerId: row.owner_id,
    hasChildren: row.has_children,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class FoldersRepository {
  constructor(private readonly db: Pool = defaultPool) {}

  async findRootByOwner(ownerId: string): Promise<Folder[]> {
    const result = await this.db.query<FolderRow>(
      `SELECT id, name, parent_id, owner_id, created_at, updated_at,
        EXISTS(SELECT 1 FROM folders sub WHERE sub.parent_id = folders.id) AS has_children
       FROM folders WHERE parent_id IS NULL AND owner_id = $1 ORDER BY name`,
      [ownerId],
    );
    return result.rows.map(toFolder);
  }

  async findById(id: string): Promise<Folder | null> {
    const result = await this.db.query<FolderRow>(
      `SELECT id, name, parent_id, owner_id, created_at, updated_at,
        EXISTS(SELECT 1 FROM folders sub WHERE sub.parent_id = folders.id) AS has_children
       FROM folders WHERE id = $1`,
      [id],
    );
    return result.rows[0] ? toFolder(result.rows[0]) : null;
  }

  async findChildren(parentId: string): Promise<Folder[]> {
    const result = await this.db.query<FolderRow>(
      `SELECT id, name, parent_id, owner_id, created_at, updated_at,
        EXISTS(SELECT 1 FROM folders sub WHERE sub.parent_id = folders.id) AS has_children
       FROM folders WHERE parent_id = $1 ORDER BY name`,
      [parentId],
    );
    return result.rows.map(toFolder);
  }

  async getContents(folderId: string): Promise<FolderContents> {
    type FileRow = { id: string; name: string; mime_type: string; size: string; created_at: Date };

    const [folderResult, subfoldersResult, filesResult] = await Promise.all([
      this.db.query<FolderRow>(
        `SELECT id, name, parent_id, owner_id, created_at, updated_at,
          EXISTS(SELECT 1 FROM folders sub WHERE sub.parent_id = folders.id) AS has_children
         FROM folders WHERE id = $1`,
        [folderId],
      ),
      this.db.query<FolderRow>(
        `SELECT id, name, parent_id, owner_id, created_at, updated_at,
          EXISTS(SELECT 1 FROM folders sub WHERE sub.parent_id = folders.id) AS has_children
         FROM folders WHERE parent_id = $1 ORDER BY name`,
        [folderId],
      ),
      this.db.query<FileRow>(
        'SELECT id, name, mime_type, size, created_at FROM files WHERE folder_id = $1 AND deleted_at IS NULL ORDER BY name',
        [folderId],
      ),
    ]);

    const folderRow = folderResult.rows[0];
    if (!folderRow) throw new Error(`Folder ${folderId} not found`);

    return {
      folder: toFolder(folderRow),
      subfolders: subfoldersResult.rows.map(toFolder),
      files: filesResult.rows.map((r) => ({
        id: r.id,
        name: r.name,
        mimeType: r.mime_type,
        size: Number(r.size),
        createdAt: r.created_at,
      })),
    };
  }

  async getBreadcrumb(folderId: string): Promise<BreadcrumbItem[]> {
    const result = await this.db.query<{ id: string; name: string }>(
      `WITH RECURSIVE breadcrumb AS (
        SELECT id, name, parent_id, 0 AS depth FROM folders WHERE id = $1
        UNION ALL
        SELECT f.id, f.name, f.parent_id, b.depth + 1
        FROM folders f
        INNER JOIN breadcrumb b ON f.id = b.parent_id
      )
      SELECT id, name FROM breadcrumb ORDER BY depth DESC`,
      [folderId],
    );
    return result.rows;
  }

  async findByNameAndParent(name: string, parentId: string | null, ownerId: string): Promise<Folder | null> {
    const result = await this.db.query<FolderRow>(
      `SELECT id, name, parent_id, owner_id, created_at, updated_at,
        EXISTS(SELECT 1 FROM folders sub WHERE sub.parent_id = folders.id) AS has_children
       FROM folders
       WHERE name = $1 AND owner_id = $2 AND parent_id IS NOT DISTINCT FROM $3`,
      [name, ownerId, parentId],
    );
    return result.rows[0] ? toFolder(result.rows[0]) : null;
  }

  async create(ownerId: string, dto: CreateFolderDto): Promise<Folder> {
    const result = await this.db.query<FolderRow>(
      `INSERT INTO folders (name, parent_id, owner_id)
       VALUES ($1, $2, $3)
       RETURNING id, name, parent_id, owner_id, created_at, updated_at, false AS has_children`,
      [dto.name, dto.parentId, ownerId],
    );
    return toFolder(result.rows[0]!);
  }

  async rename(id: string, dto: UpdateFolderDto): Promise<Folder> {
    const result = await this.db.query<FolderRow>(
      `WITH updated AS (UPDATE folders SET name = $1, updated_at = now() WHERE id = $2 RETURNING *)
       SELECT u.id, u.name, u.parent_id, u.owner_id, u.created_at, u.updated_at,
         EXISTS(SELECT 1 FROM folders sub WHERE sub.parent_id = u.id) AS has_children
       FROM updated u`,
      [dto.name, id],
    );
    return toFolder(result.rows[0]!);
  }

  async move(id: string, targetParentId: string | null): Promise<Folder> {
    const result = await this.db.query<FolderRow>(
      `WITH updated AS (UPDATE folders SET parent_id = $1, updated_at = now() WHERE id = $2 RETURNING *)
       SELECT u.id, u.name, u.parent_id, u.owner_id, u.created_at, u.updated_at,
         EXISTS(SELECT 1 FROM folders sub WHERE sub.parent_id = u.id) AS has_children
       FROM updated u`,
      [targetParentId, id],
    );
    return toFolder(result.rows[0]!);
  }

  async findAllDescendantIds(folderId: string): Promise<string[]> {
    const result = await this.db.query<{ id: string }>(
      `WITH RECURSIVE descendants AS (
        SELECT id FROM folders WHERE id = $1
        UNION ALL
        SELECT f.id FROM folders f
        INNER JOIN descendants d ON f.parent_id = d.id
      )
      SELECT id FROM descendants`,
      [folderId],
    );
    return result.rows.map((r) => r.id);
  }

  async getSubtreeFiles(folderId: string, ownerId: string): Promise<ZipEntry[]> {
    type Row = { id: string; file_name: string; storage_path: string; zip_path: string };
    const result = await this.db.query<Row>(
      `WITH RECURSIVE folder_tree AS (
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
                   AND fi.deleted_at IS NULL`,
      [folderId, ownerId],
    );
    return result.rows.map((r) => ({
      id: r.id,
      fileName: r.file_name,
      storagePath: r.storage_path,
      zipPath: r.zip_path,
    }));
  }

  async remove(id: string): Promise<void> {
    await this.db.query('DELETE FROM folders WHERE id = $1', [id]);
  }
}
