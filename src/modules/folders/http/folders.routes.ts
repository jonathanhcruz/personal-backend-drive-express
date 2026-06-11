import { Router } from 'express';
import { FoldersController } from './folders.controller';
import { FoldersService } from '../domain/folders.service';
import { FoldersRepository } from '../infrastructure/folders.repository';
import { authMiddleware } from '../../../shared/middlewares/auth.middleware';

const repo = new FoldersRepository();
const service = new FoldersService(repo);
const ctrl = new FoldersController(service);

const router = Router();

router.use(authMiddleware);

router.get('/', (req, res, next) => ctrl.listRoot(req, res).catch(next));
router.get('/:id/breadcrumb', (req, res, next) => ctrl.breadcrumb(req, res).catch(next));
router.get('/:id', (req, res, next) => ctrl.getContents(req, res).catch(next));
router.post('/', (req, res, next) => ctrl.create(req, res).catch(next));
router.patch('/:id', (req, res, next) => ctrl.rename(req, res).catch(next));
router.delete('/:id', (req, res, next) => ctrl.remove(req, res).catch(next));

export default router;
