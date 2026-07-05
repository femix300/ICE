import type { Request, Response, NextFunction } from 'express';
import { createLogger } from '../lib/logger.js';
import { appError } from '../lib/respond.js';

const log = createLogger('error-handler');

export function notFoundHandler(req: Request, res: Response) {
  appError(res, 'NOT_FOUND', `Cannot ${req.method} ${req.path}`, 404);
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  console.error('UNHANDLED ERROR:', err);
  log.error({ err, path: req.path }, 'Unhandled error');

  const status =
    typeof err === 'object' &&
    err !== null &&
    'status' in err &&
    typeof (err as Record<string, unknown>).status === 'number'
      ? (err as Record<string, unknown>).status
      : 500;
  const message = err instanceof Error ? err.message : 'Internal Server Error';

  appError(res, status === 500 ? 'INTERNAL_ERROR' : 'APP_ERROR', message, status as number);
}
