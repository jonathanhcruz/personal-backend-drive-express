export type UserRole = 'admin' | 'readonly';

export interface AuthUser {
  id: string;
  username: string;
  role: UserRole;
}

export interface LoginDto {
  username: string;
  password: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}
