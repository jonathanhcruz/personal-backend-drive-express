import { createReadStream } from 'fs';
import { unlink } from 'fs/promises';
import { createHash } from 'crypto';

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
}
