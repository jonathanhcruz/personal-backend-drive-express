import type { Request, Response } from 'express';
import type { FilesService } from '../domain/files.service';

export class FilesController {
  constructor(private readonly service: FilesService) {}

  async upload(req: Request, res: Response): Promise<void> {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: { code: 'NO_FILE', message: 'No file attached' } });
      return;
    }

    const folderId = typeof req.body?.folderId === 'string' ? req.body.folderId : null;

    const record = await this.service.upload({
      name: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      storagePath: file.path,
      folderId,
      uploadedBy: 'anonymous',
    });

    res.status(201).json({ data: record });
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
