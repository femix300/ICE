import type { Request, Response } from 'express';
import type { Queue } from 'bullmq';
import { createLogger } from '../lib/logger.ts';

// Stubs for AppError and ok respond helper
class AppError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}
const ok = (res: Response, data: unknown) => res.status(200).json({ ok: true, data });

const log = createLogger('webhook-deliveries-controller');

export interface WebhookDeliveriesRepoStub {
  byId: (id: string) => Promise<{ merchant_id: string; event_type: string; payload: unknown } | null>;
}

export function createWebhookDeliveriesController(deps: {
  deliveries: WebhookDeliveriesRepoStub;
  webhookDeliveryQueue: Queue;
}) {
  return {
    replay: async (req: Request, res: Response) => {
      const deliveryId = req.params.id;
      
      if (!deliveryId) {
        throw new AppError('INVALID_INPUT', 'Delivery ID is required');
      }

      const delivery = await deps.deliveries.byId(deliveryId);
      if (!delivery) {
        throw new AppError('NOT_FOUND', 'Webhook delivery not found');
      }

      // Re-add to queue with fresh attempts
      await deps.webhookDeliveryQueue.add('webhook-delivery', {
        merchant_id: delivery.merchant_id,
        event_type: delivery.event_type,
        payload: delivery.payload,
      });

      log.info({ deliveryId }, 'Webhook delivery manually replayed');
      
      return ok(res, { message: 'Delivery re-queued successfully' });
    }
  };
}
