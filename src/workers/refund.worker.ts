import { Worker } from 'bullmq';
import { redis } from '../lib/redis.ts';
import { createLogger } from '../lib/logger.ts';

const log = createLogger('refund-worker');

export const refundWorker = new Worker(
  'refund',
  async (job) => {
    // To be implemented in E04
    log.info({ jobId: job.id }, 'Processing refund');
  },
  { connection: redis }
);

refundWorker.on('failed', (job, err: unknown) => {
  log.error({ err, jobId: job?.id }, 'Refund job failed');
});
