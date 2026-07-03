import { Router } from 'express';
import type { RequestHandler } from 'express';

export interface VendorsController {
  create: RequestHandler;
  getById: RequestHandler;
}

export function createVendorsRouter(controller: VendorsController, authMiddleware: RequestHandler) {
  const router = Router();

  router.use(authMiddleware);

  router.post('/', controller.create);
  router.get('/:id', controller.getById);

  return router;
}
