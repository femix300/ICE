import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api } from '../../lib/api';
import { z } from 'zod';
import { AppError } from '../../lib/errors';

// Mock the config so NEXT_PUBLIC_API_URL is controlled
vi.mock('../../lib/config', () => ({
  config: {
    NEXT_PUBLIC_API_URL: 'https://api.test.com',
    NODE_ENV: 'test',
  },
}));

describe('API Client Utility', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
    vi.stubGlobal('window', { location: { href: '' } });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('performs GET request and returns data', async () => {
    const mockData = { id: '123', name: 'Test' };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, data: mockData }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await api.get('/test-route');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.test.com/test-route',
      expect.objectContaining({
        method: 'GET',
      }),
    );
    expect(result).toEqual(mockData);
  });

  it('validates envelope data with Zod schema if provided', async () => {
    const schema = z.object({
      id: z.string(),
      name: z.string(),
    });

    const mockData = { id: '123', name: 'Test' };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, data: mockData }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await api.get('/test-route', { schema });
    expect(result).toEqual(mockData);
  });

  it('throws AppError when Zod validation fails', async () => {
    const schema = z.object({
      id: z.string(),
      name: z.number(), // Expect number but API returns string
    });

    const mockData = { id: '123', name: 'Test' };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, data: mockData }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(api.get('/test-route', { schema })).rejects.toThrow();
  });

  it('throws AppError on 401 Unauthorized so callers can fall back gracefully', async () => {
    const mockRedirect = { href: '' };
    vi.stubGlobal('window', { location: mockRedirect });

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(api.get('/test-route')).rejects.toThrowError(AppError);
    // No forced navigation: the UI (e.g. useMockFallback) decides how to
    // degrade instead of bouncing the user to a non-existent login page.
    expect(mockRedirect.href).toBe('');
  });

  it('throws AppError on HTTP failure status codes', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ ok: false, error: 'Bad Request Parameter' }),
    });
    vi.stubGlobal('fetch', mockFetch);

    await expect(api.get('/test-route')).rejects.toThrowError('Bad Request Parameter');
  });

  it('performs POST request with payload and returns data', async () => {
    const payload = { businessName: 'Test Biz' };
    const mockData = { id: '456', businessName: 'Test Biz' };
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, data: mockData }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const result = await api.post('/test-route', payload);
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.test.com/test-route',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    );
    expect(result).toEqual(mockData);
  });
});
