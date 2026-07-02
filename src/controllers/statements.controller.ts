import type { Request, Response } from 'express';
import { createLogger } from '../lib/logger.ts';

const log = createLogger('statements-controller');

// Stub ok envelope
const ok = (res: Response, data: unknown) => res.status(200).json({ ok: true, data });

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

  const parsePagination = (req: Request) => ({
    page: parseInt(req.query.page as string) || 1,
    pageSize: parseInt(req.query.pageSize as string) || 50
  });

  const parseFilters = (req: Request) => ({
    from: req.query.from as string,
    to: req.query.to as string,
    status: req.query.status as string,
  });

  return {
    getVendorStatement: async (req: Request, res: Response) => {
      const vendorId = req.params.id;
      const data = await deps.service.getVendorStatement(getAuthVendorId(req), vendorId, parseFilters(req), parsePagination(req));
      return ok(res, data);
    },
    getCustomerStatement: async (req: Request, res: Response) => {
      const { id: vendorId, cid: customerId } = req.params;
      const data = await deps.service.getCustomerStatement(getAuthVendorId(req), vendorId, customerId, parseFilters(req), parsePagination(req));
      return ok(res, data);
    },
    getTransactions: async (req: Request, res: Response) => {
      const vendorId = req.params.id;
      const data = await deps.service.getTransactions(getAuthVendorId(req), vendorId, parsePagination(req));
      return ok(res, data);
    }
  };
}
