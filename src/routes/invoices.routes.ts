import { Router } from 'express';

import type { InvoicesController } from '../controllers/invoices.controller.js';

export function createInvoicesRouter(controller: InvoicesController) {
  const router = Router();

  // Create a new invoice
  router.post('/', (req, res, next) => {
    controller.create(req, res, next).catch(next);
  });

  // Get invoice by ID
  router.get('/:id', (req, res, next) => {
    controller.getById(req, res, next).catch(next);
  });

  // List all invoices for a vendor
  router.get('/vendor/:vendorId', (req, res, next) => {
    controller.listByVendor(req, res, next).catch(next);
  });

  // Issue an invoice (draft → issued)
  router.patch('/:id/issue', (req, res, next) => {
    controller.issue(req, res, next).catch(next);
  });

  // Mark an invoice as paid (manual override)
  router.post('/:id/mark-paid', (req, res, next) => {
    controller.markPaid(req, res, next).catch(next);
  });

  // Get real-time reconciliation logs for an invoice
  router.get('/:id/reconciliation', (req, res, next) => {
    controller.getReconciliation(req, res, next).catch(next);
  });

  return router;
}
