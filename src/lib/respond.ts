import type { Response } from 'express';

export const ok = (res: Response, data: unknown, status = 200) =>
  res.status(status).json({ ok: true, data, requestId: res.locals.requestId });

export const created = (res: Response, data: unknown) => ok(res, data, 201);

export const noContent = (res: Response) => res.status(204).send();

export const appError = (res: Response, errorCode: string, message: string, status = 500) => {
  return res.status(status).json({
    ok: false,
    errorCode,
    message,
    requestId: res.locals.requestId,
  });
};
