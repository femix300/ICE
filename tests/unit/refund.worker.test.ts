import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRefundWorker } from '../../src/workers/refund.worker.ts';

vi.mock('bullmq', () => {
  return {
    Worker: vi.fn().mockImplementation((name, processor, options) => {
      return { name, processor, options, on: vi.fn() };
    }),
  };
});

describe('refundWorker', () => {
  let mockNomba: any;
  let mockRefunds: any;
  let mockWebhookQueue: any;
  let worker: any;

  beforeEach(() => {
    mockNomba = {
      lookupBank: vi.fn().mockResolvedValue({ data: { accountName: 'John Doe' } }),
      transferToBank: vi.fn().mockResolvedValue({ data: { id: 'ref-123' } }),
    };
    mockRefunds = { update: vi.fn() };
    mockWebhookQueue = { add: vi.fn() };
    
    worker = createRefundWorker({
      nomba: mockNomba,
      refunds: mockRefunds,
      webhookDeliveryQueue: mockWebhookQueue,
    });
  });

  it('throws VALIDATION_ERROR on bad payload', async () => {
    await expect(worker.processor({ data: {} })).rejects.toThrow('Invalid refund payload');
  });

  it('completes refund and enqueues webhook', async () => {
    const data = {
      transaction_id: 'tx-1',
      merchant_id: 'm-1',
      amount_kobo: 1000,
      recipient_account: '12345',
      recipient_bank_code: '058'
    };

    await worker.processor({ data });

    expect(mockNomba.lookupBank).toHaveBeenCalledWith({ accountNumber: '12345', bankCode: '058' });
    expect(mockNomba.transferToBank).toHaveBeenCalledWith({ amount: 10, accountNumber: '12345', bankCode: '058', narration: 'ICE refund for transaction tx-1' });
    expect(mockRefunds.update).toHaveBeenCalledWith('tx-1', { status: 'COMPLETED', nomba_transfer_ref: 'ref-123' });
    expect(mockWebhookQueue.add).toHaveBeenCalledWith('webhook-delivery', {
      merchant_id: 'm-1',
      event_type: 'payment.overpayment.refunded',
      payload: { transaction_id: 'tx-1', amount_kobo: 1000 }
    });
  });

  it('throws NOMBA_LOOKUP_FAILED if lookup fails', async () => {
    mockNomba.lookupBank.mockRejectedValue(new Error('lookup err'));
    const data = {
      transaction_id: 'tx-1',
      merchant_id: 'm-1',
      amount_kobo: 1000,
      recipient_account: '12345',
      recipient_bank_code: '058'
    };
    await expect(worker.processor({ data })).rejects.toThrow('Failed to look up recipient account');
  });

  it('throws NOMBA_TRANSFER_FAILED if transfer fails', async () => {
    mockNomba.transferToBank.mockRejectedValue(new Error('transfer err'));
    const data = {
      transaction_id: 'tx-1',
      merchant_id: 'm-1',
      amount_kobo: 1000,
      recipient_account: '12345',
      recipient_bank_code: '058'
    };
    await expect(worker.processor({ data })).rejects.toThrow('Failed to execute transfer');
  });
});
