import crypto from 'node:crypto';

import type { Pool } from 'pg';

import { AppError } from '../lib/errors.js';

export type ReconciliationLogRow = {
  id: string;
  transaction_id: string;
  invoice_id: string | null;
  status: string;
  expected_kobo: number;
  received_kobo: number;
  difference_kobo: number;
  action_taken: string;
  created_at: Date;
};

export type CreateReconciliationLogInput = {
  transaction_id: string;
  invoice_id: string | null;
  status: string;
  expected_kobo: number;
  received_kobo: number;
  difference_kobo: number;
  action_taken: string;
};

export function createReconciliationRepo(db: Pool) {
  return {
    async findByTransactionId(transactionId: string): Promise<ReconciliationLogRow | undefined> {
      const result = await db.query<ReconciliationLogRow>(
        'SELECT * FROM reconciliation_logs WHERE transaction_id = $1',
        [transactionId],
      );
      return result.rows[0];
    },

    async create(input: CreateReconciliationLogInput): Promise<ReconciliationLogRow> {
      const id = crypto.randomUUID();

      const result = await db.query<ReconciliationLogRow>(
        `INSERT INTO reconciliation_logs (id, transaction_id, invoice_id, status, expected_kobo, received_kobo, difference_kobo, action_taken)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          id,
          input.transaction_id,
          input.invoice_id,
          input.status,
          input.expected_kobo,
          input.received_kobo,
          input.difference_kobo,
          input.action_taken,
        ],
      );

      const row = result.rows[0];
      if (!row) {
        throw new AppError(500, 'DATABASE_ERROR', 'Failed to insert reconciliation log');
      }
      return row;
    },

    async findByInvoiceId(invoiceId: string): Promise<ReconciliationLogRow[]> {
      const result = await db.query<ReconciliationLogRow>(
        'SELECT * FROM reconciliation_logs WHERE invoice_id = $1 ORDER BY created_at DESC',
        [invoiceId],
      );
      return result.rows;
    },

    async findLogs(status?: string, limit = 20, offset = 0): Promise<ReconciliationLogRow[]> {
      let query = 'SELECT * FROM reconciliation_logs';
      const params: unknown[] = [];

      if (status) {
        query += ' WHERE status = $1';
        params.push(status);
      }

      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const result = await db.query<ReconciliationLogRow>(query, params);
      return result.rows;
    },

    async countLogs(status?: string): Promise<number> {
      let query = 'SELECT COUNT(*) as count FROM reconciliation_logs';
      const params: unknown[] = [];

      if (status) {
        query += ' WHERE status = $1';
        params.push(status);
      }

      const result = await db.query<{ count: string }>(query, params);
      return parseInt(result.rows[0]?.count ?? '0', 10);
    },
  };
}

export type ReconciliationRepo = ReturnType<typeof createReconciliationRepo>;
