import type { Request, Response } from 'express';
import type { Queue } from 'bullmq';
import { createLogger } from '../lib/logger.ts';

const log = createLogger('webhook-controller');

// Stub ok envelope
const ok = (res: Response, data: unknown) => res.status(200).json({ ok: true, data });

class AppError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'AppError';
  }
}

export const ReplayPayloadSchema = z.object({
  id: z.string(),
});

export interface DeliveryRepoStub {
  byId: (id: string) => Promise<{ id: string; merchant_id: string; event_type: string; payload: any } | null>;
}

export interface WebhookDeliveryQueueStub {
  add: (name: string, data: any) => Promise<any>;
}

export function createWebhookDeliveriesController(deps: {
  repo: DeliveryRepoStub;
  webhookDeliveryQueue: WebhookDeliveryQueueStub;
}) {
  return {
    replay: async (req: Request, res: Response) => {
      const parsed = ReplayPayloadSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError('VALIDATION_ERROR', 'Invalid replay payload');
      }

      const { id } = parsed.data;

      const delivery = await deps.repo.byId(id);
      if (!delivery) {
        throw new AppError('NOT_FOUND', 'Webhook delivery record not found');
      }

      await deps.webhookDeliveryQueue.add('webhook-delivery', {
        merchant_id: delivery.merchant_id,
        event_type: delivery.event_type,
        payload: delivery.payload,
      });

      log.info({ deliveryId: id }, 'Webhook manually enqueued for replay');
      return ok(res, { message: 'Replay initiated' });
    }
  };
}
