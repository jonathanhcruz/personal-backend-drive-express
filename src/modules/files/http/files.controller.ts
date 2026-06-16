/// <reference path="../../../shared/types/express.d.ts" />
import type { Request, Response } from 'express';
import { z } from 'zod';
import type { FilesService } from '../domain/files.service';
import type { FileRecord, FilePublicDto } from '../domain/files.types';
import { ValidationError } from '../../../shared/errors/http.errors';
import { ErrorCode } from '../../../shared/constants/error-codes';

const uuidSchema = z.uuid();

function parseUuid(value: unknown, label = 'ID'): string {
  const result = uuidSchema.safeParse(value);
  if (!result.success) throw new ValidationError(`Invalid ${label}`);
  return result.data;
}

function toPublic(file: FileRecord): FilePublicDto {
  const { storagePath: _omit, ...rest } = file;
  return rest;
}

export class FilesController {
  constructor(private readonly service: FilesService) {}

  async upload(req: Request, res: Response): Promise<void> {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: { code: 'NO_FILE', message: 'No file attached' } });
      return;
    }

    const record = await this.service.upload(req.user!.id, {
      name: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      storagePath: file.path,
      folderId: req.query['folderId'] as string,
    });

    res.status(201).json({ data: toPublic(record) });
  }

  async getById(req: Request, res: Response): Promise<void> {
    const id = parseUuid(req.params['id']);
    const file = await this.service.getById(id, req.user!.id);
    res.json({ data: toPublic(file) });
  }

  async listByFolder(req: Request, res: Response): Promise<void> {
    const folderId = req.query['folderId'];
    const resolvedFolderId = typeof folderId === 'string' ? folderId : null;
    const files = await this.service.listByFolder(resolvedFolderId, req.user!.id);
    res.json({ data: files.map(toPublic) });
  }

  async download(req: Request, res: Response): Promise<void> {
    const id = parseUuid(req.params['id']);
    const file = await this.service.getById(id, req.user!.id);

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
      const partial = this.service.stream(file.storagePath, { start, end });
      partial.on('error', () => {
        if (!res.headersSent) res.status(500).json({ error: { code: ErrorCode.STREAM_ERROR, message: 'Failed to read file' } });
      });
      partial.pipe(res);
    } else {
      res.setHeader('Content-Length', file.size);
      const full = this.service.stream(file.storagePath);
      full.on('error', () => {
        if (!res.headersSent) res.status(500).json({ error: { code: ErrorCode.STREAM_ERROR, message: 'Failed to read file' } });
      });
      full.pipe(res);
    }
  }

  async listShares(req: Request, res: Response): Promise<void> {
    const id = parseUuid(req.params['id']);
    const tokens = await this.service.listShareTokens(id, req.user!.id);
    res.json({ data: tokens.map((t) => ({ id: t.id, expiresAt: t.expiresAt, createdAt: t.createdAt })) });
  }

  async revokeShare(req: Request, res: Response): Promise<void> {
    const tokenId = parseUuid(req.params['tokenId'], 'token ID');
    await this.service.revokeShareToken(tokenId, req.user!.id);
    res.status(204).send();
  }

  async createShare(req: Request, res: Response): Promise<void> {
    const id = parseUuid(req.params['id']);
    const token = await this.service.createShareToken(id, req.user!.id);
    res.status(201).json({
      data: {
        token: token.id,
        expiresAt: token.expiresAt,
      },
    });
  }

  async remove(req: Request, res: Response): Promise<void> {
    const id = parseUuid(req.params['id']);
    await this.service.remove(id, req.user!.id);
    res.status(204).send();
  }
}
