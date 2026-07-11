import type { Pool } from 'pg';
import type { ShareToken, ShareTokenWithFile } from '../domain/share-token.types';

type ShareTokenRow = {
  id: string;
  file_id: string;
  created_by: string;
  expires_at: Date;
  used_at: Date | null;
  created_at: Date;
};

function toShareToken(row: ShareTokenRow): ShareToken {
  return {
    id: row.id,
    fileId: row.file_id,
    createdBy: row.created_by,
    expiresAt: row.expires_at,
    usedAt: row.used_at,
    createdAt: row.created_at,
  };
}

export class ShareTokensRepository {
  constructor(private readonly db: Pool) {}

  async create(fileId: string, createdBy: string, expiresAt: Date): Promise<ShareToken> {
    const result = await this.db.query<ShareTokenRow>(
      `INSERT INTO file_share_tokens (file_id, created_by, expires_at)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [fileId, createdBy, expiresAt],
    );
    return toShareToken(result.rows[0]!);
  }

  async findById(id: string): Promise<ShareToken | null> {
    const result = await this.db.query<ShareTokenRow>(
      'SELECT * FROM file_share_tokens WHERE id = $1',
      [id],
    );
    return result.rows[0] ? toShareToken(result.rows[0]) : null;
  }

  async markUsed(id: string): Promise<void> {
    await this.db.query(
      'UPDATE file_share_tokens SET used_at = now() WHERE id = $1',
      [id],
    );
  }

  async findActiveByFileId(fileId: string): Promise<ShareToken[]> {
    const result = await this.db.query<ShareTokenRow>(
      `SELECT * FROM file_share_tokens
       WHERE file_id = $1 AND used_at IS NULL AND expires_at > now()
       ORDER BY created_at DESC`,
      [fileId],
    );
    return result.rows.map(toShareToken);
  }

  async delete(id: string): Promise<void> {
    await this.db.query('DELETE FROM file_share_tokens WHERE id = $1', [id]);
  }

  async findActiveByOwner(ownerId: string): Promise<ShareTokenWithFile[]> {
    type Row = ShareTokenRow & { file_name: string };
    const result = await this.db.query<Row>(
      `SELECT st.*, f.name AS file_name
       FROM file_share_tokens st
       INNER JOIN files f ON f.id = st.file_id
       WHERE st.created_by = $1
         AND st.used_at IS NULL
         AND st.expires_at > now()
       ORDER BY st.created_at DESC`,
      [ownerId],
    );
    return result.rows.map((r) => ({ ...toShareToken(r), fileName: r.file_name }));
  }
}
