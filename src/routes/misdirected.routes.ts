import { Router } from 'express';
import type { RequestHandler } from 'express';

import type { MisdirectedController } from '../controllers/misdirected.controller.js';

export function createMisdirectedRouter(
  controller: MisdirectedController,
  authMiddleware: RequestHandler,
) {
  const router = Router();

  router.get('/misdirected', authMiddleware, (req, res, next) => {
    controller.list(req, res, next).catch(next);
  });

  router.post('/:id/match', authMiddleware, (req, res, next) => {
    controller.match(req, res, next).catch(next);
  });

  router.post('/:id/refund', authMiddleware, (req, res, next) => {
    controller.refund(req, res, next).catch(next);
  });

  return router;
}
