import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'not implemented' } });
});

export default router;
