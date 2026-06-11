// TODO Phase 2: replace with zod validation so the server fails fast on missing vars
export const env = {
  port: process.env['PORT'] ?? '3000',
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  jwtSecret: process.env['JWT_SECRET'] ?? '',
  jwtExpiresIn: process.env['JWT_EXPIRES_IN'] ?? '15m',
  refreshExpiresIn: process.env['REFRESH_EXPIRES_IN'] ?? '7d',
  databaseUrl: process.env['DATABASE_URL'] ?? '',
  storagePath: process.env['STORAGE_PATH'] ?? '/mnt/jonathan//nas-data',
  maxFileSizeMb: Number(process.env['MAX_FILE_SIZE_MB'] ?? '100'),
  allowedMimeTypes: (process.env['ALLOWED_MIME_TYPES'] ?? '').split(',').filter(Boolean),
};
