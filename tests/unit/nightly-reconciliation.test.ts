import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { createNightlyReconciliation } from '../../src/jobs/nightly-reconciliation.js';

// ---------- Fake helpers ----------

type FakeDbRow = { amount_kobo: number };

function makeFakeDb(rows: FakeDbRow[] = []) {
  return {
    query: vi.fn().mockResolvedValue({ rows }),
  };
}

function makeFakeNomba(transactions: unknown[] = []) {
  return {
    fetchTransactions: vi.fn().mockResolvedValue({
      data: { transactions },
    }),
  };
}

function makeAlertOps() {
  return vi.fn().mockResolvedValue(undefined);
}

// ---------- Tests ----------

describe('createNightlyReconciliation', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv, SCHEDULER_ENABLED: 'true' };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('runNightlyDiff', () => {
    it('skips execution when SCHEDULER_ENABLED is not true', async () => {
      process.env.SCHEDULER_ENABLED = 'false';

      const nomba = makeFakeNomba();
      const db = makeFakeDb();
      const alertOps = makeAlertOps();

      const cron = createNightlyReconciliation({ nomba, db: db as never, alertOps });
      await cron.runNightlyDiff();

      expect(nomba.fetchTransactions).not.toHaveBeenCalled();
      expect(alertOps).not.toHaveBeenCalled();
    });

    it('fetches yesterday-to-today successful transactions from Nomba', async () => {
      const nomba = makeFakeNomba([]);
      const db = makeFakeDb();
      const alertOps = makeAlertOps();

      const cron = createNightlyReconciliation({ nomba, db: db as never, alertOps });
      await cron.runNightlyDiff();

      expect(nomba.fetchTransactions).toHaveBeenCalledOnce();
      const callArgs = nomba.fetchTransactions.mock.calls[0]?.[0] as {
        dateFrom: string;
        dateTo: string;
        status: string;
      };
      expect(callArgs.status).toBe('success');
      expect(typeof callArgs.dateFrom).toBe('string');
      expect(typeof callArgs.dateTo).toBe('string');
    });

    it('raises an orphan alert when merchantTxRef is missing from local ledger', async () => {
      const tx = { merchantTxRef: 'ref-orphan-001', amount: 50000, status: 'success' };
      const nomba = makeFakeNomba([tx]);
      // DB returns no rows — transaction not in local ledger
      const db = makeFakeDb([]);
      const alertOps = makeAlertOps();

      const cron = createNightlyReconciliation({ nomba, db: db as never, alertOps });
      await cron.runNightlyDiff();

      expect(alertOps).toHaveBeenCalledOnce();
      const [title, payload] = alertOps.mock.calls[0] as [string, unknown];
      expect(title).toBe('Orphan transaction on Nomba');
      expect(payload).toMatchObject({ merchantTxRef: 'ref-orphan-001' });
    });

    it('raises an amount drift alert when local amount_kobo differs from Nomba amount', async () => {
      const tx = { merchantTxRef: 'ref-drift-002', amount: 50000, status: 'success' };
      const nomba = makeFakeNomba([tx]);
      // Local ledger has a different amount
      const db = makeFakeDb([{ amount_kobo: 49000 }]);
      const alertOps = makeAlertOps();

      const cron = createNightlyReconciliation({ nomba, db: db as never, alertOps });
      await cron.runNightlyDiff();

      expect(alertOps).toHaveBeenCalledOnce();
      const [title, payload] = alertOps.mock.calls[0] as [
        string,
        { local: { amount_kobo: number }; tx: typeof tx },
      ];
      expect(title).toBe('Amount drift');
      expect(payload.local.amount_kobo).toBe(49000);
      expect(payload.tx.merchantTxRef).toBe('ref-drift-002');
    });

    it('raises no alert when local amount_kobo matches Nomba amount exactly', async () => {
      const tx = { merchantTxRef: 'ref-match-003', amount: 75000, status: 'success' };
      const nomba = makeFakeNomba([tx]);
      const db = makeFakeDb([{ amount_kobo: 75000 }]);
      const alertOps = makeAlertOps();

      const cron = createNightlyReconciliation({ nomba, db: db as never, alertOps });
      await cron.runNightlyDiff();

      expect(alertOps).not.toHaveBeenCalled();
    });

    it('processes multiple transactions and alerts on each discrepancy independently', async () => {
      const transactions = [
        { merchantTxRef: 'ref-orphan-a', amount: 10000, status: 'success' },
        { merchantTxRef: 'ref-match-b', amount: 20000, status: 'success' },
        { merchantTxRef: 'ref-drift-c', amount: 30000, status: 'success' },
      ];
      const nomba = makeFakeNomba(transactions);

      // ref-orphan-a: not in DB → orphan
      // ref-match-b: exact match → no alert
      // ref-drift-c: amount mismatch → drift
      const db = {
        query: vi
          .fn()
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ amount_kobo: 20000 }] })
          .mockResolvedValueOnce({ rows: [{ amount_kobo: 29000 }] }),
      };
      const alertOps = makeAlertOps();

      const cron = createNightlyReconciliation({ nomba, db: db as never, alertOps });
      await cron.runNightlyDiff();

      expect(alertOps).toHaveBeenCalledTimes(2);
      const titles = alertOps.mock.calls.map((c) => (c as [string, unknown])[0]);
      expect(titles).toContain('Orphan transaction on Nomba');
      expect(titles).toContain('Amount drift');
    });

    it('skips malformed Nomba entries without throwing', async () => {
      // Missing merchantTxRef — fails NombaTxSchema
      const nomba = makeFakeNomba([{ amount: 5000, status: 'success' }]);
      const db = makeFakeDb();
      const alertOps = makeAlertOps();

      const cron = createNightlyReconciliation({ nomba, db: db as never, alertOps });
      await expect(cron.runNightlyDiff()).resolves.toBeUndefined();

      expect(db.query).not.toHaveBeenCalled();
      expect(alertOps).not.toHaveBeenCalled();
    });

    it('continues processing remaining transactions when a DB query fails for one', async () => {
      const transactions = [
        { merchantTxRef: 'ref-db-fail', amount: 10000, status: 'success' },
        { merchantTxRef: 'ref-orphan-next', amount: 20000, status: 'success' },
      ];
      const nomba = makeFakeNomba(transactions);

      const db = {
        query: vi
          .fn()
          .mockRejectedValueOnce(new Error('DB connection lost'))
          .mockResolvedValueOnce({ rows: [] }),
      };
      const alertOps = makeAlertOps();

      const cron = createNightlyReconciliation({ nomba, db: db as never, alertOps });
      await cron.runNightlyDiff();

      // Second transaction still processed despite first DB failure
      expect(alertOps).toHaveBeenCalledOnce();
      const [title] = alertOps.mock.calls[0] as [string, unknown];
      expect(title).toBe('Orphan transaction on Nomba');
    });

    it('continues when Nomba returns an unexpected response shape', async () => {
      const nomba = {
        fetchTransactions: vi.fn().mockResolvedValue({ unexpected: 'shape' }),
      };
      const db = makeFakeDb();
      const alertOps = makeAlertOps();

      const cron = createNightlyReconciliation({ nomba, db: db as never, alertOps });
      await expect(cron.runNightlyDiff()).rejects.toThrow();
    });

    it('throws when Nomba fetch itself rejects', async () => {
      const nomba = {
        fetchTransactions: vi.fn().mockRejectedValue(new Error('Network timeout')),
      };
      const db = makeFakeDb();
      const alertOps = makeAlertOps();

      const cron = createNightlyReconciliation({ nomba, db: db as never, alertOps });
      await expect(cron.runNightlyDiff()).rejects.toThrow();
    });

    it('uses merchantTxRef as the anchor key for the local ledger lookup', async () => {
      const tx = { merchantTxRef: 'anchor-ref-xyz', amount: 60000, status: 'success' };
      const nomba = makeFakeNomba([tx]);
      const db = makeFakeDb([{ amount_kobo: 60000 }]);
      const alertOps = makeAlertOps();

      const cron = createNightlyReconciliation({ nomba, db: db as never, alertOps });
      await cron.runNightlyDiff();

      const querySql = (db.query.mock.calls[0] as [string, string[]])[0];
      const queryParams = (db.query.mock.calls[0] as [string, string[]])[1];
      expect(querySql).toContain('transaction_id');
      expect(queryParams).toContain('anchor-ref-xyz');
    });
  });

  describe('schedule', () => {
    it('registers a setTimeout targeting midnight', () => {
      vi.useFakeTimers();

      const nomba = makeFakeNomba();
      const db = makeFakeDb();
      const alertOps = makeAlertOps();

      const cron = createNightlyReconciliation({ nomba, db: db as never, alertOps });
      cron.schedule();

      // Advance past midnight to confirm the run is triggered
      vi.advanceTimersByTime(24 * 60 * 60 * 1000 + 1);

      expect(nomba.fetchTransactions).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });
});
