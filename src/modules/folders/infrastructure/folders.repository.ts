import type { Pool } from 'pg';
import { pool as defaultPool } from '../../../config/database';
import type {
  Folder,
  FolderContents,
  BreadcrumbItem,
  CreateFolderDto,
  UpdateFolderDto,
} from '../domain/folders.types';

type FolderRow = {
  id: string;
  name: string;
  parent_id: string | null;
  owner_id: string;
  created_at: Date;
  updated_at: Date;
};

function toFolder(row: FolderRow): Folder {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
    ownerId: row.owner_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class FoldersRepository {
  constructor(private readonly db: Pool = defaultPool) {}

  async findRootByOwner(ownerId: string): Promise<Folder[]> {
    const result = await this.db.query<FolderRow>(
      'SELECT * FROM folders WHERE parent_id IS NULL AND owner_id = $1 ORDER BY name',
      [ownerId],
    );
    return result.rows.map(toFolder);
  }

  async findById(id: string): Promise<Folder | null> {
    const result = await this.db.query<FolderRow>(
      'SELECT * FROM folders WHERE id = $1',
      [id],
    );
    return result.rows[0] ? toFolder(result.rows[0]) : null;
  }

  async findChildren(parentId: string): Promise<Folder[]> {
    const result = await this.db.query<FolderRow>(
      'SELECT * FROM folders WHERE parent_id = $1 ORDER BY name',
      [parentId],
    );
    return result.rows.map(toFolder);
  }

  async getContents(folderId: string): Promise<FolderContents> {
    const [folderResult, subfoldersResult] = await Promise.all([
      this.db.query<FolderRow>('SELECT * FROM folders WHERE id = $1', [folderId]),
      this.db.query<FolderRow>(
        'SELECT * FROM folders WHERE parent_id = $1 ORDER BY name',
        [folderId],
      ),
    ]);

    const folderRow = folderResult.rows[0];
    if (!folderRow) throw new Error(`Folder ${folderId} not found`);

    return {
      folder: toFolder(folderRow),
      subfolders: subfoldersResult.rows.map(toFolder),
      files: [],
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

  async create(ownerId: string, dto: CreateFolderDto): Promise<Folder> {
    const result = await this.db.query<FolderRow>(
      `INSERT INTO folders (name, parent_id, owner_id)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [dto.name, dto.parentId, ownerId],
    );
    return toFolder(result.rows[0]!);
  }

  async rename(id: string, dto: UpdateFolderDto): Promise<Folder> {
    const result = await this.db.query<FolderRow>(
      'UPDATE folders SET name = $1, updated_at = now() WHERE id = $2 RETURNING *',
      [dto.name, id],
    );
    return toFolder(result.rows[0]!);
  }

  async remove(id: string): Promise<void> {
    await this.db.query('DELETE FROM folders WHERE id = $1', [id]);
  }
}
