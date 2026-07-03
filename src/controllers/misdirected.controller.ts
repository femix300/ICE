import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

import type { MisdirectedService } from '../services/misdirected.service.js';
import { AppError } from '../lib/errors.js';
import { ok } from '../lib/respond.js';

const listQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(20),
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
  };
}

export type MisdirectedController = ReturnType<typeof createMisdirectedController>;
