import { Router } from 'express';

import type { ReconciliationController } from '../controllers/reconciliation.controller.js';

export function createReconciliationRouter(controller: ReconciliationController) {
  const router = Router();

  // GET /v1/reconciliation/logs
  router.get('/logs', (req, res, next) => {
    controller.listLogs(req, res, next).catch(next);
  });

  return router;
}
