import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createVendorsRepo } from '../../src/repositories/vendors.repo.js';
import { AppError } from '../../src/lib/errors.js';
import type { Pool, QueryResult } from 'pg';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const makeRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'v1',
  merchant_id: 'm1',
  name: 'Acme',
  api_key_hash: null,
  api_key_prefix: null,
  callback_url: null,
  nomba_va_number: null,
  nomba_bank_name: null,
  va_status: 'active' as const,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

function mockPool(...responses: Array<{ rows: unknown[] }>): Pool {
  const query = vi.fn();
  responses.forEach((r) => query.mockResolvedValueOnce(r as QueryResult));
  return { query } as unknown as Pool;
}

// ---------------------------------------------------------------------------
// updateApiKey
// ---------------------------------------------------------------------------

describe('vendors.repo — updateApiKey', () => {
  it('issues an UPDATE with the correct params', async () => {
    const db = mockPool({ rows: [] });
    const repo = createVendorsRepo(db);

    await repo.updateApiKey('v1', 'hashed_value', 'ice_live_');

    const query = (db.query as ReturnType<typeof vi.fn>);
    expect(query).toHaveBeenCalledOnce();
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/UPDATE vendors SET api_key_hash/i);
    expect(params).toEqual(['hashed_value', 'ice_live_', 'v1']);
  });
});

// ---------------------------------------------------------------------------
// list
// ---------------------------------------------------------------------------

describe('vendors.repo — list', () => {
  beforeEach(() => vi.clearAllMocks());

  it('runs a COUNT then a SELECT and returns data + total', async () => {
    const row = makeRow();
    const db = mockPool(
      { rows: [{ count: '3' }] }, // COUNT query
      { rows: [row] },             // SELECT query
    );
    const repo = createVendorsRepo(db);

    const result = await repo.list('m1', 20, 0);

    expect(result.total).toBe(3);
    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('v1');

    const query = db.query as ReturnType<typeof vi.fn>;
    expect(query).toHaveBeenCalledTimes(2);

    // First call must be a COUNT
    const [countSql, countParams] = query.mock.calls[0] as [string, unknown[]];
    expect(countSql).toMatch(/COUNT\(\*\)/i);
    expect(countParams).toContain('m1');

    // Second call must be a SELECT with LIMIT/OFFSET
    const [selectSql, selectParams] = query.mock.calls[1] as [string, unknown[]];
    expect(selectSql).toMatch(/SELECT \* FROM vendors/i);
    expect(selectSql).toMatch(/LIMIT/i);
    expect(selectSql).toMatch(/OFFSET/i);
    expect(selectParams).toContain(20);
    expect(selectParams).toContain(0);
  });

  it('appends AND va_status = $2 when status filter is provided', async () => {
    const db = mockPool(
      { rows: [{ count: '1' }] },
      { rows: [makeRow({ va_status: 'suspended' as const })] },
    );
    const repo = createVendorsRepo(db);

    await repo.list('m1', 10, 0, 'suspended');

    const query = db.query as ReturnType<typeof vi.fn>;
    const [countSql, countParams] = query.mock.calls[0] as [string, unknown[]];
    expect(countSql).toMatch(/AND va_status/i);
    expect(countParams).toContain('suspended');

    const [selectSql, selectParams] = query.mock.calls[1] as [string, unknown[]];
    expect(selectSql).toMatch(/AND va_status/i);
    expect(selectParams).toContain('suspended');
  });

  it('returns total 0 and empty array when no vendors match', async () => {
    const db = mockPool(
      { rows: [{ count: '0' }] },
      { rows: [] },
    );
    const repo = createVendorsRepo(db);

    const result = await repo.list('m_nobody', 20, 0);

    expect(result.total).toBe(0);
    expect(result.data).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// updateAccount
// ---------------------------------------------------------------------------

describe('vendors.repo — updateAccount', () => {
  beforeEach(() => vi.clearAllMocks());

  it('issues UPDATE with name when only name is provided', async () => {
    const updated = makeRow({ name: 'New Name' });
    const db = mockPool({ rows: [updated] });
    const repo = createVendorsRepo(db);

    const result = await repo.updateAccount('v1', 'New Name');

    expect(result.name).toBe('New Name');
    const query = db.query as ReturnType<typeof vi.fn>;
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/UPDATE vendors SET/i);
    expect(sql).toMatch(/name = \$1/i);
    expect(sql).toMatch(/RETURNING \*/i);
    expect(params).toContain('New Name');
    expect(params).toContain('v1');
  });

  it('issues UPDATE with callback_url when only callbackUrl is provided', async () => {
    const updated = makeRow({ callback_url: 'https://cb.example.com' });
    const db = mockPool({ rows: [updated] });
    const repo = createVendorsRepo(db);

    const result = await repo.updateAccount('v1', undefined, 'https://cb.example.com');

    expect(result.callback_url).toBe('https://cb.example.com');
    const query = db.query as ReturnType<typeof vi.fn>;
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/callback_url = \$1/i);
    expect(params).toContain('https://cb.example.com');
  });

  it('issues UPDATE with both fields when both are provided', async () => {
    const updated = makeRow({ name: 'Renamed', callback_url: 'https://new.url' });
    const db = mockPool({ rows: [updated] });
    const repo = createVendorsRepo(db);

    const result = await repo.updateAccount('v1', 'Renamed', 'https://new.url');

    expect(result.name).toBe('Renamed');
    expect(result.callback_url).toBe('https://new.url');
    const query = db.query as ReturnType<typeof vi.fn>;
    const [sql] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/name = \$1/i);
    expect(sql).toMatch(/callback_url = \$2/i);
  });

  it('falls back to SELECT when no fields are provided', async () => {
    const existing = makeRow();
    const db = mockPool({ rows: [existing] });
    const repo = createVendorsRepo(db);

    const result = await repo.updateAccount('v1');

    expect(result.id).toBe('v1');
    const query = db.query as ReturnType<typeof vi.fn>;
    const [sql] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/SELECT \* FROM vendors WHERE id = \$1/i);
  });

  it('throws VENDOR_NOT_FOUND when no row is returned after UPDATE', async () => {
    const db = mockPool({ rows: [] });
    const repo = createVendorsRepo(db);

    await expect(repo.updateAccount('v_gone', 'New Name')).rejects.toMatchObject({
      errorCode: 'VENDOR_NOT_FOUND',
      status: 404,
    });
  });

  it('throws VENDOR_NOT_FOUND on SELECT fallback when vendor does not exist', async () => {
    const db = mockPool({ rows: [] });
    const repo = createVendorsRepo(db);

    await expect(repo.updateAccount('v_gone')).rejects.toMatchObject({
      errorCode: 'VENDOR_NOT_FOUND',
      status: 404,
    });
  });
});

// ---------------------------------------------------------------------------
// updateStatus
// ---------------------------------------------------------------------------

describe('vendors.repo — updateStatus', () => {
  it('issues UPDATE with the correct status and returns the row', async () => {
    const updated = makeRow({ va_status: 'suspended' as const });
    const db = mockPool({ rows: [updated] });
    const repo = createVendorsRepo(db);

    const result = await repo.updateStatus('v1', 'suspended');

    expect(result.va_status).toBe('suspended');
    const query = db.query as ReturnType<typeof vi.fn>;
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toMatch(/UPDATE vendors SET va_status = \$1/i);
    expect(params).toEqual(['suspended', 'v1']);
  });

  it('throws VENDOR_NOT_FOUND when no row is returned', async () => {
    const db = mockPool({ rows: [] });
    const repo = createVendorsRepo(db);

    await expect(repo.updateStatus('v_gone', 'suspended')).rejects.toMatchObject({
      errorCode: 'VENDOR_NOT_FOUND',
      status: 404,
    });
  });
});
