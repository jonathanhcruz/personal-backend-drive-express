import type { Request, Response, NextFunction } from 'express';

// TODO Phase 2: replace with express-rate-limit (10 req / 15 min on /api/auth/login)
export function rateLimitMiddleware(_req: Request, _res: Response, next: NextFunction): void {
  next();
}
