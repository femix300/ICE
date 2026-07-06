import express from 'express';

import { config } from './config.js';
import { createDbPool } from './db/client.js';
import { createTransactionsRepo } from './repositories/transactions.repo.js';
import { createWebhookInboundService } from './services/webhook-inbound.service.js';
import { createWebhooksController } from './controllers/webhooks.controller.js';
import { createWebhooksRouter } from './routes/webhooks.routes.js';
import { createInvoicesRepo } from './repositories/invoices.repo.js';
import { createReconciliationRepo } from './repositories/reconciliation.repo.js';
import { createMisdirectedRepo } from './repositories/misdirected.repo.js';
import { createMisdirectedService } from './services/misdirected.service.js';
import { createMisdirectedController } from './controllers/misdirected.controller.js';
import { createPaymentsRouter } from './routes/payments.routes.js';
import { createNombaClient } from './lib/nomba.js';
import { createAuditRepo } from './repositories/audit.repo.js';
import { errorHandler } from './middleware/errors.js';
import { ok } from './lib/respond.js';

const db = createDbPool(config.DATABASE_URL);

// Repositories
const transactionsRepo = createTransactionsRepo(db);
const invoicesRepo = createInvoicesRepo(db);
const reconciliationRepo = createReconciliationRepo(db);
const misdirectedRepo = createMisdirectedRepo(db);
const auditRepo = createAuditRepo(); // Placeholder for M07

// Clients
const nombaClient = createNombaClient();
// Authenticate Nomba client in background
nombaClient.authenticate().catch((err: unknown) => {
  console.error('Failed to authenticate Nomba client at startup:', err);
});

// Services
const webhookInboundService = createWebhookInboundService({
  transactions: transactionsRepo,
  webhookSecret: config.NOMBA_WEBHOOK_SECRET,
});
const misdirectedService = createMisdirectedService({
  misdirected: misdirectedRepo,
  invoices: invoicesRepo,
  reconciliation: reconciliationRepo,
  nombaTransfer: nombaClient,
  audit: auditRepo,
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
