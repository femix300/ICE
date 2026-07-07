import { Router, type RequestHandler } from 'express';
import type { createMerchantsController } from '../controllers/merchants.controller.js';

export function createMerchantsRouter(
  controller: ReturnType<typeof createMerchantsController>,
  authMiddleware: RequestHandler,
) {
  const router = Router();

  router.post('/register', controller.register);
  router.get('/:id', authMiddleware, controller.getById);
  router.put('/:id/webhook-url', authMiddleware, controller.updateWebhookUrl);
  router.post('/:id/api-keys/rotate', authMiddleware, controller.rotateApiKey);
  router.get('/:id/webhook-deliveries', authMiddleware, controller.listWebhookDeliveries);

  return router;
}
