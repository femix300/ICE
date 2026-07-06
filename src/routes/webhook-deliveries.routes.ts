import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { createAuthMiddleware } from '../middleware/auth.js';

export function createWebhookDeliveriesRouter(controller: {
  replay: (req: Request, res: Response) => Promise<unknown>;
}) {
  const router = Router();

  // POST /v1/webhook-deliveries/:id/replay
  router.post('/:id/replay', createAuthMiddleware, (req: Request, res: Response, next: NextFunction) => {
    controller.replay(req, res).catch(next);
  });

  return router;
}
