import { Router } from 'express';

import type { MisdirectedController } from '../controllers/misdirected.controller.js';

export function createPaymentsRouter(controller: MisdirectedController) {
  const router = Router();

  // GET /v1/payments/misdirected
  router.get('/misdirected', (req, res, next) => {
    controller.list(req, res, next).catch(next);
  });

  return router;
}
