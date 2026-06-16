import { Router } from 'express';
import { ShareController } from './share.controller';
import { FilesService } from '../../files/domain/files.service';
import { FilesRepository } from '../../files/infrastructure/files.repository';
import { FoldersRepository } from '../../folders/infrastructure/folders.repository';
import { StorageAdapter } from '../../files/infrastructure/storage.adapter';
import { ShareTokensRepository } from '../../files/infrastructure/share-tokens.repository';
import { pool } from '../../../config/database';

const repo = new FilesRepository(pool);
const storage = new StorageAdapter();
const foldersRepo = new FoldersRepository(pool);
const shareTokensRepo = new ShareTokensRepository(pool);
const service = new FilesService(repo, storage, foldersRepo, shareTokensRepo);
const ctrl = new ShareController(service);

const router = Router();

router.get('/:token', (req, res, next) => ctrl.downloadPublic(req, res).catch(next));

export default router;
