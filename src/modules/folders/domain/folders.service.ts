import type { FoldersRepository } from '../infrastructure/folders.repository';
import type { StorageAdapter } from '../../files/infrastructure/storage.adapter';
import { NotFoundError, ForbiddenError, ConflictError, ValidationError } from '../../../shared/errors/http.errors';
import type {
  Folder,
  FolderFile,
  FolderContents,
  BreadcrumbItem,
  ZipEntry,
  CreateFolderDto,
  UpdateFolderDto,
} from './folders.types';

function sanitizeSegment(segment: string): string {
  return segment.replace(/[/\\\0]/g, '_').replace(/^\.+$/, '_') || '_';
}

function sanitizeZipPath(zipPath: string): string {
  return zipPath.split('/').map(sanitizeSegment).join('/');
}

export class FoldersService {
  constructor(
    private readonly repo: FoldersRepository,
    private readonly storage: StorageAdapter,
  ) {}

  private async resolveParentId(parentId: string | null, ownerId: string): Promise<string> {
    if (parentId !== null) return parentId;
    const root = await this.repo.findRootFolder(ownerId);
    return root.id;
  }

  async getRootContents(ownerId: string): Promise<{ subfolders: Folder[]; files: FolderFile[] }> {
    const root = await this.repo.findRootFolder(ownerId);
    const { subfolders, files } = await this.repo.getContents(root.id);
    return { subfolders, files };
  }

  async getContents(id: string, ownerId: string): Promise<FolderContents> {
    const folder = await this.repo.findById(id);
    if (!folder) throw new NotFoundError('Folder not found');
    if (folder.ownerId !== ownerId) throw new ForbiddenError();
    if (!folder.parentId) throw new NotFoundError('Folder not found');
    return this.repo.getContents(id);
  }

  async getBreadcrumb(id: string, ownerId: string): Promise<BreadcrumbItem[]> {
    const folder = await this.repo.findById(id);
    if (!folder) throw new NotFoundError('Folder not found');
    if (folder.ownerId !== ownerId) throw new ForbiddenError();
    if (!folder.parentId) throw new NotFoundError('Folder not found');
    return this.repo.getBreadcrumb(id);
  }

  async create(ownerId: string, dto: CreateFolderDto): Promise<Folder> {
    const effectiveParentId = await this.resolveParentId(dto.parentId, ownerId);

    if (dto.parentId !== null) {
      const parent = await this.repo.findById(effectiveParentId);
      if (!parent) throw new NotFoundError('Parent folder not found');
      if (parent.ownerId !== ownerId) throw new ForbiddenError();
    }

    const existing = await this.repo.findByNameAndParent(dto.name, effectiveParentId, ownerId);
    if (existing) throw new ConflictError(`A folder named "${dto.name}" already exists here`);

    const folder = await this.repo.create(ownerId, { ...dto, parentId: effectiveParentId });
    try {
      await this.storage.createFolderDir(ownerId, folder.id);
    } catch (err) {
      await this.repo.remove(folder.id);
      throw err;
    }
    return folder;
  }

  async rename(id: string, ownerId: string, dto: UpdateFolderDto): Promise<Folder> {
    const folder = await this.repo.findById(id);
    if (!folder) throw new NotFoundError('Folder not found');
    if (folder.ownerId !== ownerId) throw new ForbiddenError();
    if (!folder.parentId) throw new NotFoundError('Folder not found');
    return this.repo.rename(id, dto);
  }

  async move(id: string, ownerId: string, targetParentId: string | null): Promise<Folder> {
    const folder = await this.repo.findById(id);
    if (!folder) throw new NotFoundError('Folder not found');
    if (folder.ownerId !== ownerId) throw new ForbiddenError();
    if (!folder.parentId) throw new NotFoundError('Folder not found');

    const effectiveTarget = await this.resolveParentId(targetParentId, ownerId);

    if (folder.parentId === effectiveTarget) return folder;

    const target = await this.repo.findById(effectiveTarget);
    if (!target) throw new NotFoundError('Target folder not found');
    if (target.ownerId !== ownerId) throw new ForbiddenError();

    const descendants = await this.repo.findAllDescendantIds(id);
    if (descendants.includes(effectiveTarget)) {
      throw new ValidationError('Cannot move a folder into one of its own descendants');
    }

    const existing = await this.repo.findByNameAndParent(folder.name, effectiveTarget, ownerId);
    if (existing) throw new ConflictError(`A folder named "${folder.name}" already exists in the target location`);
    return this.repo.move(id, effectiveTarget);
  }

  async downloadAsZip(folderId: string, ownerId: string): Promise<{ folderName: string; entries: ZipEntry[] }> {
    const folder = await this.repo.findById(folderId);
    if (!folder) throw new NotFoundError('Folder not found');
    if (folder.ownerId !== ownerId) throw new ForbiddenError();
    if (!folder.parentId) throw new NotFoundError('Folder not found');
    const raw = await this.repo.getSubtreeFiles(folderId, ownerId);
    const entries = raw.map((e) => ({ ...e, zipPath: sanitizeZipPath(e.zipPath) }));
    return { folderName: folder.name, entries };
  }

  async remove(id: string, ownerId: string, recursive: boolean): Promise<void> {
    const folder = await this.repo.findById(id);
    if (!folder) throw new NotFoundError('Folder not found');
    if (folder.ownerId !== ownerId) throw new ForbiddenError();
    if (!folder.parentId) throw new NotFoundError('Folder not found');
    if (!recursive) {
      const children = await this.repo.findChildren(id);
      if (children.length > 0) {
        throw new ConflictError('Folder is not empty. Use ?recursive=true to delete all contents.');
      }
    }

    const descendantIds = await this.repo.findAllDescendantIds(id);
    await this.repo.remove(id);
    await Promise.all(descendantIds.map((fid) => this.storage.removeFolderDir(ownerId, fid)));
  }
}
