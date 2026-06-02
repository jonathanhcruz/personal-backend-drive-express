import type { UserRole } from '../../auth/domain/auth.types';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
}

export interface CreateUserDto {
  username: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserDto {
  username?: string;
  role?: UserRole;
}
