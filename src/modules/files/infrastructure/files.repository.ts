import type { Pool } from 'pg';
import { pool as defaultPool } from '../../../config/database';
import type { FileRecord } from '../domain/files.types';

type FileRow = {
  id: string;
  name: string;
  mime_type: string;
  size: string;
  checksum: string;
  storage_path: string;
  folder_id: string | null;
  uploaded_by: string;
  deleted_at: Date | null;
  created_at: Date;
};

function toFileRecord(row: FileRow): FileRecord {
  return {
    id: row.id,
    name: row.name,
    mimeType: row.mime_type,
    size: Number(row.size),
    checksum: row.checksum,
    storagePath: row.storage_path,
    folderId: row.folder_id,
    uploadedBy: row.uploaded_by,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
  };
}

export class FilesRepository {
  constructor(private readonly db: Pool = defaultPool) {}

  async create(record: Omit<FileRecord, 'id' | 'createdAt'>): Promise<FileRecord> {
    const result = await this.db.query<FileRow>(
      `INSERT INTO files (name, mime_type, size, checksum, storage_path, folder_id, uploaded_by, deleted_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        record.name,
        record.mimeType,
        record.size,
        record.checksum,
        record.storagePath,
        record.folderId,
        record.uploadedBy,
        record.deletedAt,
      ],
    );
    return toFileRecord(result.rows[0]!);
  }

  async findById(id: string): Promise<FileRecord | null> {
    const result = await this.db.query<FileRow>(
      'SELECT * FROM files WHERE id = $1 AND deleted_at IS NULL',
      [id],
    );
    return result.rows[0] ? toFileRecord(result.rows[0]) : null;
  }

  async findByFolder(folderId: string | null, uploadedBy: string): Promise<FileRecord[]> {
    const result = await this.db.query<FileRow>(
      `SELECT * FROM files
       WHERE folder_id IS NOT DISTINCT FROM $1 AND uploaded_by = $2 AND deleted_at IS NULL
       ORDER BY name`,
      [folderId, uploadedBy],
    );
    return result.rows.map(toFileRecord);
  }

  async findByNameAndFolder(
    name: string,
    folderId: string | null,
    uploadedBy: string,
  ): Promise<FileRecord | null> {
    const result = await this.db.query<FileRow>(
      `SELECT * FROM files
       WHERE name = $1 AND folder_id IS NOT DISTINCT FROM $2 AND uploaded_by = $3 AND deleted_at IS NULL`,
      [name, folderId, uploadedBy],
    );
    return result.rows[0] ? toFileRecord(result.rows[0]) : null;
  }

  async rename(id: string, name: string): Promise<FileRecord> {
    const result = await this.db.query<FileRow>(
      'UPDATE files SET name = $1 WHERE id = $2 AND deleted_at IS NULL RETURNING *',
      [name, id],
    );
    return toFileRecord(result.rows[0]!);
  }

  async move(id: string, targetFolderId: string): Promise<FileRecord> {
    const result = await this.db.query<FileRow>(
      'UPDATE files SET folder_id = $1 WHERE id = $2 AND deleted_at IS NULL RETURNING *',
      [targetFolderId, id],
    );
    return toFileRecord(result.rows[0]!);
  }

  async softDelete(id: string): Promise<void> {
    await this.db.query('UPDATE files SET deleted_at = now() WHERE id = $1', [id]);
  }

  async hardDelete(id: string): Promise<void> {
    await this.db.query('DELETE FROM files WHERE id = $1', [id]);
  }
}
