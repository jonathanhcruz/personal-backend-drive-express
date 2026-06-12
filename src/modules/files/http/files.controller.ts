/// <reference path="../../../shared/types/express.d.ts" />
import type { Request, Response } from 'express';
import { z } from 'zod';
import type { FilesService } from '../domain/files.service';
import type { FileRecord, FilePublicDto } from '../domain/files.types';
import { ValidationError } from '../../../shared/errors/http.errors';

const uuidSchema = z.uuid();

function parseUuid(value: unknown): string {
  const result = uuidSchema.safeParse(value);
  if (!result.success) throw new ValidationError('Invalid file ID');
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

  async remove(req: Request, res: Response): Promise<void> {
    const id = parseUuid(req.params['id']);
    await this.service.remove(id, req.user!.id);
    res.status(204).send();
  }
}
