import type { Folder, CreateFolderDto, UpdateFolderDto } from '../domain/folders.types';

export interface IFoldersRepository {
  findRootByUser(userId: string): Promise<Folder[]>;
  findById(id: string): Promise<Folder | null>;
  findChildren(parentId: string): Promise<Folder[]>;
  create(dto: CreateFolderDto): Promise<Folder>;
  update(id: string, dto: UpdateFolderDto): Promise<Folder>;
  remove(id: string): Promise<void>;
}
