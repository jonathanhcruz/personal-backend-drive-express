export interface FileRecord {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  checksum: string;
  storagePath: string;
  folderId: string | null;
  uploadedBy: string;
  deletedAt: Date | null;
  createdAt: Date;
}

export interface UploadFileDto {
  name: string;
  mimeType: string;
  size: number;
  storagePath: string;
  folderId: string | null;
  uploadedBy: string;
}

export interface FileListFilter {
  folderId?: string | null;
  uploadedBy?: string;
  includeDeleted?: boolean;
}
