import type { Request, Response, NextFunction } from 'express';
import { createLogger } from '../lib/logger.js';

const log = createLogger('error-handler');

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    ok: false,
    errorCode: 'NOT_FOUND',
    message: `Cannot ${req.method} ${req.path}`,
    requestId: res.locals.requestId,
  });
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  log.error({ err, path: req.path }, 'Unhandled error');

  const status =
    typeof err === 'object' && err !== null && 'status' in err && typeof (err as Record<string, unknown>).status === 'number'
      ? (err as Record<string, unknown>).status
      : 500;
  const message = err instanceof Error ? err.message : 'Internal Server Error';

  res.status(status as number).json({
    ok: false,
    errorCode: status === 500 ? 'INTERNAL_ERROR' : 'APP_ERROR',
    message,
    requestId: res.locals.requestId,
  });
}
