import { z } from 'zod';
import dotenv from 'dotenv';
import pino from 'pino';

dotenv.config();

const configSchema = z.object({
  DATABASE_URL: z.string().url().default('postgresql://postgres:1249@localhost:5432/nomba'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NOMBA_WEBHOOK_SECRET: z.string().min(1).default('dev-webhook-secret'),
  PORT: z.coerce.number().int().positive().default(3000),
});

const parsed = configSchema.safeParse(process.env);

if (!parsed.success) {
  const log = pino({ name: 'config' });
  log.error({ error: parsed.error.format() }, 'Invalid environment variables');
  process.exit(1);
}

export const config = parsed.data;
