import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCustomersController } from '../../src/controllers/customers.controller.js';
import type { CustomersService, VendorsService } from '../../src/types/index.js';
import { AppError } from '../../src/lib/errors.js';
import type { Request, Response } from 'express';

describe('Customers Controller', () => {
  const mockCustomersService = {
    createCustomer: vi.fn(),
    getCustomer: vi.fn(),
    provisionCustomerDva: vi.fn(),
  };

  const mockVendorsService = {
    getVendor: vi.fn(),
  };

  const controller = createCustomersController(
    mockCustomersService as unknown as CustomersService,
    mockVendorsService as unknown as VendorsService
  );

  const mockRes = () => {
    const res = {} as Response;
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    res.locals = {};
    return res;
  };

  const mockNext = vi.fn();

  const MERCHANT_ID = '11111111-1111-4111-8111-111111111111';
  const OTHER_MERCHANT_ID = '44444444-4444-4444-8444-444444444444';
  const VENDOR_ID = '22222222-2222-4222-8222-222222222222';
  const CUSTOMER_ID = '33333333-3333-4333-8333-333333333333';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Merchant Scope Enforcement', () => {
    it('allows merchant to access their own vendor', async () => {
      const req = {
        principal: { id: MERCHANT_ID, tier: 'merchant' },
        params: { id: VENDOR_ID, cid: CUSTOMER_ID },
        body: { name: 'Alice', email: 'alice@example.com' }
      } as unknown as Request;
      const res = mockRes();

      mockVendorsService.getVendor.mockResolvedValueOnce({ merchant_id: MERCHANT_ID });
      mockCustomersService.createCustomer.mockResolvedValueOnce({ id: CUSTOMER_ID });

      await controller.create(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockCustomersService.createCustomer).toHaveBeenCalledWith(VENDOR_ID, expect.any(Object));
    });

    it('throws FORBIDDEN when merchant tries to access another merchant vendor', async () => {
      const req = {
        principal: { id: MERCHANT_ID, tier: 'merchant' },
        params: { id: VENDOR_ID, cid: CUSTOMER_ID },
      } as unknown as Request;
      const res = mockRes();

      mockVendorsService.getVendor.mockResolvedValueOnce({ merchant_id: OTHER_MERCHANT_ID });

      await controller.getById(req, res, mockNext);


      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockNext.mock.calls[0][0].status).toBe(403);
      expect(mockNext.mock.calls[0][0].message).toMatch(/Merchants can only access their own vendors/);
    });
  });
});
