/// <reference path="../../../shared/types/express.d.ts" />
import type { Request, Response } from 'express';
import { z } from 'zod';
import archiver from 'archiver';
import type { FoldersService } from '../domain/folders.service';
import type { Folder, FolderContents, FolderPublicDto } from '../domain/folders.types';
import { ValidationError } from '../../../shared/errors/http.errors';

function toPublic(folder: Folder): FolderPublicDto {
  const { ownerId: _omit, ...rest } = folder;
  return rest;
}

function contentsToPublic(contents: FolderContents) {
  return {
    folder: toPublic(contents.folder),
    subfolders: contents.subfolders.map(toPublic),
    files: contents.files,
  };
}

const uuidSchema = z.uuid();

const createSchema = z.object({
  name: z.string().min(1).max(255),
  parentId: z.uuid().nullable().default(null),
});

const renameSchema = z.object({
  name: z.string().min(1).max(255),
});

function parseUuid(value: unknown): string {
  const result = uuidSchema.safeParse(value);
  if (!result.success) throw new ValidationError('Invalid folder ID');
  return result.data;
}

export class FoldersController {
  constructor(private readonly service: FoldersService) {}

  async listRoot(req: Request, res: Response): Promise<void> {
    const folders = await this.service.listRoot(req.user!.id);
    res.json({ data: folders.map(toPublic) });
  }

  async getContents(req: Request, res: Response): Promise<void> {
    const id = parseUuid(req.params['id']);
    const contents = await this.service.getContents(id, req.user!.id);
    res.json({ data: contentsToPublic(contents) });
  }

  async breadcrumb(req: Request, res: Response): Promise<void> {
    const id = parseUuid(req.params['id']);
    const items = await this.service.getBreadcrumb(id, req.user!.id);
    res.json({ data: items });
  }

  async create(req: Request, res: Response): Promise<void> {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? 'Validation error');
    const folder = await this.service.create(req.user!.id, parsed.data);
    res.status(201).json({ data: toPublic(folder) });
  }

  async rename(req: Request, res: Response): Promise<void> {
    const id = parseUuid(req.params['id']);
    const parsed = renameSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? 'Validation error');
    const folder = await this.service.rename(id, req.user!.id, parsed.data);
    res.json({ data: toPublic(folder) });
  }

  async move(req: Request, res: Response): Promise<void> {
    const id = parseUuid(req.params['id']);
    const parsed = z.object({ targetParentId: z.uuid().nullable() }).safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? 'Validation error');
    const folder = await this.service.move(id, req.user!.id, parsed.data.targetParentId);
    res.json({ data: toPublic(folder) });
  }

  async downloadAsZip(req: Request, res: Response): Promise<void> {
    const id = parseUuid(req.params['id']);
    const userId = req.user!.id;

    const { folderName, entries } = await this.service.downloadAsZip(id, userId);

    const safeName = encodeURIComponent(folderName);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${safeName}.zip`);

    const archive = archiver('zip', { zlib: { level: 6 } });

    archive.on('error', (err: Error) => {
      console.error('[zip-stream]', err);
      archive.abort();
      if (!res.headersSent) {
        res.status(500).json({ error: { code: 'STREAM_ERROR' } });
      } else {
        res.destroy();
      }
    });

    req.on('close', () => archive.abort());

    archive.pipe(res);

    for (const entry of entries) {
      archive.file(entry.storagePath, { name: entry.zipPath });
    }

    await archive.finalize();
  }

  async remove(req: Request, res: Response): Promise<void> {
    const id = parseUuid(req.params['id']);
    const recursive = req.query['recursive'] === 'true';
    await this.service.remove(id, req.user!.id, recursive);
    res.status(204).send();
  }
}
