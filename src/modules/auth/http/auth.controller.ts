import type { Request, Response } from 'express';

export class AuthController {
  login(_req: Request, res: Response): void {
    res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'login not implemented' } });
  }

  refresh(_req: Request, res: Response): void {
    res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'refresh not implemented' } });
  }

  logout(_req: Request, res: Response): void {
    res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'logout not implemented' } });
  }
}
