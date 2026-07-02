import pg from 'pg';

const { Pool } = pg;

export function createDbPool(connectionString?: string) {
  const connStr = connectionString || 'postgresql://postgres:postgres@localhost:5432/nomba';
  const isLocal = connStr.includes('localhost') || connStr.includes('127.0.0.1');

  return new Pool({
    connectionString: connStr,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });
}
