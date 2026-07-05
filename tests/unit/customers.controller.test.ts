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
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    return res as Response;
  };

  const mockNext = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Merchant Scope Enforcement', () => {
    it('allows merchant to access their own vendor', async () => {
      const req = {
        principal: { id: 'm1', tier: 'merchant' },
        params: { id: 'v1', cid: 'c1' },
        body: { name: 'Alice', email: 'alice@example.com' }
      } as unknown as Request;
      const res = mockRes();

      mockVendorsService.getVendor.mockResolvedValueOnce({ merchant_id: 'm1' });
      mockCustomersService.createCustomer.mockResolvedValueOnce({ id: 'c1' });

      await controller.create(req, res, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockCustomersService.createCustomer).toHaveBeenCalledWith('v1', expect.any(Object));
    });

    it('throws FORBIDDEN when merchant tries to access another merchant vendor', async () => {
      const req = {
        principal: { id: 'm1', tier: 'merchant' },
        params: { id: 'v1', cid: 'c1' },
      } as unknown as Request;
      const res = mockRes();

      mockVendorsService.getVendor.mockResolvedValueOnce({ merchant_id: 'm2' }); // belongs to m2

      await controller.getById(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
      expect(mockNext.mock.calls[0][0].statusCode).toBe(403);
      expect(mockNext.mock.calls[0][0].message).toMatch(/Merchants can only access their own vendors/);
    });
  });
});
