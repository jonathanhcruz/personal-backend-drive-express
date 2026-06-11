import type { Request, Response } from 'express';
import type { FoldersService } from '../domain/folders.service';

export class FoldersController {
  constructor(private readonly service: FoldersService) {}

  async listRoot(_req: Request, res: Response): Promise<void> {
    void this.service;
    res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'not implemented' } });
  }

  async getContents(_req: Request, res: Response): Promise<void> {
    res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'not implemented' } });
  }

  async breadcrumb(_req: Request, res: Response): Promise<void> {
    res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'not implemented' } });
  }

  async create(_req: Request, res: Response): Promise<void> {
    res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'not implemented' } });
  }

  async rename(_req: Request, res: Response): Promise<void> {
    res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'not implemented' } });
  }

  async remove(_req: Request, res: Response): Promise<void> {
    res.status(501).json({ error: { code: 'NOT_IMPLEMENTED', message: 'not implemented' } });
  }
}
