import type { FilesRepository } from '../infrastructure/files.repository';
import type { StorageAdapter } from '../infrastructure/storage.adapter';
import type { FoldersRepository } from '../../folders/infrastructure/folders.repository';
import type { ShareTokensRepository } from '../infrastructure/share-tokens.repository';
import { NotFoundError, ForbiddenError, ConflictError } from '../../../shared/errors/http.errors';
import { ErrorCode } from '../../../shared/constants/error-codes';
import type { FileRecord, UploadFileDto } from './files.types';
import type { ShareToken, ShareTokenWithFile } from './share-token.types';

export class FilesService {
  constructor(
    private readonly repo: FilesRepository,
    private readonly storage: StorageAdapter,
    private readonly foldersRepo: FoldersRepository,
    private readonly shareTokensRepo: ShareTokensRepository,
  ) {}

  private async resolveRootFolderId(ownerId: string): Promise<string> {
    const root = await this.foldersRepo.findRootFolder(ownerId);
    return root.id;
  }

  async upload(ownerId: string, dto: UploadFileDto): Promise<FileRecord> {
    const effectiveFolderId = dto.folderId ?? await this.resolveRootFolderId(ownerId);

    if (dto.folderId !== null) {
      const folder = await this.foldersRepo.findById(effectiveFolderId);
      if (!folder) {
        await this.storage.remove(dto.storagePath);
        throw new NotFoundError('Folder not found', ErrorCode.FOLDER_NOT_FOUND);
      }
      if (folder.ownerId !== ownerId) {
        await this.storage.remove(dto.storagePath);
        throw new ForbiddenError();
      }
    }

    const existing = await this.repo.findByNameAndFolder(dto.name, effectiveFolderId, ownerId);
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
        folderId: effectiveFolderId,
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
    if (!file) throw new NotFoundError('File not found', ErrorCode.FILE_NOT_FOUND);
    if (file.uploadedBy !== ownerId) throw new ForbiddenError();
    return file;
  }

  async listByFolder(folderId: string | null, ownerId: string): Promise<FileRecord[]> {
    const effectiveFolderId = folderId ?? await this.resolveRootFolderId(ownerId);

    if (folderId !== null) {
      const folder = await this.foldersRepo.findById(effectiveFolderId);
      if (!folder) throw new NotFoundError('Folder not found', ErrorCode.FOLDER_NOT_FOUND);
      if (folder.ownerId !== ownerId) throw new ForbiddenError();
    }

    return this.repo.findByFolder(effectiveFolderId, ownerId);
  }

  stream(filePath: string, options?: { start?: number; end?: number }) {
    return this.storage.stream(filePath, options);
  }

  async rename(id: string, ownerId: string, name: string): Promise<FileRecord> {
    const file = await this.repo.findById(id);
    if (!file) throw new NotFoundError('File not found', ErrorCode.FILE_NOT_FOUND);
    if (file.uploadedBy !== ownerId) throw new ForbiddenError();
    const effectiveFolderId = file.folderId ?? await this.resolveRootFolderId(ownerId);
    const existing = await this.repo.findByNameAndFolder(name, effectiveFolderId, ownerId);
    if (existing) throw new ConflictError(`A file named "${name}" already exists in this folder`);
    return this.repo.rename(id, name);
  }

  async move(id: string, ownerId: string, targetFolderId: string | null): Promise<FileRecord> {
    const file = await this.repo.findById(id);
    if (!file) throw new NotFoundError('File not found', ErrorCode.FILE_NOT_FOUND);
    if (file.uploadedBy !== ownerId) throw new ForbiddenError();

    const effectiveTarget = targetFolderId ?? await this.resolveRootFolderId(ownerId);

    if (file.folderId === effectiveTarget) return file;

    const targetFolder = await this.foldersRepo.findById(effectiveTarget);
    if (!targetFolder) throw new NotFoundError('Target folder not found', ErrorCode.FOLDER_NOT_FOUND);
    if (targetFolder.ownerId !== ownerId) throw new ForbiddenError();

    const existing = await this.repo.findByNameAndFolder(file.name, effectiveTarget, ownerId);
    if (existing) throw new ConflictError(`A file named "${file.name}" already exists in the target folder`);
    return this.repo.move(id, effectiveTarget);
  }

  async createShareToken(fileId: string, ownerId: string): Promise<ShareToken> {
    const file = await this.repo.findById(fileId);
    if (!file) throw new NotFoundError('File not found');
    if (file.uploadedBy !== ownerId) throw new ForbiddenError();
    const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);
    return this.shareTokensRepo.create(fileId, ownerId, expiresAt);
  }

  async listAllShareTokens(ownerId: string): Promise<ShareTokenWithFile[]> {
    return this.shareTokensRepo.findActiveByOwner(ownerId);
  }

  async listShareTokens(fileId: string, ownerId: string): Promise<ShareToken[]> {
    const file = await this.repo.findById(fileId);
    if (!file) throw new NotFoundError('File not found', ErrorCode.FILE_NOT_FOUND);
    if (file.uploadedBy !== ownerId) throw new ForbiddenError();
    return this.shareTokensRepo.findActiveByFileId(fileId);
  }

  async revokeShareToken(tokenId: string, ownerId: string): Promise<void> {
    const token = await this.shareTokensRepo.findById(tokenId);
    if (!token) throw new NotFoundError('Token not found', ErrorCode.SHARE_TOKEN_NOT_FOUND);
    const file = await this.repo.findById(token.fileId);
    if (!file || file.uploadedBy !== ownerId) throw new ForbiddenError();
    await this.shareTokensRepo.delete(tokenId);
  }

  async redeemToken(tokenId: string): Promise<FileRecord> {
    const token = await this.shareTokensRepo.findById(tokenId);
    if (!token) throw new NotFoundError('Token not found', ErrorCode.SHARE_TOKEN_NOT_FOUND);
    if (token.usedAt !== null) throw new ForbiddenError('Token already used', ErrorCode.SHARE_TOKEN_USED);
    if (token.expiresAt < new Date()) throw new ForbiddenError('Token expired', ErrorCode.SHARE_TOKEN_EXPIRED);
    await this.shareTokensRepo.markUsed(tokenId);
    const file = await this.repo.findById(token.fileId);
    if (!file) throw new NotFoundError('File not found', ErrorCode.FILE_NOT_FOUND);
    return file;
  }

  async remove(id: string, ownerId: string): Promise<void> {
    const file = await this.repo.findById(id);
    if (!file) throw new NotFoundError('File not found', ErrorCode.FILE_NOT_FOUND);
    if (file.uploadedBy !== ownerId) throw new ForbiddenError();
    await this.repo.hardDelete(id);
    await this.storage.remove(file.storagePath);
  }
}
