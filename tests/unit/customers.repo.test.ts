import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createCustomersRepo } from '../../src/repositories/customers.repo.js';
import type { Pool } from 'pg';
import { AppError } from '../../src/lib/errors.js';

describe('Customers Repository', () => {
  const mockDbQuery = vi.fn();
  const db = { query: mockDbQuery } as unknown as Pool;
  const repo = createCustomersRepo(db);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('creates and returns a new customer', async () => {
      const customer = { id: 'c1', vendor_id: 'v1', name: 'Alice', email: 'alice@example.com' };
      mockDbQuery.mockResolvedValueOnce({ rows: [customer] });

      const result = await repo.create(customer);

      expect(result).toEqual(customer);
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO customers'),
        ['c1', 'v1', 'Alice', 'alice@example.com']
      );
    });

    it('throws AppError if insert fails', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        repo.create({ id: 'c1', vendor_id: 'v1', name: 'Alice', email: 'alice@example.com' })
      ).rejects.toThrow(AppError);
    });
  });

  describe('byId', () => {
    it('returns customer by id', async () => {
      const customer = { id: 'c1', vendor_id: 'v1', name: 'Alice', email: 'alice@example.com' };
      mockDbQuery.mockResolvedValueOnce({ rows: [customer] });

      const result = await repo.byId('c1');

      expect(result).toEqual(customer);
    });

    it('returns null if not found', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.byId('c1');

      expect(result).toBeNull();
    });
  });

  describe('byVendorAndId', () => {
    it('returns customer by vendor and id', async () => {
      const customer = { id: 'c1', vendor_id: 'v1', name: 'Alice', email: 'alice@example.com' };
      mockDbQuery.mockResolvedValueOnce({ rows: [customer] });

      const result = await repo.byVendorAndId('v1', 'c1');

      expect(result).toEqual(customer);
    });

    it('returns null if not found', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.byVendorAndId('v1', 'c1');

      expect(result).toBeNull();
    });
  });

  describe('byEmailAndVendor', () => {
    it('returns customer by email and vendor', async () => {
      const customer = { id: 'c1', vendor_id: 'v1', name: 'Alice', email: 'alice@example.com' };
      mockDbQuery.mockResolvedValueOnce({ rows: [customer] });

      const result = await repo.byEmailAndVendor('alice@example.com', 'v1');

      expect(result).toEqual(customer);
    });

    it('returns null if not found', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [] });

      const result = await repo.byEmailAndVendor('alice@example.com', 'v1');

      expect(result).toBeNull();
    });
  });

  describe('updateVa', () => {
    it('updates and returns the customer', async () => {
      const customer = { id: 'c1', nomba_va_number: '123', nomba_bank_name: 'Nombank' };
      mockDbQuery.mockResolvedValueOnce({ rows: [customer] });

      const result = await repo.updateVa('c1', '123', 'Nombank');

      expect(result).toEqual(customer);
      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE customers'),
        ['123', 'Nombank', 'c1']
      );
    });

    it('throws AppError if customer not found', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [] });

      await expect(repo.updateVa('c1', '123', 'Nombank')).rejects.toThrow(AppError);
    });
  });

  describe('delete', () => {
    it('executes delete query', async () => {
      mockDbQuery.mockResolvedValueOnce({ rows: [] });

      await repo.delete('c1');

      expect(mockDbQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM customers'),
        ['c1']
      );
    });
  });
});
