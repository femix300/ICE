import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';

import { createDbPool } from '../../src/db/client.js';
import { createMisdirectedRepo } from '../../src/repositories/misdirected.repo.js';
import { createInvoicesRepo } from '../../src/repositories/invoices.repo.js';
import { createReconciliationRepo } from '../../src/repositories/reconciliation.repo.js';
import { createAuditRepo } from '../../src/repositories/audit.repo.js';
import { createMisdirectedService } from '../../src/services/misdirected.service.js';
import { createMisdirectedController } from '../../src/controllers/misdirected.controller.js';
import { createPaymentsRouter } from '../../src/routes/payments.routes.js';
import { errorHandler } from '../../src/middleware/errors.js';
import { config } from '../../src/config.js';

describe('Misdirected Payments Actions Integration Tests', () => {
  const db = createDbPool(config.DATABASE_URL);
  const repo = createMisdirectedRepo(db);
  const invoices = createInvoicesRepo(db);
  const reconciliation = createReconciliationRepo(db);
  const audit = createAuditRepo(db);

  // Hand-rolled Nomba Transfer Mock
  const nombaTransferMock = {
    async lookupAccount() {
      return { accountName: 'TEST SENDER' };
    },
    async transfer() {
      return { transferReference: 'REF-MOCK-111' };
    },
  };

  const service = createMisdirectedService({
    misdirected: repo,
    invoices,
    reconciliation,
    audit,
    nombaTransfer: nombaTransferMock,
  });

  const controller = createMisdirectedController(service);

  const app = express();
  app.use(express.json());

  app.use((_req, res, next) => {
    res.locals.requestId = 'test-id';
    next();
  });

  const router = createPaymentsRouter(controller);
  app.use('/v1/payments', router);
  app.use(errorHandler);

  beforeEach(async () => {
    await db.query('DELETE FROM audit_logs');
    await db.query('DELETE FROM reconciliation_logs');
    await db.query('DELETE FROM invoices');
    await db.query('DELETE FROM misdirected_payments');
    await db.query('DELETE FROM vendors');
    await db.query('DELETE FROM merchants');
    await db.query('DELETE FROM customers');

    // Seed test state
    await db.query(
      `INSERT INTO merchants (id, business_name, api_key_hash, webhook_url, status)
       VALUES ('m-1', 'Merchant One', 'hash', 'http://webhook', 'active'),
              ('m-2', 'Merchant Two', 'hash', 'http://webhook', 'active')`
    );

    await db.query(
      `INSERT INTO vendors (id, merchant_id, name, api_key_hash, nomba_va_number, va_status)
       VALUES ('v-1', 'm-1', 'Vendor One', 'hash', '1111111111', 'active')`
    );

    await db.query(
      `INSERT INTO customers (id, vendor_id, name, email, nomba_va_number)
       VALUES ('c-1', 'v-1', 'Customer One', 'c1@test.com', '1111111111')`
    );

    await db.query(
      `INSERT INTO invoices (id, vendor_id, customer_id, amount_kobo, status, paid_amount_kobo)
       VALUES ('inv-1', 'v-1', 'c-1', 5000, 'issued', 0)`
    );

    await db.query(
      `INSERT INTO misdirected_payments (id, merchant_id, va_number, amount_kobo, sender_name, raw_payload, status)
       VALUES ('p-1', 'm-1', '1111111111', 5000, 'Sender A', '{"data":{"transactionId":"TXN-MIS-001","senderAccountNumber":"123","senderBankCode":"058"}}', 'PENDING_REVIEW')`
    );

    // Seed transaction for foreign key reference in reconciliation_logs
    await db.query(
      `INSERT INTO transactions (id, transaction_id, va_number, amount_kobo, sender_name, sender_account, sender_bank_code, raw_payload)
       VALUES ('tx-1', 'TXN-MIS-001', '1111111111', 5000, 'Sender A', '123', '058', '{}')`
    );
  });

  afterEach(async () => {
    await db.query('DELETE FROM audit_logs');
    await db.query('DELETE FROM reconciliation_logs');
    await db.query('DELETE FROM transactions');
    await db.query('DELETE FROM invoices');
    await db.query('DELETE FROM misdirected_payments');
    await db.query('DELETE FROM vendors');
    await db.query('DELETE FROM merchants');
    await db.query('DELETE FROM customers');
  });

  afterAll(async () => {
    await db.end();
  });

  describe('POST /v1/payments/:id/match', () => {
    it('manually matches misdirected payment to invoice and transitions invoice status', async () => {
      const res = await request(app)
        .post('/v1/payments/p-1/match')
        .set('x-merchant-id', 'm-1')
        .set('x-key-tier', 'platform')
        .set('x-actor-id', 'admin-1')
        .send({ invoice_id: 'inv-1' });

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.reconciliation_status).toBe('EXACT_MATCH');
      expect(res.body.data.status).toBe('RESOLVED');

      // Verify invoice status in database
      const invRes = await db.query('SELECT status, paid_amount_kobo FROM invoices WHERE id = \'inv-1\'');
      expect(invRes.rows[0].status).toBe('paid');
      expect(invRes.rows[0].paid_amount_kobo).toBe(5000);

      // Verify payment status in database
      const payRes = await db.query('SELECT status, resolution FROM misdirected_payments WHERE id = \'p-1\'');
      expect(payRes.rows[0].status).toBe('RESOLVED');
      expect(payRes.rows[0].resolution).toContain('Manually matched');

      // Verify audit log exists
      const auditRes = await db.query('SELECT action, actor_id FROM audit_logs');
      expect(auditRes.rows).toHaveLength(1);
      expect(auditRes.rows[0].action).toBe('MANUAL_MATCH');
      expect(auditRes.rows[0].actor_id).toBe('admin-1');
    });

    it('returns 403 when called with vendor tier key', async () => {
      const res = await request(app)
        .post('/v1/payments/p-1/match')
        .set('x-merchant-id', 'm-1')
        .set('x-key-tier', 'vendor')
        .send({ invoice_id: 'inv-1' });

      expect(res.status).toBe(403);
      expect(res.body.ok).toBe(false);
      expect(res.body.errorCode).toBe('APP_ERROR');
    });
  });

  describe('POST /v1/payments/:id/refund', () => {
    it('manually refunds payment and marks resolved', async () => {
      const res = await request(app)
        .post('/v1/payments/p-1/refund')
        .set('x-merchant-id', 'm-1')
        .set('x-key-tier', 'platform')
        .set('x-actor-id', 'admin-2');

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data.status).toBe('RESOLVED');
      expect(res.body.data.refund_reference).toBe('REF-MOCK-111');

      // Verify payment status in database
      const payRes = await db.query('SELECT status, resolution FROM misdirected_payments WHERE id = \'p-1\'');
      expect(payRes.rows[0].status).toBe('RESOLVED');
      expect(payRes.rows[0].resolution).toContain('REF-MOCK-111');

      // Verify audit log exists
      const auditRes = await db.query('SELECT action, actor_id FROM audit_logs');
      expect(auditRes.rows).toHaveLength(1);
      expect(auditRes.rows[0].action).toBe('MANUAL_REFUND');
      expect(auditRes.rows[0].actor_id).toBe('admin-2');
    });

    it('returns 403 when called with vendor tier key', async () => {
      const res = await request(app)
        .post('/v1/payments/p-1/refund')
        .set('x-merchant-id', 'm-1')
        .set('x-key-tier', 'vendor');

      expect(res.status).toBe(403);
      expect(res.body.ok).toBe(false);
      expect(res.body.errorCode).toBe('APP_ERROR');
    });
  });
});
