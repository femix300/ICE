import { describe, it, expect, vi } from 'vitest';
import { createDbPool } from '../../src/db/client.js';
import pg from 'pg';

vi.mock('pg', () => {
  return {
    default: {
      Pool: vi.fn(),
    },
  };
});

describe('createDbPool', () => {
  it('creates a pool without ssl for local connections', () => {
    createDbPool('postgresql://user:pass@localhost:5432/db');
    expect(pg.Pool).toHaveBeenCalledWith({
      connectionString: 'postgresql://user:pass@localhost:5432/db',
      ssl: false,
    });
  });

  it('creates a pool with ssl for remote connections', () => {
    createDbPool('postgresql://user:pass@remotehost.com:5432/db');
    expect(pg.Pool).toHaveBeenCalledWith({
      connectionString: 'postgresql://user:pass@remotehost.com:5432/db',
      ssl: { rejectUnauthorized: false },
    });
  });
});
