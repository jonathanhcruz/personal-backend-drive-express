import { z } from 'zod';
import type { Request, Response } from 'express';
import type { AuthService } from '../domain/auth.service';
import { ValidationError } from '../../../shared/errors/http.errors';
import { env } from '../../../config/env';

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: 'strict' as const,
  path: '/api/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export class AuthController {
  constructor(private readonly service: AuthService) {}

  private getRefreshToken(req: Request): string | null {
    return (req.cookies?.refreshToken as string | undefined) ?? req.body?.refreshToken ?? null;
  }

  async login(req: Request, res: Response): Promise<void> {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid body');

    const tokens = await this.service.login(parsed.data);

    res.cookie('refreshToken', tokens.refreshToken, REFRESH_COOKIE_OPTIONS);
    res.status(200).json({ data: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken } });
  }

  async refresh(req: Request, res: Response): Promise<void> {
    const token = this.getRefreshToken(req);
    if (!token) throw new ValidationError('refreshToken is required');

    const tokens = await this.service.refresh(token);

    res.cookie('refreshToken', tokens.refreshToken, REFRESH_COOKIE_OPTIONS);
    res.status(200).json({ data: { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken } });
  }

  async logout(req: Request, res: Response): Promise<void> {
    const token = this.getRefreshToken(req);
    if (!token) throw new ValidationError('refreshToken is required');

    await this.service.logout(token);

    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.status(200).json({ data: { message: 'Session closed successfully' } });
  }
}
