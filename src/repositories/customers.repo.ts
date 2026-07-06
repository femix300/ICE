import type { Pool } from 'pg';
import { AppError } from '../lib/errors.js';

export interface CustomerRow {
  id: string;
  vendor_id: string;
  name: string;
  email: string;
  nomba_va_number: string | null;
  nomba_bank_name: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface NewCustomer {
  id: string;
  vendor_id: string;
  name: string;
  email: string;
}

export interface CustomersRepo {
  create(data: NewCustomer): Promise<CustomerRow>;
  byId(id: string): Promise<CustomerRow | null>;
  byVendorAndId(vendorId: string, id: string): Promise<CustomerRow | null>;
  byEmailAndVendor(email: string, vendorId: string): Promise<CustomerRow | null>;
  updateVa(id: string, vaNumber: string, bankName: string): Promise<CustomerRow>;
  delete(id: string): Promise<void>;
}

export function createCustomersRepo(db: Pool): CustomersRepo {
  return {
    create: async (data: NewCustomer): Promise<CustomerRow> => {
      const res = await db.query<CustomerRow>(
        `INSERT INTO customers (id, vendor_id, name, email)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [data.id, data.vendor_id, data.name, data.email],
      );
      if (!res.rows[0]) throw new AppError(500, 'INTERNAL_ERROR', 'Failed to create customer');
      return res.rows[0];
    },

    byId: async (id: string): Promise<CustomerRow | null> => {
      const res = await db.query<CustomerRow>('SELECT * FROM customers WHERE id = $1', [id]);
      return res.rows[0] ?? null;
    },

    byVendorAndId: async (vendorId: string, id: string): Promise<CustomerRow | null> => {
      const res = await db.query<CustomerRow>(
        'SELECT * FROM customers WHERE vendor_id = $1 AND id = $2',
        [vendorId, id],
      );
      return res.rows[0] ?? null;
    },

    byEmailAndVendor: async (email: string, vendorId: string): Promise<CustomerRow | null> => {
      const res = await db.query<CustomerRow>(
        'SELECT * FROM customers WHERE email = $1 AND vendor_id = $2',
        [email, vendorId],
      );
      return res.rows[0] ?? null;
    },

    updateVa: async (id: string, vaNumber: string, bankName: string): Promise<CustomerRow> => {
      const res = await db.query<CustomerRow>(
        'UPDATE customers SET nomba_va_number = $1, nomba_bank_name = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
        [vaNumber, bankName, id],
      );
      if (!res.rows[0]) throw new AppError(404, 'CUSTOMER_NOT_FOUND', 'Customer not found');
      return res.rows[0];
    },

    delete: async (id: string): Promise<void> => {
      await db.query('DELETE FROM customers WHERE id = $1', [id]);
    },
  };
}
