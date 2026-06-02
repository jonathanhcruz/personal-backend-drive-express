import type { Folder, CreateFolderDto, UpdateFolderDto } from './folders.types';

export class FoldersService {
  async listRoot(_userId: string): Promise<Folder[]> {
    throw new Error('not implemented');
  }

  async getContents(_id: string, _userId: string): Promise<Folder[]> {
    throw new Error('not implemented');
  }

  async create(_dto: CreateFolderDto): Promise<Folder> {
    throw new Error('not implemented');
  }

  async update(_id: string, _dto: UpdateFolderDto): Promise<Folder> {
    throw new Error('not implemented');
  }

  async remove(_id: string, _userId: string): Promise<void> {
    throw new Error('not implemented');
  }
}
