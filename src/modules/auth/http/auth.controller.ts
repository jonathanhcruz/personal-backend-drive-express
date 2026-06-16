import { z } from 'zod';
import type { Request, Response } from 'express';
import type { AuthService } from '../domain/auth.service';
import { ValidationError, UnauthorizedError } from '../../../shared/errors/http.errors';

const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export class AuthController {
  constructor(private readonly service: AuthService) {}

  async login(req: Request, res: Response): Promise<void> {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid body');
    const tokens = await this.service.login(parsed.data);
    res.status(200).json({ data: tokens });
  }

  async refresh(req: Request, res: Response): Promise<void> {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('refreshToken is required');
    const tokens = await this.service.refresh(parsed.data.refreshToken);
    res.status(200).json({ data: tokens });
  }

  async logout(req: Request, res: Response): Promise<void> {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) throw new ValidationError('Invalid or missing refresh token');
    const revoked = await this.service.logout(parsed.data.refreshToken);
    if (!revoked) throw new UnauthorizedError('Invalid or missing refresh token');
    res.status(200).json({ data: { message: 'Session closed successfully' } });
  }
}
