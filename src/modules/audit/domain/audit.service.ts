import type { AuditLog, CreateAuditLogDto } from './audit.types';

export class AuditService {
  async log(_dto: CreateAuditLogDto): Promise<void> {
    throw new Error('not implemented');
  }

  async findByUser(_userId: string): Promise<AuditLog[]> {
    throw new Error('not implemented');
  }
}
