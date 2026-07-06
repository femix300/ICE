import { z } from 'zod';

import type { Pool } from 'pg';

import { createLogger } from '../lib/logger.js';
import { AppError } from '../lib/errors.js';

const log = createLogger('nightly-reconciliation');

// ---------- Types ----------

const NombaTxSchema = z.object({
  merchantTxRef: z.string(),
  amount: z.number(),
  status: z.string(),
});

type NombaTx = z.infer<typeof NombaTxSchema>;

const NombaTransactionsResponseSchema = z.object({
  data: z.object({
    transactions: z.array(z.unknown()),
  }),
});

export interface NombaClientStub {
  fetchTransactions: (params: {
    dateFrom: string;
    dateTo: string;
    status: string;
  }) => Promise<unknown>;
}

export interface AlertService {
  alertOps: (title: string, payload: unknown) => Promise<void>;
}

// ---------- Date helpers ----------

function getYesterday(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function getToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// ---------- Factory ----------

export function createNightlyReconciliation(deps: {
  nomba: NombaClientStub;
  db: Pool;
  alertOps: AlertService['alertOps'];
}) {
  const runNightlyDiff = async (): Promise<void> => {
    if (process.env.SCHEDULER_ENABLED !== 'true') {
      log.info('Nightly reconciliation skipped: SCHEDULER_ENABLED is not true');
      return;
    }

    log.info({ dateFrom: getYesterday(), dateTo: getToday() }, 'Nightly reconciliation diff started');

    let raw: unknown;
    try {
      raw = await deps.nomba.fetchTransactions({
        dateFrom: getYesterday(),
        dateTo: getToday(),
        status: 'success',
      });
    } catch (err: unknown) {
      log.error({ err }, 'Failed to fetch transactions from Nomba');
      throw new AppError(502, 'NOMBA_FETCH_ERROR', 'Nightly diff: failed to fetch from Nomba');
    }

    const parsed = NombaTransactionsResponseSchema.safeParse(raw);
    if (!parsed.success) {
      log.error({ issues: parsed.error.issues }, 'Unexpected Nomba transaction response shape');
      throw new AppError(502, 'NOMBA_RESPONSE_ERROR', 'Nightly diff: unexpected Nomba response shape');
    }

    const transactions = parsed.data.data.transactions;
    let orphanCount = 0;
    let driftCount = 0;

    for (const rawTx of transactions) {
      const txParsed = NombaTxSchema.safeParse(rawTx);
      if (!txParsed.success) {
        log.warn({ rawTx }, 'Skipping malformed Nomba transaction entry');
        continue;
      }

      const tx = txParsed.data;

      let localRows: { amount_kobo: number }[];
      try {
        const result = await deps.db.query<{ amount_kobo: number }>(
          'SELECT amount_kobo FROM transactions WHERE transaction_id = $1',
          [tx.merchantTxRef],
        );
        localRows = result.rows;
      } catch (err: unknown) {
        log.error({ err, merchantTxRef: tx.merchantTxRef }, 'DB query failed during nightly diff');
        continue;
      }

      const local = localRows[0];

      if (!local) {
        orphanCount += 1;
        log.warn({ merchantTxRef: tx.merchantTxRef }, 'Orphan transaction detected on Nomba');
        await deps.alertOps('Orphan transaction on Nomba', tx).catch((err: unknown) => {
          log.error({ err, merchantTxRef: tx.merchantTxRef }, 'Failed to send orphan alert');
        });
        continue;
      }

      // Nomba returns amounts in kobo — compare directly against local amount_kobo
      if (local.amount_kobo !== tx.amount) {
        driftCount += 1;
        log.warn(
          { merchantTxRef: tx.merchantTxRef, localKobo: local.amount_kobo, nombaKobo: tx.amount },
          'Amount drift detected',
        );
        await deps.alertOps('Amount drift', { local, tx }).catch((err: unknown) => {
          log.error({ err, merchantTxRef: tx.merchantTxRef }, 'Failed to send drift alert');
        });
      }
    }

    log.info(
      { total: transactions.length, orphans: orphanCount, drifts: driftCount },
      'Nightly reconciliation diff completed',
    );
  };

  const schedule = (): void => {
    const now = new Date();
    const nextRun = new Date();
    nextRun.setHours(0, 0, 0, 0);

    // If midnight has already passed today, schedule for tomorrow
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    const msUntilNextRun = nextRun.getTime() - now.getTime();

    setTimeout(() => {
      runNightlyDiff().catch((err: unknown) =>
        log.error({ err }, 'Nightly reconciliation diff unhandled error'),
      );
      setInterval(
        () => {
          runNightlyDiff().catch((err: unknown) =>
            log.error({ err }, 'Nightly reconciliation diff unhandled error'),
          );
        },
        24 * 60 * 60 * 1000,
      );
    }, msUntilNextRun);

    log.info({ nextRunAt: nextRun.toISOString() }, 'Nightly reconciliation diff scheduled');
  };

  return { runNightlyDiff, schedule };
}

export type NightlyReconciliation = ReturnType<typeof createNightlyReconciliation>;
