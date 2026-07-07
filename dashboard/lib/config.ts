import { z } from 'zod';
import { AppError } from './errors';

const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default('http://localhost:3000'),
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
