import express from 'express';

import { config } from './config.js';
import { createDbPool } from './db/client.js';
import { createTransactionsRepo } from './repositories/transactions.repo.js';
import { createWebhookInboundService } from './services/webhook-inbound.service.js';
import { createWebhooksController } from './controllers/webhooks.controller.js';
import { createWebhooksRouter } from './routes/webhooks.routes.js';
import { errorHandler } from './middleware/errors.js';
import { ok } from './lib/respond.js';

const db = createDbPool(config.DATABASE_URL);

const transactionsRepo = createTransactionsRepo(db);

const webhookInboundService = createWebhookInboundService({
  transactions: transactionsRepo,
  webhookSecret: config.NOMBA_WEBHOOK_SECRET,
});

const webhooksController = createWebhooksController(webhookInboundService);
=======
import { redis } from './lib/redis.js';
import { v1Router } from './routes/v1.js';
import { notFoundHandler, errorHandler } from './middleware/errors.js';

const app = express();

app.get('/healthz', (_req, res) => {
  return ok(res, { status: 'ok' });
});

const v1 = express.Router();

v1.use(express.text({ type: 'application/json' }));
v1.use(createWebhooksRouter(webhooksController));
=======
// Health Check
app.get('/healthz', (req, res) => {
  if (redis.status !== 'ready') {
    return res.status(503).json({ ok: false, error: 'Redis is not ready' });
  }
  return res.json({ ok: true, redis: 'ready' });
});

app.use('/v1', v1);

app.use(errorHandler);

export { app, db };
