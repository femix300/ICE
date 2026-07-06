import { Router } from 'express';
import type { RequestHandler } from 'express';

export interface CustomersController {
  create: RequestHandler;
  getById: RequestHandler;
  provisionDva: RequestHandler;
}

export function createCustomersRouter(
  controller: CustomersController,
  authMiddleware: RequestHandler,
) {
  const router = Router({ mergeParams: true });

  router.use(authMiddleware);

  router.post('/', controller.create);
  router.get('/:cid', controller.getById);
  router.post('/:cid/account', controller.provisionDva);

  return router;
}
