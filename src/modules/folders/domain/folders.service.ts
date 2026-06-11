import type { FoldersRepository } from '../infrastructure/folders.repository';
import type { StorageAdapter } from '../../files/infrastructure/storage.adapter';
import { NotFoundError, ForbiddenError, ConflictError } from '../../../shared/errors/http.errors';
import type {
  Folder,
  FolderContents,
  BreadcrumbItem,
  CreateFolderDto,
  UpdateFolderDto,
} from './folders.types';

export class FoldersService {
  constructor(
    private readonly repo: FoldersRepository,
    private readonly storage: StorageAdapter,
  ) {}

  async listRoot(ownerId: string): Promise<Folder[]> {
    return this.repo.findRootByOwner(ownerId);
  }

  async getContents(id: string, ownerId: string): Promise<FolderContents> {
    const folder = await this.repo.findById(id);
    if (!folder) throw new NotFoundError('Folder not found');
    if (folder.ownerId !== ownerId) throw new ForbiddenError();
    return this.repo.getContents(id);
  }

  async getBreadcrumb(id: string, ownerId: string): Promise<BreadcrumbItem[]> {
    const folder = await this.repo.findById(id);
    if (!folder) throw new NotFoundError('Folder not found');
    if (folder.ownerId !== ownerId) throw new ForbiddenError();
    return this.repo.getBreadcrumb(id);
  }

  async create(ownerId: string, dto: CreateFolderDto): Promise<Folder> {
    if (dto.parentId === null) {
      const roots = await this.repo.findRootByOwner(ownerId);
      if (roots.length > 0) throw new ConflictError('A root folder already exists for this user');
    } else {
      const parent = await this.repo.findById(dto.parentId);
      if (!parent) throw new NotFoundError('Parent folder not found');
      if (parent.ownerId !== ownerId) throw new ForbiddenError();
    }

    const existing = await this.repo.findByNameAndParent(dto.name, dto.parentId, ownerId);
    if (existing) throw new ConflictError(`A folder named "${dto.name}" already exists here`);

    const folder = await this.repo.create(ownerId, dto);
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
    return this.repo.rename(id, dto);
  }

  async remove(id: string, ownerId: string, recursive: boolean): Promise<void> {
    const folder = await this.repo.findById(id);
    if (!folder) throw new NotFoundError('Folder not found');
    if (folder.ownerId !== ownerId) throw new ForbiddenError();
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
