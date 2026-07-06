import { Router } from 'express';

import type { MisdirectedController } from '../controllers/misdirected.controller.js';

export function createPaymentsRouter(controller: MisdirectedController) {
  const router = Router();

  // GET /v1/payments/misdirected
  router.get('/misdirected', (req, res, next) => {
    controller.list(req, res, next).catch(next);
  });

  // POST /v1/payments/:id/match
  router.post('/:id/match', (req, res, next) => {
    controller.match(req, res, next).catch(next);
  });

  // POST /v1/payments/:id/refund
  router.post('/:id/refund', (req, res, next) => {
    controller.refund(req, res, next).catch(next);
  });

  return router;
}
