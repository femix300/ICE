import crypto from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

import { app } from '../../src/app.js';
import { db } from '../../src/db/index.js';
import { config } from '../../src/config.js';

function makePayload(overrides?: Record<string, unknown>) {
  return {
    event: 'payment_success',
    data: {
      transactionId: `TXN-${crypto.randomUUID()}`,
      amount: 15000,
      accountNumber: '0127667384',
      senderName: 'John Doe',
      senderAccountNumber: '0123456789',
      senderBankCode: '058',
      status: 'SUCCESS',
      currency: 'NGN',
      ...overrides,
    },
  };
}

function sign(body: string): string {
  return crypto
    .createHmac('sha256', config.NOMBA_WEBHOOK_SECRET || 'dev-webhook-secret')
    .update(body)
    .digest('hex');
}

describe('POST /v1/webhooks/nomba', () => {
  beforeAll(async () => {
    await db.query('DELETE FROM transactions');
  });

  afterAll(async () => {
    await db.query('DELETE FROM transactions');
    await db.end();
  });

  it('returns 200 and stores transaction for a valid webhook', async () => {
    const payload = makePayload();
    const body = JSON.stringify(payload);
    const signature = sign(body);

    const res = await request(app)
      .post('/v1/webhooks/nomba')
      .set('Content-Type', 'application/json')
      .set('x-nomba-signature', signature)
      .send(body);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.duplicate).toBe(false);
    expect(res.body.data.transactionId).toBe(payload.data.transactionId);

    const dbResult = await db.query(
      'SELECT * FROM transactions WHERE transaction_id = $1',
      [payload.data.transactionId],
    );
    expect(dbResult.rows).toHaveLength(1);
  });

  it('returns 401 for an invalid signature', async () => {
    const payload = makePayload();
    const body = JSON.stringify(payload);

    const res = await request(app)
      .post('/v1/webhooks/nomba')
      .set('Content-Type', 'application/json')
      .set('x-nomba-signature', 'a'.repeat(64))
      .send(body);

    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);

    const dbResult = await db.query(
      'SELECT * FROM transactions WHERE transaction_id = $1',
      [payload.data.transactionId],
    );
    expect(dbResult.rows).toHaveLength(0);
  });

  it('returns 200 and does not duplicate for the same transactionId', async () => {
    const payload = makePayload();
    const body = JSON.stringify(payload);
    const signature = sign(body);

    const first = await request(app)
      .post('/v1/webhooks/nomba')
      .set('Content-Type', 'application/json')
      .set('x-nomba-signature', signature)
      .send(body);

    expect(first.status).toBe(200);
    expect(first.body.data.duplicate).toBe(false);

    const second = await request(app)
      .post('/v1/webhooks/nomba')
      .set('Content-Type', 'application/json')
      .set('x-nomba-signature', signature)
      .send(body);

    expect(second.status).toBe(200);
    expect(second.body.data.duplicate).toBe(true);

    const dbResult = await db.query(
      'SELECT * FROM transactions WHERE transaction_id = $1',
      [payload.data.transactionId],
    );
    expect(dbResult.rows).toHaveLength(1);
  });

  it('stores payment_failed events without reconciliation', async () => {
    const payload = makePayload({ transactionId: `TXN-FAIL-${crypto.randomUUID()}` });
    payload.event = 'payment_failed';
    const body = JSON.stringify(payload);
    const signature = sign(body);

    const res = await request(app)
      .post('/v1/webhooks/nomba')
      .set('Content-Type', 'application/json')
      .set('x-nomba-signature', signature)
      .send(body);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const dbResult = await db.query(
      'SELECT * FROM transactions WHERE transaction_id = $1',
      [payload.data.transactionId],
    );
    expect(dbResult.rows).toHaveLength(1);
  });

  it('returns 401 when x-nomba-signature header is missing', async () => {
    const payload = makePayload();
    const body = JSON.stringify(payload);

    const res = await request(app)
      .post('/v1/webhooks/nomba')
      .set('Content-Type', 'application/json')
      .send(body);

    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
  });
});
