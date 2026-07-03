import { z } from 'zod';
import dotenv from 'dotenv';
import { createLogger } from './lib/logger.js';

dotenv.config();

const configSchema = z.object({
  DATABASE_URL: z.string().url(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  NOMBA_WEBHOOK_SECRET: z.string().min(1).default('dev-webhook-secret'),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGIN: z.string().url().default('http://localhost:3000'),
  NOMBA_CLIENT_ID: z.string().optional(),
  NOMBA_CLIENT_SECRET: z.string().optional(),
  NOMBA_ACCOUNT_ID: z.string().optional(),
});

const parsed = configSchema.safeParse(process.env);

export const config = parsed.success ? parsed.data : {} as z.infer<typeof configSchema>;

if (!parsed.success) {
  const log = createLogger('config');
  log.error({ error: parsed.error.format() }, 'Invalid environment variables');
  process.exit(1);
}
