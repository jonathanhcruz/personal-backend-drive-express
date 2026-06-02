export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  createdBy: string;
  createdAt: Date;
}

export interface CreateFolderDto {
  name: string;
  parentId: string | null;
  createdBy: string;
}

export interface UpdateFolderDto {
  name: string;
}
