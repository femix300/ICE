import crypto from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

import { db, nomba } from '../../src/app.js';
import { config } from '../../src/config.js';

describe('Invoices — mark-paid authorization + audit logging', () => {
  let app: Express;

  let merchantApiKey = '';
  let vendorId = '';
  let vendorApiKey = '';
  let invoiceId = '';

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

  it('sets up merchant, vendor, vendor-scoped key, and an issued invoice', async () => {
    const merchantRes = await request(app)
      .post('/v1/merchants/register')
      .send({
        businessName: 'MarkPaidTestCo',
        email: `markpaidtest_${crypto.randomUUID()}@example.com`,
        webhookUrl: 'https://webhook.site/markpaid-test',
      });
    expect(merchantRes.status).toBe(201);
    merchantApiKey = merchantRes.body.data.api_key;

    const vendorRes = await request(app)
      .post('/v1/vendors')
      .set('Authorization', `Bearer ${merchantApiKey}`)
      .send({
        name: 'MarkPaid Test Vendor',
        email: `markpaidvendor_${crypto.randomUUID()}@example.com`,
      });
    expect(vendorRes.status).toBe(201);
    vendorId = vendorRes.body.data.id;

    const keyRes = await request(app)
      .post(`/v1/vendors/${vendorId}/api-keys`)
      .set('Authorization', `Bearer ${merchantApiKey}`)
      .send({});
    expect(keyRes.status).toBe(200);
    expect(keyRes.body.data.api_key).toBeDefined();
    vendorApiKey = keyRes.body.data.api_key;

    const customerRes = await request(app)
      .post(`/v1/vendors/${vendorId}/customers`)
      .set('Authorization', `Bearer ${merchantApiKey}`)
      .send({
        name: 'MarkPaid Test Customer',
        email: `markpaidcustomer_${crypto.randomUUID()}@example.com`,
        provisionDva: true,
      });
    expect(customerRes.status).toBe(201);
    const customerId = customerRes.body.data.id;

    const invoiceRes = await request(app)
      .post('/v1/invoices')
      .set('Authorization', `Bearer ${merchantApiKey}`)
      .send({
        vendor_id: vendorId,
        customer_id: customerId,
        amount_kobo: 500_000,
      });
    expect(invoiceRes.status).toBe(201);
    invoiceId = invoiceRes.body.data.id;
    expect(invoiceRes.body.data.status).toBe('issued');
  }, 20000);

  it('rejects mark-paid from a vendor-scoped key with 403', async () => {
    const res = await request(app)
      .post(`/v1/invoices/${invoiceId}/mark-paid`)
      .set('Authorization', `Bearer ${vendorApiKey}`)
      .send({});

    expect(res.status).toBe(403);
    expect(res.body.ok).toBe(false);
  });

  it('allows mark-paid from the merchant master key and writes an audit log', async () => {
    const res = await request(app)
      .post(`/v1/invoices/${invoiceId}/mark-paid`)
      .set('Authorization', `Bearer ${merchantApiKey}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.status).toBe('paid');

    const auditRows = await db.query(
      `SELECT * FROM audit_logs WHERE resource_id = $1 AND action = $2`,
      [invoiceId, 'invoice.mark_paid'],
    );
    expect(auditRows.rows.length).toBeGreaterThan(0);
    
    // Explicitly verify audit completeness
    const auditLog = auditRows.rows[0];
    expect(auditLog.actor_id).toBeDefined();
    expect(auditLog.old_values).toBeDefined();
    expect(auditLog.new_values).toBeDefined();
  });

  it('rejects mark-paid for a non-existent invoice with 404', async () => {
    const res = await request(app)
      .post(`/v1/invoices/99999999-9999-9999-9999-999999999999/mark-paid`)
      .set('Authorization', `Bearer ${merchantApiKey}`)
      .send({});

    expect(res.status).toBe(404);
    expect(res.body.ok).toBe(false);
  });

  it('rejects mark-paid on an already paid invoice with 400 (Invalid Transition)', async () => {
    // Attempting to mark the same invoice paid again should fail
    const res = await request(app)
      .post(`/v1/invoices/${invoiceId}/mark-paid`)
      .set('Authorization', `Bearer ${merchantApiKey}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.ok).toBe(false);
  });
});
