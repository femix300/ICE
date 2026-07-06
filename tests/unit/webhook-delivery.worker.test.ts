import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createWebhookDeliveryWorker } from '../../src/workers/webhook-delivery.worker.ts';
import type { createMerchantsRepo } from '../../src/repositories/merchants.repo.ts';
import type { createWebhookDeliveriesRepo } from '../../src/repositories/webhook-deliveries.repo.ts';
import type { Queue } from 'bullmq';

vi.mock('bullmq', () => {
  return {
    Worker: vi.fn().mockImplementation((name, processor, options) => {
      return { name, processor, options, on: vi.fn() };
    }),
  };
});

describe('webhookDeliveryWorker', () => {
  let mockMerchants: { byId: ReturnType<typeof vi.fn> };
  let mockDeliveries: { log: ReturnType<typeof vi.fn>; markDeadLetter: ReturnType<typeof vi.fn> };
  let mockDeadLetterQueue: { add: ReturnType<typeof vi.fn> };
  let worker: {
    processor: (job: unknown) => Promise<void>;
    options: { settings: { backoffStrategy: (attemptsMade: number) => number } };
  };

  beforeEach(() => {
    mockMerchants = { byId: vi.fn() };
    mockDeliveries = { log: vi.fn(), markDeadLetter: vi.fn() };
    mockDeadLetterQueue = { add: vi.fn() };
    worker = createWebhookDeliveryWorker({
      merchants: mockMerchants as unknown as ReturnType<typeof createMerchantsRepo>,
      deliveries: mockDeliveries as unknown as ReturnType<typeof createWebhookDeliveriesRepo>,
      deadLetterQueue: mockDeadLetterQueue as unknown as Queue,
    }) as unknown as typeof worker;
    global.fetch = vi.fn();
  });

  it('skips gracefully if merchant has no webhook URL', async () => {
    mockMerchants.byId.mockResolvedValue({ webhook_url: null });
    await worker.processor({ data: { merchant_id: 'test-id', event_type: 'test', payload: {} } });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('logs successful delivery as DELIVERED', async () => {
    mockMerchants.byId.mockResolvedValue({ webhook_url: 'https://test.com' });
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, status: 200 });
    
    await worker.processor({ attemptsMade: 1, data: { merchant_id: 'test-id', event_type: 'test', payload: {} } });
    expect(mockDeliveries.log).toHaveBeenCalledWith(expect.objectContaining({ status: 'DELIVERED', http_status: 200 }));
  });
});
