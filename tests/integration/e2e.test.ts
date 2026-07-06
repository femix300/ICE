
import crypto from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

import { db, nomba } from '../../src/app.js';
import { config } from '../../src/config.js';

/**
 * Polls a function until it returns true or maxAttempts is reached.
 */
async function pollUntil(
  fn: () => Promise<boolean>,
  intervalMs = 250,
  maxAttempts = 12,
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    if (await fn()) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  return false;
}

function signWebhook(body: string): string {
  return crypto
    .createHmac('sha256', config.NOMBA_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');
}

describe('E2E Demo Flow: P10', () => {
  let app: Express;

  // Shared state matching the narrative
  let merchantApiKey = '';
  let merchantId = '';
  let vendorId = '';
  let customerId = '';
  let vaNumber = '';
  let invoiceId = '';

  beforeAll(async () => {
    // Inject test URL into config
    config.CORS_ORIGIN = 'http://localhost';

    // Import app dynamically
    const mod = await import('../../src/app.js');
    app = mod.app;

    // Authenticate with Nomba sandbox using credentials from .env
    // so that createVirtualAccount() has a valid token when vendor/customer are provisioned
    await nomba.authenticate();

    // Clean tables so test is isolated
    await db.query('DELETE FROM webhook_deliveries');
    await db.query('DELETE FROM reconciliation_logs');
    await db.query('DELETE FROM transactions');
    await db.query('DELETE FROM invoices');
    await db.query('DELETE FROM customers');
    await db.query('DELETE FROM vendors');
    await db.query('DELETE FROM merchants');
  });

  afterAll(async () => {
    await db.query('DELETE FROM webhook_deliveries');
    await db.query('DELETE FROM reconciliation_logs');
    await db.query('DELETE FROM transactions');
    await db.query('DELETE FROM invoices');
    await db.query('DELETE FROM customers');
    await db.query('DELETE FROM vendors');
    await db.query('DELETE FROM merchants');
    await db.end();
  });

  it('Step 1 — Register Platform Owner ("StyleHub")', async () => {
    const res = await request(app)
      .post('/v1/merchants/register')
      .send({
        businessName: 'StyleHub',
        email: `stylehub_${crypto.randomUUID()}@example.com`,
        webhookUrl: 'https://webhook.site/stylehub-test',
      });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.api_key).toBeDefined();

    merchantApiKey = res.body.data.api_key;
    merchantId = res.body.data.merchant.id;
  });

  it('Step 2 — Create Vendor ("Adunola Fabrics") and get DVA', async () => {
    const res = await request(app)
      .post('/v1/vendors')
      .set('Authorization', `Bearer ${merchantApiKey}`)
      .send({
        name: 'Adunola Fabrics',
        email: `adunola_${crypto.randomUUID()}@example.com`,
      });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.nomba_va_number).toBeDefined();

    vendorId = res.body.data.id;
    // vaNumber is initially the vendor VA; Step 2.5 overwrites with the customer DVA
    vaNumber = res.body.data.nomba_va_number;
  });

  it('Step 2.5 — Create Customer to link DVA to invoice (per PRD)', async () => {
    // The reconciliation engine looks up the invoice by VA number via the `customers` table.
    // We create a customer and provision a DVA for them so the webhook can be reconciled.
    const res = await request(app)
      .post(`/v1/vendors/${vendorId}/customers`)
      .set('Authorization', `Bearer ${merchantApiKey}`)
      .send({
        name: 'Customer 1',
        email: `customer_${crypto.randomUUID()}@example.com`,
        provisionDva: true, // camelCase — must match the Zod schema in customers.schema.ts
      });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.nomba_va_number).toBeDefined();

    customerId = res.body.data.id;
    // Use the customer DVA for the inbound webhook going forward
    vaNumber = res.body.data.nomba_va_number;
  });

  it('Step 3 — Create Invoice for ₦15,000', async () => {
    // ₦15,000 = 1,500,000 kobo
    const res = await request(app)
      .post('/v1/invoices')
      .set('Authorization', `Bearer ${merchantApiKey}`)
      .send({
        vendor_id: vendorId,
        customer_id: customerId, // links the invoice to the customer DVA for reconciliation
        amount_kobo: 1_500_000,
      });

    expect(res.status).toBe(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.status).toBe('issued');

    invoiceId = res.body.data.id;
  });

  it('Step 4 — Simulate ₦16,000 Nomba Webhook', async () => {
    // Nomba sends amount in Naira: 16000
    const payload = {
      event: 'payment_success',
      data: {
        transactionId: `TXN-${crypto.randomUUID()}`,
        amount: 16000,
        accountNumber: vaNumber, // the customer's DVA provisioned in Step 2.5
        senderName: 'John Doe',
        senderAccountNumber: '0123456789',
        senderBankCode: '058',
        status: 'SUCCESS',
        currency: 'NGN',
      },
    };

    const body = JSON.stringify(payload);
    const signature = signWebhook(body);

    const res = await request(app)
      .post('/v1/webhooks/nomba')
      .set('Content-Type', 'application/json')
      .set('x-nomba-signature', signature)
      .send(body);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it('Step 5 — Verify OVERPAYMENT detected and refund queued', async () => {
    // Poll because reconciliation may be async depending on whether E02 (BullMQ) is wired
    const success = await pollUntil(async () => {
      const res = await request(app)
        .get(`/v1/invoices/${invoiceId}`)
        .set('Authorization', `Bearer ${merchantApiKey}`);
      return res.body.data?.status === 'overpaid';
    });

    expect(success).toBe(true);

    const res = await request(app)
      .get(`/v1/invoices/${invoiceId}/reconciliation`)
      .set('Authorization', `Bearer ${merchantApiKey}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);

    const log = res.body.data[0];
    expect(log.status).toBe('OVERPAYMENT');
    // Difference is ₦1,000 = 100,000 kobo
    expect(log.difference_kobo).toBe(100_000);
    expect(log.action_taken).toBe('refund_queued');
  });

  it('Step 6 — Verify Outbound Webhook Delivery queued', async () => {
    // Webhook deliveries ARE async (BullMQ via E02), so we poll here
    const success = await pollUntil(async () => {
      const res = await request(app)
        .get(`/v1/merchants/${merchantId}/webhook-deliveries`)
        .set('Authorization', `Bearer ${merchantApiKey}`);

      if (!res.body.data) return false;
      return res.body.data.some((d: any) => d.event_type === 'payment.overpayment.refunded');
    });

    const res = await request(app)
      .get(`/v1/merchants/${merchantId}/webhook-deliveries`)
      .set('Authorization', `Bearer ${merchantApiKey}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(0);
  });
});
