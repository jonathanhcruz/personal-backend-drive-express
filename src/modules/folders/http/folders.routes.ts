import { Router } from 'express';
import { FoldersController } from './folders.controller';
import { FoldersService } from '../domain/folders.service';
import { FoldersRepository } from '../infrastructure/folders.repository';
import { StorageAdapter } from '../../files/infrastructure/storage.adapter';
import { authMiddleware } from '../../../shared/middlewares/auth.middleware';
import { pool } from '../../../config/database';

const repo = new FoldersRepository(pool);
const storage = new StorageAdapter();
const service = new FoldersService(repo, storage);
const ctrl = new FoldersController(service);

const router = Router();

router.use(authMiddleware);

router.get('/', (req, res, next) => ctrl.listRoot(req, res).catch(next));
router.get('/:id/breadcrumb', (req, res, next) => ctrl.breadcrumb(req, res).catch(next));
router.get('/:id', (req, res, next) => ctrl.getContents(req, res).catch(next));
router.post('/', (req, res, next) => ctrl.create(req, res).catch(next));
router.patch('/:id/move', (req, res, next) => ctrl.move(req, res).catch(next));
router.patch('/:id', (req, res, next) => ctrl.rename(req, res).catch(next));
router.delete('/:id', (req, res, next) => ctrl.remove(req, res).catch(next));

export default router;
