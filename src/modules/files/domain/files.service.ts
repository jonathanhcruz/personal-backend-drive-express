import { randomUUID } from 'crypto';
import type { FileRecord, UploadFileDto, FileListFilter } from './files.types';
import type { StorageAdapter } from '../infrastructure/storage.adapter';

export class FilesService {
  constructor(private readonly storage: StorageAdapter) {}

  async upload(dto: UploadFileDto): Promise<FileRecord> {
    try {
      const checksum = await this.storage.checksum(dto.storagePath);
      return {
        id: randomUUID(),
        name: dto.name,
        mimeType: dto.mimeType,
        size: dto.size,
        checksum,
        storagePath: dto.storagePath,
        folderId: dto.folderId,
        uploadedBy: dto.uploadedBy,
        deletedAt: null,
        createdAt: new Date(),
      };
    } catch (err) {
      await this.storage.remove(dto.storagePath);
      throw err;
    }
  }

  async list(_filter: FileListFilter): Promise<FileRecord[]> {
    throw new Error('not implemented');
  }

  async download(_id: string, _requestedBy: string): Promise<Buffer> {
    throw new Error('not implemented');
  }

  async softDelete(_id: string, _requestedBy: string): Promise<void> {
    throw new Error('not implemented');
  }

  async hardDelete(_id: string): Promise<void> {
    throw new Error('not implemented');
  }
}
