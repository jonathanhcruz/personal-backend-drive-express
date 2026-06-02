import type { AuditLog, CreateAuditLogDto } from '../domain/audit.types';

export interface IAuditRepository {
  create(dto: CreateAuditLogDto): Promise<AuditLog>;
  findByUser(userId: string): Promise<AuditLog[]>;
}
