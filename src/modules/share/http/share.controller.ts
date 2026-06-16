/// <reference path="../../../shared/types/express.d.ts" />
import type { Request, Response } from 'express';
import { z } from 'zod';
import type { FilesService } from '../../files/domain/files.service';
import { ValidationError } from '../../../shared/errors/http.errors';

const uuidSchema = z.uuid();

export class ShareController {
  constructor(private readonly filesService: FilesService) {}

  async downloadPublic(req: Request, res: Response): Promise<void> {
    const result = uuidSchema.safeParse(req.params['token']);
    if (!result.success) throw new ValidationError('Invalid token');

    const file = await this.filesService.redeemToken(result.data);

    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`);

    const rangeHeader = req.headers['range'];

    if (rangeHeader) {
      const match = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
      if (!match) {
        res.status(416).setHeader('Content-Range', `bytes */${file.size}`).end();
        return;
      }
      const start = parseInt(match[1]!, 10);
      const end = match[2] ? parseInt(match[2], 10) : file.size - 1;

      if (start > end || end >= file.size) {
        res.status(416).setHeader('Content-Range', `bytes */${file.size}`).end();
        return;
      }

      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${file.size}`);
      res.setHeader('Content-Length', end - start + 1);
      const partial = this.filesService.stream(file.storagePath, { start, end });
      partial.on('error', () => { if (!res.headersSent) res.status(500).end(); });
      partial.pipe(res);
    } else {
      res.setHeader('Content-Length', file.size);
      const full = this.filesService.stream(file.storagePath);
      full.on('error', () => { if (!res.headersSent) res.status(500).end(); });
      full.pipe(res);
    }
  }
}
