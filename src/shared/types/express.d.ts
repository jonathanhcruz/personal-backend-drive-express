import type { AuthUser } from '../../modules/auth/domain/auth.types';

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
