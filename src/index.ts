import 'dotenv/config';
import express from 'express';
import { errorMiddleware } from './shared/middlewares/error.middleware';
import authRoutes from './modules/auth/http/auth.routes';
import usersRoutes from './modules/users/http/users.routes';
import filesRoutes from './modules/files/http/files.routes';
import foldersRoutes from './modules/folders/http/folders.routes';
import auditRoutes from './modules/audit/http/audit.routes';
import { query } from './config/database';
import { StorageAdapter } from './modules/files/infrastructure/storage.adapter';

const app = express();
const PORT = process.env['PORT'] ?? 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/folders', foldersRoutes);
app.use('/api/audit', auditRoutes);

app.use(errorMiddleware);

async function bootstrap(): Promise<void> {
  const storage = new StorageAdapter();
  const result = await query<{ id: string }>('SELECT id FROM users');
  await Promise.all(result.rows.map((u) => storage.ensureUserDir(u.id)));

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export default app;
