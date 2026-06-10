import { Pool } from 'pg';
import { env } from './env';

export const pool = new Pool({ connectionString: env.databaseUrl });

export const query = <T extends object>(text: string, params?: unknown[]) =>
  pool.query<T>(text, params);
