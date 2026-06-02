import type { User, CreateUserDto, UpdateUserDto } from '../domain/users.types';

export interface IUsersRepository {
  findAll(): Promise<User[]>;
  findById(id: string): Promise<User | null>;
  findByUsername(username: string): Promise<User | null>;
  create(dto: CreateUserDto): Promise<User>;
  update(id: string, dto: UpdateUserDto): Promise<User>;
  deactivate(id: string): Promise<void>;
}
