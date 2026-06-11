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

  async read(_filePath: string): Promise<Buffer> {
    throw new Error('not implemented');
  }

  async ensureUserDir(userId: string): Promise<void> {
    await mkdir(path.join(env.storagePath, userId), { recursive: true });
  }
}
