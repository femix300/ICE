import crypto from 'node:crypto';

import type { Pool } from 'pg';

import type { NombaWebhookPayload } from '../schemas/webhooks.schema.js';

export type TransactionRow = {
  id: string;
  transaction_id: string;
  va_number: string;
  amount_kobo: number;
  sender_name: string;
  sender_account: string;
  sender_bank_code: string;
  raw_payload: unknown;
  created_at: Date;
};

export function createTransactionsRepo(db: Pool) {
  return {
    async byTransactionId(transactionId: string): Promise<TransactionRow | undefined> {
      const result = await db.query<TransactionRow>(
        'SELECT * FROM transactions WHERE transaction_id = $1',
        [transactionId],
      );
      return result.rows[0];
    },

    async create(payload: NombaWebhookPayload): Promise<TransactionRow> {
      const id = crypto.randomUUID();
      const amountKobo = Math.round(payload.data.amount * 100);

      const result = await db.query<TransactionRow>(
        `INSERT INTO transactions (id, transaction_id, va_number, amount_kobo, sender_name, sender_account, sender_bank_code, raw_payload)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          id,
          payload.data.transactionId,
          payload.data.accountNumber,
          amountKobo,
          payload.data.senderName,
          payload.data.senderAccountNumber,
          payload.data.senderBankCode,
          JSON.stringify(payload),
        ],
      );

      const row = result.rows[0];
      if (!row) {
        throw new Error('Failed to insert transaction');
      }
      return row;
    },
  };
}

export type TransactionsRepo = ReturnType<typeof createTransactionsRepo>;
