export type AuditAction =
  | 'login'
  | 'logout'
  | 'upload'
  | 'download'
  | 'delete'
  | 'create_folder'
  | 'delete_folder'
  | 'share';

export interface AuditLog {
  id: string;
  userId: string;
  action: AuditAction;
  resourceId: string | null;
  ip: string;
  createdAt: Date;
}

export interface CreateAuditLogDto {
  userId: string;
  action: AuditAction;
  resourceId: string | null;
  ip: string;
}
