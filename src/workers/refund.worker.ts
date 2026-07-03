import { Worker, type Job } from 'bullmq';
import { redis } from '../lib/redis.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('refund-worker');

export const refundWorker = new Worker(
  'refund',
  async (job: Job<unknown>) => {
    // To be implemented in E04
    log.info({ jobId: job.id }, 'Processing refund');
  },
  // @ts-expect-error type mismatch between bullmq's ioredis and the project's ioredis
  { connection: redis }
);

refundWorker.on('failed', (job: Job<unknown> | undefined, err: unknown) => {
  log.error({ err, jobId: job?.id }, 'Refund job failed');
});
