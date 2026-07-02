import { Router } from 'express';

// Stubs for types
export function createWebhookDeliveriesRouter(controller: {
  replay: (req: any, res: any) => Promise<any>;
}) {
  const router = Router();

  // POST /v1/webhook-deliveries/:id/replay
  // Note: auth middleware to enforce master key would be added here in full integration
  router.post('/:id/replay', (req, res, next) => {
    controller.replay(req, res).catch(next);
  });

  return router;
}
