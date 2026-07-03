import express from 'express';

import { config } from './config.js';
import { createDbPool } from './db/client.js';
import { createTransactionsRepo } from './repositories/transactions.repo.js';
import { createWebhookInboundService } from './services/webhook-inbound.service.js';
import { createWebhooksController } from './controllers/webhooks.controller.js';
import { createWebhooksRouter } from './routes/webhooks.routes.js';
import { createMisdirectedRepo } from './repositories/misdirected.repo.js';
import { createMisdirectedService } from './services/misdirected.service.js';
import { createMisdirectedController } from './controllers/misdirected.controller.js';
import { createPaymentsRouter } from './routes/payments.routes.js';
import { errorHandler } from './middleware/errors.js';
import { ok } from './lib/respond.js';

const db = createDbPool(config.DATABASE_URL);

// Repositories
const transactionsRepo = createTransactionsRepo(db);
const misdirectedRepo = createMisdirectedRepo(db);

// Services
const webhookInboundService = createWebhookInboundService({
  transactions: transactionsRepo,
  webhookSecret: config.NOMBA_WEBHOOK_SECRET,
});
const misdirectedService = createMisdirectedService({
  misdirected: misdirectedRepo,
});

// Controllers
const webhooksController = createWebhooksController(webhookInboundService);
const misdirectedController = createMisdirectedController(misdirectedService);

const app = express();

app.get('/healthz', (_req, res) => {
  return ok(res, { status: 'ok' });
});

const v1 = express.Router();

v1.use(express.text({ type: 'application/json' }));
v1.use(express.json());

// Routes
v1.use(createWebhooksRouter(webhooksController));
v1.use('/payments', createPaymentsRouter(misdirectedController));

app.use('/v1', v1);

app.use(errorHandler);

export { app, db };
