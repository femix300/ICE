import Redis from 'ioredis';
import { createLogger } from './logger.ts';
import { config } from '../config.ts';

const log = createLogger('redis');

export const redis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: null, // BullMQ requirement
});

redis.on('error', (err: unknown) => {
  log.error({ err }, 'Redis connection error');
});

redis.on('connect', () => {
  log.info({}, 'Redis connected');
});
