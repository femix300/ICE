import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setApiKey, clearApiKey, getMerchantId, setMerchantId } from '../../lib/auth';
import { CURRENT_MERCHANT_ID } from '../../lib/session';

describe('Auth Store (Cookie Layer)', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
    Object.defineProperty(document, 'cookie', { writable: true, value: '' });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('setApiKey calls the secure session endpoint via POST', () => {
    setApiKey('test_key');
    expect(global.fetch).toHaveBeenCalledWith('/api/auth/session', expect.objectContaining({ 
      method: 'POST',
      body: JSON.stringify({ apiKey: 'test_key' })
    }));
  });

  it('clearApiKey calls the secure session endpoint via DELETE', () => {
    clearApiKey();
    expect(global.fetch).toHaveBeenCalledWith('/api/auth/session', expect.objectContaining({ 
      method: 'DELETE' 
    }));
  });

  it('getMerchantId falls back to CURRENT_MERCHANT_ID if cookie is missing', () => {
    expect(getMerchantId()).toBe(CURRENT_MERCHANT_ID);
  });

  it('setMerchantId sets the cookie directly', () => {
    setMerchantId('merch_123');
    expect(document.cookie).toContain('ice_merchant_id=merch_123');
  });
});
