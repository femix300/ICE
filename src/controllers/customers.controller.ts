import type { Request, Response, NextFunction } from 'express';
import { createCustomerBody, customerIdParam, vendorIdParam } from '../schemas/customers.schema.js';
import { created, ok } from '../lib/respond.js';
import { AppError } from '../lib/errors.js';
import type { CustomersService } from '../types/index.js';

export function createCustomersController(service: CustomersService) {
  return {
    create: async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.principal) {
          throw new AppError(401, 'UNAUTHORIZED', 'Unauthorized');
        }

        const params = vendorIdParam.parse(req.params);
        const body = createCustomerBody.parse(req.body);

        // Merchants can create customers for any of their vendors; vendors can only create for themselves
        if (req.principal.tier === 'vendor' && req.principal.id !== params.id) {
          throw new AppError(
            403,
            'FORBIDDEN',
            'Vendors can only create customers under their own account',
          );
        }

        const customer = await service.createCustomer(params.id, body);
        return created(res, customer);
      } catch (err) {
        next(err);
      }
    },

    getById: async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.principal) {
          throw new AppError(401, 'UNAUTHORIZED', 'Unauthorized');
        }

        const params = customerIdParam.parse(req.params);

        if (req.principal.tier === 'vendor' && req.principal.id !== params.id) {
          throw new AppError(403, 'FORBIDDEN', 'Vendors can only view their own customers');
        }

        const customer = await service.getCustomer(params.id, params.cid);
        return ok(res, customer);
      } catch (err) {
        next(err);
      }
    },

    provisionDva: async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.principal) {
          throw new AppError(401, 'UNAUTHORIZED', 'Unauthorized');
        }

        const params = customerIdParam.parse(req.params);

        if (req.principal.tier === 'vendor' && req.principal.id !== params.id) {
          throw new AppError(
            403,
            'FORBIDDEN',
            'Vendors can only provision DVAs for their own customers',
          );
        }

        const customer = await service.provisionCustomerDva(params.id, params.cid);
        return ok(res, customer);
      } catch (err) {
        next(err);
      }
    },
  };
}
