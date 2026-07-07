import type { Pool } from 'pg';
import { AppError } from '../lib/errors.js';

export interface VendorRow {
  id: string;
  merchant_id: string;
  name: string;
  api_key_hash: string | null;
  api_key_prefix: string | null;
  callback_url: string | null;
  nomba_va_number: string | null;
  nomba_bank_name: string | null;
  va_status: 'pending' | 'active' | 'suspended';
  created_at: Date;
  updated_at: Date;
}

export interface NewVendor {
  id: string;
  merchant_id: string;
  name: string;
  va_status: 'pending' | 'active' | 'suspended';
}

export interface VendorsRepo {
  create(data: NewVendor): Promise<VendorRow>;
  delete(id: string): Promise<void>;
  updateVa(id: string, vaNumber: string, bankName: string): Promise<VendorRow>;
  byId(id: string): Promise<VendorRow | null>;
  byNameAndMerchant(name: string, merchantId: string): Promise<VendorRow | null>;
  findByKeyPrefix(
    prefix: string,
  ): Promise<{ id: string; merchant_id: string; api_key_hash: string } | null>;
  updateApiKey(id: string, hash: string, prefix: string): Promise<void>;
  list(
    merchantId: string,
    limit: number,
    offset: number,
    status?: string,
  ): Promise<{ data: VendorRow[]; total: number }>;
  updateAccount(id: string, name?: string, callbackUrl?: string): Promise<VendorRow>;
  updateStatus(id: string, status: 'pending' | 'active' | 'suspended'): Promise<VendorRow>;
}

export function createVendorsRepo(db: Pool): VendorsRepo {
  return {
    create: async (data: NewVendor): Promise<VendorRow> => {
      const res = await db.query<VendorRow>(
        `INSERT INTO vendors (id, merchant_id, name, va_status)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [data.id, data.merchant_id, data.name, data.va_status],
      );
      if (!res.rows[0]) throw new AppError(500, 'INTERNAL_ERROR', 'Failed to create vendor');
      return res.rows[0];
    },
    delete: async (id: string): Promise<void> => {
      await db.query('DELETE FROM vendors WHERE id = $1', [id]);
    },
    updateVa: async (id: string, vaNumber: string, bankName: string): Promise<VendorRow> => {
      const res = await db.query<VendorRow>(
        'UPDATE vendors SET nomba_va_number = $1, nomba_bank_name = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
        [vaNumber, bankName, id],
      );
      if (!res.rows[0]) throw new AppError(404, 'VENDOR_NOT_FOUND', 'Vendor not found');
      return res.rows[0];
    },
    byId: async (id: string): Promise<VendorRow | null> => {
      const res = await db.query<VendorRow>('SELECT * FROM vendors WHERE id = $1', [id]);
      return res.rows[0] ?? null;
    },
    byNameAndMerchant: async (name: string, merchantId: string): Promise<VendorRow | null> => {
      const res = await db.query<VendorRow>(
        'SELECT * FROM vendors WHERE name = $1 AND merchant_id = $2',
        [name, merchantId],
      );
      return res.rows[0] ?? null;
    },
    findByKeyPrefix: async (
      prefix: string,
    ): Promise<{ id: string; merchant_id: string; api_key_hash: string } | null> => {
      const res = await db.query<{ id: string; merchant_id: string; api_key_hash: string }>(
        'SELECT id, merchant_id, api_key_hash FROM vendors WHERE api_key_prefix = $1 AND va_status = $2 AND api_key_hash IS NOT NULL',
        [prefix, 'active'],
      );
      return res.rows[0] ?? null;
    },
    updateApiKey: async (id: string, hash: string, prefix: string): Promise<void> => {
      await db.query(
        'UPDATE vendors SET api_key_hash = $1, api_key_prefix = $2, updated_at = NOW() WHERE id = $3',
        [hash, prefix, id],
      );
    },
    list: async (
      merchantId: string,
      limit: number,
      offset: number,
      status?: string,
    ): Promise<{ data: VendorRow[]; total: number }> => {
      const queryParams: (string | number)[] = [merchantId];
      let whereClause = 'WHERE merchant_id = $1';

      if (status) {
        queryParams.push(status);
        whereClause += ` AND va_status = $${queryParams.length}`;
      }

      const countRes = await db.query<{ count: string }>(
        `SELECT COUNT(*) FROM vendors ${whereClause}`,
        queryParams,
      );
      const total = parseInt(countRes.rows[0]?.count ?? '0', 10);

      queryParams.push(limit, offset);
      const res = await db.query<VendorRow>(
        `SELECT * FROM vendors ${whereClause} ORDER BY created_at DESC LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}`,
        queryParams,
      );

      return { data: res.rows, total };
    },
    updateAccount: async (id: string, name?: string, callbackUrl?: string): Promise<VendorRow> => {
      const updates = [];
      const values = [];
      let i = 1;

      if (name !== undefined) {
        updates.push(`name = $${i++}`);
        values.push(name);
      }
      if (callbackUrl !== undefined) {
        updates.push(`callback_url = $${i++}`);
        values.push(callbackUrl);
      }

      if (updates.length === 0) {
        const res = await db.query<VendorRow>('SELECT * FROM vendors WHERE id = $1', [id]);
        if (!res.rows[0]) throw new AppError(404, 'VENDOR_NOT_FOUND', 'Vendor not found');
        return res.rows[0];
      }

      updates.push(`updated_at = NOW()`);
      values.push(id);

      const query = `UPDATE vendors SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`;
      const res = await db.query<VendorRow>(query, values);

      if (!res.rows[0]) throw new AppError(404, 'VENDOR_NOT_FOUND', 'Vendor not found');
      return res.rows[0];
    },
    updateStatus: async (
      id: string,
      status: 'pending' | 'active' | 'suspended',
    ): Promise<VendorRow> => {
      const res = await db.query<VendorRow>(
        'UPDATE vendors SET va_status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [status, id],
      );
      if (!res.rows[0]) throw new AppError(404, 'VENDOR_NOT_FOUND', 'Vendor not found');
      return res.rows[0];
    },
  };
}
