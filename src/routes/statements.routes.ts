import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';

export interface StatementsControllerStub {
  getVendorStatement: (req: Request, res: Response) => Promise<unknown>;
  getCustomerStatement: (req: Request, res: Response) => Promise<unknown>;
  getTransactions: (req: Request, res: Response) => Promise<unknown>;
}

export function createStatementsRouter(controller: StatementsControllerStub) {
  const router = Router();

  // GET /vendors/:id/statement
  router.get('/vendors/:id/statement', (req: Request, res: Response, next: NextFunction) => {
    controller.getVendorStatement(req, res).catch(next);
  });

  // GET /vendors/:id/customers/:cid/statement
  router.get(
    '/vendors/:id/customers/:cid/statement',
    (req: Request, res: Response, next: NextFunction) => {
      controller.getCustomerStatement(req, res).catch(next);
    },
  );

  // GET /vendors/:id/transactions
  router.get('/vendors/:id/transactions', (req: Request, res: Response, next: NextFunction) => {
    controller.getTransactions(req, res).catch(next);
  });

  return router;
}
