import type { Request, Response } from 'express';
import { z } from 'zod';
import { createLogger } from '../lib/logger.ts';

const log = createLogger('statements-controller');

// Stub ok envelope
const ok = (res: Response, data: unknown) => res.status(200).json({ ok: true, data });

class AppError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'AppError';
  }
}

export const StatementsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  pageSize: z.coerce.number().min(1).max(100).default(50),
  from: z.string().optional(),
  to: z.string().optional(),
  status: z.string().optional(),
});

export interface StatementsServiceStub {
  getVendorStatement: (authId: string | null, vId: string, f: any, p: any) => Promise<any>;
  getCustomerStatement: (authId: string | null, vId: string, cId: string, f: any, p: any) => Promise<any>;
  getTransactions: (authId: string | null, vId: string, p: any) => Promise<any>;
}

export function createStatementsController(deps: { service: StatementsServiceStub }) {
  const getAuthVendorId = (req: Request) => {
    // Extracts vendor_id from the mocked JWT context or API key context
    return (req as any).user?.vendor_id || null;
  };

  const validateQuery = (req: Request) => {
    const parsed = StatementsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new AppError('VALIDATION_ERROR', 'Invalid query parameters');
    }
    return parsed.data;
  };

  return {
    getVendorStatement: async (req: Request, res: Response) => {
      const vendorId = req.params.id;
      if (!vendorId) throw new AppError('VALIDATION_ERROR', 'Vendor ID is required');

      const query = validateQuery(req);
      const data = await deps.service.getVendorStatement(
        getAuthVendorId(req), 
        vendorId, 
        { from: query.from, to: query.to, status: query.status }, 
        { page: query.page, pageSize: query.pageSize }
      );
      return ok(res, data);
    },
    getCustomerStatement: async (req: Request, res: Response) => {
      const { id: vendorId, cid: customerId } = req.params;
      if (!vendorId || !customerId) throw new AppError('VALIDATION_ERROR', 'Vendor ID and Customer ID are required');

      const query = validateQuery(req);
      const data = await deps.service.getCustomerStatement(
        getAuthVendorId(req), 
        vendorId, 
        customerId, 
        { from: query.from, to: query.to, status: query.status }, 
        { page: query.page, pageSize: query.pageSize }
      );
      return ok(res, data);
    },
    getTransactions: async (req: Request, res: Response) => {
      const vendorId = req.params.id;
      if (!vendorId) throw new AppError('VALIDATION_ERROR', 'Vendor ID is required');

      const query = validateQuery(req);
      const data = await deps.service.getTransactions(
        getAuthVendorId(req), 
        vendorId, 
        { page: query.page, pageSize: query.pageSize }
      );
      return ok(res, data);
    }
  };
}
