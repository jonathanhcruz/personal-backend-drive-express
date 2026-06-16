import type { TErrorCode } from '../constants/error-codes';

export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: TErrorCode,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
