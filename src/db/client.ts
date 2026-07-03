import pg from 'pg';

const { Pool } = pg;

export function createDbPool(connectionString: string) {
  const isLocal = connectionString.includes('localhost') || connectionString.includes('127.0.0.1');
  
  return new Pool({
    connectionString,
    ssl: isLocal ? false : { rejectUnauthorized: false },
  });
}
