import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';

import { createDbPool } from '../../src/db/client.js';
import { createInvoicesRepo } from '../../src/repositories/invoices.repo.js';
import { createReconciliationRepo } from '../../src/repositories/reconciliation.repo.js';
import { createAuditRepo } from '../../src/repositories/audit.repo.js';
import { createInvoicesService } from '../../src/services/invoices.service.js';
import { createReconciliationService } from '../../src/services/reconciliation.service.js';
import { createAuditService } from '../../src/services/audit.service.js';
import { createInvoicesController } from '../../src/controllers/invoices.controller.js';
import { createReconciliationController } from '../../src/controllers/reconciliation.controller.js';
import { createInvoicesRouter } from '../../src/routes/invoices.routes.js';
import { createReconciliationRouter } from '../../src/routes/reconciliation.routes.js';
import { errorHandler } from '../../src/middleware/errors.js';
import { config } from '../../src/config.js';

describe('Reconciliation Override & Logs API', () => {
  const db = createDbPool(config.DATABASE_URL);
  
  const invoicesRepo = createInvoicesRepo(db);
  const reconRepo = createReconciliationRepo(db);
  const auditRepo = createAuditRepo(db);

  const auditService = createAuditService({ audit: auditRepo });
  
  const invoicesService = createInvoicesService({
    invoices: invoicesRepo,
    reconciliation: reconRepo,
    audit: auditService,
  });
  
  const reconService = createReconciliationService({
    reconciliation: reconRepo,
    invoices: invoicesRepo,
  });

  const invoicesController = createInvoicesController(invoicesService);
  const reconController = createReconciliationController(reconService);

  const app = express();
  app.use(express.json());

  app.use((_req, res, next) => {
    res.locals.requestId = 'test-id';
    next();
  });

  app.use('/v1/invoices', createInvoicesRouter(invoicesController));
  app.use('/v1/reconciliation', createReconciliationRouter(reconController));
  app.use(errorHandler);

  beforeEach(async () => {
    await db.query('DELETE FROM audit_logs');
    await db.query('DELETE FROM reconciliation_logs');
    await db.query('DELETE FROM transactions');
    await db.query('DELETE FROM invoices');
    await db.query('DELETE FROM vendors');
    await db.query('DELETE FROM merchants');
    await db.query('DELETE FROM customers');

    // Seed merchants and vendors
    await db.query(
      `INSERT INTO merchants (id, business_name, api_key_hash, webhook_url, status)
       VALUES ('m-1', 'Merchant One', 'hash', 'http://webhook', 'active')`
    );
    await db.query(
      `INSERT INTO vendors (id, merchant_id, name, api_key_hash, nomba_va_number, va_status)
       VALUES ('v-1', 'm-1', 'Vendor One', 'hash', '1111111111', 'active')`
    );
    await db.query(
      `INSERT INTO customers (id, vendor_id, name, email, nomba_va_number)
       VALUES ('c-1', 'v-1', 'Customer One', 'c1@test.com', '1111111111')`
    );

    // Seed invoices
    await db.query(
      `INSERT INTO invoices (id, vendor_id, customer_id, amount_kobo, status, paid_amount_kobo)
       VALUES ('inv-1', 'v-1', 'c-1', 10000, 'issued', 0),
              ('inv-2', 'v-1', 'c-1', 20000, 'draft', 0)`
    );

    // Seed transaction for foreign key in logs
    await db.query(
      `INSERT INTO transactions (id, transaction_id, va_number, amount_kobo, sender_name, sender_account, sender_bank_code, raw_payload)
       VALUES ('tx-1', 'TX-1', '1111111111', 10000, 'Sender A', '123', '058', '{}'),
              ('tx-2', 'TX-2', '1111111111', 15000, 'Sender B', '123', '058', '{}')`
    );

    // Seed reconciliation logs
    await db.query(
      `INSERT INTO reconciliation_logs (id, transaction_id, invoice_id, status, expected_kobo, received_kobo, difference_kobo, action_taken)
       VALUES ('log-1', 'TX-1', 'inv-1', 'EXACT_MATCH', 10000, 10000, 0, 'invoice_closed'),
              ('log-2', 'TX-2', 'inv-1', 'UNDERPAYMENT', 20000, 15000, -5000, 'partial_payment')`
    );
  });

  afterEach(async () => {
    await db.query('DELETE FROM audit_logs');
    await db.query('DELETE FROM reconciliation_logs');
    await db.query('DELETE FROM transactions');
    await db.query('DELETE FROM invoices');
    await db.query('DELETE FROM vendors');
    await db.query('DELETE FROM merchants');
    await db.query('DELETE FROM customers');
  });

  afterAll(async () => {
    await db.end();
  });

  describe('POST /v1/invoices/:id/mark-paid', () => {
    it('manually transitions invoice to paid and creates audit log entry', async () => {
      const res = await request(app)
        .post('/v1/invoices/inv-1/mark-paid')
        .set('x-key-tier', 'platform')
        .set('x-actor-id', 'admin-user-1');

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.status).toBe('paid');
      expect(res.body.data.paid_amount_kobo).toBe(10000);

      // Verify audit logs in database
      const auditRes = await db.query('SELECT * FROM audit_logs');
      expect(auditRes.rows).toHaveLength(1);
      expect(auditRes.rows[0].action).toBe('invoice.mark_paid');
      expect(auditRes.rows[0].actor_id).toBe('admin-user-1');
      expect(auditRes.rows[0].old_values).toEqual({ status: 'issued' });
      expect(auditRes.rows[0].new_values).toEqual({ status: 'paid' });
    });

    it('returns 403 when called with vendor tier key', async () => {
      const res = await request(app)
        .post('/v1/invoices/inv-1/mark-paid')
        .set('x-key-tier', 'vendor');

      expect(res.status).toBe(403);
      expect(res.body.ok).toBe(false);
      expect(res.body.errorCode).toBe('APP_ERROR');
    });
  });

  describe('GET /v1/invoices/:id/reconciliation', () => {
    it('returns real-time reconciliation logs for a specific invoice', async () => {
      const res = await request(app)
        .get('/v1/invoices/inv-1/reconciliation');

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.data[0].invoice_id).toBe('inv-1');
      expect(res.body.data[1].invoice_id).toBe('inv-1');
    });

    it('returns empty array when invoice has no reconciliation logs', async () => {
      const res = await request(app)
        .get('/v1/invoices/inv-2/reconciliation');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });
  });

  describe('GET /v1/reconciliation/logs', () => {
    it('returns paginated list of all reconciliation logs', async () => {
      const res = await request(app)
        .get('/v1/reconciliation/logs');

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.data).toHaveLength(2);
      expect(res.body.data.pagination.total).toBe(2);
    });

    it('filters reconciliation logs by status', async () => {
      const res = await request(app)
        .get('/v1/reconciliation/logs?status=EXACT_MATCH');

      expect(res.status).toBe(200);
      expect(res.body.data.data).toHaveLength(1);
      expect(res.body.data.data[0].status).toBe('EXACT_MATCH');
    });
  });
});
