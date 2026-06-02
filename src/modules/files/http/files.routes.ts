import { Router } from 'express';
import { FilesController } from './files.controller';

const router = Router();
const ctrl = new FilesController();

router.post('/upload', (req, res) => ctrl.upload(req, res));
router.get('/', (req, res) => ctrl.list(req, res));
router.get('/:id/download', (req, res) => ctrl.download(req, res));
router.delete('/:id', (req, res) => ctrl.softDelete(req, res));
router.delete('/:id/hard', (req, res) => ctrl.hardDelete(req, res));

export default router;
