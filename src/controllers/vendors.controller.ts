import type { Request, Response, NextFunction } from 'express';
import { createVendorBody, vendorIdParam } from '../schemas/vendors.schema.js';
import { created, ok } from '../lib/respond.js';
import { AppError } from '../lib/errors.js';

export interface VendorsService {
  createVendor(
    merchantId: string,
    data: { name: string },
  ): Promise<{
    id: string;
    merchant_id: string;
    name: string;
    nomba_va_number: string | null;
    nomba_bank_name: string | null;
    va_status: 'pending' | 'active' | 'suspended';
    created_at: Date;
    updated_at: Date;
  }>;
  getVendor(id: string): Promise<{
    id: string;
    merchant_id: string;
    name: string;
    nomba_va_number: string | null;
    nomba_bank_name: string | null;
    va_status: 'pending' | 'active' | 'suspended';
    created_at: Date;
    updated_at: Date;
  }>;
}

export function createVendorsController(service: VendorsService) {
  return {
    create: async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.principal || req.principal.tier !== 'merchant') {
          throw new AppError(403, 'FORBIDDEN', 'Only merchants can create vendors');
        }

        const body = createVendorBody.parse(req.body);
        const vendor = await service.createVendor(req.principal.id, body);
        return created(res, vendor);
      } catch (err) {
        next(err);
      }
    },
    getById: async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Anyone with valid auth can view vendor if they know ID (or you can scope it, but PRD doesn't enforce strict scope for read in MVP)
        // If we need to scope to the merchant, we would check vendor.merchant_id === req.principal.id
        if (!req.principal) {
          throw new AppError(401, 'UNAUTHORIZED', 'Unauthorized');
        }

        const params = vendorIdParam.parse(req.params);
        const vendor = await service.getVendor(params.id);

        if (req.principal.tier === 'merchant' && vendor.merchant_id !== req.principal.id) {
          throw new AppError(403, 'FORBIDDEN', 'Vendor does not belong to this merchant');
        }
        if (req.principal.tier === 'vendor' && vendor.id !== req.principal.id) {
          throw new AppError(403, 'FORBIDDEN', 'Cannot view other vendors');
        }

        return ok(res, vendor);
      } catch (err) {
        next(err);
      }
    },
  };
}
