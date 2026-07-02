import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

import type { ReconciliationService } from '../services/reconciliation.service.js';
import { AppError } from '../lib/errors.js';
import { ok } from '../lib/respond.js';
import { ReconciliationStatus } from '../services/reconciliation.service.js';

const logQuerySchema = z.object({
  status: z.nativeEnum(ReconciliationStatus).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(20),
});

export function createReconciliationController(service: ReconciliationService) {
  return {
    async listLogs(req: Request, res: Response, next: NextFunction) {
      try {
        const query = logQuerySchema.parse(req.query);
        const result = await service.listLogs(query.status, query.page, query.limit);

        return ok(res, result);
      } catch (err) {
        next(err);
      }
    },
  };
}

export type ReconciliationController = ReturnType<typeof createReconciliationController>;
