import { Worker } from 'bullmq';
import { redis } from '../lib/redis.ts';
import { createLogger } from '../lib/logger.ts';

const log = createLogger('webhook-delivery-worker');

export const webhookDeliveryWorker = new Worker(
  'webhook-delivery',
  async (job) => {
    // To be implemented in E02
    log.info({ jobId: job.id }, 'Processing webhook delivery');
  },
  { connection: redis }
);

webhookDeliveryWorker.on('failed', (job, err: unknown) => {
  log.error({ err, jobId: job?.id }, 'Webhook delivery job failed');
});
