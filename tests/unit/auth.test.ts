import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { createAuthMiddleware, type MerchantsRepo, type VendorsRepo } from '../../src/middleware/auth.js';
import { hash } from '../../src/lib/api-key.js';
import { AppError } from '../../src/lib/errors.js';

describe('Auth Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = { headers: {} };
    res = {};
    next = vi.fn();
  });

  it('throws MISSING_API_KEY if no Authorization header', async () => {
    const middleware = createAuthMiddleware({
      merchants: { findByKeyPrefix: vi.fn() },
      vendors: { findByKeyPrefix: vi.fn() },
    });

    await middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const err = (next as Mock).mock.calls[0][0];
    expect(err.errorCode).toBe('MISSING_API_KEY');
    expect(err.status).toBe(401);
  });

  it('throws INVALID_AUTHORIZATION_HEADER if not Bearer', async () => {
    req.headers = { authorization: 'Basic token' };
    const middleware = createAuthMiddleware({
      merchants: { findByKeyPrefix: vi.fn() },
      vendors: { findByKeyPrefix: vi.fn() },
    });

    await middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const err = (next as Mock).mock.calls[0][0];
    expect(err.errorCode).toBe('INVALID_AUTHORIZATION_HEADER');
  });

  it('authenticates a valid merchant key', async () => {
    const rawKey = 'ice_live_1234567890';
    const prefix = rawKey.slice(0, 8);
    const keyHash = await hash(rawKey);

    const merchantsRepo: MerchantsRepo = {
      findByKeyPrefix: vi.fn().mockImplementation(async (p) => {
        if (p === prefix) return { id: 'm_123', api_key_hash: keyHash };
        return null;
      }),
    };
    const vendorsRepo: VendorsRepo = { findByKeyPrefix: vi.fn().mockResolvedValue(null) };

    const middleware = createAuthMiddleware({ merchants: merchantsRepo, vendors: vendorsRepo });

    req.headers = { authorization: `Bearer ${rawKey}` };
    await middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(); // success, no args
    expect((req as Request).principal).toEqual({ tier: 'merchant', id: 'm_123' });
    expect(merchantsRepo.findByKeyPrefix).toHaveBeenCalledWith(prefix);
    expect(vendorsRepo.findByKeyPrefix).not.toHaveBeenCalled();
  });

  it('authenticates a valid vendor key when merchant is not found', async () => {
    const rawKey = 'vnd_live_0987654321';
    const prefix = rawKey.slice(0, 8);
    const keyHash = await hash(rawKey);

    const merchantsRepo: MerchantsRepo = { findByKeyPrefix: vi.fn().mockResolvedValue(null) };
    const vendorsRepo: VendorsRepo = {
      findByKeyPrefix: vi.fn().mockImplementation(async (p) => {
        if (p === prefix) return { id: 'v_456', merchant_id: 'm_123', api_key_hash: keyHash };
        return null;
      }),
    };

    const middleware = createAuthMiddleware({ merchants: merchantsRepo, vendors: vendorsRepo });

    req.headers = { authorization: `Bearer ${rawKey}` };
    await middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith();
    expect((req as Request).principal).toEqual({ tier: 'vendor', id: 'v_456', merchantId: 'm_123' });
    expect(merchantsRepo.findByKeyPrefix).toHaveBeenCalledWith(prefix);
    expect(vendorsRepo.findByKeyPrefix).toHaveBeenCalledWith(prefix);
  });

  it('throws INVALID_API_KEY when key is not found anywhere', async () => {
    const merchantsRepo: MerchantsRepo = { findByKeyPrefix: vi.fn().mockResolvedValue(null) };
    const vendorsRepo: VendorsRepo = { findByKeyPrefix: vi.fn().mockResolvedValue(null) };

    const middleware = createAuthMiddleware({ merchants: merchantsRepo, vendors: vendorsRepo });

    req.headers = { authorization: `Bearer unknown_key` };
    await middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const err = (next as Mock).mock.calls[0][0];
    expect(err.errorCode).toBe('INVALID_API_KEY');
  });

  it('throws INVALID_API_KEY when key is found but hash mismatch', async () => {
    const validKey = 'ice_live_123';
    const badKey = 'ice_live_bad';
    const keyHash = await hash(validKey);

    const merchantsRepo: MerchantsRepo = {
      findByKeyPrefix: vi.fn().mockResolvedValue({ id: 'm_123', api_key_hash: keyHash })
    };
    const vendorsRepo: VendorsRepo = { findByKeyPrefix: vi.fn().mockResolvedValue(null) };

    const middleware = createAuthMiddleware({ merchants: merchantsRepo, vendors: vendorsRepo });

    req.headers = { authorization: `Bearer ${badKey}` };
    await middleware(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const err = (next as Mock).mock.calls[0][0];
    expect(err.errorCode).toBe('INVALID_API_KEY');
  });
});
