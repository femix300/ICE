import { Redis } from 'ioredis';
import { createLogger } from './logger.js';
import { config } from '../config.js';

const log = createLogger('redis');

export const redis = new Redis(config.REDIS_URL || '', {
  maxRetriesPerRequest: null, // BullMQ requirement
});

redis.on('error', (err: unknown) => {
  log.error({ err }, 'Redis connection error');
});

redis.on('connect', () => {
  log.info({}, 'Redis connected');
});
