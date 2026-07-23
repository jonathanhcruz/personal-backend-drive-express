import multer from 'multer';
import { mkdirSync } from 'fs';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { env } from './env';
import { pool } from './database';

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

    pool
      .query<{ id: string }>(
        'SELECT id FROM folders WHERE owner_id = $1 AND parent_id IS NULL',
        [userId],
      )
      .then((result) => {
        const rootId = result.rows[0]?.id;
        if (!rootId) { cb(new Error('Root folder not found'), ''); return; }
        const dest = `${env.storagePath}/${userId}/${rootId}`;
        mkdirSync(dest, { recursive: true });
        cb(null, dest);
      })
      .catch((err: Error) => cb(err, ''));
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
