import type { Request, Response, NextFunction } from 'express';

// TODO Phase 4: verify JWT and attach req.user
export function authMiddleware(_req: Request, _res: Response, next: NextFunction): void {
  next();
}
