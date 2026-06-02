import type { User, CreateUserDto, UpdateUserDto } from './users.types';

export class UsersService {
  async findAll(): Promise<User[]> {
    throw new Error('not implemented');
  }

  async create(_dto: CreateUserDto): Promise<User> {
    throw new Error('not implemented');
  }

  async update(_id: string, _dto: UpdateUserDto): Promise<User> {
    throw new Error('not implemented');
  }

  async deactivate(_id: string): Promise<void> {
    throw new Error('not implemented');
  }
}
