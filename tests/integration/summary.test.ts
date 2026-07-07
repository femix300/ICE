import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStatementsController } from '../../src/controllers/statements.controller.ts';

describe('summaryController', () => {
  let mockService: any;
  let controller: any;
  let req: any;
  let res: any;
  let next: any;

  beforeEach(() => {
    mockService = {
      getPlatformSummary: vi.fn().mockResolvedValue({ total_volume: 1000 }),
      getTransactionById: vi.fn().mockResolvedValue({ id: 'tx-1' }),
    };
    controller = createStatementsController({ service: mockService });
    req = { query: {}, params: {}, principal: {} };
    res = { status: vi.fn().mockReturnThis(), json: vi.fn(), locals: { requestId: 'test-req' } };
    next = vi.fn();
  });

  it('getPlatformSummary validates master key and calls service', async () => {
    req.params = { id: 'm-1' };
    req.principal = { tier: 'merchant', id: 'm-1' };
    
    await controller.getPlatformSummary(req, res, next);
    if (next.mock.calls.length > 0) throw next.mock.calls[0][0]; // Bubble up actual error if any
    expect(mockService.getPlatformSummary).toHaveBeenCalledWith(true, 'm-1');
  });

  it('getPlatformSummary identifies non-master key', async () => {
    req.params = { id: 'm-1' };
    req.principal = { tier: 'vendor', id: 'v-1' };
    
    await controller.getPlatformSummary(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].message).toBe('Platform master key required');
  });

  it('getTransactionById fetches by id and auth context', async () => {
    req.params = { id: 'tx-1' };
    req.principal = { tier: 'vendor', id: 'v-1' };
    
    await controller.getTransactionById(req, res, next);
    if (next.mock.calls.length > 0) throw next.mock.calls[0][0];
    expect(mockService.getTransactionById).toHaveBeenCalledWith('v-1', 'tx-1');
  });

  it('getTransactionById throws NOT_FOUND if missing', async () => {
    req.params = { id: 'tx-missing' };
    mockService.getTransactionById.mockResolvedValue(null);
    
    await controller.getTransactionById(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(next.mock.calls[0][0].message).toBe('Transaction not found');
  });
});
