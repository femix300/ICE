import type { Pool } from 'pg';
import { AppError } from '../lib/errors.js';

export interface VendorRow {
  id: string;
  merchant_id: string;
  name: string;
  api_key_hash: string | null;
  api_key_prefix: string | null;
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
      return res.rows[0] as VendorRow;
    },
    delete: async (id: string): Promise<void> => {
      await db.query('DELETE FROM vendors WHERE id = $1', [id]);
    },
    updateVa: async (id: string, vaNumber: string, bankName: string): Promise<VendorRow> => {
      const res = await db.query<VendorRow>(
        'UPDATE vendors SET nomba_va_number = $1, nomba_bank_name = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
        [vaNumber, bankName, id],
      );
      if (res.rowCount === 0) throw new AppError(404, 'VENDOR_NOT_FOUND', 'Vendor not found');
      return res.rows[0] as VendorRow;
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
  };
}
