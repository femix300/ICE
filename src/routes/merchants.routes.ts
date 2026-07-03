import { Router, type RequestHandler } from 'express';
import type { createMerchantsController } from '../controllers/merchants.controller.js';

export function createMerchantsRouter(
  controller: ReturnType<typeof createMerchantsController>,
  authMiddleware: RequestHandler
) {
  const router = Router();

  router.post('/register', controller.register);
  router.get('/:id', authMiddleware, controller.getById);

  return router;
}
