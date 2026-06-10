import bcrypt from 'bcrypt';
import { query } from '../../../config/database';
import type { User, UserWithHash, CreateUserDto, UpdateUserDto } from '../domain/users.types';
import type { UserRole } from '../../auth/domain/auth.types';

const BCRYPT_ROUNDS = 12;

interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
  refresh_token_hash: string | null;
}

function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    role: row.role,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toUserWithHash(row: UserRow): UserWithHash {
  return { ...toUser(row), passwordHash: row.password_hash, refreshTokenHash: row.refresh_token_hash };
}

export class UsersRepository {
  async findAll(): Promise<User[]> {
    const result = await query<UserRow>('SELECT * FROM users WHERE is_active = true ORDER BY created_at DESC');
    return result.rows.map(toUser);
  }

  async findById(id: string): Promise<User | null> {
    const result = await query<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
    return result.rows[0] ? toUser(result.rows[0]) : null;
  }

  async findByEmail(email: string): Promise<UserWithHash | null> {
    const result = await query<UserRow>('SELECT * FROM users WHERE email = $1', [email]);
    return result.rows[0] ? toUserWithHash(result.rows[0]) : null;
  }

  async create(dto: CreateUserDto): Promise<User> {
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const result = await query<UserRow>(
      `INSERT INTO users (email, password_hash, role)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [dto.email, passwordHash, dto.role ?? 'user'],
    );
    return toUser(result.rows[0]!);
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (dto.email !== undefined) { fields.push(`email = $${idx++}`); values.push(dto.email); }
    if (dto.role !== undefined) { fields.push(`role = $${idx++}`); values.push(dto.role); }
    fields.push(`updated_at = now()`);
    values.push(id);

    const result = await query<UserRow>(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`,
      values,
    );
    return toUser(result.rows[0]!);
  }

  async deactivate(id: string): Promise<void> {
    await query('UPDATE users SET is_active = false, updated_at = now() WHERE id = $1', [id]);
  }

  async setRefreshToken(id: string, hash: string | null): Promise<void> {
    await query('UPDATE users SET refresh_token_hash = $1, updated_at = now() WHERE id = $2', [hash, id]);
  }
}
