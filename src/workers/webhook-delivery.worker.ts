import { Worker, type Job, type Queue } from 'bullmq';
import { redis } from '../lib/redis.ts';
import { createLogger } from '../lib/logger.ts';

const log = createLogger('webhook-delivery-worker');

// Stubs for types until dependencies land
export interface MerchantRepoStub {
  byId: (id: string) => Promise<{ webhook_url?: string } | null>;
}

export interface WebhookDeliveriesRepoStub {
  log: (data: unknown) => Promise<void>;
  markDeadLetter: (merchant_id: string, job_id: string) => Promise<void>;
}

export function createWebhookDeliveryWorker(deps: {
  merchants: MerchantRepoStub;
  deliveries: WebhookDeliveriesRepoStub;
  webhookDeliveryQueue: Queue;
}) {
  const worker = new Worker(
    'webhook-delivery',
    async (job: Job) => {
      const { merchant_id, event_type, payload } = job.data;
      
      const merchant = await deps.merchants.byId(merchant_id);
      if (!merchant?.webhook_url) {
        log.info({ merchant_id, jobId: job.id }, 'Skipping webhook delivery: No webhook URL configured');
        return;
      }

      const response = await fetch(merchant.webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-ICE-Event': event_type },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
      });

      await deps.deliveries.log({
        merchant_id,
        event_type,
        payload,
        status: response.ok ? 'DELIVERED' : 'FAILED',
        http_status: response.status,
        retry_count: job.attemptsMade,
      });

      if (!response.ok) {
        throw new Error(`Delivery failed: ${response.status}`);
      }
    },
    { connection: redis }
  );

  worker.on('failed', async (job, err: unknown) => {
    log.error({ err, jobId: job?.id }, 'Webhook delivery job failed');
    
    if (job && job.opts.attempts && job.attemptsMade >= job.opts.attempts) {
      if (job.data.event_type !== 'system.webhook_dead_letter' && job.id) {
        await deps.deliveries.markDeadLetter(job.data.merchant_id, job.id);
        await deps.webhookDeliveryQueue.add('webhook-delivery', {
          merchant_id: job.data.merchant_id,
          event_type: 'system.webhook_dead_letter',
          payload: { failed_event: job.data.event_type, attempts: job.attemptsMade },
        });
      }
    }
  });

  return worker;
}
