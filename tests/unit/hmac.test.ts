import crypto from 'node:crypto';
import { describe, it, expect } from 'vitest';

import { verifySignature } from '../../src/lib/hmac.js';

describe('verifySignature', () => {
  const secret = 'test-secret-key';

  function makePayload(overrides?: {
    event_type?: string;
    requestId?: string;
    userId?: string;
    walletId?: string;
    transactionId?: string;
    type?: string;
    time?: string;
    responseCode?: string;
  }) {
    return {
      event_type: overrides?.event_type ?? 'payment_success',
      requestId: overrides?.requestId ?? 'req-1',
      data: {
        merchant: {
          userId: overrides?.userId ?? 'user-1',
          walletId: overrides?.walletId ?? 'wallet-1',
        },
        transaction: {
          transactionId: overrides?.transactionId ?? 'TXN-1',
          type: overrides?.type ?? 'credit',
          time: overrides?.time ?? '2026-07-08T00:00:00Z',
          responseCode: overrides?.responseCode,
        },
      },
    };
  }

  function sign(
    payload: ReturnType<typeof makePayload>,
    timestamp: string,
    signingSecret: string,
  ): string {
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
    return crypto.createHmac('sha256', signingSecret).update(signedString).digest('base64');
  }

  it('returns true for a valid signature', () => {
    const payload = makePayload();
    const timestamp = '1783490467';
    const signature = sign(payload, timestamp, secret);

    expect(verifySignature(payload, signature, timestamp, secret)).toBe(true);
  });

  it('returns false for an invalid signature', () => {
    const payload = makePayload();
    const timestamp = '1783490467';
    const badSignature = Buffer.from('a'.repeat(44)).toString('base64');

    expect(verifySignature(payload, badSignature, timestamp, secret)).toBe(false);
  });

  it('returns false when payload has been tampered with', () => {
    const payload = makePayload({ transactionId: 'TXN-original' });
    const timestamp = '1783490467';
    const signature = sign(payload, timestamp, secret);

    const tamperedPayload = makePayload({ transactionId: 'TXN-tampered' });

    expect(verifySignature(tamperedPayload, signature, timestamp, secret)).toBe(false);
  });

  it('returns false for a wrong secret', () => {
    const payload = makePayload();
    const timestamp = '1783490467';
    const signature = sign(payload, timestamp, secret);

    expect(verifySignature(payload, signature, timestamp, 'wrong-secret')).toBe(false);
  });

  it('returns false when signature length does not match', () => {
    const payload = makePayload();
    const timestamp = '1783490467';

    expect(verifySignature(payload, 'short', timestamp, secret)).toBe(false);
  });
});
