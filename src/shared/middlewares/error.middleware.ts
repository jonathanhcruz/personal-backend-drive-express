import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { AppError } from '../errors/app.error';
import { ErrorCode } from '../constants/error-codes';
import { env } from '../../config/env';

export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    res.status(413).json({
      error: { code: ErrorCode.FILE_TOO_LARGE, message: `Max file size is ${env.maxFileSizeMb}MB` },
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: { code: err.code, message: err.message } });
    return;
  }

  console.error('[ERROR]', err);
  res.status(500).json({ error: { code: ErrorCode.INTERNAL_ERROR, message: 'Internal server error' } });
}
