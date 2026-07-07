import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { createLogger } from '../lib/logger.js';
import { ok } from '../lib/respond.js';
import { AppError } from '../lib/errors.js';
import type { StatementsService } from '../services/statements.service.js';

const log = createLogger('statements-controller');

export const StatementsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(50),
  from: z.string().optional(),
  to: z.string().optional(),
  status: z.string().optional(),
});

type ParsedQuery = z.infer<typeof StatementsQuerySchema>;

export function createStatementsController(deps: { service: StatementsService }) {
  const getAuthVendorId = (req: Request): string | null => {
    // Extract vendor_id from the authenticated principal
    if (req.principal && req.principal.tier === 'vendor') {
      return req.principal.id;
    }
    return null;
  };

  const validateQuery = (req: Request): ParsedQuery => {
    const parsed = StatementsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Invalid query parameters');
    }
    return parsed.data;
  };

  return {
    getVendorStatement: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const vendorId = req.params.id;
        if (!vendorId) throw new AppError(400, 'VALIDATION_ERROR', 'Vendor ID is required');
        
        const query = validateQuery(req);
        const data = await deps.service.getVendorStatement(
          getAuthVendorId(req), 
          vendorId, 
          { from: query.from, to: query.to, status: query.status }, 
          { page: query.page, pageSize: query.pageSize }
        );
        return ok(res, data);
      } catch (err) {
        next(err);
      }
    },
    getCustomerStatement: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id: vendorId, cid: customerId } = req.params;
        if (!vendorId || !customerId) throw new AppError(400, 'VALIDATION_ERROR', 'Vendor ID and Customer ID are required');
        
        const query = validateQuery(req);
        const data = await deps.service.getCustomerStatement(
          getAuthVendorId(req), 
          vendorId, 
          customerId, 
          { from: query.from, to: query.to, status: query.status }, 
          { page: query.page, pageSize: query.pageSize }
        );
        return ok(res, data);
      } catch (err) {
        next(err);
      }
    },
    getTransactions: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const vendorId = req.params.id;
        if (!vendorId) throw new AppError(400, 'VALIDATION_ERROR', 'Vendor ID is required');
        
        const query = validateQuery(req);
        const data = await deps.service.getTransactions(
          getAuthVendorId(req), 
          vendorId, 
          { page: query.page, pageSize: query.pageSize }
        );
        return ok(res, data);
      } catch (err) {
        next(err);
      }
    },
    getPlatformSummary: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const merchantId = req.params.id;
        if (!merchantId) throw new AppError(400, 'VALIDATION_ERROR', 'Merchant ID is required');
        
        const isMasterKey = !getAuthVendorId(req) && req.principal?.tier === 'merchant';
        if (!isMasterKey) {
            throw new AppError(403, 'FORBIDDEN', 'Platform master key required');
        }

        const data = await deps.service.getPlatformSummary(merchantId);
        return ok(res, data);
      } catch (err) {
        next(err);
      }
    },
    getTransactionById: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const { id } = req.params;
        if (!id) throw new AppError(400, 'VALIDATION_ERROR', 'Transaction ID is required');
        
        const data = await deps.service.getTransactionById(getAuthVendorId(req), id);
        if (!data) {
          throw new AppError(404, 'NOT_FOUND', 'Transaction not found');
        }
        return ok(res, data);
      } catch (err) {
        next(err);
      }
    }
  };
}
