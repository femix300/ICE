import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

import type { MisdirectedService } from '../services/misdirected.service.js';
import { AppError } from '../lib/errors.js';
import { ok } from '../lib/respond.js';

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(20),
});

const matchBodySchema = z.object({
  invoice_id: z.string().min(1),
});

export function createMisdirectedController(service: MisdirectedService) {
  return {
    async list(req: Request, res: Response, next: NextFunction) {
      try {
        const merchantId = req.headers['x-merchant-id'];
        if (typeof merchantId !== 'string' || !merchantId) {
          throw new AppError(401, 'UNAUTHORIZED', 'Missing or invalid x-merchant-id header');
        }

        const query = listQuerySchema.parse(req.query);
        const result = await service.listByMerchant(merchantId, query.page, query.limit);

        return ok(res, result);
      } catch (err) {
        next(err);
      }
    },

    async match(req: Request, res: Response, next: NextFunction) {
      try {
        const merchantId = req.headers['x-merchant-id'];
        const actorId = req.headers['x-actor-id'] || 'system';
        const keyTier = req.headers['x-key-tier'];
        const ipAddress = req.ip || '127.0.0.1';

        if (typeof merchantId !== 'string' || !merchantId) {
          throw new AppError(401, 'UNAUTHORIZED', 'Missing or invalid x-merchant-id header');
        }

        if (keyTier !== 'platform') {
          throw new AppError(403, 'FORBIDDEN', 'Platform master key required');
        }

        const paymentId = req.params.id;
        if (!paymentId) {
          throw new AppError(400, 'BAD_REQUEST', 'Missing payment ID parameter');
        }

        const body = matchBodySchema.parse(req.body);
        const result = await service.matchPayment(
          typeof paymentId === "string" ? paymentId : paymentId[0],
          body.invoice_id,
          merchantId,
          typeof actorId === 'string' ? actorId : 'system',
          ipAddress,
        );

        return ok(res, result);
      } catch (err) {
        next(err);
      }
    },

    async refund(req: Request, res: Response, next: NextFunction) {
      try {
        const merchantId = req.headers['x-merchant-id'];
        const actorId = req.headers['x-actor-id'] || 'system';
        const keyTier = req.headers['x-key-tier'];
        const ipAddress = req.ip || '127.0.0.1';

        if (typeof merchantId !== 'string' || !merchantId) {
          throw new AppError(401, 'UNAUTHORIZED', 'Missing or invalid x-merchant-id header');
        }

        if (keyTier !== 'platform') {
          throw new AppError(403, 'FORBIDDEN', 'Platform master key required');
        }

        const paymentId = req.params.id;
        if (!paymentId) {
          throw new AppError(400, 'BAD_REQUEST', 'Missing payment ID parameter');
        }

        const result = await service.refundPayment(
          typeof paymentId === "string" ? paymentId : paymentId[0],
          merchantId,
          typeof actorId === 'string' ? actorId : 'system',
          ipAddress,
        );

        return ok(res, result);
      } catch (err) {
        next(err);
      }
    },
  };
}

export type MisdirectedController = ReturnType<typeof createMisdirectedController>;
