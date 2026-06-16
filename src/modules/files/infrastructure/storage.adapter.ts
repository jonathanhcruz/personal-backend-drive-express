import { createReadStream } from 'fs';
import { mkdir, unlink } from 'fs/promises';
import { createHash } from 'crypto';
import path from 'path';
import { env } from '../../../config/env';

export class StorageAdapter {
  checksum(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const hash = createHash('sha256');
      const stream = createReadStream(filePath);
      stream.on('data', (chunk) => hash.update(chunk));
      stream.on('end', () => resolve(hash.digest('hex')));
      stream.on('error', reject);
    });
  }

  async remove(filePath: string): Promise<void> {
    await unlink(filePath).catch(() => undefined);
  }

  stream(filePath: string, options?: { start?: number; end?: number }) {
    return createReadStream(filePath, options);
  }

  async ensureUserDir(userId: string): Promise<void> {
    await mkdir(path.join(env.storagePath, userId), { recursive: true });
  }

  async createFolderDir(ownerId: string, folderId: string): Promise<void> {
    await mkdir(path.join(env.storagePath, ownerId, folderId), { recursive: true });
  }

  async removeFolderDir(ownerId: string, folderId: string): Promise<void> {
    const { rm } = await import('fs/promises');
    await rm(path.join(env.storagePath, ownerId, folderId), { recursive: true, force: true });
  }
}
