import { describe, it, expect, beforeEach } from 'vitest';

import { createReconciliationService, ReconciliationStatus } from '../../src/services/reconciliation.service.js';
import type { RefundQueue, RefundJobData } from '../../src/services/reconciliation.service.js';
import type { InvoicesRepo, InvoiceRow } from '../../src/repositories/invoices.repo.js';
import type { ReconciliationRepo, ReconciliationLogRow, CreateReconciliationLogInput } from '../../src/repositories/reconciliation.repo.js';
import type { TransactionRow } from '../../src/repositories/transactions.repo.js';
import { InvoiceStatus } from '../../src/schemas/invoices.schema.js';
import { AppError } from '../../src/lib/errors.js';

// ── Hand-rolled fakes ──

function createFakeReconciliationRepo(): ReconciliationRepo & { _logs: ReconciliationLogRow[] } {
  const logs: ReconciliationLogRow[] = [];

  return {
    _logs: logs,

    async findByTransactionId(transactionId: string) {
      return logs.find((l) => l.transaction_id === transactionId);
    },

    async create(input: CreateReconciliationLogInput) {
      const row: ReconciliationLogRow = {
        id: `rlog-${logs.length + 1}`,
        ...input,
        created_at: new Date(),
      };
      logs.push(row);
      return row;
    },

    async findByInvoiceId(invoiceId: string) {
      return logs.filter((l) => l.invoice_id === invoiceId);
    },

    async findLogs(status?: string, limit = 20, offset = 0) {
      let filtered = logs;
      if (status) {
        filtered = filtered.filter((l) => l.status === status);
      }
      return filtered.slice(offset, offset + limit);
    },

    async countLogs(status?: string) {
      if (status) {
        return logs.filter((l) => l.status === status).length;
      }
      return logs.length;
    },
  };
}

function createFakeInvoicesRepo(initialInvoices: InvoiceRow[] = []): InvoicesRepo {
  const store = new Map<string, InvoiceRow>();
  for (const inv of initialInvoices) {
    store.set(inv.id, inv);
  }

  return {
    async findById(id: string) {
      return store.get(id);
    },

    async findMerchantIdByInvoiceId(invoiceId: string) {
      const invoice = store.get(invoiceId);
      return invoice ? 'merchant-1' : undefined;
    },

    async findByVendorId(vendorId: string) {
      return [...store.values()].filter(i => i.vendor_id === vendorId);
    },

    async findIssuedByVaNumber(vaNumber: string) {
      return [...store.values()].find(
        (i) =>
          (i as unknown as { _va_number: string })._va_number === vaNumber &&
          (i.status === InvoiceStatus.ISSUED || i.status === InvoiceStatus.PARTIALLY_PAID),
      );
    },

    async create() {
      throw new AppError(500, 'NOT_USED', 'Not used in reconciliation tests');
    },

    async updateStatus(id: string, status, paidAmountKobo?: number) {
      const row = store.get(id);
      if (!row) throw new AppError(404, 'NOT_FOUND', 'Not found');
      const updated: InvoiceRow = {
        ...row,
        status,
        paid_amount_kobo: paidAmountKobo ?? row.paid_amount_kobo,
        updated_at: new Date(),
      };
      store.set(id, updated);
      return updated;
    },
  };
}

function createFakeRefundQueue(): RefundQueue & { _jobs: RefundJobData[] } {
  const jobs: RefundJobData[] = [];
  return {
    _jobs: jobs,
    async add(data: RefundJobData) {
      jobs.push(data);
    },
  };
}

function makeInvoice(overrides: Partial<InvoiceRow> & { _va_number: string }): InvoiceRow & { _va_number: string } {
  return {
    id: 'inv-1',
    vendor_id: 'vendor-1',
    customer_id: 'customer-1',
    amount_kobo: 500000,
    status: InvoiceStatus.ISSUED as InvoiceStatus,
    paid_amount_kobo: 0,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

function makeTransaction(overrides?: Partial<TransactionRow>): TransactionRow {
  return {
    id: 'tx-1',
    transaction_id: 'TXN-EDGE-001',
    va_number: '0127667384',
    amount_kobo: 500000,
    sender_name: 'John Doe',
    sender_account: '0123456789',
    sender_bank_code: '058',
    raw_payload: {},
    created_at: new Date(),
    ...overrides,
  };
}

// ── Edge Case Tests ──

describe('ReconciliationService — edge cases', () => {
  describe('overpayment with refund queue', () => {
    let fakeReconRepo: ReturnType<typeof createFakeReconciliationRepo>;
    let fakeInvoicesRepo: ReturnType<typeof createFakeInvoicesRepo>;
    let fakeRefundQueue: ReturnType<typeof createFakeRefundQueue>;
    let service: ReturnType<typeof createReconciliationService>;

    beforeEach(() => {
      fakeReconRepo = createFakeReconciliationRepo();
      fakeInvoicesRepo = createFakeInvoicesRepo([
        makeInvoice({ _va_number: '0127667384', amount_kobo: 500000 }),
      ]);
      fakeRefundQueue = createFakeRefundQueue();
      service = createReconciliationService({
        reconciliation: fakeReconRepo,
        invoices: fakeInvoicesRepo,
        refundQueue: fakeRefundQueue,
      });
    });

    it('queues a refund job with the correct difference amount', async () => {
      const tx = makeTransaction({ amount_kobo: 700000 });
      const result = await service.reconcile(tx);

      expect(result.status).toBe(ReconciliationStatus.OVERPAYMENT);
      expect(result.refund_queued).toBe(true);
      expect(result.difference_kobo).toBe(200000);

      expect(fakeRefundQueue._jobs).toHaveLength(1);
      expect(fakeRefundQueue._jobs[0]?.amount_kobo).toBe(200000);
    });

    it('refund job contains correct sender account and bank code', async () => {
      const tx = makeTransaction({
        amount_kobo: 600000,
        sender_account: '9876543210',
        sender_bank_code: '044',
      });
      const result = await service.reconcile(tx);

      expect(result.refund_queued).toBe(true);

      const job = fakeRefundQueue._jobs[0];
      expect(job?.recipient_account).toBe('9876543210');
      expect(job?.recipient_bank_code).toBe('044');
      expect(job?.transaction_id).toBe(tx.transaction_id);
    });

    it('moves invoice to overpaid status', async () => {
      const tx = makeTransaction({ amount_kobo: 800000 });
      await service.reconcile(tx);

      const invoice = await fakeInvoicesRepo.findById('inv-1');
      expect(invoice?.status).toBe(InvoiceStatus.OVERPAID);
      expect(invoice?.paid_amount_kobo).toBe(800000);
    });

    it('logs reconciliation with refund_queued action', async () => {
      const tx = makeTransaction({ amount_kobo: 700000 });
      await service.reconcile(tx);

      expect(fakeReconRepo._logs).toHaveLength(1);
      expect(fakeReconRepo._logs[0]?.action_taken).toBe('refund_queued');
      expect(fakeReconRepo._logs[0]?.status).toBe(ReconciliationStatus.OVERPAYMENT);
    });
  });

  describe('underpayment tracking', () => {
    let fakeReconRepo: ReturnType<typeof createFakeReconciliationRepo>;
    let fakeInvoicesRepo: ReturnType<typeof createFakeInvoicesRepo>;
    let service: ReturnType<typeof createReconciliationService>;

    beforeEach(() => {
      fakeReconRepo = createFakeReconciliationRepo();
      fakeInvoicesRepo = createFakeInvoicesRepo([
        makeInvoice({ _va_number: '0127667384', amount_kobo: 500000 }),
      ]);
      service = createReconciliationService({
        reconciliation: fakeReconRepo,
        invoices: fakeInvoicesRepo,
      });
    });

    it('returns outstanding balance when underpaid', async () => {
      const tx = makeTransaction({ amount_kobo: 300000 });
      const result = await service.reconcile(tx);

      expect(result.status).toBe(ReconciliationStatus.UNDERPAYMENT);
      expect(result.outstanding_kobo).toBe(200000);
    });

    it('moves invoice to partially_paid with correct paid amount', async () => {
      const tx = makeTransaction({ amount_kobo: 200000 });
      await service.reconcile(tx);

      const invoice = await fakeInvoicesRepo.findById('inv-1');
      expect(invoice?.status).toBe(InvoiceStatus.PARTIALLY_PAID);
      expect(invoice?.paid_amount_kobo).toBe(200000);
    });

    it('logs reconciliation with partial_payment_recorded action', async () => {
      const tx = makeTransaction({ amount_kobo: 300000 });
      await service.reconcile(tx);

      expect(fakeReconRepo._logs).toHaveLength(1);
      expect(fakeReconRepo._logs[0]?.action_taken).toBe('partial_payment_recorded');
      expect(fakeReconRepo._logs[0]?.status).toBe(ReconciliationStatus.UNDERPAYMENT);
    });
  });

  describe('exact match does NOT trigger refund', () => {
    it('does not queue a refund job on exact match', async () => {
      const fakeReconRepo = createFakeReconciliationRepo();
      const fakeInvoicesRepo = createFakeInvoicesRepo([
        makeInvoice({ _va_number: '0127667384', amount_kobo: 500000 }),
      ]);
      const fakeRefundQueue = createFakeRefundQueue();
      const service = createReconciliationService({
        reconciliation: fakeReconRepo,
        invoices: fakeInvoicesRepo,
        refundQueue: fakeRefundQueue,
      });

      const tx = makeTransaction({ amount_kobo: 500000 });
      const result = await service.reconcile(tx);

      expect(result.status).toBe(ReconciliationStatus.EXACT_MATCH);
      expect(result.refund_queued).toBeUndefined();
      expect(fakeRefundQueue._jobs).toHaveLength(0);
    });
  });
});
