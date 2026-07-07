import type { RequestHandler, Router as RouterType } from 'express';
import { Router } from 'express';

import type { InvoicesController } from '../controllers/invoices.controller.js';

export function createInvoicesRouter(
  controller: InvoicesController,
  authMiddleware: RequestHandler,
): RouterType {
  const router = Router();

  // Create a new invoice
  router.post('/', authMiddleware, (req, res, next) => {
    controller.create(req, res, next).catch(next);
  });

  // Get invoice by ID
  router.get('/:id', authMiddleware, (req, res, next) => {
    controller.getById(req, res, next).catch(next);
  });

  // List all invoices for a vendor
  router.get('/vendor/:vendorId', authMiddleware, (req, res, next) => {
    controller.listByVendor(req, res, next).catch(next);
  });

  // Issue an invoice (draft → issued)
  router.patch('/:id/issue', authMiddleware, (req, res, next) => {
    controller.issue(req, res, next).catch(next);
  });

  // Mark an invoice as paid — manual override, platform master key only
  router.post('/:id/mark-paid', authMiddleware, (req, res, next) => {
    controller.markPaid(req, res, next).catch(next);
  });

  // Get real-time reconciliation logs for an invoice
  router.get('/:id/reconciliation', authMiddleware, (req, res, next) => {
    controller.getReconciliation(req, res, next).catch(next);
  });

  // Paginated reconciliation log — filterable by status
  router.get('/reconciliation/logs', authMiddleware, (req, res, next) => {
    controller.listReconciliationLogs(req, res, next).catch(next);
  });

  return router;
}
