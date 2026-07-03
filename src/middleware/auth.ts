import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../lib/errors.js';
import { verify } from '../lib/api-key.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('auth-middleware');

export interface MerchantsRepo {
  findByKeyPrefix(prefix: string): Promise<{ id: string; api_key_hash: string } | null>;
}

export interface VendorsRepo {
  findByKeyPrefix(
    prefix: string,
  ): Promise<{ id: string; merchant_id: string; api_key_hash: string } | null>;
}

export function createAuthMiddleware(deps: { merchants: MerchantsRepo; vendors: VendorsRepo }) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        throw new AppError(401, 'MISSING_API_KEY', 'No API key provided');
      }

      if (!authHeader.startsWith('Bearer ')) {
        throw new AppError(
          401,
          'INVALID_AUTHORIZATION_HEADER',
          'Authorization header must start with Bearer',
        );
      }

      const key = authHeader.substring(7).trim();
      if (!key) {
        throw new AppError(401, 'MISSING_API_KEY', 'No API key provided');
      }

      const prefix = key.slice(0, 8);

      // Try merchant (master) key first
      const merchant = await deps.merchants.findByKeyPrefix(prefix);
      if (merchant && (await verify(key, merchant.api_key_hash))) {
        req.principal = {
          tier: 'merchant',
          id: merchant.id,
        };
        return next();
      }

      // Then try vendor (scoped) key
      const vendor = await deps.vendors.findByKeyPrefix(prefix);
      if (vendor && (await verify(key, vendor.api_key_hash))) {
        req.principal = {
          tier: 'vendor',
          id: vendor.id,
          merchantId: vendor.merchant_id,
        };
        return next();
      }

      log.warn({ prefix }, 'Invalid API key attempt');
      throw new AppError(401, 'INVALID_API_KEY', 'Invalid API key');
    } catch (err) {
      next(err);
    }
  };
}
