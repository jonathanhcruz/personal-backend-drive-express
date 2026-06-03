import 'dotenv/config';
import express from 'express';
import { errorMiddleware } from './shared/middlewares/error.middleware';
import authRoutes from './modules/auth/http/auth.routes';
import usersRoutes from './modules/users/http/users.routes';
import filesRoutes from './modules/files/http/files.routes';
import foldersRoutes from './modules/folders/http/folders.routes';
import auditRoutes from './modules/audit/http/audit.routes';

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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
