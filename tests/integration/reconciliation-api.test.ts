import { describe, it, expect, vi, beforeEach } from 'vitest';

import { createInvoicesService } from '../../src/services/invoices.service.js';
import { createAuditService } from '../../src/services/audit.service.js';
import type { InvoicesRepo, InvoiceRow } from '../../src/repositories/invoices.repo.js';
import type { ReconciliationRepo, ReconciliationLogRow } from '../../src/repositories/reconciliation.repo.js';
import type { AuditLogRow, CreateAuditLogInput } from '../../src/repositories/audit.repo.js';
import type { AuditRepo } from '../../src/repositories/audit.repo.js';
import { InvoiceStatus } from '../../src/schemas/invoices.schema.js';
import { AppError } from '../../src/lib/errors.js';

// ---------- Fake helpers ----------

function makeInvoice(overrides: Partial<InvoiceRow> = {}): InvoiceRow {
  return {
    id: 'inv-1',
    vendor_id: 'vendor-1',
    customer_id: 'customer-1',
    amount_kobo: 100000,
    status: InvoiceStatus.ISSUED,
    paid_amount_kobo: 0,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  };
}

function createFakeInvoicesRepo(initial: InvoiceRow[] = []): InvoicesRepo & { _store: Map<string, InvoiceRow> } {
  const store = new Map<string, InvoiceRow>(initial.map((i) => [i.id, i]));

  return {
    _store: store,

    async findById(id) {
      return store.get(id);
    },

    async findMerchantIdByInvoiceId(_id) {
      return 'merchant-1';
    },

    async findByVendorId(vendorId) {
      return [...store.values()].filter((i) => i.vendor_id === vendorId);
    },

    async findIssuedByVaNumber(_va) {
      return undefined;
    },

    async create(input) {
      const row = makeInvoice({ id: `inv-${store.size + 1}`, ...input });
      store.set(row.id, row);
      return row;
    },

    async updateStatus(id, status, paidAmountKobo?) {
      const row = store.get(id);
      if (!row) throw new AppError(404, 'NOT_FOUND', 'Invoice not found');
      const updated = { ...row, status, paid_amount_kobo: paidAmountKobo ?? row.paid_amount_kobo, updated_at: new Date() };
      store.set(id, updated);
      return updated;
    },
  };
}

function createFakeReconciliationRepo(initial: ReconciliationLogRow[] = []): ReconciliationRepo & { _logs: ReconciliationLogRow[] } {
  const logs: ReconciliationLogRow[] = [...initial];

  return {
    _logs: logs,

    async findByTransactionId(txId) {
      return logs.find((l) => l.transaction_id === txId);
    },

    async create(input) {
      const row: ReconciliationLogRow = { id: `rlog-${logs.length + 1}`, ...input, created_at: new Date() };
      logs.push(row);
      return row;
    },

    async findByInvoiceId(invoiceId) {
      return logs.filter((l) => l.invoice_id === invoiceId);
    },

    async findLogs(status?, limit = 20, offset = 0) {
      let filtered = logs;
      if (status) filtered = filtered.filter((l) => l.status === status);
      return filtered.slice(offset, offset + limit);
    },

    async countLogs(status?) {
      if (status) return logs.filter((l) => l.status === status).length;
      return logs.length;
    },
  };
}

function createFakeAuditRepo(): AuditRepo & { _entries: AuditLogRow[] } {
  const entries: AuditLogRow[] = [];

  return {
    _entries: entries,

    async create(input: CreateAuditLogInput) {
      const row: AuditLogRow = { id: `audit-${entries.length + 1}`, ...input, created_at: new Date() };
      entries.push(row);
      return row;
    },

    async findByMerchantId(merchantId: string) {
      return entries.filter((e) => e.merchant_id === merchantId);
    },
  };
}

// ---------- Test suite ----------

describe('reconciliation API — mark-paid, reconciliation log, audit logging', () => {
  let invoicesRepo: ReturnType<typeof createFakeInvoicesRepo>;
  let reconciliationRepo: ReturnType<typeof createFakeReconciliationRepo>;
  let auditRepo: ReturnType<typeof createFakeAuditRepo>;
  let auditService: ReturnType<typeof createAuditService>;
  let invoicesService: ReturnType<typeof createInvoicesService>;

  beforeEach(() => {
    invoicesRepo = createFakeInvoicesRepo([makeInvoice()]);
    reconciliationRepo = createFakeReconciliationRepo();
    auditRepo = createFakeAuditRepo();
    auditService = createAuditService({ audit: auditRepo });
    invoicesService = createInvoicesService({
      invoices: invoicesRepo,
      reconciliation: reconciliationRepo,
      audit: auditService,
    });
  });

  // ── mark-paid ────────────────────────────────────────────────────────────

  describe('markInvoiceAsPaid', () => {
    it('transitions invoice to paid and returns updated row', async () => {
      const result = await invoicesService.markInvoiceAsPaid('inv-1', 'actor-merchant', '1.2.3.4');

      expect(result.status).toBe(InvoiceStatus.PAID);
      expect(result.paid_amount_kobo).toBe(100000);
    });

    it('writes an audit log entry with actor_id, action, old_values, new_values', async () => {
      await invoicesService.markInvoiceAsPaid('inv-1', 'actor-merchant', '10.0.0.1');

      expect(auditRepo._entries).toHaveLength(1);
      const entry = auditRepo._entries[0];
      expect(entry).toBeDefined();
      expect(entry!.actor_id).toBe('actor-merchant');
      expect(entry!.action).toBe('invoice.mark_paid');
      expect(entry!.resource_type).toBe('invoice');
      expect(entry!.resource_id).toBe('inv-1');
      expect(entry!.old_values).toMatchObject({ status: InvoiceStatus.ISSUED });
      expect(entry!.new_values).toMatchObject({ status: 'paid' });
    });

    it('throws 404 when invoice does not exist', async () => {
      await expect(
        invoicesService.markInvoiceAsPaid('no-such-id', 'actor', '1.2.3.4'),
      ).rejects.toThrow(AppError);
    });

    it('throws INVALID_TRANSITION when invoice is already paid', async () => {
      invoicesRepo._store.set('inv-1', makeInvoice({ status: InvoiceStatus.PAID }));

      await expect(
        invoicesService.markInvoiceAsPaid('inv-1', 'actor', '1.2.3.4'),
      ).rejects.toMatchObject({ errorCode: 'INVALID_TRANSITION' });
    });

    it('throws INVALID_TRANSITION when invoice is in draft state', async () => {
      invoicesRepo._store.set('inv-1', makeInvoice({ status: InvoiceStatus.DRAFT }));

      await expect(
        invoicesService.markInvoiceAsPaid('inv-1', 'actor', '1.2.3.4'),
      ).rejects.toMatchObject({ errorCode: 'INVALID_TRANSITION' });
    });

    it('writes no audit log if audit service is not injected', async () => {
      const serviceWithoutAudit = createInvoicesService({
        invoices: invoicesRepo,
        reconciliation: reconciliationRepo,
      });

      await serviceWithoutAudit.markInvoiceAsPaid('inv-1', 'actor', '1.2.3.4');

      expect(auditRepo._entries).toHaveLength(0);
    });
  });

  // ── reconciliation log ───────────────────────────────────────────────────

  describe('getReconciliation', () => {
    it('returns empty array when no logs exist for invoice', async () => {
      const logs = await invoicesService.getReconciliation('inv-1');
      expect(logs).toEqual([]);
    });

    it('returns logs filtered to the requested invoice', async () => {
      reconciliationRepo._logs.push(
        {
          id: 'rlog-1',
          transaction_id: 'tx-a',
          invoice_id: 'inv-1',
          status: 'EXACT_MATCH',
          expected_kobo: 100000,
          received_kobo: 100000,
          difference_kobo: 0,
          action_taken: 'invoice_closed',
          created_at: new Date(),
        },
        {
          id: 'rlog-2',
          transaction_id: 'tx-b',
          invoice_id: 'inv-other',
          status: 'UNMATCHED',
          expected_kobo: 0,
          received_kobo: 5000,
          difference_kobo: 5000,
          action_taken: 'flagged',
          created_at: new Date(),
        },
      );

      const logs = await invoicesService.getReconciliation('inv-1');
      expect(logs).toHaveLength(1);
      expect(logs[0]!.invoice_id).toBe('inv-1');
    });

    it('throws 404 when invoice does not exist', async () => {
      await expect(invoicesService.getReconciliation('no-such')).rejects.toThrow(AppError);
    });
  });

  // ── reconciliation log filtering (via repo) ─────────────────────────────

  describe('reconciliation log status filter', () => {
    const statuses = ['EXACT_MATCH', 'OVERPAYMENT', 'UNDERPAYMENT', 'DUPLICATE', 'UNMATCHED'] as const;

    beforeEach(() => {
      statuses.forEach((status, i) => {
        reconciliationRepo._logs.push({
          id: `rlog-${i + 1}`,
          transaction_id: `tx-${i}`,
          invoice_id: 'inv-1',
          status,
          expected_kobo: 10000,
          received_kobo: 10000,
          difference_kobo: 0,
          action_taken: 'logged',
          created_at: new Date(),
        });
      });
    });

    it.each(statuses)('filters logs by status %s', async (status) => {
      const filtered = await reconciliationRepo.findLogs(status);
      expect(filtered).toHaveLength(1);
      expect(filtered[0]!.status).toBe(status);
    });

    it('returns all logs when no status filter is applied', async () => {
      const all = await reconciliationRepo.findLogs();
      expect(all).toHaveLength(statuses.length);
    });

    it('supports pagination via limit and offset', async () => {
      const page1 = await reconciliationRepo.findLogs(undefined, 2, 0);
      const page2 = await reconciliationRepo.findLogs(undefined, 2, 2);
      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(2);
      expect(page1[0]!.id).not.toBe(page2[0]!.id);
    });

    it('countLogs returns correct total without filter', async () => {
      const count = await reconciliationRepo.countLogs();
      expect(count).toBe(statuses.length);
    });

    it('countLogs returns correct total with filter', async () => {
      const count = await reconciliationRepo.countLogs('EXACT_MATCH');
      expect(count).toBe(1);
    });
  });

  // ── audit service ────────────────────────────────────────────────────────

  describe('createAuditService', () => {
    it('persists all required fields to the audit repo', async () => {
      await auditService.logAction({
        merchant_id: 'merchant-1',
        actor_id: 'actor-abc',
        action: 'invoice.mark_paid',
        resource_type: 'invoice',
        resource_id: 'inv-99',
        old_values: { status: 'issued' },
        new_values: { status: 'paid' },
        ip_address: '192.168.1.1',
      });

      expect(auditRepo._entries).toHaveLength(1);
      const entry = auditRepo._entries[0]!;
      expect(entry.merchant_id).toBe('merchant-1');
      expect(entry.actor_id).toBe('actor-abc');
      expect(entry.action).toBe('invoice.mark_paid');
      expect(entry.resource_type).toBe('invoice');
      expect(entry.resource_id).toBe('inv-99');
      expect(entry.old_values).toMatchObject({ status: 'issued' });
      expect(entry.new_values).toMatchObject({ status: 'paid' });
      expect(entry.ip_address).toBe('192.168.1.1');
    });
  });
});
