import type { FileRecord, FileListFilter } from '../domain/files.types';

export interface IFilesRepository {
  findAll(filter: FileListFilter): Promise<FileRecord[]>;
  findById(id: string): Promise<FileRecord | null>;
  create(record: Omit<FileRecord, 'id' | 'createdAt'>): Promise<FileRecord>;
  softDelete(id: string): Promise<void>;
  hardDelete(id: string): Promise<void>;
}
