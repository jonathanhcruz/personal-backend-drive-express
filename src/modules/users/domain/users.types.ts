import type { UserRole } from '../../auth/domain/auth.types';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserWithHash extends User {
  passwordHash: string;
  refreshTokenHash: string | null;
}

export interface CreateUserDto {
  email: string;
  password: string;
  role?: UserRole | undefined;
}

export interface UpdateUserDto {
  email?: string | undefined;
  role?: UserRole | undefined;
}
