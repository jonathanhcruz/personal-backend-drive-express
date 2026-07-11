import { z } from 'zod';

const schema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  REFRESH_TOKEN_SECRET: z.string().min(32, 'REFRESH_TOKEN_SECRET is required (min 32 chars)'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  REFRESH_EXPIRES_IN: z.string().default('7d'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  STORAGE_PATH: z.string().min(1, 'STORAGE_PATH is required'),
  MAX_FILE_SIZE_MB: z.coerce.number().positive().default(100),
  ALLOWED_MIME_TYPES: z.string().default(''),
  FRONTEND_URL: z
    .string()
    .min(1, 'FRONTEND_URL is required')
    .transform((val) =>
      val
        .split(',')
        .map((url) => url.trim())
        .filter(Boolean),
    )
    .refine((urls) => urls.every((url) => z.string().url().safeParse(url).success), {
      message: 'FRONTEND_URL must be a comma-separated list of valid URLs',
    }),
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
  refreshTokenSecret: data.REFRESH_TOKEN_SECRET,
  jwtExpiresIn: data.JWT_EXPIRES_IN,
  refreshExpiresIn: data.REFRESH_EXPIRES_IN,
  databaseUrl: data.DATABASE_URL,
  storagePath: data.STORAGE_PATH,
  maxFileSizeMb: data.MAX_FILE_SIZE_MB,
  allowedMimeTypes: data.ALLOWED_MIME_TYPES.split(',').filter(Boolean),
  frontendUrls: data.FRONTEND_URL,
};
