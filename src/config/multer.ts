import multer from 'multer';
import { mkdirSync } from 'fs';
import { env } from './env';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    mkdirSync(env.storagePath, { recursive: true });
    cb(null, env.storagePath);
  },
  filename: (_req, file, cb) => {
    cb(null, file.originalname);
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
