import { Router } from 'express';

export function createStatementsRouter(controller: any) {
  const router = Router();

  // GET /v1/vendors/:id/statement
  router.get('/v1/vendors/:id/statement', (req, res, next) => {
    controller.getVendorStatement(req, res).catch(next);
  });

  // GET /v1/vendors/:id/customers/:cid/statement
  router.get('/v1/vendors/:id/customers/:cid/statement', (req, res, next) => {
    controller.getCustomerStatement(req, res).catch(next);
  });

  // GET /v1/vendors/:id/transactions
  router.get('/v1/vendors/:id/transactions', (req, res, next) => {
    controller.getTransactions(req, res).catch(next);
  });

  return router;
}
