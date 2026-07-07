import { describe, it, expect, beforeEach } from 'vitest';

import { createMisdirectedService } from '../../src/services/misdirected.service.js';
import type { WebhookDeliveryQueue, RefundQueue, NombaTransferClient } from '../../src/services/misdirected.service.js';
import type { MisdirectedRepo, MisdirectedPaymentRow, CreateMisdirectedPaymentInput } from '../../src/repositories/misdirected.repo.js';
import type { InvoicesRepo, InvoiceRow } from '../../src/repositories/invoices.repo.js';
import type { ReconciliationRepo, ReconciliationLogRow, CreateReconciliationLogInput } from '../../src/repositories/reconciliation.repo.js';
import type { AuditRepo, AuditLogInput } from '../../src/repositories/audit.repo.js';
import type { TransactionRow } from '../../src/repositories/transactions.repo.js';
import { InvoiceStatus } from '../../src/schemas/invoices.schema.js';

// ── Hand-rolled fakes ──

function createFakeMisdirectedRepo(): MisdirectedRepo & { _store: MisdirectedPaymentRow[] } {
  const store: MisdirectedPaymentRow[] = [];
  const vaMerchantMap = new Map<string, string>();

  return {
    _store: store,

    setVaMerchant(vaNumber: string, merchantId: string) {
      vaMerchantMap.set(vaNumber, merchantId);
    },

    async create(input: CreateMisdirectedPaymentInput) {
      const row: MisdirectedPaymentRow = {
        id: `mis-${store.length + 1}`,
        merchant_id: input.merchant_id,
        va_number: input.va_number,
        amount_kobo: input.amount_kobo,
        sender_name: input.sender_name,
        raw_payload: input.raw_payload,
        status: 'PENDING_REVIEW',
        resolution: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      store.push(row);
      return row;
    },

    async findByMerchantId(merchantId: string, limit = 50, offset = 0) {
      return store
        .filter((p) => p.merchant_id === merchantId)
        .slice(offset, offset + limit);
    },

    async countByMerchantId(merchantId: string) {
      return store.filter((p) => p.merchant_id === merchantId).length;
    },

    async findById(id: string) {
      return store.find((p) => p.id === id);
    },

    async updateResolution(id: string, resolution: string, status: string) {
      const idx = store.findIndex((p) => p.id === id);
      if (idx === -1) throw new Error('Not found');
      store[idx] = { ...store[idx]!, resolution, status, updated_at: new Date() };
      return store[idx]!;
    },

    async findMerchantByVaNumber(vaNumber: string) {
      return vaMerchantMap.get(vaNumber);
    },
  } as any;
}

function createFakeInvoicesRepo(): InvoicesRepo & { _store: Map<string, InvoiceRow> } {
  const store = new Map<string, InvoiceRow>();
  return {
    _store: store,
    async findById(id: string) {
      return store.get(id);
    },
    async updateStatus(id: string, status, paidAmountKobo?: number) {
      const row = store.get(id);
      if (!row) throw new Error('Not found');
      const updated = {
        ...row,
        status,
        paid_amount_kobo: paidAmountKobo ?? row.paid_amount_kobo,
        updated_at: new Date(),
      };
      store.set(id, updated);
      return updated;
    },
  } as any;
}

function createFakeReconciliationRepo(): ReconciliationRepo & { _logs: ReconciliationLogRow[] } {
  const logs: ReconciliationLogRow[] = [];
  return {
    _logs: logs,
    async create(input: CreateReconciliationLogInput) {
      const row = {
        id: `rlog-${logs.length + 1}`,
        ...input,
        created_at: new Date(),
      };
      logs.push(row);
      return row;
    },
  } as any;
}

function createFakeAuditRepo(): AuditRepo & { _logs: AuditLogInput[] } {
  const logs: AuditLogInput[] = [];
  return {
    _logs: logs,
    async create(input: AuditLogInput) {
      logs.push(input);
    },
  };
}

function createFakeWebhookQueue(): WebhookDeliveryQueue & { _deliveries: any[] } {
  const deliveries: any[] = [];
  return {
    _deliveries: deliveries,
    async add(data) {
      deliveries.push(data);
    },
  };
}

function createFakeRefundQueue(): RefundQueue & { _jobs: any[] } {
  const jobs: any[] = [];
  return {
    _jobs: jobs,
    async add(data) {
      jobs.push(data);
    },
  };
}

function createFakeNombaTransferClient(): NombaTransferClient & { _lookups: any[]; _transfers: any[] } {
  const lookups: any[] = [];
  const transfers: any[] = [];
  return {
    _lookups: lookups,
    _transfers: transfers,
    async lookupAccount(data) {
      lookups.push(data);
      return { accountName: 'VERIFIED ACCOUNT NAME' };
    },
    async transfer(data) {
      transfers.push(data);
      return { transferReference: 'REF-NOMBA-123' };
    },
  };
}

function makeTransaction(overrides?: Partial<TransactionRow>): TransactionRow {
  return {
    id: 'tx-1',
    transaction_id: 'TXN-MIS-001',
    va_number: '9999999999',
    amount_kobo: 300000,
    sender_name: 'Unknown Sender',
    sender_account: '1112223334',
    sender_bank_code: '058',
    raw_payload: {
      data: {
        transactionId: 'TXN-MIS-001',
        senderAccountNumber: '1112223334',
        senderBankCode: '058',
      },
    },
    created_at: new Date(),
    ...overrides,
  };
}

// ── Tests ──

describe('MisdirectedService with actions', () => {
  let fakeRepo: ReturnType<typeof createFakeMisdirectedRepo>;
  let fakeInvoicesRepo: ReturnType<typeof createFakeInvoicesRepo>;
  let fakeReconRepo: ReturnType<typeof createFakeReconciliationRepo>;
  let fakeAuditRepo: ReturnType<typeof createFakeAuditRepo>;
  let fakeWebhookQueue: ReturnType<typeof createFakeWebhookQueue>;
  let fakeRefundQueue: ReturnType<typeof createFakeRefundQueue>;
  let fakeNombaClient: ReturnType<typeof createFakeNombaTransferClient>;
  let service: ReturnType<typeof createMisdirectedService>;

  beforeEach(() => {
    fakeRepo = createFakeMisdirectedRepo();
    fakeInvoicesRepo = createFakeInvoicesRepo();
    fakeReconRepo = createFakeReconciliationRepo();
    fakeAuditRepo = createFakeAuditRepo();
    fakeWebhookQueue = createFakeWebhookQueue();
    fakeRefundQueue = createFakeRefundQueue();
    fakeNombaClient = createFakeNombaTransferClient();

    fakeRepo.setVaMerchant('9999999999', 'merchant-1');

    service = createMisdirectedService({
      misdirected: fakeRepo,
      invoices: fakeInvoicesRepo,
      reconciliation: fakeReconRepo,
      audit: fakeAuditRepo,
      webhookQueue: fakeWebhookQueue,
      refundQueue: fakeRefundQueue,
      nombaTransfer: fakeNombaClient,
    });
  });

  describe('manual match', () => {
    let payment: MisdirectedPaymentRow;

    beforeEach(async () => {
      payment = await service.flagMisdirected(makeTransaction({ amount_kobo: 500000 }));
      fakeInvoicesRepo._store.set('inv-1', {
        id: 'inv-1',
        vendor_id: 'v-1',
        customer_id: 'c-1',
        amount_kobo: 500000,
        status: InvoiceStatus.ISSUED,
        paid_amount_kobo: 0,
        created_at: new Date(),
        updated_at: new Date(),
      });
    });

    it('updates status to RESOLVED and matches invoice', async () => {
      const result = await service.matchPayment(payment.id, 'inv-1', 'merchant-1', 'actor-1', '127.0.0.1');

      expect(result.status).toBe('RESOLVED');
      expect(result.reconciliation_status).toBe('EXACT_MATCH');

      // Verify payment row updated
      const updatedPayment = await fakeRepo.findById(payment.id);
      expect(updatedPayment?.status).toBe('RESOLVED');
      expect(updatedPayment?.resolution).toContain('Manually matched to invoice inv-1');

      // Verify invoice status updated
      const invoice = await fakeInvoicesRepo.findById('inv-1');
      expect(invoice?.status).toBe(InvoiceStatus.PAID);
      expect(invoice?.paid_amount_kobo).toBe(500000);
    });

    it('queues refund if matched invoice is overpaid', async () => {
      // Create invoice for 300000 kobo (payment is 500000 kobo)
      fakeInvoicesRepo._store.set('inv-2', {
        id: 'inv-2',
        vendor_id: 'v-1',
        customer_id: 'c-1',
        amount_kobo: 300000,
        status: InvoiceStatus.ISSUED,
        paid_amount_kobo: 0,
        created_at: new Date(),
        updated_at: new Date(),
      });

      const result = await service.matchPayment(payment.id, 'inv-2', 'merchant-1', 'actor-1', '127.0.0.1');
      expect(result.reconciliation_status).toBe('OVERPAYMENT');

      expect(fakeRefundQueue._jobs).toHaveLength(1);
      expect(fakeRefundQueue._jobs[0].amount_kobo).toBe(200000);
    });

    it('writes audit logs for match action', async () => {
      await service.matchPayment(payment.id, 'inv-1', 'merchant-1', 'actor-1', '127.0.0.1');

      expect(fakeAuditRepo._logs).toHaveLength(1);
      expect(fakeAuditRepo._logs[0]).toEqual({
        merchant_id: 'merchant-1',
        actor_id: 'actor-1',
        action: 'MANUAL_MATCH',
        resource_type: 'MISDIRECTED_PAYMENT',
        resource_id: payment.id,
        old_values: { status: 'PENDING_REVIEW', resolution: null },
        new_values: { status: 'RESOLVED', resolution: 'Manually matched to invoice inv-1' },
        ip_address: '127.0.0.1',
      });
    });
  });

  describe('manual refund', () => {
    let payment: MisdirectedPaymentRow;

    beforeEach(async () => {
      payment = await service.flagMisdirected(makeTransaction({ amount_kobo: 450000 }));
    });

    it('lookup bank account first then execute transfer', async () => {
      const result = await service.refundPayment(payment.id, 'merchant-1', 'actor-1', '127.0.0.1');

      expect(result.status).toBe('RESOLVED');
      expect(result.recipient_name).toBe('VERIFIED ACCOUNT NAME');
      expect(result.refund_reference).toBe('REF-NOMBA-123');

      // Verify Nomba Certification steps occurred
      expect(fakeNombaClient._lookups).toHaveLength(1);
      expect(fakeNombaClient._lookups[0]).toEqual({
        accountNumber: '1112223334',
        bankCode: '058',
      });

      expect(fakeNombaClient._transfers).toHaveLength(1);
      expect(fakeNombaClient._transfers[0]).toEqual({
        amount: 450000, // Rule 1: Kobo, no conversion
        accountNumber: '1112223334',
        accountName: 'VERIFIED ACCOUNT NAME',
        bankCode: '058',
        merchantTxRef: `REFUND-${payment.id}`,
        senderName: payment.sender_name,
        narration: `Refund for misdirected payment ref: ${payment.id}`,
      });

      // Verify status resolved
      const updatedPayment = await fakeRepo.findById(payment.id);
      expect(updatedPayment?.status).toBe('RESOLVED');
      expect(updatedPayment?.resolution).toContain('REF-NOMBA-123');
    });

    it('writes audit logs for refund action', async () => {
      await service.refundPayment(payment.id, 'merchant-1', 'actor-1', '127.0.0.1');

      expect(fakeAuditRepo._logs).toHaveLength(1);
      expect(fakeAuditRepo._logs[0].action).toBe('MANUAL_REFUND');
      expect(fakeAuditRepo._logs[0].merchant_id).toBe('merchant-1');
    });
  });
});
