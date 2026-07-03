import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createWebhookDeliveryWorker } from '../../src/workers/webhook-delivery.worker.ts';

// Mock bullmq
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
      merchants: mockMerchants as any,
      deliveries: mockDeliveries as any,
      deadLetterQueue: mockDeadLetterQueue as any,
    }) as unknown as typeof worker;
    global.fetch = vi.fn();
  });

  it('skips gracefully if merchant has no webhook URL', async () => {
    mockMerchants.byId.mockResolvedValue({ webhook_url: null });
    
    await worker.processor({
      data: { merchant_id: 'test-id', event_type: 'test', payload: {} }
    });
    
    expect(global.fetch).not.toHaveBeenCalled();
    expect(mockDeliveries.log).not.toHaveBeenCalled();
  });

  it('logs successful delivery as DELIVERED', async () => {
    mockMerchants.byId.mockResolvedValue({ webhook_url: 'https://test.com' });
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, status: 200 });
    
    await worker.processor({
      attemptsMade: 1,
      data: { merchant_id: 'test-id', event_type: 'test', payload: {} }
    });
    
    expect(mockDeliveries.log).toHaveBeenCalledWith(expect.objectContaining({
      status: 'DELIVERED',
      http_status: 200,
      retry_count: 1
    }));
  });

  it('throws AppError and logs FAILED on unsuccessful HTTP response', async () => {
    mockMerchants.byId.mockResolvedValue({ webhook_url: 'https://test.com' });
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 500 });
    
    await expect(worker.processor({
      attemptsMade: 1,
      data: { merchant_id: 'test-id', event_type: 'test', payload: {} }
    })).rejects.toThrow('Delivery failed: 500');
    
    expect(mockDeliveries.log).toHaveBeenCalledWith(expect.objectContaining({
      status: 'FAILED',
      http_status: 500,
      retry_count: 1
    }));
  });

  it('enforces a 10-second timeout for fetch', async () => {
    mockMerchants.byId.mockResolvedValue({ webhook_url: 'https://test.com' });
    const abortError = new Error('The operation was aborted');
    abortError.name = 'AbortError';
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mockRejectedValue(abortError);

    await expect(worker.processor({
      attemptsMade: 1,
      data: { merchant_id: 'test-id', event_type: 'test', payload: {} }
    })).rejects.toThrow('Network error or timeout during delivery');

    expect(mockDeliveries.log).toHaveBeenCalledWith(expect.objectContaining({
      status: 'FAILED',
      retry_count: 1
    }));
  });

  it('uses custom backoff strategy', () => {
    const backoffStrategy = worker.options.settings.backoffStrategy;
    expect(backoffStrategy(1)).toBe(30000); // 30s
    expect(backoffStrategy(2)).toBe(120000); // 2m
    expect(backoffStrategy(3)).toBe(600000); // 10m
    expect(backoffStrategy(4)).toBe(1800000); // 30m
    expect(backoffStrategy(5)).toBe(-1);
  });
});
