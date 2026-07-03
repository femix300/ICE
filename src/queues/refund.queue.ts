import { Queue } from 'bullmq';
import { redis } from '../lib/redis.js';

const defaultJobOptions = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 30_000 },
  removeOnComplete: 100,
  removeOnFail: 500,
} as const;

export const refundQueue = new Queue('refund', {
  // @ts-expect-error type mismatch between bullmq's ioredis and the project's ioredis
  connection: redis,
  defaultJobOptions,
});
