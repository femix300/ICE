import crypto from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

import { db, nomba } from '../../src/app.js';
import { config } from '../../src/config.js';

describe('Statements & Reporting API', () => {
  let app: Express;

  let merchantApiKey = '';
  let vendorAId = '';
  let vendorAApiKey = '';
  let vendorBId = '';
  let vendorBApiKey = '';
  let customerAId = '';

  beforeAll(async () => {
    config.CORS_ORIGIN = 'http://localhost';

    const mod = await import('../../src/app.js');
    app = mod.app;

    await nomba.authenticate();

    await db.query('DELETE FROM audit_logs');
    await db.query('DELETE FROM reconciliation_logs');
    await db.query('DELETE FROM transactions');
    await db.query('DELETE FROM invoices');
    await db.query('DELETE FROM customers');
    await db.query('DELETE FROM vendors');
    await db.query('DELETE FROM merchants');

    // Set up one merchant with two vendors, so we can test cross-vendor scoping
    const merchantRes = await request(app)
      .post('/v1/merchants/register')
      .send({
        businessName: 'StatementsTestCo',
        email: `statementstest_${crypto.randomUUID()}@example.com`,
        webhookUrl: 'https://webhook.site/statements-test',
      });
    expect(merchantRes.status).toBe(201);
    merchantApiKey = merchantRes.body.data.api_key;

    const vendorARes = await request(app)
      .post('/v1/vendors')
      .set('Authorization', `Bearer ${merchantApiKey}`)
      .send({
        name: 'Statements Vendor A',
        email: `statementsvendora_${crypto.randomUUID()}@example.com`,
      });
    expect(vendorARes.status).toBe(201);
    vendorAId = vendorARes.body.data.id;

    const keyARes = await request(app)
      .post(`/v1/vendors/${vendorAId}/api-keys`)
      .set('Authorization', `Bearer ${merchantApiKey}`)
      .send({});
    expect(keyARes.status).toBe(200);
    vendorAApiKey = keyARes.body.data.api_key;

    const vendorBRes = await request(app)
      .post('/v1/vendors')
      .set('Authorization', `Bearer ${merchantApiKey}`)
      .send({
        name: 'Statements Vendor B',
        email: `statementsvendorb_${crypto.randomUUID()}@example.com`,
      });
    expect(vendorBRes.status).toBe(201);
    vendorBId = vendorBRes.body.data.id;

    const keyBRes = await request(app)
      .post(`/v1/vendors/${vendorBId}/api-keys`)
      .set('Authorization', `Bearer ${merchantApiKey}`)
      .send({});
    expect(keyBRes.status).toBe(200);
    vendorBApiKey = keyBRes.body.data.api_key;

    const customerARes = await request(app)
      .post(`/v1/vendors/${vendorAId}/customers`)
      .set('Authorization', `Bearer ${merchantApiKey}`)
      .send({
        name: 'Statements Test Customer',
        email: `statementscustomer_${crypto.randomUUID()}@example.com`,
        provisionDva: false,
      });
    expect(customerARes.status).toBe(201);
    customerAId = customerARes.body.data.id;
  }, 30000);

  afterAll(async () => {
    await db.query('DELETE FROM audit_logs');
    await db.query('DELETE FROM reconciliation_logs');
    await db.query('DELETE FROM transactions');
    await db.query('DELETE FROM invoices');
    await db.query('DELETE FROM customers');
    await db.query('DELETE FROM vendors');
    await db.query('DELETE FROM merchants');
    await db.end();
  });

  describe('GET /v1/vendors/:id/statement', () => {
    it('vendor can access their own statement', async () => {
      const res = await request(app)
        .get(`/v1/vendors/${vendorAId}/statement`)
        .set('Authorization', `Bearer ${vendorAApiKey}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('vendor key cannot access another vendor statement (403 UNAUTHORIZED)', async () => {
      const res = await request(app)
        .get(`/v1/vendors/${vendorBId}/statement`)
        .set('Authorization', `Bearer ${vendorAApiKey}`);

      expect(res.status).toBe(403);
      expect(res.body.ok).toBe(false);
    });

    it('master key can access any vendor statement', async () => {
      const res = await request(app)
        .get(`/v1/vendors/${vendorAId}/statement`)
        .set('Authorization', `Bearer ${merchantApiKey}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });

    // KNOWN GAP: the repo's SQL comments out the from/to/status filter clauses
    // (see src/repositories/statements.repo.ts getVendorStatement), so date
    // range filtering is accepted by the schema/service but not actually
    // applied at the DB level yet. This test only confirms the params don't
    // break the request; it does NOT confirm filtering behavior, since that
    // isn't implemented. Flagging rather than silently passing.
    it('accepts from/to query params without erroring (date filtering not yet implemented in repo)', async () => {
      const res = await request(app)
        .get(`/v1/vendors/${vendorAId}/statement?from=2020-01-01&to=2030-01-01`)
        .set('Authorization', `Bearer ${vendorAApiKey}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
    });
  });

  describe('GET /v1/vendors/:id/customers/:cid/statement', () => {
    it('vendor can access their own customer statement', async () => {
      const res = await request(app)
        .get(`/v1/vendors/${vendorAId}/customers/${customerAId}/statement`)
        .set('Authorization', `Bearer ${vendorAApiKey}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('vendor key cannot access customer statement under a different vendor (403)', async () => {
      const res = await request(app)
        .get(`/v1/vendors/${vendorBId}/customers/${customerAId}/statement`)
        .set('Authorization', `Bearer ${vendorAApiKey}`);

      expect(res.status).toBe(403);
      expect(res.body.ok).toBe(false);
    });
  });

  describe('GET /v1/vendors/:id/transactions', () => {
    it('vendor can list their own transactions', async () => {
      const res = await request(app)
        .get(`/v1/vendors/${vendorAId}/transactions`)
        .set('Authorization', `Bearer ${vendorAApiKey}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('vendor key cannot list another vendor transactions (403)', async () => {
      const res = await request(app)
        .get(`/v1/vendors/${vendorBId}/transactions`)
        .set('Authorization', `Bearer ${vendorAApiKey}`);

      expect(res.status).toBe(403);
      expect(res.body.ok).toBe(false);
    });
  });

  describe('GET /v1/merchants/:id/summary', () => {
    it('rejects vendor-scoped key with 403 (master key required)', async () => {
      const merchantId = (
        await db.query('SELECT merchant_id FROM vendors WHERE id = $1', [vendorAId])
      ).rows[0].merchant_id;

      const res = await request(app)
        .get(`/v1/merchants/${merchantId}/summary`)
        .set('Authorization', `Bearer ${vendorAApiKey}`);

      expect(res.status).toBe(403);
      expect(res.body.ok).toBe(false);
    });

    it('allows master key and returns summary shape', async () => {
      const merchantId = (
        await db.query('SELECT merchant_id FROM vendors WHERE id = $1', [vendorAId])
      ).rows[0].merchant_id;

      const res = await request(app)
        .get(`/v1/merchants/${merchantId}/summary`)
        .set('Authorization', `Bearer ${merchantApiKey}`);

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.data).toHaveProperty('total_transactions');
      expect(res.body.data).toHaveProperty('reconciliation_rate_percent');
    });
  });
});
