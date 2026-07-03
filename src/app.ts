import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import crypto from 'node:crypto';

import { config } from './config.js';
import { createDbPool } from './db/client.js';
import { createTransactionsRepo } from './repositories/transactions.repo.js';
import { createWebhookInboundService } from './services/webhook-inbound.service.js';
import { createWebhooksController } from './controllers/webhooks.controller.js';
import { createWebhooksRouter } from './routes/webhooks.routes.js';
import { redis } from './lib/redis.js';
import { v1Router } from './routes/v1.js';
import { notFoundHandler, errorHandler } from './middleware/errors.js';

const app = express();

const db = createDbPool(config.DATABASE_URL);
const transactionsRepo = createTransactionsRepo(db);
const webhookInboundService = createWebhookInboundService({
  transactions: transactionsRepo,
  webhookSecret: config.NOMBA_WEBHOOK_SECRET,
});
const webhooksController = createWebhooksController(webhookInboundService);
const webhooksRouter = createWebhooksRouter(webhooksController);

// Assign a request ID for tracing
app.use((_req, res, next) => {
  res.locals.requestId = crypto.randomUUID();
  next();
});

// Middleware order is fixed per engineering guidelines
app.use(helmet());
app.use(cors({ origin: config.CORS_ORIGIN }));
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({ windowMs: 60_000, max: 100 }));

// Health Check
app.get('/healthz', (req, res) => {
  if (redis.status !== 'ready') {
    return res.status(503).json({ ok: false, error: 'Redis is not ready' });
  }
  return res.json({ ok: true, redis: 'ready' });
});

// Scope the raw text parser specifically to the webhook route
v1Router.use('/webhooks/nomba', express.text({ type: 'application/json' }), webhooksRouter);

// API Routes
app.use('/v1', v1Router);

// Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

export { app, db };
