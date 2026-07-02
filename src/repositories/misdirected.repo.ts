import crypto from 'node:crypto';

import type { Pool } from 'pg';

export type MisdirectedPaymentRow = {
  id: string;
  merchant_id: string;
  va_number: string;
  amount_kobo: number;
  sender_name: string;
  raw_payload: unknown;
  status: string;
  resolution: string | null;
  created_at: Date;
  updated_at: Date;
};

export type CreateMisdirectedPaymentInput = {
  merchant_id: string;
  va_number: string;
  amount_kobo: number;
  sender_name: string;
  raw_payload: unknown;
};

export function createMisdirectedRepo(db: Pool) {
  return {
    async create(input: CreateMisdirectedPaymentInput): Promise<MisdirectedPaymentRow> {
      const id = crypto.randomUUID();

      const result = await db.query<MisdirectedPaymentRow>(
        `INSERT INTO misdirected_payments (id, merchant_id, va_number, amount_kobo, sender_name, raw_payload, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'PENDING_REVIEW')
         RETURNING *`,
        [id, input.merchant_id, input.va_number, input.amount_kobo, input.sender_name, JSON.stringify(input.raw_payload)],
      );

      const row = result.rows[0];
      if (!row) {
        throw new Error('Failed to insert misdirected payment');
      }
      return row;
    },

    async findByMerchantId(merchantId: string, limit = 50, offset = 0): Promise<MisdirectedPaymentRow[]> {
      const result = await db.query<MisdirectedPaymentRow>(
        `SELECT * FROM misdirected_payments
         WHERE merchant_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [merchantId, limit, offset],
      );
      return result.rows;
    },

    async countByMerchantId(merchantId: string): Promise<number> {
      const result = await db.query<{ count: string }>(
        'SELECT COUNT(*) as count FROM misdirected_payments WHERE merchant_id = $1',
        [merchantId],
      );
      return parseInt(result.rows[0]?.count ?? '0', 10);
    },

    async findById(id: string): Promise<MisdirectedPaymentRow | undefined> {
      const result = await db.query<MisdirectedPaymentRow>(
        'SELECT * FROM misdirected_payments WHERE id = $1',
        [id],
      );
      return result.rows[0];
    },

    async updateResolution(id: string, resolution: string, status: string): Promise<MisdirectedPaymentRow> {
      const result = await db.query<MisdirectedPaymentRow>(
        `UPDATE misdirected_payments
         SET resolution = $1, status = $2, updated_at = CURRENT_TIMESTAMP
         WHERE id = $3 RETURNING *`,
        [resolution, status, id],
      );

      const row = result.rows[0];
      if (!row) {
        throw new Error('Misdirected payment not found for update');
      }
      return row;
    },

    async findMerchantByVaNumber(vaNumber: string): Promise<string | undefined> {
      const result = await db.query<{ merchant_id: string }>(
        `SELECT merchant_id FROM vendors WHERE nomba_va_number = $1 LIMIT 1`,
        [vaNumber],
      );
      return result.rows[0]?.merchant_id;
    },
  };
}

export type MisdirectedRepo = ReturnType<typeof createMisdirectedRepo>;
