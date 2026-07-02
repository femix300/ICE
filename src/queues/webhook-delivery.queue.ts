import { Queue } from 'bullmq';
import { redis } from '../lib/redis.ts';

const defaultJobOptions = {
  attempts: 5,
  backoff: { type: 'exponential', delay: 30_000 },
  removeOnComplete: 100,
  removeOnFail: 500,
} as const;

export const webhookDeliveryQueue = new Queue('webhook-delivery', {
  connection: redis,
  defaultJobOptions,
});
