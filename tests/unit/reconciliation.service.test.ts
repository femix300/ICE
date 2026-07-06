import { describe, it, expect, beforeEach } from 'vitest';

import { createReconciliationService, ReconciliationStatus } from '../../src/services/reconciliation.service.js';
import { AppError } from '../../src/lib/errors.js';
import type { InvoicesRepo, InvoiceRow } from '../../src/repositories/invoices.repo.js';
import type { ReconciliationRepo, ReconciliationLogRow, CreateReconciliationLogInput } from '../../src/repositories/reconciliation.repo.js';
import type { TransactionRow } from '../../src/repositories/transactions.repo.js';
import { InvoiceStatus } from '../../src/schemas/invoices.schema.js';

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
    transaction_id: 'TXN-001',
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

// ── Tests ──

describe('ReconciliationService', () => {
  let fakeReconRepo: ReturnType<typeof createFakeReconciliationRepo>;
  let fakeInvoicesRepo: ReturnType<typeof createFakeInvoicesRepo>;
  let service: ReturnType<typeof createReconciliationService>;

  describe('exact match', () => {
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

    it('closes invoice and returns EXACT_MATCH when payment equals expected amount', async () => {
      const tx = makeTransaction({ amount_kobo: 500000 });
      const result = await service.reconcile(tx);

      expect(result.status).toBe(ReconciliationStatus.EXACT_MATCH);
      expect(result.action).toBe('invoice_closed');
      expect(result.invoice_id).toBe('inv-1');

      // Verify invoice was transitioned to paid
      const invoice = await fakeInvoicesRepo.findById('inv-1');
      expect(invoice?.status).toBe(InvoiceStatus.PAID);
      expect(invoice?.paid_amount_kobo).toBe(500000);
    });

    it('creates a reconciliation log entry for exact match', async () => {
      const tx = makeTransaction({ amount_kobo: 500000 });
      await service.reconcile(tx);

      expect(fakeReconRepo._logs).toHaveLength(1);
      expect(fakeReconRepo._logs[0]?.status).toBe(ReconciliationStatus.EXACT_MATCH);
      expect(fakeReconRepo._logs[0]?.difference_kobo).toBe(0);
      expect(fakeReconRepo._logs[0]?.action_taken).toBe('invoice_closed');
    });
  });

  describe('duplicate rejection', () => {
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

    it('returns DUPLICATE without re-processing when transaction already reconciled', async () => {
      const tx = makeTransaction({ amount_kobo: 500000 });

      // First reconciliation
      const first = await service.reconcile(tx);
      expect(first.status).toBe(ReconciliationStatus.EXACT_MATCH);

      // Second reconciliation with same transaction_id
      const second = await service.reconcile(tx);
      expect(second.status).toBe(ReconciliationStatus.DUPLICATE);
      expect(second.action).toBe('rejected');

      // Only one log entry should exist (from the first reconciliation)
      expect(fakeReconRepo._logs).toHaveLength(1);
    });

    it('does not change invoice state on duplicate', async () => {
      const tx = makeTransaction({ amount_kobo: 500000 });

      await service.reconcile(tx);
      const invoiceAfterFirst = await fakeInvoicesRepo.findById('inv-1');
      const statusAfterFirst = invoiceAfterFirst?.status;

      await service.reconcile(tx);
      const invoiceAfterSecond = await fakeInvoicesRepo.findById('inv-1');

      expect(invoiceAfterSecond?.status).toBe(statusAfterFirst);
    });
  });

  describe('unmatched payment', () => {
    beforeEach(() => {
      fakeReconRepo = createFakeReconciliationRepo();
      fakeInvoicesRepo = createFakeInvoicesRepo([]); // No invoices
      service = createReconciliationService({
        reconciliation: fakeReconRepo,
        invoices: fakeInvoicesRepo,
      });
    });

    it('returns UNMATCHED when no invoice found for the VA number', async () => {
      const tx = makeTransaction({ va_number: '9999999999' });
      const result = await service.reconcile(tx);

      expect(result.status).toBe(ReconciliationStatus.UNMATCHED);
      expect(result.action).toBe('flagged');
    });

    it('creates a reconciliation log entry for unmatched payment', async () => {
      const tx = makeTransaction({ va_number: '9999999999', amount_kobo: 300000 });
      await service.reconcile(tx);

      expect(fakeReconRepo._logs).toHaveLength(1);
      expect(fakeReconRepo._logs[0]?.status).toBe(ReconciliationStatus.UNMATCHED);
      expect(fakeReconRepo._logs[0]?.invoice_id).toBeNull();
      expect(fakeReconRepo._logs[0]?.received_kobo).toBe(300000);
    });
  });

  describe('overpayment', () => {
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

    it('returns OVERPAYMENT and flags when payment exceeds expected', async () => {
      const tx = makeTransaction({ amount_kobo: 700000 });
      const result = await service.reconcile(tx);

      expect(result.status).toBe(ReconciliationStatus.OVERPAYMENT);
      expect(result.difference_kobo).toBe(200000);

      const invoice = await fakeInvoicesRepo.findById('inv-1');
      expect(invoice?.status).toBe(InvoiceStatus.OVERPAID);
    });
  });

  describe('underpayment', () => {
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

    it('returns UNDERPAYMENT and records partial payment', async () => {
      const tx = makeTransaction({ amount_kobo: 300000 });
      const result = await service.reconcile(tx);

      expect(result.status).toBe(ReconciliationStatus.UNDERPAYMENT);
      expect(result.difference_kobo).toBe(-200000);

      const invoice = await fakeInvoicesRepo.findById('inv-1');
      expect(invoice?.status).toBe(InvoiceStatus.PARTIALLY_PAID);
      expect(invoice?.paid_amount_kobo).toBe(300000);
    });

    it('creates a reconciliation log for underpayment', async () => {
      const tx = makeTransaction({ amount_kobo: 300000 });
      await service.reconcile(tx);

      expect(fakeReconRepo._logs).toHaveLength(1);
      expect(fakeReconRepo._logs[0]?.status).toBe(ReconciliationStatus.UNDERPAYMENT);
      expect(fakeReconRepo._logs[0]?.action_taken).toBe('partial_payment_recorded');
    });
  });
});
