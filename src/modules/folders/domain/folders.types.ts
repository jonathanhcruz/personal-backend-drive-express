export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  ownerId: string;
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

export interface CreateFolderDto {
  name: string;
  parentId: string | null;
}

export interface UpdateFolderDto {
  name: string;
}
