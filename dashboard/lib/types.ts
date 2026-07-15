import { z } from 'zod';

export const PlatformSummarySchema = z.object({
  total_collected_kobo: z.number(),
  reconciliation_rate_percent: z.number(),
  active_vendors: z.number(),
  refunds_issued_kobo: z.number(),
  pending_misdirected_count: z.number(),
});

export type PlatformSummary = z.infer<typeof PlatformSummarySchema>;

export const MisdirectedPaymentSchema = z.object({
  id: z.string(),
  sender_name: z.string(),
  amount_kobo: z.number(),
  va_number: z.string(),
  created_at: z.string(),
});

export type MisdirectedPayment = z.infer<typeof MisdirectedPaymentSchema>;

export const MisdirectedListResponseSchema = z.object({
  data: z.array(MisdirectedPaymentSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    total_pages: z.number(),
  }),
});

export type MisdirectedListResponse = z.infer<typeof MisdirectedListResponseSchema>;

export const VendorSchema = z.object({
  id: z.string(),
  merchant_id: z.string(),
  name: z.string(),
  nomba_va_number: z.string().nullable(),
  nomba_bank_name: z.string().nullable(),
  va_status: z.enum(['pending', 'active', 'suspended']),
  created_at: z.string(),
  updated_at: z.string(),
});

export type Vendor = z.infer<typeof VendorSchema>;

export const VendorListResponseSchema = z.object({
  data: z.array(VendorSchema),
  meta: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
});

export type VendorListResponse = z.infer<typeof VendorListResponseSchema>;

export const CustomerSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  last_payment_at: z.string().nullable(),
  total_paid_kobo: z.number(),
});

export type CustomerSummary = z.infer<typeof CustomerSummarySchema>;

export const CustomerListResponseSchema = z.object({
  rows: z.array(CustomerSummarySchema),
  total: z.number(),
});

export type CustomerListResponse = z.infer<typeof CustomerListResponseSchema>;

export const VendorStatementSchema = z.object({
  vendor_id: z.string(),
  va_number: z.string().nullable(),
  va_bank_name: z.string().nullable(),
  total_collected_kobo: z.number(),
  reconciliation_rate: z.number(),
  outstanding_balance_kobo: z.number(),
  recent_customers: z.array(CustomerSummarySchema),
});

export type VendorStatement = z.infer<typeof VendorStatementSchema>;

export const CustomerStatementSchema = z.object({
  customer: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
  }),
  running_balance_kobo: z.number(),
  transactions: z.array(
    z.object({
      id: z.string(),
      date: z.string(),
      amount_kobo: z.number(),
      status: z.string(),
      invoice_id: z.string().nullable(),
    }),
  ),
});

export type CustomerStatement = z.infer<typeof CustomerStatementSchema>;

export const StatementResponseSchema = z.union([
  z.object({
    vendor: z.object({
      id: z.string(),
      name: z.string(),
    }),
    opening_balance_kobo: z.number(),
    transactions: z.array(
      z.object({
        id: z.string(),
        date: z.string(),
        amount_kobo: z.number(),
        status: z.string(),
        description: z.string().optional(),
        invoice_id: z.string().nullable(),
      }),
    ),
  }),
  z.object({
    customer: z.object({
      id: z.string(),
      name: z.string(),
      email: z.string(),
    }),
    opening_balance_kobo: z.number(),
    transactions: z.array(
      z.object({
        id: z.string(),
        date: z.string(),
        amount_kobo: z.number(),
        status: z.string(),
        description: z.string().optional(),
        invoice_id: z.string().nullable(),
      }),
    ),
  }),
]);

export type StatementResponse = z.infer<typeof StatementResponseSchema>;

export const TransactionListItemSchema = z.object({
  id: z.string(),
  transaction_id: z.string(),
  va_number: z.string(),
  amount_kobo: z.number(),
  sender_name: z.string(),
  sender_account: z.string(),
  sender_bank_code: z.string(),
  sender_bank_name: z.string().optional(),
  raw_payload: z.unknown(),
  created_at: z.string(),
  invoice_id: z.string().nullable(),
  refund_status: z.string().nullable(),
});

export type TransactionListItem = z.infer<typeof TransactionListItemSchema>;

export const TransactionDetailSchema = z.object({
  id: z.string(),
  transaction_id: z.string(),
  va_number: z.string(),
  amount_kobo: z.number(),
  sender_name: z.string(),
  sender_account: z.string(),
  sender_bank_code: z.string(),
  sender_bank_name: z.string().optional(),
  raw_payload: z.unknown(),
  created_at: z.string(),
  invoice_id: z.string().nullable(),
  refund_status: z.enum(['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']).optional(),
});

export type TransactionDetail = z.infer<typeof TransactionDetailSchema>;

export const ReconciliationDetailSchema = z.object({
  id: z.string(),
  transaction_id: z.string(),
  invoice_id: z.string().nullable(),
  status: z.string(),
  expected_kobo: z.number(),
  received_kobo: z.number(),
  difference_kobo: z.number(),
  action_taken: z.string(),
  created_at: z.string(),
});

export type ReconciliationDetail = z.infer<typeof ReconciliationDetailSchema>;

export const TransactionListResponseSchema = z.object({
  rows: z.array(TransactionListItemSchema),
  total: z.number(),
});

export type TransactionListResponse = z.infer<typeof TransactionListResponseSchema>;

export const WebhookDeliverySchema = z.object({
  id: z.string(),
  event_type: z.string(),
  attempt: z.number(),
  http_status: z.number().nullable(),
  latency_ms: z.number().nullable(),
  status: z.enum(['success', 'failed', 'pending', 'dead_letter']),
  created_at: z.string(),
});

export type WebhookDelivery = z.infer<typeof WebhookDeliverySchema>;

export const AnomalyAlertSchema = z.object({
  id: z.string(),
  rule: z.string(),
  transaction_id: z.string(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  timestamp: z.string(),
});

export type AnomalyAlert = z.infer<typeof AnomalyAlertSchema>;
