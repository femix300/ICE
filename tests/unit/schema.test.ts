import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Database Schema Migration', () => {
  const schemaPath = path.join(process.cwd(), 'src', 'db', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  it('contains all 10 required tables', () => {
    const tables = [
      'merchants',
      'vendors',
      'customers',
      'invoices',
      'transactions',
      'reconciliation_logs',
      'refunds',
      'webhook_deliveries',
      'misdirected_payments',
      'audit_logs',
    ];

    for (const table of tables) {
      expect(schemaSql).toMatch(new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`, 'i'));
    }
  });

  it('uses INTEGER for all amount columns', () => {
    // There should be no FLOAT or DECIMAL in the schema
    expect(schemaSql).not.toMatch(/FLOAT/i);
    expect(schemaSql).not.toMatch(/DECIMAL/i);
    expect(schemaSql).not.toMatch(/NUMERIC/i);
    expect(schemaSql).not.toMatch(/REAL/i);
    expect(schemaSql).not.toMatch(/DOUBLE/i);
    
    // Specifically check that amount_kobo is used
    expect(schemaSql).toMatch(/amount_kobo INTEGER/i);
  });

  it('is idempotent (uses IF NOT EXISTS)', () => {
    const createTableCount = (schemaSql.match(/CREATE TABLE/gi) || []).length;
    const ifNotExistsCount = (schemaSql.match(/CREATE TABLE IF NOT EXISTS/gi) || []).length;
    
    expect(createTableCount).toBe(ifNotExistsCount);
    expect(createTableCount).toBe(10);
  });
});
