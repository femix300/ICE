import crypto from 'node:crypto';
import type { Pool } from 'pg';
import { AppError } from '../lib/errors.js';
import type { NombaWebhookPayload } from '../schemas/webhooks.schema.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('transactions-repo');

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

// Field paths confirmed against docs/openapi.yaml NombaWebhookPayload schema
// (verified this session against Nomba's real webhook shape). va_number maps
// to aliasAccountNumber - the VA the payment landed in - not accountNumber or
// walletId, which don't exist / aren't the receiving account. Sender details
// live under data.customer, not data.transaction.
function extractField(source: unknown, path: string[]): string | undefined {
  let cur: unknown = source;
  for (const key of path) {
    if (typeof cur !== 'object' || cur === null) return undefined;
    cur = (cur as Record<string, unknown>)[key];
  }
  return typeof cur === 'string' ? cur : undefined;
}

function extractAmount(payload: NombaWebhookPayload): number {
  const t = (payload as { data?: { transaction?: Record<string, unknown> } }).data?.transaction;
  const raw = t?.transactionAmount;
  const num = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN;
  if (Number.isNaN(num)) {
    log.warn({ payload }, 'could not extract numeric amount from webhook payload');
    return 0;
  }
  return num;
}

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
      const amountKobo = Math.round(extractAmount(payload) * 100);

      const transactionId = payload.data.transaction.transactionId;
      const accountNumber =
        extractField(payload, ['data', 'transaction', 'aliasAccountNumber']) ?? '';
      const senderName = extractField(payload, ['data', 'customer', 'senderName']) ?? '';
      const senderAccountNumber =
        extractField(payload, ['data', 'customer', 'accountNumber']) ?? '';
      const senderBankCode =
        extractField(payload, ['data', 'customer', 'bankCode']) ?? '';

      if (!accountNumber || !senderName || !senderAccountNumber || !senderBankCode) {
        log.warn(
          { transactionId, payload },
          'one or more transaction fields missing from real webhook payload - check raw_payload and update mapping',
        );
      }

      const result = await db.query<TransactionRow>(
        `INSERT INTO transactions (id, transaction_id, va_number, amount_kobo, sender_name, sender_account, sender_bank_code, raw_payload)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          id,
          transactionId,
          accountNumber,
          amountKobo,
          senderName,
          senderAccountNumber,
          senderBankCode,
          JSON.stringify(payload),
        ],
      );
      const row = result.rows[0];
      if (!row) {
        throw new AppError(500, 'DATABASE_ERROR', 'Failed to insert transaction');
      }
      return row;
    },
  };
}
export type TransactionsRepo = ReturnType<typeof createTransactionsRepo>;
