import { z } from 'zod';

export const InvoiceStatus = {
  DRAFT: 'draft',
  ISSUED: 'issued',
  PARTIALLY_PAID: 'partially_paid',
  PAID: 'paid',
  OVERPAID: 'overpaid',
  REFUNDED: 'refunded',
} as const;

export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

/**
 * State machine — only valid transitions allowed.
 * Per PRD section 6.2: draft → issued → partially_paid → paid → overpaid → refunded
 */
export const TRANSITIONS: Record<InvoiceStatus, readonly InvoiceStatus[]> = {
  draft: [InvoiceStatus.ISSUED],
  issued: [InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.PAID, InvoiceStatus.OVERPAID],
  partially_paid: [InvoiceStatus.PAID, InvoiceStatus.OVERPAID],
  paid: [InvoiceStatus.REFUNDED],
  overpaid: [InvoiceStatus.REFUNDED],
  refunded: [],
};

export const createInvoiceSchema = z.object({
  vendor_id: z.string().min(1),
  customer_id: z.string().min(1).optional(),
  amount_kobo: z.number().int().positive(),
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;

export const updateInvoiceStatusSchema = z.object({
  status: z.enum([
    InvoiceStatus.DRAFT,
    InvoiceStatus.ISSUED,
    InvoiceStatus.PARTIALLY_PAID,
    InvoiceStatus.PAID,
    InvoiceStatus.OVERPAID,
    InvoiceStatus.REFUNDED,
  ]),
});

export const invoiceIdParamSchema = z.object({
  id: z.string().min(1),
});

export const vendorIdParamSchema = z.object({
  vendorId: z.string().min(1),
});
