import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStatementsController } from '../../src/controllers/statements.controller.ts';

describe('summaryController', () => {
  let mockService: any;
  let controller: any;
  let req: any;
  let res: any;

  beforeEach(() => {
    mockService = {
      getPlatformSummary: vi.fn().mockResolvedValue({ total_volume: 1000 }),
      getTransactionById: vi.fn().mockResolvedValue({ id: 'tx-1' }),
    };
    controller = createStatementsController({ service: mockService });
    req = { query: {}, params: {}, user: {} };
    res = { status: vi.fn().mockReturnThis(), json: vi.fn() };
  });

  it('getPlatformSummary validates master key and calls service', async () => {
    req.params = { id: 'm-1' };
    req.user = {}; // no vendor_id -> master key
    
    await controller.getPlatformSummary(req, res);
    expect(mockService.getPlatformSummary).toHaveBeenCalledWith(true, 'm-1');
  });

  it('getPlatformSummary identifies non-master key', async () => {
    req.params = { id: 'm-1' };
    req.user = { vendor_id: 'v-1' };
    
    await controller.getPlatformSummary(req, res);
    expect(mockService.getPlatformSummary).toHaveBeenCalledWith(false, 'm-1');
  });

  it('getTransactionById fetches by id and auth context', async () => {
    req.params = { id: 'tx-1' };
    req.user = { vendor_id: 'v-1' };
    
    await controller.getTransactionById(req, res);
    expect(mockService.getTransactionById).toHaveBeenCalledWith('v-1', 'tx-1');
  });

  it('getTransactionById throws NOT_FOUND if missing', async () => {
    req.params = { id: 'tx-missing' };
    mockService.getTransactionById.mockResolvedValue(null);
    
    await expect(controller.getTransactionById(req, res)).rejects.toThrow('Transaction not found');
  });
});
