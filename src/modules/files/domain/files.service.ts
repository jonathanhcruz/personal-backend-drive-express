import type { FileRecord, UploadFileDto, FileListFilter } from './files.types';

export class FilesService {
  async upload(_dto: UploadFileDto): Promise<FileRecord> {
    throw new Error('not implemented');
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
