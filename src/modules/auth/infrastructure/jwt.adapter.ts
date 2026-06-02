import type { AuthUser } from '../domain/auth.types';

export class JwtAdapter {
  signAccessToken(_payload: AuthUser): string {
    throw new Error('not implemented');
  }

  signRefreshToken(_userId: string): string {
    throw new Error('not implemented');
  }

  verifyAccessToken(_token: string): AuthUser {
    throw new Error('not implemented');
  }
}
