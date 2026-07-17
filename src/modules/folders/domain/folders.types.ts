export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  ownerId: string;
  hasChildren: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FolderFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  createdAt: Date;
}

export interface FolderContents {
  folder: Folder;
  subfolders: Folder[];
  files: FolderFile[];
}

export interface BreadcrumbItem {
  id: string;
  name: string;
}

export type FolderPublicDto = Omit<Folder, 'ownerId'>;

export interface ZipEntry {
  id: string;
  fileName: string;
  storagePath: string;
  zipPath: string;
}

export interface CreateFolderDto {
  name: string;
  parentId: string | null;
}

export interface UpdateFolderDto {
  name: string;
}
