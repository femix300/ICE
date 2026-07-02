import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStatementsController } from '../../src/controllers/statements.controller.ts';

describe('statementsController', () => {
  let mockService: any;
  let controller: any;
  let req: any;
  let res: any;

  beforeEach(() => {
    mockService = {
      getVendorStatement: vi.fn().mockResolvedValue({ items: [] }),
      getCustomerStatement: vi.fn().mockResolvedValue({ items: [] }),
      getTransactions: vi.fn().mockResolvedValue({ items: [] })
    };
    controller = createStatementsController({ service: mockService });
    req = { query: {}, params: {}, user: { vendor_id: 'v-auth' } };
    res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  });

  it('validates query params and sets defaults', async () => {
    req.params = { id: 'v-1' };
    await controller.getVendorStatement(req, res);
    expect(mockService.getVendorStatement).toHaveBeenCalledWith(
      'v-auth', 'v-1', 
      { from: undefined, to: undefined, status: undefined }, 
      { page: 1, pageSize: 50 }
    );
  });

  it('throws AppError if query is invalid', async () => {
    req.params = { id: 'v-1' };
    req.query = { page: 'invalid' };
    await expect(controller.getVendorStatement(req, res)).rejects.toThrow('Invalid query parameters');
  });

  it('getCustomerStatement passes ids and parsed query', async () => {
    req.params = { id: 'v-1', cid: 'c-1' };
    req.query = { page: '2', pageSize: '10', status: 'PAID' };
    await controller.getCustomerStatement(req, res);
    expect(mockService.getCustomerStatement).toHaveBeenCalledWith(
      'v-auth', 'v-1', 'c-1',
      { from: undefined, to: undefined, status: 'PAID' }, 
      { page: 2, pageSize: 10 }
    );
  });

  it('getTransactions routes correctly', async () => {
    req.params = { id: 'v-1' };
    await controller.getTransactions(req, res);
    expect(mockService.getTransactions).toHaveBeenCalledWith(
      'v-auth', 'v-1', { page: 1, pageSize: 50 }
    );
  });
});
