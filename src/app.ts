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

const app = express();

app.get('/healthz', (_req, res) => {
  return ok(res, { status: 'ok' });
});

const v1 = express.Router();

v1.use(express.text({ type: 'application/json' }));

v1.use(createWebhooksRouter(webhooksController));

app.use('/v1', v1);

app.use(errorHandler);

export { app, db };
