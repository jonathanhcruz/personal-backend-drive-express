import { z } from 'zod';

const schema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_EXPIRES_IN: z.string().default('7d'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  STORAGE_PATH: z.string().min(1, 'STORAGE_PATH is required'),
  MAX_FILE_SIZE_MB: z.coerce.number().positive().default(100),
  ALLOWED_MIME_TYPES: z.string().default(''),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:');
  parsed.error.issues.forEach((issue) => {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  });
  process.exit(1);
}

const data = parsed.data;

export const env = {
  port: data.PORT,
  nodeEnv: data.NODE_ENV,
  jwtSecret: data.JWT_SECRET,
  jwtExpiresIn: data.JWT_EXPIRES_IN,
  refreshExpiresIn: data.REFRESH_EXPIRES_IN,
  databaseUrl: data.DATABASE_URL,
  storagePath: data.STORAGE_PATH,
  maxFileSizeMb: data.MAX_FILE_SIZE_MB,
  allowedMimeTypes: data.ALLOWED_MIME_TYPES.split(',').filter(Boolean),
};
