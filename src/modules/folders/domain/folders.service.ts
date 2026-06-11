import type { FoldersRepository } from '../infrastructure/folders.repository';
import type {
  Folder,
  FolderContents,
  BreadcrumbItem,
  CreateFolderDto,
  UpdateFolderDto,
} from './folders.types';

export class FoldersService {
  constructor(private readonly repo: FoldersRepository) {}

  async listRoot(_ownerId: string): Promise<Folder[]> {
    void this.repo;
    throw new Error('not implemented');
  }

  async getContents(_id: string, _ownerId: string): Promise<FolderContents> {
    throw new Error('not implemented');
  }

  async getBreadcrumb(_id: string, _ownerId: string): Promise<BreadcrumbItem[]> {
    throw new Error('not implemented');
  }

  async create(_ownerId: string, _dto: CreateFolderDto): Promise<Folder> {
    throw new Error('not implemented');
  }

  async rename(_id: string, _ownerId: string, _dto: UpdateFolderDto): Promise<Folder> {
    throw new Error('not implemented');
  }

  async remove(_id: string, _ownerId: string, _recursive: boolean): Promise<void> {
    throw new Error('not implemented');
  }
}
