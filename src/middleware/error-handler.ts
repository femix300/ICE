import type { Request, Response, NextFunction } from 'express';

import { AppError } from '../lib/errors.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('error-handler');

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      ok: false,
      error_code: err.code,
      message: err.message,
    });
    return;
  }

  log.error({ err }, 'unhandled error');

  res.status(500).json({
    ok: false,
    error_code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  });
}
