import { describe, it, expect, vi } from 'vitest';

vi.mock('ioredis', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      on: vi.fn(),
      status: 'ready',
    })),
  };
});

import { webhookDeliveryQueue, refundQueue } from '../../src/queues/index.js';

describe('BullMQ Queues', () => {
  it('webhookDeliveryQueue is initialized with correct name', () => {
    expect(webhookDeliveryQueue).toBeDefined();
    expect(webhookDeliveryQueue.name).toBe('webhook-delivery');
  });

  it('refundQueue is initialized with correct name', () => {
    expect(refundQueue).toBeDefined();
    expect(refundQueue.name).toBe('refund');
  });
});
