import type { FilesRepository } from '../infrastructure/files.repository';
import type { StorageAdapter } from '../infrastructure/storage.adapter';
import type { FoldersRepository } from '../../folders/infrastructure/folders.repository';
import { NotFoundError, ForbiddenError, ConflictError } from '../../../shared/errors/http.errors';
import type { FileRecord, UploadFileDto } from './files.types';

export class FilesService {
  constructor(
    private readonly repo: FilesRepository,
    private readonly storage: StorageAdapter,
    private readonly foldersRepo: FoldersRepository,
  ) {}

  async upload(ownerId: string, dto: UploadFileDto): Promise<FileRecord> {
    const folder = await this.foldersRepo.findById(dto.folderId);
    if (!folder) {
      await this.storage.remove(dto.storagePath);
      throw new NotFoundError('Folder not found');
    }
    if (folder.ownerId !== ownerId) {
      await this.storage.remove(dto.storagePath);
      throw new ForbiddenError();
    }

    const existing = await this.repo.findByNameAndFolder(dto.name, dto.folderId, ownerId);
    if (existing) {
      await this.storage.remove(dto.storagePath);
      throw new ConflictError(`A file named "${dto.name}" already exists in this folder`);
    }

    try {
      const checksum = await this.storage.checksum(dto.storagePath);
      return await this.repo.create({
        name: dto.name,
        mimeType: dto.mimeType,
        size: dto.size,
        checksum,
        storagePath: dto.storagePath,
        folderId: dto.folderId,
        uploadedBy: ownerId,
        deletedAt: null,
      });
    } catch (err) {
      await this.storage.remove(dto.storagePath);
      throw err;
    }
  }

  async getById(id: string, ownerId: string): Promise<FileRecord> {
    const file = await this.repo.findById(id);
    if (!file) throw new NotFoundError('File not found');
    if (file.uploadedBy !== ownerId) throw new ForbiddenError();
    return file;
  }

  async listByFolder(folderId: string | null, ownerId: string): Promise<FileRecord[]> {
    if (folderId !== null) {
      const folder = await this.foldersRepo.findById(folderId);
      if (!folder) throw new NotFoundError('Folder not found');
      if (folder.ownerId !== ownerId) throw new ForbiddenError();
    }
    return this.repo.findByFolder(folderId, ownerId);
  }

  async remove(id: string, ownerId: string): Promise<void> {
    const file = await this.repo.findById(id);
    if (!file) throw new NotFoundError('File not found');
    if (file.uploadedBy !== ownerId) throw new ForbiddenError();
    await this.repo.hardDelete(id);
    await this.storage.remove(file.storagePath);
  }
}
