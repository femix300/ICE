import { Router } from 'express';

import { db } from '../db/index.js';
import { createTransactionsRepo } from '../repositories/transactions.repo.js';
import { createWebhookInboundService } from '../services/webhook-inbound.service.js';
import { createWebhooksController } from '../controllers/webhooks.controller.js';
import { createWebhooksRouter } from './webhooks.routes.js';
import { config } from '../config.js';

const v1Router = Router();

const transactionsRepo = createTransactionsRepo(db);
const webhookInboundService = createWebhookInboundService({
  transactions: transactionsRepo,
  webhookSecret: config.NOMBA_WEBHOOK_SECRET || 'dev-webhook-secret',
});
const webhooksController = createWebhooksController(webhookInboundService);

v1Router.use(createWebhooksRouter(webhooksController));

export { v1Router };
