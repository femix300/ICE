import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRefundWorker } from '../../src/workers/refund.worker.ts';
import type { Queue } from 'bullmq';
import type { NombaClient } from '../../src/lib/nomba.ts';
import type { RefundsRepo } from '../../src/repositories/refunds.repo.ts';
import type { createMerchantsRepo } from '../../src/repositories/merchants.repo.ts';

vi.mock('bullmq', () => ({
  Worker: vi.fn().mockImplementation((name, processor, options) => {
    return { name, processor, options, on: vi.fn() };
  }),
}));

describe('refundWorker', () => {
  let mockNomba: { lookupBank: ReturnType<typeof vi.fn>; transferToBank: ReturnType<typeof vi.fn> };
  let mockRefunds: { update: ReturnType<typeof vi.fn> };
  let mockMerchants: { byId: ReturnType<typeof vi.fn> };
  let mockWebhookQueue: { add: ReturnType<typeof vi.fn> };
  let worker: any;

  beforeEach(() => {
    mockNomba = { lookupBank: vi.fn(), transferToBank: vi.fn() };
    mockRefunds = { update: vi.fn() };
    mockMerchants = { byId: vi.fn() };
    mockWebhookQueue = { add: vi.fn() };

    worker = createRefundWorker({
      nomba: mockNomba as unknown as NombaClient,
      refunds: mockRefunds as unknown as RefundsRepo,
      merchants: mockMerchants as unknown as ReturnType<typeof createMerchantsRepo>,
      webhookDeliveryQueue: mockWebhookQueue as unknown as Queue,
    });
  });

  it('looks up bank and transfers exact kobo amount', async () => {
    mockMerchants.byId.mockResolvedValue({ business_name: 'Test Biz' });
    mockNomba.lookupBank.mockResolvedValue({ data: { accountName: 'John Doe' } });
    mockNomba.transferToBank.mockResolvedValue({ data: { id: 'trans-123', status: 'SUCCESS' } });

    await worker.processor({
      data: {
        transaction_id: 'tx-1', merchant_id: 'm-1', amount_kobo: 5000, recipient_account: '123', recipient_bank_code: '058'
      }
    });

    expect(mockNomba.lookupBank).toHaveBeenCalledWith({ accountNumber: '123', bankCode: '058' });
    expect(mockNomba.transferToBank).toHaveBeenCalledWith(expect.objectContaining({
      amount: 5000, // Explicitly no kobo-to-naira conversion
      accountNumber: '123'
    }));
    expect(mockRefunds.update).toHaveBeenCalledWith('tx-1', expect.objectContaining({ status: 'COMPLETED' }));
    expect(mockWebhookQueue.add).toHaveBeenCalled();
  });

  it('marks refund FAILED if lookup fails', async () => {
    mockMerchants.byId.mockResolvedValue({ business_name: 'Test Biz' });
    mockNomba.lookupBank.mockRejectedValue(new Error('Lookup error'));

    await expect(worker.processor({
      data: { transaction_id: 'tx-2', merchant_id: 'm-1', amount_kobo: 1000, recipient_account: '123', recipient_bank_code: '058' }
    })).rejects.toThrow('Failed to look up recipient account');

    expect(mockRefunds.update).toHaveBeenCalledWith('tx-2', expect.objectContaining({ status: 'FAILED' }));
    expect(mockNomba.transferToBank).not.toHaveBeenCalled();
  });
});
