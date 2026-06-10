import { z } from 'zod';
import type { Request, Response } from 'express';
import type { AuthService } from '../domain/auth.service';

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
    if (!parsed.success) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid body' } });
      return;
    }
    const tokens = await this.service.login(parsed.data);
    res.status(200).json({ data: tokens });
  }

  async refresh(req: Request, res: Response): Promise<void> {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'refreshToken is required' } });
      return;
    }
    const tokens = await this.service.refresh(parsed.data.refreshToken);
    res.status(200).json({ data: tokens });
  }

  async logout(req: Request, res: Response): Promise<void> {
    const parsed = refreshSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid or missing refresh token' } });
      return;
    }
    const revoked = await this.service.logout(parsed.data.refreshToken);
    if (!revoked) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid or missing refresh token' } });
      return;
    }
    res.status(200).json({ data: { message: 'Session closed successfully' } });
  }
}
