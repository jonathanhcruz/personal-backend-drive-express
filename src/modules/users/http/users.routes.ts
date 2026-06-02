import { Router } from 'express';
import { UsersController } from './users.controller';

const router = Router();
const ctrl = new UsersController();

router.get('/', (req, res) => ctrl.findAll(req, res));
router.post('/', (req, res) => ctrl.create(req, res));
router.patch('/:id', (req, res) => ctrl.update(req, res));
router.delete('/:id', (req, res) => ctrl.deactivate(req, res));

export default router;
