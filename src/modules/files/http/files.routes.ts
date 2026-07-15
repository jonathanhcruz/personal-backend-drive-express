import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { FilesController } from './files.controller';
import { FilesService } from '../domain/files.service';
import { FilesRepository } from '../infrastructure/files.repository';
import { FoldersRepository } from '../../folders/infrastructure/folders.repository';
import { StorageAdapter } from '../infrastructure/storage.adapter';
import { ShareTokensRepository } from '../infrastructure/share-tokens.repository';
import { authMiddleware } from '../../../shared/middlewares/auth.middleware';
import { ValidationError } from '../../../shared/errors/http.errors';
import { upload } from '../../../config/multer';
import { pool } from '../../../config/database';

function requireFolderIdQuery(req: Request, _res: Response, next: NextFunction): void {
  const result = z.uuid().safeParse(req.query['folderId']);
  if (!result.success) {
    next(new ValidationError('folderId query param is required and must be a valid UUID'));
    return;
  }
  next();
}

const repo = new FilesRepository(pool);
const storage = new StorageAdapter();
const foldersRepo = new FoldersRepository(pool);
const shareTokensRepo = new ShareTokensRepository(pool);
const service = new FilesService(repo, storage, foldersRepo, shareTokensRepo);
const ctrl = new FilesController(service);

const router = Router();

router.use(authMiddleware);

router.post('/upload', requireFolderIdQuery, upload.single('file'), (req, res, next) => ctrl.upload(req, res).catch(next));
router.get('/', (req, res, next) => ctrl.listByFolder(req, res).catch(next));
router.get('/shares', (req, res, next) => ctrl.listAllShares(req, res).catch(next));
router.delete('/share/:tokenId', (req, res, next) => ctrl.revokeShare(req, res).catch(next));
router.get('/:id/share', (req, res, next) => ctrl.listShares(req, res).catch(next));
router.post('/:id/share', (req, res, next) => ctrl.createShare(req, res).catch(next));
router.get('/:id/download', (req, res, next) => ctrl.download(req, res).catch(next));
router.get('/:id', (req, res, next) => ctrl.getById(req, res).catch(next));
router.patch('/:id', (req, res, next) => ctrl.rename(req, res).catch(next));
router.delete('/:id', (req, res, next) => ctrl.remove(req, res).catch(next));

export default router;
