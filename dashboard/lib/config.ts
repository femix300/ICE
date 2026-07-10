import { z } from 'zod';
import { AppError } from './errors';

const envSchema = z.object({
  // Base URL the browser uses to reach the ICE backend. Defaults to the
  // same-origin /api proxy (see next.config.ts rewrites). To bypass the proxy
  // and call the backend directly, set this to its absolute URL (CORS must then
  // allow the dashboard origin).
  NEXT_PUBLIC_API_URL: z.string().min(1).default('/api'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const _env = envSchema.safeParse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NODE_ENV: process.env.NODE_ENV,
});

if (!_env.success) {
  throw new AppError('CONFIG_ERROR', 'Invalid environment variables configuration');
}

export type Config = z.infer<typeof envSchema>;
export const config: Config = _env.data;
