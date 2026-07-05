import { Router } from 'express';
import type { RequestHandler } from 'express';

export interface VendorsController {
  create: RequestHandler;
  getById: RequestHandler;
  list: RequestHandler;
  generateApiKey: RequestHandler;
  suspend: RequestHandler;
  updateAccount: RequestHandler;
}

export function createVendorsRouter(controller: VendorsController, authMiddleware: RequestHandler) {
  const router = Router();

  router.use(authMiddleware);

  router.post('/', controller.create);
  router.get('/', controller.list);
  router.get('/:id', controller.getById);
  router.post('/:id/api-keys', controller.generateApiKey);
  router.post('/:id/account/suspend', controller.suspend);
  router.put('/:id/account', controller.updateAccount);

  return router;
}
