import { Router } from 'express';

import type { WebhooksController } from '../controllers/webhooks.controller.js';

export function createWebhooksRouter(controller: WebhooksController) {
  const router = Router();

  router.post('/webhooks/nomba', (req, res, next) => {
    controller.receiveNombaWebhook(req, res, next).catch(next);
  });

  return router;
}
