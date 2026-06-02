import { Router } from 'express';
import { FoldersController } from './folders.controller';

const router = Router();
const ctrl = new FoldersController();

router.get('/', (req, res) => ctrl.listRoot(req, res));
router.get('/:id', (req, res) => ctrl.getContents(req, res));
router.post('/', (req, res) => ctrl.create(req, res));
router.patch('/:id', (req, res) => ctrl.update(req, res));
router.delete('/:id', (req, res) => ctrl.remove(req, res));

export default router;
