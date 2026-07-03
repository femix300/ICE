import type { Request, Response, NextFunction } from 'express';
import { registerMerchantBody, idParam } from '../schemas/merchants.schema.js';
import type { MerchantsService } from '../services/merchants.service.js';
import { ok, created } from '../lib/respond.js';
import { AppError } from '../lib/errors.js';

export function createMerchantsController(service: MerchantsService) {
  return {
    register: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const body = registerMerchantBody.parse(req.body);
        const result = await service.register(body);
        return created(res, result);
      } catch (err) {
        next(err);
      }
    },
    getById: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const params = idParam.parse(req.params);
        if (req.principal?.tier === 'merchant' && req.principal.id !== params.id) {
          throw new AppError(403, 'FORBIDDEN', 'Cannot access other merchant profiles');
        }
        if (req.principal?.tier === 'vendor' && req.principal.merchantId !== params.id) {
          throw new AppError(403, 'FORBIDDEN', 'Cannot access other merchant profiles');
        }
        
        const merchant = await service.getById(params.id);
        return ok(res, merchant);
      } catch (err) {
        next(err);
      }
    },
  };
}
