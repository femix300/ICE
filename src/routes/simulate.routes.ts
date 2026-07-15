import { Router } from 'express';
import type { RequestHandler } from 'express';

export interface SimulateController {
  simulateWebhook: RequestHandler;
}

export function createSimulateRouter(
  controller: SimulateController,
  authMiddleware: RequestHandler,
) {
  const router = Router();
  
  router.post('/', authMiddleware, (req, res, next) => {
    Promise.resolve(controller.simulateWebhook(req, res, next)).catch(next);
  });

  return router;
}
