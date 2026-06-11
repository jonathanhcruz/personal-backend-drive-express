import type {
  Folder,
  FolderContents,
  BreadcrumbItem,
  CreateFolderDto,
  UpdateFolderDto,
} from '../domain/folders.types';

export class FoldersRepository {
  async findRootByOwner(_ownerId: string): Promise<Folder[]> {
    throw new Error('not implemented');
  }

  async findById(_id: string): Promise<Folder | null> {
    throw new Error('not implemented');
  }

  async findChildren(_parentId: string): Promise<Folder[]> {
    throw new Error('not implemented');
  }

  async getContents(_folderId: string): Promise<FolderContents> {
    throw new Error('not implemented');
  }

  async getBreadcrumb(_folderId: string): Promise<BreadcrumbItem[]> {
    throw new Error('not implemented');
  }

  async create(_ownerId: string, _dto: CreateFolderDto): Promise<Folder> {
    throw new Error('not implemented');
  }

  async rename(_id: string, _dto: UpdateFolderDto): Promise<Folder> {
    throw new Error('not implemented');
  }

  async remove(_id: string): Promise<void> {
    throw new Error('not implemented');
  }
}
