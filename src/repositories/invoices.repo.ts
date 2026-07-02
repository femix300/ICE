import crypto from 'node:crypto';

import type { Pool } from 'pg';

import type { CreateInvoiceInput, InvoiceStatus } from '../schemas/invoices.schema.js';

export type InvoiceRow = {
  id: string;
  vendor_id: string;
  customer_id: string;
  amount_kobo: number;
  status: InvoiceStatus;
  paid_amount_kobo: number;
  created_at: Date;
  updated_at: Date;
};

export function createInvoicesRepo(db: Pool) {
  return {
    async findById(id: string): Promise<InvoiceRow | undefined> {
      const result = await db.query<InvoiceRow>(
        'SELECT * FROM invoices WHERE id = $1',
        [id],
      );
      return result.rows[0];
    },

    async findMerchantIdByInvoiceId(invoiceId: string): Promise<string | undefined> {
      const result = await db.query<{ merchant_id: string }>(
        `SELECT v.merchant_id FROM invoices i
         JOIN vendors v ON i.vendor_id = v.id
         WHERE i.id = $1`,
        [invoiceId],
      );
      return result.rows[0]?.merchant_id;
    },

    async findByVendorId(vendorId: string): Promise<InvoiceRow[]> {
      const result = await db.query<InvoiceRow>(
        'SELECT * FROM invoices WHERE vendor_id = $1 ORDER BY created_at DESC',
        [vendorId],
      );
      return result.rows;
    },

    async findIssuedByVaNumber(vaNumber: string): Promise<InvoiceRow | undefined> {
      const result = await db.query<InvoiceRow>(
        `SELECT i.* FROM invoices i
         JOIN customers c ON i.customer_id = c.id
         WHERE c.nomba_va_number = $1
         AND i.status IN ('issued', 'partially_paid')
         ORDER BY i.created_at ASC
         LIMIT 1`,
        [vaNumber],
      );
      return result.rows[0];
    },

    async create(input: CreateInvoiceInput): Promise<InvoiceRow> {
      const id = crypto.randomUUID();

      const result = await db.query<InvoiceRow>(
        `INSERT INTO invoices (id, vendor_id, customer_id, amount_kobo, status, paid_amount_kobo)
         VALUES ($1, $2, $3, $4, 'draft', 0)
         RETURNING *`,
        [id, input.vendor_id, input.customer_id, input.amount_kobo],
      );

      const row = result.rows[0];
      if (!row) {
        throw new Error('Failed to insert invoice');
      }
      return row;
    },

    async updateStatus(id: string, status: InvoiceStatus, paidAmountKobo?: number): Promise<InvoiceRow> {
      let query: string;
      let params: unknown[];

      if (paidAmountKobo !== undefined) {
        query = `UPDATE invoices SET status = $1, paid_amount_kobo = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *`;
        params = [status, paidAmountKobo, id];
      } else {
        query = `UPDATE invoices SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`;
        params = [status, id];
      }

      const result = await db.query<InvoiceRow>(query, params);

      const row = result.rows[0];
      if (!row) {
        throw new Error('Invoice not found for update');
      }
      return row;
    },
  };
}

export type InvoicesRepo = ReturnType<typeof createInvoicesRepo>;
