import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';

import { config } from './config.js';
import { createDbPool } from './db/client.js';
import { createTransactionsRepo } from './repositories/transactions.repo.js';
import { createWebhookInboundService } from './services/webhook-inbound.service.js';
import { createWebhooksController } from './controllers/webhooks.controller.js';
import { createWebhooksRouter } from './routes/webhooks.routes.js';
import { redis } from './lib/redis.js';
import { v1Router, setupV1Router } from './routes/v1.js';
import { notFoundHandler, errorHandler } from './middleware/errors.js';
import { createMerchantsRepo } from './repositories/merchants.repo.js';
import { createMerchantsService } from './services/merchants.service.js';
import { createMerchantsController } from './controllers/merchants.controller.js';
import { createMerchantsRouter } from './routes/merchants.routes.js';
import { createVendorsRepo } from './repositories/vendors.repo.js';
import { createVendorsService } from './services/vendors.service.js';
import { createVendorsController } from './controllers/vendors.controller.js';
import { createVendorsRouter } from './routes/vendors.routes.js';
import { createNombaClient } from './lib/nomba.js';
import { createAuthMiddleware } from './middleware/auth.js';
import { createInvoicesRepo } from './repositories/invoices.repo.js';
import { createInvoicesService } from './services/invoices.service.js';
import { createInvoicesController } from './controllers/invoices.controller.js';
import { createInvoicesRouter } from './routes/invoices.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const db = createDbPool(config.DATABASE_URL);

const nomba = createNombaClient();

const merchantsRepo = createMerchantsRepo(db);
const vendorsRepo = createVendorsRepo(db);
const transactionsRepo = createTransactionsRepo(db);
const invoicesRepo = createInvoicesRepo(db);

const webhookInboundService = createWebhookInboundService({
  transactions: transactionsRepo,
  webhookSecret: config.NOMBA_WEBHOOK_SECRET,
});

const merchantsService = createMerchantsService({ merchants: merchantsRepo });
const vendorsService = createVendorsService({ vendors: vendorsRepo, nomba });
const invoicesService = createInvoicesService({ invoices: invoicesRepo });

const merchantsController = createMerchantsController(merchantsService);
const vendorsController = createVendorsController(vendorsService);
const webhooksController = createWebhooksController(webhookInboundService);
const invoicesController = createInvoicesController(invoicesService);

const authMiddleware = createAuthMiddleware({ merchants: merchantsRepo, vendors: vendorsRepo });

const merchantsRouter = createMerchantsRouter(merchantsController, authMiddleware);
const vendorsRouter = createVendorsRouter(vendorsController, authMiddleware);
const webhooksRouter = createWebhooksRouter(webhooksController);
const invoicesRouter = createInvoicesRouter(invoicesController);

setupV1Router({ merchantsRouter, vendorsRouter });

// Assign a request ID for tracing
app.use((_req, res, next) => {
  res.locals.requestId = crypto.randomUUID();
  next();
});

// Middleware order is fixed per engineering guidelines
// Wait, we need to allow inline scripts for Redoc and Swagger in Helmet CSP
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.redoc.ly"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "https://validator.swagger.io"],
      workerSrc: ["'self'", "blob:"],
    },
  },
}));

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

// Serve API Docs
const swaggerDocument = YAML.load(path.join(__dirname, '../docs/openapi.yaml'));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get('/openapi.yaml', (req, res) => {
  res.sendFile(path.join(__dirname, '../docs/openapi.yaml'));
});

app.get('/redoc', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>ICE API Documentation (ReDoc)</title>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
        <style>body { margin: 0; padding: 0; }</style>
      </head>
      <body>
        <redoc spec-url='/openapi.yaml'></redoc>
        <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
      </body>
    </html>
  `);
});

// Mount invoices router
v1Router.use('/invoices', invoicesRouter);

// Scope the raw text parser specifically to the webhook route
v1Router.use('/webhooks/nomba', express.text({ type: 'application/json' }), webhooksRouter);

// API Routes
app.use('/v1', v1Router);

// Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

export { app, db };
