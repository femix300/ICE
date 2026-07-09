import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

import { misdirectedIdParamSchema, matchPaymentBodySchema } from '../schemas/misdirected.schema.js';
import type { MisdirectedService } from '../services/misdirected.service.js';
import { AppError } from '../lib/errors.js';
import { ok } from '../lib/respond.js';

const misdirectedListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export function createMisdirectedController(service: MisdirectedService) {
  return {
    async list(req: Request, res: Response, next: NextFunction) {
      try {
        if (!req.principal || req.principal.tier !== 'merchant') {
          throw new AppError(403, 'FORBIDDEN', 'Platform (merchant) key tier required');
        }

        const query = misdirectedListQuerySchema.safeParse(req.query);
        if (!query.success) {
          throw new AppError(400, 'VALIDATION_ERROR', 'Invalid query parameters');
        }

        const result = await service.listByMerchant(
          req.principal.id,
          query.data.page,
          query.data.limit,
        );
        return ok(res, result);
      } catch (err) {
        next(err);
      }
    },

    async match(req: Request, res: Response, next: NextFunction) {
      try {
        if (!req.principal || req.principal.tier !== 'merchant') {
          throw new AppError(403, 'FORBIDDEN', 'Platform (merchant) key tier required');
        }

        const params = misdirectedIdParamSchema.safeParse(req.params);
        if (!params.success) {
          throw new AppError(400, 'VALIDATION_ERROR', 'Invalid misdirected payment ID');
        }

        const body = matchPaymentBodySchema.safeParse(req.body);
        if (!body.success) {
          throw new AppError(400, 'VALIDATION_ERROR', 'invoiceId is required');
        }

        const result = await service.matchPayment(
          params.data.id,
          body.data.invoiceId,
          req.principal.id,
          req.principal.id,
          req.ip || '127.0.0.1',
        );

        return ok(res, result);
      } catch (err) {
        next(err);
      }
    },

    async refund(req: Request, res: Response, next: NextFunction) {
      try {
        if (!req.principal || req.principal.tier !== 'merchant') {
          throw new AppError(403, 'FORBIDDEN', 'Platform (merchant) key tier required');
        }

        const params = misdirectedIdParamSchema.safeParse(req.params);
        if (!params.success) {
          throw new AppError(400, 'VALIDATION_ERROR', 'Invalid misdirected payment ID');
        }

        const result = await service.refundPayment(
          params.data.id,
          req.principal.id,
          req.principal.id,
          req.ip || '127.0.0.1',
        );

        return ok(res, result);
      } catch (err) {
        next(err);
      }
    },
  };
}

export type MisdirectedController = ReturnType<typeof createMisdirectedController>;
