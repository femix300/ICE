import { Worker } from 'bullmq';
import { redis } from '../lib/redis.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('refund-worker');

export const refundWorker = new Worker(
  'refund',
  async (job) => {
    // To be implemented in E04
    log.info({ job: job.id }, 'Processing refund');
  },
  // @ts-expect-error type mismatch between bullmq's ioredis and the project's ioredis
  { connection: redis }
);

refundWorker.on('failed', (job, err: unknown) => {
  log.error({ err, jobId: job?.id }, 'Refund job failed');
});
