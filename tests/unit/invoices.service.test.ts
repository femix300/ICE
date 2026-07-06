import { describe, it, expect, beforeEach } from 'vitest';

import { createInvoicesService, transition } from '../../src/services/invoices.service.js';
import type { InvoicesRepo, InvoiceRow } from '../../src/repositories/invoices.repo.js';
import { InvoiceStatus } from '../../src/schemas/invoices.schema.js';

// Hand-rolled fake repo (per engineering standards — no mocking libraries)
function createFakeInvoicesRepo(): InvoicesRepo & { _store: Map<string, InvoiceRow> } {
  const store = new Map<string, InvoiceRow>();

  return {
    _store: store,

    async findById(id: string) {
      return store.get(id);
    },

    async findByVendorId(vendorId: string) {
      return [...store.values()].filter((i) => i.vendor_id === vendorId);
    },

    async create(input) {
      const row: InvoiceRow = {
        id: `inv-${store.size + 1}`,
        vendor_id: input.vendor_id,
        customer_id: input.customer_id,
        amount_kobo: input.amount_kobo,
        status: InvoiceStatus.DRAFT as InvoiceStatus,
        paid_amount_kobo: 0,
        created_at: new Date(),
        updated_at: new Date(),
      };
      store.set(row.id, row);
      return row;
    },

    async updateStatus(id: string, status, paidAmountKobo?: number) {
      const row = store.get(id);
      if (!row) throw new Error('Not found');

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

describe('transition()', () => {
  it('allows draft → issued', () => {
    expect(() => transition(InvoiceStatus.DRAFT, InvoiceStatus.ISSUED)).not.toThrow();
  });

  it('allows issued → partially_paid', () => {
    expect(() => transition(InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID)).not.toThrow();
  });

  it('allows issued → paid', () => {
    expect(() => transition(InvoiceStatus.ISSUED, InvoiceStatus.PAID)).not.toThrow();
  });

  it('allows issued → overpaid', () => {
    expect(() => transition(InvoiceStatus.ISSUED, InvoiceStatus.OVERPAID)).not.toThrow();
  });

  it('allows partially_paid → paid', () => {
    expect(() => transition(InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.PAID)).not.toThrow();
  });

  it('allows partially_paid → overpaid', () => {
    expect(() => transition(InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERPAID)).not.toThrow();
  });

  it('allows paid → refunded', () => {
    expect(() => transition(InvoiceStatus.PAID, InvoiceStatus.REFUNDED)).not.toThrow();
  });

  it('allows overpaid → refunded', () => {
    expect(() => transition(InvoiceStatus.OVERPAID, InvoiceStatus.REFUNDED)).not.toThrow();
  });

  it('rejects draft → paid (must issue first)', () => {
    expect(() => transition(InvoiceStatus.DRAFT, InvoiceStatus.PAID)).toThrow('Cannot move from draft to paid');
  });

  it('rejects issued → refunded (must be paid/overpaid first)', () => {
    expect(() => transition(InvoiceStatus.ISSUED, InvoiceStatus.REFUNDED)).toThrow('Cannot move from issued to refunded');
  });

  it('rejects refunded → anything', () => {
    expect(() => transition(InvoiceStatus.REFUNDED, InvoiceStatus.DRAFT)).toThrow('Cannot move from refunded to draft');
  });

  it('rejects paid → issued (backwards transition)', () => {
    expect(() => transition(InvoiceStatus.PAID, InvoiceStatus.ISSUED)).toThrow('Cannot move from paid to issued');
  });
});

describe('InvoicesService', () => {
  let fakeRepo: ReturnType<typeof createFakeInvoicesRepo>;
  let service: ReturnType<typeof createInvoicesService>;

  beforeEach(() => {
    fakeRepo = createFakeInvoicesRepo();
    service = createInvoicesService({ invoices: fakeRepo });
  });

  describe('createInvoice', () => {
    it('creates an invoice with draft status and amount in kobo', async () => {
      const invoice = await service.createInvoice({
        vendor_id: 'vendor-1',
        customer_id: 'customer-1',
        amount_kobo: 500000,
      });

      expect(invoice.status).toBe('draft');
      expect(invoice.amount_kobo).toBe(500000);
      expect(invoice.paid_amount_kobo).toBe(0);
      expect(invoice.vendor_id).toBe('vendor-1');
      expect(invoice.customer_id).toBe('customer-1');
    });
  });

  describe('getInvoice', () => {
    it('returns the invoice when found', async () => {
      const created = await service.createInvoice({
        vendor_id: 'vendor-1',
        customer_id: 'customer-1',
        amount_kobo: 100000,
      });

      const found = await service.getInvoice(created.id);
      expect(found.id).toBe(created.id);
    });

    it('throws NOT_FOUND for a non-existent invoice', async () => {
      await expect(service.getInvoice('does-not-exist')).rejects.toThrow('not found');
    });
  });

  describe('listByVendor', () => {
    it('returns invoices for the given vendor', async () => {
      await service.createInvoice({ vendor_id: 'v1', customer_id: 'c1', amount_kobo: 100 });
      await service.createInvoice({ vendor_id: 'v1', customer_id: 'c2', amount_kobo: 200 });
      await service.createInvoice({ vendor_id: 'v2', customer_id: 'c3', amount_kobo: 300 });

      const list = await service.listByVendor('v1');
      expect(list).toHaveLength(2);
    });
  });

  describe('issueInvoice', () => {
    it('transitions from draft to issued', async () => {
      const created = await service.createInvoice({
        vendor_id: 'v1',
        customer_id: 'c1',
        amount_kobo: 500000,
      });

      const issued = await service.issueInvoice(created.id);
      expect(issued.status).toBe('issued');
    });

    it('throws INVALID_TRANSITION when invoice is already issued', async () => {
      const created = await service.createInvoice({
        vendor_id: 'v1',
        customer_id: 'c1',
        amount_kobo: 500000,
      });

      await service.issueInvoice(created.id);
      await expect(service.issueInvoice(created.id)).rejects.toThrow('Cannot move from issued to issued');
    });
  });

  describe('applyPayment', () => {
    it('transitions to paid when payment matches the invoice amount', async () => {
      const created = await service.createInvoice({
        vendor_id: 'v1',
        customer_id: 'c1',
        amount_kobo: 500000,
      });
      await service.issueInvoice(created.id);

      const result = await service.applyPayment(created.id, 500000);
      expect(result.status).toBe('paid');
      expect(result.paid_amount_kobo).toBe(500000);
    });

    it('transitions to partially_paid when payment is less than the amount', async () => {
      const created = await service.createInvoice({
        vendor_id: 'v1',
        customer_id: 'c1',
        amount_kobo: 500000,
      });
      await service.issueInvoice(created.id);

      const result = await service.applyPayment(created.id, 250000);
      expect(result.status).toBe('partially_paid');
      expect(result.paid_amount_kobo).toBe(250000);
    });

    it('transitions to overpaid when payment exceeds the amount', async () => {
      const created = await service.createInvoice({
        vendor_id: 'v1',
        customer_id: 'c1',
        amount_kobo: 500000,
      });
      await service.issueInvoice(created.id);

      const result = await service.applyPayment(created.id, 600000);
      expect(result.status).toBe('overpaid');
      expect(result.paid_amount_kobo).toBe(600000);
    });

    it('transitions from partially_paid to paid with a second payment', async () => {
      const created = await service.createInvoice({
        vendor_id: 'v1',
        customer_id: 'c1',
        amount_kobo: 500000,
      });
      await service.issueInvoice(created.id);
      await service.applyPayment(created.id, 200000);

      const result = await service.applyPayment(created.id, 300000);
      expect(result.status).toBe('paid');
      expect(result.paid_amount_kobo).toBe(500000);
    });

    it('rejects payment on a draft invoice', async () => {
      const created = await service.createInvoice({
        vendor_id: 'v1',
        customer_id: 'c1',
        amount_kobo: 500000,
      });

      await expect(service.applyPayment(created.id, 500000)).rejects.toThrow('Cannot move from draft to paid');
    });
  });

  describe('markRefunded', () => {
    it('transitions paid invoice to refunded', async () => {
      const created = await service.createInvoice({
        vendor_id: 'v1',
        customer_id: 'c1',
        amount_kobo: 500000,
      });
      await service.issueInvoice(created.id);
      await service.applyPayment(created.id, 500000);

      const result = await service.markRefunded(created.id);
      expect(result.status).toBe('refunded');
    });

    it('transitions overpaid invoice to refunded', async () => {
      const created = await service.createInvoice({
        vendor_id: 'v1',
        customer_id: 'c1',
        amount_kobo: 500000,
      });
      await service.issueInvoice(created.id);
      await service.applyPayment(created.id, 700000);

      const result = await service.markRefunded(created.id);
      expect(result.status).toBe('refunded');
    });

    it('rejects refund on an issued invoice', async () => {
      const created = await service.createInvoice({
        vendor_id: 'v1',
        customer_id: 'c1',
        amount_kobo: 500000,
      });
      await service.issueInvoice(created.id);

      await expect(service.markRefunded(created.id)).rejects.toThrow('Cannot move from issued to refunded');
    });
  });
});
