import { AppError } from './app.error';
import { ErrorCode, type TErrorCode } from '../constants/error-codes';

export class NotFoundError extends AppError {
  constructor(message = 'Resource not found', code: TErrorCode = ErrorCode.NOT_FOUND) {
    super(message, 404, code);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized', code: TErrorCode = ErrorCode.UNAUTHORIZED) {
    super(message, 401, code);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden', code: TErrorCode = ErrorCode.FORBIDDEN) {
    super(message, 403, code);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400, ErrorCode.VALIDATION_ERROR);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, ErrorCode.CONFLICT);
  }
}
