import type { Request, Response } from 'express';

export class UsersController {
  findAll(_req: Request, res: Response): void {
    res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'not implemented' } });
  }

  create(_req: Request, res: Response): void {
    res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'not implemented' } });
  }

  update(_req: Request, res: Response): void {
    res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'not implemented' } });
  }

  deactivate(_req: Request, res: Response): void {
    res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'not implemented' } });
  }
}
