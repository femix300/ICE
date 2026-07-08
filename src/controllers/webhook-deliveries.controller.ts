import { z } from 'zod';
import type { Request, Response } from 'express';
import { createLogger } from '../lib/logger.js';
import { AppError } from '../lib/errors.js';
import { ok } from '../lib/respond.js';

const log = createLogger('webhook-controller');

export const ReplayPayloadSchema = z.object({
  id: z.string(),
});

export interface DeliveryRepoStub {
  byId: (
    id: string,
  ) => Promise<{ id: string; merchant_id: string; event_type: string; payload: unknown } | null>;
}

export interface WebhookDeliveryQueueStub {
  add: (name: string, data: unknown) => Promise<unknown>;
}

export function createWebhookDeliveriesController(deps: {
  repo: DeliveryRepoStub;
  webhookDeliveryQueue: WebhookDeliveryQueueStub;
}) {
  return {
    replay: async (req: Request, res: Response) => {
      const parsed = ReplayPayloadSchema.safeParse(req.params);
      if (!parsed.success) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Invalid replay payload');
      }

      const { id } = parsed.data;

      const delivery = await deps.repo.byId(id);
      if (!delivery) {
        throw new AppError(404, 'NOT_FOUND', 'Webhook delivery record not found');
      }

      await deps.webhookDeliveryQueue.add('webhook-delivery', {
        merchant_id: delivery.merchant_id,
        event_type: delivery.event_type,
        payload: delivery.payload,
      });

      log.info({ deliveryId: id }, 'Webhook manually enqueued for replay');
      return ok(res, { message: 'Replay initiated' });
    },
  };
}
