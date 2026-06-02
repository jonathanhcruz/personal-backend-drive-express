import type { Request, Response } from 'express';

export class FilesController {
  upload(_req: Request, res: Response): void {
    res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'not implemented' } });
  }

  list(_req: Request, res: Response): void {
    res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'not implemented' } });
  }

  download(_req: Request, res: Response): void {
    res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'not implemented' } });
  }

  softDelete(_req: Request, res: Response): void {
    res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'not implemented' } });
  }

  hardDelete(_req: Request, res: Response): void {
    res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'not implemented' } });
  }
}
