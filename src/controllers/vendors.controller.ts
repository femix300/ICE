import type { Request, Response, NextFunction } from 'express';
import { createVendorBody, vendorIdParam } from '../schemas/vendors.schema.js';
import { created, ok } from '../lib/respond.js';
import { AppError } from '../lib/errors.js';
import type { VendorsService } from '../types/index.js';

import { listVendorsQuery, updateVendorAccountBody } from '../schemas/vendors.schema.js';

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
    generateApiKey: async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.principal || req.principal.tier !== 'merchant') {
          throw new AppError(403, 'FORBIDDEN', 'Only merchants can generate vendor API keys');
        }

        const params = vendorIdParam.parse(req.params);
        const result = await service.generateApiKey(params.id, req.principal.id);
        return ok(res, result);
      } catch (err) {
        next(err);
      }
    },
    suspend: async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.principal || req.principal.tier !== 'merchant') {
          throw new AppError(403, 'FORBIDDEN', 'Only merchants can suspend vendors');
        }

        const params = vendorIdParam.parse(req.params);
        const vendor = await service.suspendAccount(params.id, req.principal.id);
        return ok(res, vendor);
      } catch (err) {
        next(err);
      }
    },
    list: async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.principal || req.principal.tier !== 'merchant') {
          throw new AppError(403, 'FORBIDDEN', 'Only merchants can list vendors');
        }

        const query = listVendorsQuery.parse(req.query);
        const result = await service.listVendors(
          req.principal.id,
          query.page,
          query.pageSize,
          query.status,
        );
        return ok(res, result);
      } catch (err) {
        next(err);
      }
    },
    updateAccount: async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.principal || req.principal.tier !== 'merchant') {
          throw new AppError(403, 'FORBIDDEN', 'Only merchants can update vendors');
        }

        const params = vendorIdParam.parse(req.params);
        const body = updateVendorAccountBody.parse(req.body);
        const vendor = await service.updateAccount(params.id, req.principal.id, body);
        return ok(res, vendor);
      } catch (err) {
        next(err);
      }
    },
  };
}
