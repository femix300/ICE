import { z } from 'zod';
import { AppError } from './errors';
import { createLogger } from './logger';

const log = createLogger('config');

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

// Safe parse process.env in a way that works both on server and client
const _env = envSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NODE_ENV: process.env.NODE_ENV,
});

if (!_env.success) {
  log.error({ errors: _env.error.format() }, 'Invalid environment variables');
  throw new AppError('CONFIG_ERROR', 'Invalid environment variables configuration');
}

export const config = _env.data;
