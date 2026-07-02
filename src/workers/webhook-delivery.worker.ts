import { Worker } from 'bullmq';
import { redis } from '../lib/redis.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('webhook-delivery-worker');

export const webhookDeliveryWorker = new Worker(
  'webhook-delivery',
  async (job) => {
    // To be implemented in E02
    log.info({ job: job.id }, 'Processing webhook delivery');
  },
  // @ts-expect-error type mismatch between bullmq's ioredis and the project's ioredis
  { connection: redis }
);

webhookDeliveryWorker.on('failed', (job, err: unknown) => {
  log.error({ err, jobId: job?.id }, 'Webhook delivery job failed');
});
