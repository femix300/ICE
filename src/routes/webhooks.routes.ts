import { Router } from 'express';
import type { WebhooksController } from '../controllers/webhooks.controller.js';

export function createWebhooksRouter(controller: WebhooksController) {
  const router = Router();
  router.post('/', (req, res, next) => {
    controller.receiveNombaWebhook(req, res, next).catch(next);
  });
  router.all('/', (req, res) => {
    res.status(405).json({
      ok: false,
      errorCode: 'METHOD_NOT_ALLOWED',
      message: 'Only POST is supported on this endpoint',
    });
  });
  return router;
}
