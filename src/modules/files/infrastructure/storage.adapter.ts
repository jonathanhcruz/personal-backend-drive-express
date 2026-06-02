export class StorageAdapter {
  async write(_path: string, _buffer: Buffer): Promise<void> {
    throw new Error('not implemented');
  }

  async read(_path: string): Promise<Buffer> {
    throw new Error('not implemented');
  }

  async remove(_path: string): Promise<void> {
    throw new Error('not implemented');
  }

  buildPath(_fileId: string, _filename: string): string {
    throw new Error('not implemented');
  }
}
