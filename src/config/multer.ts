import multer from 'multer';
import { mkdirSync } from 'fs';
import { extname } from 'path';
import { randomUUID } from 'crypto';
import { env } from './env';

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const userId = (req as Express.Request).user!.id;
    const folderId = req.query['folderId'] as string | undefined;
    const dest = `${env.storagePath}/${userId}/${folderId ?? 'root'}`;
    mkdirSync(dest, { recursive: true });
    cb(null, dest);
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
