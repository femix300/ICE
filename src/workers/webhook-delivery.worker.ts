import { Worker, type Job, type Queue } from 'bullmq';
import { z } from 'zod';
import { redis } from '../lib/redis.ts';
import { createLogger } from '../lib/logger.ts';
import { AppError } from '../lib/errors.ts';
import type { createMerchantsRepo } from '../repositories/merchants.repo.ts';
import type { createWebhookDeliveriesRepo } from '../repositories/webhook-deliveries.repo.ts';

const log = createLogger('webhook-worker');



export const WebhookPayloadSchema = z.object({
  merchant_id: z.string(),
  event_type: z.string(),
  payload: z.record(z.unknown()),
});

export type WebhookPayload = z.infer<typeof WebhookPayloadSchema>;

export function createWebhookDeliveryWorker(deps: {
  merchants: ReturnType<typeof createMerchantsRepo>;
  deliveries: ReturnType<typeof createWebhookDeliveriesRepo>;
  deadLetterQueue: Queue;
}) {
  const worker = new Worker(
    'webhook-delivery',
    async (job: Job<WebhookPayload>) => {
      const parsed = WebhookPayloadSchema.safeParse(job.data);
      if (!parsed.success) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Invalid webhook payload');
      }
      
      const { merchant_id, event_type, payload } = parsed.data;

      const merchant = await deps.merchants.byId(merchant_id);
      if (!merchant.webhook_url) {
        log.warn({ merchant_id }, 'Merchant has no webhook URL, skipping delivery');
        return;
      }

      let response;
      try {
        response = await fetch(merchant.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-ICE-Event': event_type },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10_000), // 10s timeout
        });
      } catch (err) {
        await deps.deliveries.log({
          merchant_id,
          event_type,
          payload,
          status: 'FAILED',
          retry_count: job.attemptsMade,
        });
        throw new AppError(500, 'DELIVERY_FAILED', 'Network error or timeout during delivery');
      }

      await deps.deliveries.log({
        merchant_id,
        event_type,
        payload,
        status: response.ok ? 'DELIVERED' : 'FAILED',
        http_status: response.status,
        retry_count: job.attemptsMade,
      });

      if (!response.ok) {
        throw new AppError(500, 'DELIVERY_FAILED', `Delivery failed: ${response.status}`);
      }
    },
    { 
      connection: redis,
      settings: {
        backoffStrategy: (attemptsMade: number) => {
          // Linear PRD mandates: 30s, 2m, 10m, 30m
          switch (attemptsMade) {
            case 1: return 30 * 1000;
            case 2: return 2 * 60 * 1000;
            case 3: return 10 * 60 * 1000;
            case 4: return 30 * 60 * 1000;
            default: return -1;
          }
        }
      }
    }
  );

  worker.on('failed', async (job: Job<WebhookPayload> | undefined, err: Error) => {
    log.error({ err, jobId: job?.id }, 'Webhook delivery job failed');
    if (job && job.attemptsMade >= (job.opts.attempts || 5)) {
      log.warn({ jobId: job.id }, 'Max retries reached, routing to DLQ');
      await deps.deadLetterQueue.add('dead-letter', job.data);
      if (job.data) {
        await deps.deliveries.markDeadLetter(job.data.merchant_id, job.data.event_type, job.data.payload);
      }
    }
  });

  return worker;
}
