import crypto from 'node:crypto';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

import { app, db } from '../../src/app.js';
import { config } from '../../src/config.js';

function makePayload(overrides?: {
  event_type?: string;
  transactionId?: string;
  responseCode?: string;
}) {
  return {
    event_type: overrides?.event_type ?? 'payment_success',
    requestId: `req-${crypto.randomUUID()}`,
    data: {
      merchant: {
        userId: 'user-1',
        walletId: 'wallet-1',
      },
      transaction: {
        transactionId: overrides?.transactionId ?? `TXN-${crypto.randomUUID()}`,
        type: 'credit',
        time: new Date().toISOString(),
        responseCode: overrides?.responseCode,
      },
      // Fields beyond the signature spec — unconfirmed shape, but needed
      // for transactions.repo.ts's create() mapping (va_number, amount, sender details).
      accountNumber: '0127667384',
      senderName: 'John Doe',
      senderAccountNumber: '0123456789',
      senderBankCode: '058',
      amount: 150,
      currency: 'NGN',
      status: 'SUCCESS',
    },
  };
}

function sign(payload: ReturnType<typeof makePayload>, timestamp: string): string {
  const { merchant: m, transaction: t } = payload.data;
  const signedString = [
    payload.event_type,
    payload.requestId,
    m.userId,
    m.walletId,
    t.transactionId,
    t.type,
    t.time,
    t.responseCode ?? '',
    timestamp,
  ].join(':');
  return crypto
    .createHmac('sha256', config.NOMBA_WEBHOOK_SECRET)
    .update(signedString)
    .digest('base64');
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
    const timestamp = String(Date.now());
    const signature = sign(payload, timestamp);

    const res = await request(app)
      .post('/v1/webhooks/nomba')
      .set('Content-Type', 'application/json')
      .set('nomba-signature', signature)
      .set('nomba-timestamp', timestamp)
      .send(body);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.data.duplicate).toBe(false);
    expect(res.body.data.transactionId).toBe(payload.data.transaction.transactionId);

    const dbResult = await db.query('SELECT * FROM transactions WHERE transaction_id = $1', [
      payload.data.transaction.transactionId,
    ]);
    expect(dbResult.rows).toHaveLength(1);
  });

  it('returns 401 for an invalid signature', async () => {
    const payload = makePayload();
    const body = JSON.stringify(payload);
    const timestamp = String(Date.now());

    const res = await request(app)
      .post('/v1/webhooks/nomba')
      .set('Content-Type', 'application/json')
      .set('nomba-signature', Buffer.from('a'.repeat(44)).toString('base64'))
      .set('nomba-timestamp', timestamp)
      .send(body);

    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);

    const dbResult = await db.query('SELECT * FROM transactions WHERE transaction_id = $1', [
      payload.data.transaction.transactionId,
    ]);
    expect(dbResult.rows).toHaveLength(0);
  });

  it('returns 200 and does not duplicate for the same transactionId', async () => {
    const payload = makePayload();
    const body = JSON.stringify(payload);
    const timestamp = String(Date.now());
    const signature = sign(payload, timestamp);

    const first = await request(app)
      .post('/v1/webhooks/nomba')
      .set('Content-Type', 'application/json')
      .set('nomba-signature', signature)
      .set('nomba-timestamp', timestamp)
      .send(body);

    expect(first.status).toBe(200);
    expect(first.body.data.duplicate).toBe(false);

    const second = await request(app)
      .post('/v1/webhooks/nomba')
      .set('Content-Type', 'application/json')
      .set('nomba-signature', signature)
      .set('nomba-timestamp', timestamp)
      .send(body);

    expect(second.status).toBe(200);
    expect(second.body.data.duplicate).toBe(true);

    const dbResult = await db.query('SELECT * FROM transactions WHERE transaction_id = $1', [
      payload.data.transaction.transactionId,
    ]);
    expect(dbResult.rows).toHaveLength(1);
  });

  it('stores payment_failed events without reconciliation', async () => {
    const payload = makePayload({
      event_type: 'payment_failed',
      transactionId: `TXN-FAIL-${crypto.randomUUID()}`,
    });
    const body = JSON.stringify(payload);
    const timestamp = String(Date.now());
    const signature = sign(payload, timestamp);

    const res = await request(app)
      .post('/v1/webhooks/nomba')
      .set('Content-Type', 'application/json')
      .set('nomba-signature', signature)
      .set('nomba-timestamp', timestamp)
      .send(body);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const dbResult = await db.query('SELECT * FROM transactions WHERE transaction_id = $1', [
      payload.data.transaction.transactionId,
    ]);
    expect(dbResult.rows).toHaveLength(1);
  });

  it('returns 401 when nomba-signature header is missing', async () => {
    const payload = makePayload();
    const body = JSON.stringify(payload);
    const timestamp = String(Date.now());

    const res = await request(app)
      .post('/v1/webhooks/nomba')
      .set('Content-Type', 'application/json')
      .set('nomba-timestamp', timestamp)
      .send(body);

    expect(res.status).toBe(401);
    expect(res.body.ok).toBe(false);
  });
});
