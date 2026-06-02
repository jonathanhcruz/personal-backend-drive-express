import type { AuthUser } from '../domain/auth.types';

export interface IAuthRepository {
  findByUsername(username: string): Promise<AuthUser | null>;
  saveRefreshToken(userId: string, token: string, expiresAt: Date): Promise<void>;
  revokeRefreshToken(token: string): Promise<void>;
  isRefreshTokenValid(token: string): Promise<boolean>;
}
