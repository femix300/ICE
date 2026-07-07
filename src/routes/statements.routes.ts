import { Router } from 'express';
import type { RequestHandler } from 'express';

import type { StatementsController } from '../controllers/statements.controller.js';

export function createStatementsRouter(
  controller: StatementsController,
  authMiddleware: RequestHandler,
) {
  const router = Router();

  router.use(authMiddleware);

  // GET /v1/vendors/:id/statement
  router.get('/vendors/:id/statement', (req, res, next) => {
    controller.getVendorStatement(req, res, next).catch(next);
  });

  // GET /v1/vendors/:id/customers/:cid/statement
  router.get('/vendors/:id/customers/:cid/statement', (req, res, next) => {
    controller.getCustomerStatement(req, res, next).catch(next);
  });

  // GET /v1/vendors/:id/transactions
  router.get('/vendors/:id/transactions', (req, res, next) => {
    controller.getTransactions(req, res, next).catch(next);
  });

  // GET /v1/merchants/:id/summary (master key only)
  router.get('/merchants/:id/summary', (req, res, next) => {
    controller.getPlatformSummary(req, res, next).catch(next);
  });

  // GET /v1/transactions/:id
  router.get('/transactions/:id', (req, res, next) => {
    controller.getTransactionById(req, res, next).catch(next);
  });

  return router;
}
