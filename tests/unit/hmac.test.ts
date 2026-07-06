import crypto from 'node:crypto';
import { describe, it, expect } from 'vitest';

import { verifySignature } from '../../src/lib/hmac.js';

describe('verifySignature', () => {
  const secret = 'test-secret-key';

  function generateValidSignature(payload: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  it('returns true for a valid signature', () => {
    const payload = '{"event":"payment_success","data":{}}';
    const signature = generateValidSignature(payload);

    expect(verifySignature(payload, signature, secret)).toBe(true);
  });

  it('returns false for an invalid signature', () => {
    const payload = '{"event":"payment_success","data":{}}';
    const badSignature = 'a'.repeat(64);

    expect(verifySignature(payload, badSignature, secret)).toBe(false);
  });

  it('returns false when payload has been tampered with', () => {
    const originalPayload = '{"event":"payment_success","data":{"amount":100}}';
    const signature = generateValidSignature(originalPayload);
    const tamperedPayload = '{"event":"payment_success","data":{"amount":999}}';

    expect(verifySignature(tamperedPayload, signature, secret)).toBe(false);
  });

  it('returns false for a wrong secret', () => {
    const payload = '{"event":"payment_success","data":{}}';
    const signature = generateValidSignature(payload);

    expect(verifySignature(payload, signature, 'wrong-secret')).toBe(false);
  });

  it('returns false when signature length does not match', () => {
    const payload = '{"event":"payment_success","data":{}}';

    expect(verifySignature(payload, 'short', secret)).toBe(false);
  });
});
