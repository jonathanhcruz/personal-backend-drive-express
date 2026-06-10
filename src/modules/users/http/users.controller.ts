import { z } from 'zod';
import type { Request, Response } from 'express';
import type { UsersService } from '../domain/users.service';

const createSchema = z.object({
  email: z.email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'user']).optional(),
});

const updateSchema = z.object({
  email: z.email().optional(),
  role: z.enum(['admin', 'user']).optional(),
});

export class UsersController {
  constructor(private readonly service: UsersService) {}

  async findAll(_req: Request, res: Response): Promise<void> {
    const users = await this.service.findAll();
    res.status(200).json({ data: users });
  }

  async create(req: Request, res: Response): Promise<void> {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid body' } });
      return;
    }
    const user = await this.service.create(parsed.data);
    res.status(201).json({ data: user });
  }

  async update(req: Request, res: Response): Promise<void> {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Invalid body' } });
      return;
    }
    const user = await this.service.update(req.params['id'] as string, parsed.data);
    res.status(200).json({ data: user });
  }

  async deactivate(req: Request, res: Response): Promise<void> {
    await this.service.deactivate(req.params['id'] as string);
    res.status(204).send();
  }
}
