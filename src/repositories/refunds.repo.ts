import crypto from 'node:crypto';
import type { Pool } from 'pg';
import { AppError } from '../lib/errors.js';

export interface RefundRow {
  id: string;
  transaction_id: string;
  amount_kobo: number;
  recipient_account: string;
  recipient_bank_code: string;
  nomba_transfer_ref: string | null;
  status: string;
  retry_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateRefundInput {
  transaction_id: string;
  amount_kobo: number;
  recipient_account: string;
  recipient_bank_code: string;
}

export function createRefundsRepo(db: Pool) {
  return {
    async create(input: CreateRefundInput): Promise<RefundRow> {
      const id = crypto.randomUUID();

      const result = await db.query<RefundRow>(
        `INSERT INTO refunds (id, transaction_id, amount_kobo, recipient_account, recipient_bank_code, status)
         VALUES ($1, $2, $3, $4, $5, 'PENDING')
         RETURNING *`,
        [id, input.transaction_id, input.amount_kobo, input.recipient_account, input.recipient_bank_code],
      );

      const row = result.rows[0];
      if (!row) {
        throw new AppError(500, 'DATABASE_ERROR', 'Failed to insert refund');
      }
      return row;
    },

    async update(
      transactionId: string,
      data: { status: 'COMPLETED' | 'FAILED'; nomba_transfer_ref?: string },
    ): Promise<void> {
      await db.query(
        `UPDATE refunds
         SET status = $1, nomba_transfer_ref = $2, updated_at = CURRENT_TIMESTAMP
         WHERE transaction_id = $3`,
        [data.status, data.nomba_transfer_ref ?? null, transactionId],
      );
    },
  };
}

export type RefundsRepo = ReturnType<typeof createRefundsRepo>;
