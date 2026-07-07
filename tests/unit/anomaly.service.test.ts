import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAnomalyService } from '../../src/services/anomaly.service.ts';

describe('anomalyService', () => {
  let mockRepo: any;
  let mockQueue: any;
  let service: any;
  const baseTx = {
    id: 'tx-1',
    va_number: '12345',
    vendor_id: 'v-1',
    merchant_id: 'm-1',
    sender_account: '9999',
    amount_kobo: 15000,
    received_at: '2026-07-02T12:00:00Z',
  };

  beforeEach(() => {
    mockRepo = {
      countRecentPayments: vi.fn().mockResolvedValue(0),
      getRecentAmounts: vi.fn().mockResolvedValue([]),
      hasDuplicateSender: vi.fn().mockResolvedValue(false),
      isVaSuspended: vi.fn().mockResolvedValue(false),
    };
    mockQueue = {
      add: vi.fn().mockResolvedValue(undefined),
    };
    service = createAnomalyService({ repo: mockRepo, webhookDeliveryQueue: mockQueue });
  });

  it('throws AppError if payload is invalid', async () => {
    await expect(service.analyze({})).rejects.toThrow('Invalid transaction payload for anomaly detection');
  });

  it('detects no anomalies when rules pass', async () => {
    const result = await service.analyze(baseTx);
    expect(result).toEqual([]);
    expect(mockQueue.add).not.toHaveBeenCalled();
  });

  it('detects velocity_spike', async () => {
    mockRepo.countRecentPayments.mockResolvedValue(6);
    const result = await service.analyze(baseTx);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('velocity_spike');
    expect(mockQueue.add).toHaveBeenCalledWith('webhook-delivery', expect.objectContaining({
      event_type: 'payment.anomaly_detected'
    }));
  });

  it('detects round_number_flooding', async () => {
    mockRepo.getRecentAmounts.mockResolvedValue([10000, 50000]);
    const result = await service.analyze({ ...baseTx, amount_kobo: 20000 });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('round_number_flooding');
  });

  it('continues checking other rules if one rule throws', async () => {
    mockRepo.countRecentPayments.mockRejectedValue(new Error('DB crash'));
    mockRepo.hasDuplicateSender.mockResolvedValue(true);
    const result = await service.analyze(baseTx);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('duplicate_sender');
  });
});
