import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Mock } from 'vitest';
import { createNombaClient } from '../../src/lib/nomba.js';
import { AppError } from '../../src/lib/errors.js';

describe('NombaClient', () => {
  let client: ReturnType<typeof createNombaClient>;
  let fetchMock: Mock;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
    client = createNombaClient();
    client._setToken('test_token'); // authenticate manually for tests
  });

  afterEach(() => {
    client.close();
    vi.clearAllMocks();
  });

  it('createVirtualAccount sends correct payload to Nomba (mocked)', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const res = await client.createVirtualAccount({ accountRef: 'ref123', accountName: 'John Doe' });

    expect(fetchMock).toHaveBeenCalledWith('https://sandbox.nomba.com/v1/accounts/virtual', {
      method: 'POST',
      headers: expect.objectContaining({
        Authorization: 'Bearer test_token',
        'Content-Type': 'application/json',
      }),
      body: JSON.stringify({ accountRef: 'ref123', accountName: 'John Doe', currency: 'NGN' }),
    });
    expect(res).toEqual({ success: true });
  });

  it('Nomba API failure throws AppError with 502 status', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
    });

    await expect(client.createVirtualAccount({ accountRef: 'ref123', accountName: 'John Doe' }))
      .rejects.toThrow(AppError);

    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
    });

    try {
      await client.createVirtualAccount({ accountRef: 'ref123', accountName: 'John Doe' });
    } catch (error: unknown) {
      expect(error instanceof AppError).toBe(true);
      if (error instanceof AppError) {
        expect(error.status).toBe(502);
        expect(error.errorCode).toBe('NOMBA_ERROR');
      }
    }
  });

  it('transferToBank looks up account and sends correct kobo amount', async () => {
    // Mock lookup success
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, accountName: 'Test Account' }),
    });
    // Mock transfer success
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    await client.transferToBank({ amount: 50000, accountNumber: '1234567890', bankCode: '044', narration: 'Test' });

    // Lookup
    expect(fetchMock).toHaveBeenNthCalledWith(1, 'https://sandbox.nomba.com/v1/transfers/bank/lookup', {
      method: 'POST',
      headers: expect.objectContaining({
        Authorization: 'Bearer test_token',
      }),
      body: JSON.stringify({ accountNumber: '1234567890', bankCode: '044' }),
    });

    // Transfer
    expect(fetchMock).toHaveBeenNthCalledWith(2, 'https://sandbox.nomba.com/v2/transfers/bank', {
      method: 'POST',
      headers: expect.objectContaining({
        Authorization: 'Bearer test_token',
      }),
      body: JSON.stringify({ amount: 50000, accountNumber: '1234567890', bankCode: '044', narration: 'Test' }),
    });
  });

  it('All requests include correct Authorization header', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    await client.deleteVirtualAccount('acct_123');

    expect(fetchMock).toHaveBeenCalledWith('https://sandbox.nomba.com/v1/accounts/virtual/acct_123', {
      method: 'DELETE',
      headers: expect.objectContaining({
        Authorization: 'Bearer test_token',
        'Content-Type': 'application/json',
      }),
    });
  });
});
