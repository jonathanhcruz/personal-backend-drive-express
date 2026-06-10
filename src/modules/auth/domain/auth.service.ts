import bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { UnauthorizedError } from '../../../shared/errors/http.errors';
import type { LoginDto, TokenPair } from './auth.types';
import type { JwtAdapter } from '../infrastructure/jwt.adapter';
import type { UsersRepository } from '../../users/infrastructure/users.repository';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export class AuthService {
  constructor(
    private readonly users: UsersRepository,
    private readonly jwt: JwtAdapter,
  ) {}

  async login(dto: LoginDto): Promise<TokenPair> {
    const user = await this.users.findByEmail(dto.email);
    if (!user || !user.isActive) throw new UnauthorizedError('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedError('Invalid credentials');

    const tokens = this.issueTokens(user.id, user.email, user.role);
    await this.users.setRefreshToken(user.id, sha256(tokens.refreshToken));
    return tokens;
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    let payload: { sub: string };
    try {
      payload = this.jwt.verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const user = await this.users.findById(payload.sub);
    if (!user || !user.isActive) throw new UnauthorizedError('Invalid refresh token');

    const userWithHash = await this.users.findByEmail(user.email);
    if (!userWithHash?.refreshTokenHash || userWithHash.refreshTokenHash !== sha256(refreshToken)) {
      throw new UnauthorizedError('Refresh token already used or revoked');
    }

    const tokens = this.issueTokens(user.id, user.email, user.role);
    await this.users.setRefreshToken(user.id, sha256(tokens.refreshToken));
    return tokens;
  }

  async logout(refreshToken: string): Promise<boolean> {
    try {
      const payload = this.jwt.verifyRefreshToken(refreshToken);
      const user = await this.users.findByEmail(
        (await this.users.findById(payload.sub))?.email ?? '',
      );
      if (!user?.refreshTokenHash || user.refreshTokenHash !== sha256(refreshToken)) {
        return false;
      }
      await this.users.setRefreshToken(payload.sub, null);
      return true;
    } catch {
      return false;
    }
  }

  private issueTokens(id: string, email: string, role: 'admin' | 'user'): TokenPair {
    return {
      accessToken: this.jwt.signAccessToken({ id, email, role }),
      refreshToken: this.jwt.signRefreshToken(id),
    };
  }
}
