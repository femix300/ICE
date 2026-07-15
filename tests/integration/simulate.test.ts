import crypto from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

import { db, nomba } from '../../src/app.js';
import { config } from '../../src/config.js';

describe('Webhook Simulator API Endpoint', () => {
  let app: Express;

  let merchantId = '';
  let merchantApiKey = '';
  let vendorId = '';
  let customerId = '';
  let customerVa = '';

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
  });

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

  it('sets up merchant, vendor, and customer', async () => {
    const merchantRes = await request(app)
      .post('/v1/merchants/register')
      .send({
        businessName: 'SimulatorTestCo',
        email: `simtest_${crypto.randomUUID()}@example.com`,
        webhookUrl: 'https://webhook.site/sim-test',
      });
    expect(merchantRes.status).toBe(201);
    merchantId = merchantRes.body.data.id;
    merchantApiKey = merchantRes.body.data.api_key;

    const vendorRes = await request(app)
      .post('/v1/vendors')
      .set('Authorization', `Bearer ${merchantApiKey}`)
      .send({
        name: 'Sim Test Vendor',
      });
    expect(vendorRes.status).toBe(201);
    vendorId = vendorRes.body.data.id;

    // Set DVA on vendor to pass any validation
    await db.query("UPDATE vendors SET nomba_va_number = '1122334455', va_status = 'active' WHERE id = $1", [vendorId]);

    // Create a customer
    const customerRes = await request(app)
      .post(`/v1/vendors/${vendorId}/customers`)
      .set('Authorization', `Bearer ${merchantApiKey}`)
      .send({
        name: 'John Doe',
        email: 'john@example.com',
      });
    expect(customerRes.status).toBe(201);
    customerId = customerRes.body.data.id;
    customerVa = customerRes.body.data.nomba_va_number;
  });

  it('returns 401 Unauthorized when auth header is missing', async () => {
    const res = await request(app)
      .post('/v1/webhooks/simulate')
      .send({
        scenario: 'exact_match',
        amount: 150000,
        senderName: 'Chukwuemeka Obi',
        senderAccount: '0123456789',
        senderBank: 'Zenith Bank',
        virtualAccountNumber: customerVa,
        merchantId,
      });
    expect(res.status).toBe(401);
  });

  it('successfully fires a simulated webhook and reconciles it', async () => {
    // 1. Create an open invoice for the customer
    const invoiceRes = await request(app)
      .post('/v1/invoices')
      .set('Authorization', `Bearer ${merchantApiKey}`)
      .send({
        vendor_id: vendorId,
        customer_id: customerId,
        amount_kobo: 150000, // 1500 Naira
      });
    expect(invoiceRes.status).toBe(201);

    // 2. Fire the simulator
    const res = await request(app)
      .post('/v1/webhooks/simulate')
      .set('Authorization', `Bearer ${merchantApiKey}`)
      .send({
        scenario: 'exact_match',
        amount: 150000,
        senderName: 'Chukwuemeka Obi',
        senderAccount: '0123456789',
        senderBank: 'Zenith Bank',
        virtualAccountNumber: customerVa,
        merchantId,
      });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.success).toBe(true);
    expect(res.body.data.result.matched).toBe(true);
    expect(res.body.data.result.action).toBe('reconciled');
  });
});
