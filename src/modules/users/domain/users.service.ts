import { ConflictError, NotFoundError } from '../../../shared/errors/http.errors';
import type { User, CreateUserDto, UpdateUserDto } from './users.types';
import type { UsersRepository } from '../infrastructure/users.repository';

export class UsersService {
  constructor(private readonly repo: UsersRepository) {}

  async findAll(): Promise<User[]> {
    return this.repo.findAll();
  }

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.repo.findByEmail(dto.email);
    if (existing) throw new ConflictError(`Email ${dto.email} already registered`);
    return this.repo.create(dto);
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.repo.findById(id);
    if (!user) throw new NotFoundError('User not found');
    return this.repo.update(id, dto);
  }

  async deactivate(id: string): Promise<void> {
    const user = await this.repo.findById(id);
    if (!user) throw new NotFoundError('User not found');
    await this.repo.deactivate(id);
  }
}
