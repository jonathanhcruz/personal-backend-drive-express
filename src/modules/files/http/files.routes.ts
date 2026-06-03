import { Router } from 'express';
import { FilesController } from './files.controller';
import { FilesService } from '../domain/files.service';
import { StorageAdapter } from '../infrastructure/storage.adapter';
import { upload } from '../../../config/multer';

const storage = new StorageAdapter();
const service = new FilesService(storage);
const ctrl = new FilesController(service);

const router = Router();

router.post('/upload', upload.single('file'), (req, res) => ctrl.upload(req, res));
router.get('/', (req, res) => ctrl.list(req, res));
router.get('/:id/download', (req, res) => ctrl.download(req, res));
router.delete('/:id', (req, res) => ctrl.softDelete(req, res));
router.delete('/:id/hard', (req, res) => ctrl.hardDelete(req, res));

export default router;
