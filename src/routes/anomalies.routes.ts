import { Router } from 'express';
import type { RequestHandler } from 'express';

export interface AnomaliesController {
  list: RequestHandler;
  dismiss: RequestHandler;
}

export function createAnomaliesRouter(
  controller: AnomaliesController,
  authMiddleware: RequestHandler,
) {
  const router = Router();

  router.use(authMiddleware);

  router.get('/', controller.list);
  router.delete('/:id', controller.dismiss);

  return router;
}
