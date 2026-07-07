import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createWebhookDeliveriesController } from '../../src/controllers/webhook-deliveries.controller.ts';

describe('webhookDeliveriesController', () => {
  let mockRepo: any;
  let mockQueue: any;
  let controller: any;
  let req: any;
  let res: any;

  beforeEach(() => {
    mockRepo = { byId: vi.fn() };
    mockQueue = { add: vi.fn() };
    controller = createWebhookDeliveriesController({
      repo: mockRepo,
      webhookDeliveryQueue: mockQueue
    });
    req = { body: {} };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    };
  });

  it('throws AppError (VALIDATION_ERROR) when id is missing', async () => {
    await expect(controller.replay(req, res)).rejects.toThrow('Invalid replay payload');
  });

  it('throws AppError (NOT_FOUND) when delivery is not found', async () => {
    req.body = { id: 'invalid-id' };
    mockRepo.byId.mockResolvedValue(null);
    await expect(controller.replay(req, res)).rejects.toThrow('Webhook delivery record not found');
  });

  it('enqueues delivery and returns success response', async () => {
    req.body = { id: 'valid-id' };
    mockRepo.byId.mockResolvedValue({
      id: 'valid-id',
      merchant_id: 'm-123',
      event_type: 'test.event',
      payload: { data: 1 }
    });

    await controller.replay(req, res);

    expect(mockQueue.add).toHaveBeenCalledWith('webhook-delivery', {
      merchant_id: 'm-123',
      event_type: 'test.event',
      payload: { data: 1 }
    });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true, data: { message: 'Replay initiated' } });
  });
});
