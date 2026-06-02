import type { LoginDto, TokenPair } from './auth.types';

export class AuthService {
  async login(_dto: LoginDto): Promise<TokenPair> {
    throw new Error('not implemented');
  }

  async refresh(_refreshToken: string): Promise<TokenPair> {
    throw new Error('not implemented');
  }

  async logout(_refreshToken: string): Promise<void> {
    throw new Error('not implemented');
  }
}
