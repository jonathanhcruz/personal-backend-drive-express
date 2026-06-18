import jwt from 'jsonwebtoken';
import { env } from '../../../config/env';
import type { AuthUser } from '../domain/auth.types';

export class JwtAdapter {
  signAccessToken(payload: AuthUser): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return jwt.sign(payload as object, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as any);
  }

  signRefreshToken(userId: string): string {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return jwt.sign({ sub: userId }, env.refreshTokenSecret, { expiresIn: env.refreshExpiresIn } as any);
  }

  verifyAccessToken(token: string): AuthUser {
    return jwt.verify(token, env.jwtSecret) as AuthUser;
  }

  verifyRefreshToken(token: string): { sub: string } {
    return jwt.verify(token, env.refreshTokenSecret) as { sub: string };
  }
}
