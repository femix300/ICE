import { Router } from 'express';
import type { Request, Response, NextFunction, RequestHandler } from 'express';

export function createWebhookDeliveriesRouter(
  controller: {
    replay: (req: Request, res: Response) => Promise<unknown>;
  },
  authMiddleware: RequestHandler,
) {
  const router = Router();

  // POST /v1/webhook-deliveries/:id/replay
  router.post(
    '/:id/replay',
    authMiddleware,
    (req: Request, res: Response, next: NextFunction) => {
      controller.replay(req, res).catch(next);
    },
  );

  return router;
}
