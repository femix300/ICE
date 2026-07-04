import type { InvoicesRepo } from '../repositories/invoices.repo.js';
import type { ReconciliationRepo, CreateReconciliationLogInput } from '../repositories/reconciliation.repo.js';
import type { TransactionRow } from '../repositories/transactions.repo.js';
import { InvoiceStatus } from '../schemas/invoices.schema.js';
import { transition } from './invoices.service.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('reconciliation');

export const ReconciliationStatus = {
  EXACT_MATCH: 'EXACT_MATCH',
  OVERPAYMENT: 'OVERPAYMENT',
  UNDERPAYMENT: 'UNDERPAYMENT',
  DUPLICATE: 'DUPLICATE',
  UNMATCHED: 'UNMATCHED',
} as const;

export type ReconciliationStatus = (typeof ReconciliationStatus)[keyof typeof ReconciliationStatus];

type ReconciliationResult = {
  status: ReconciliationStatus;
  action: string;
  invoice_id?: string;
  difference_kobo?: number;
  outstanding_kobo?: number;
  refund_queued?: boolean;
};

export type RefundJobData = {
  transaction_id: string;
  amount_kobo: number;
  recipient_account: string;
  recipient_bank_code: string;
};

export type RefundQueue = {
  add(data: RefundJobData): Promise<void>;
};

type ReconciliationDeps = {
  reconciliation: ReconciliationRepo;
  invoices: InvoicesRepo;
  refundQueue?: RefundQueue;
};

export function createReconciliationService(deps: ReconciliationDeps) {
  return {
    async reconcile(transaction: TransactionRow): Promise<ReconciliationResult> {
      // 1. Duplicate check — already reconciled?
      const existing = await deps.reconciliation.findByTransactionId(transaction.transaction_id);
      if (existing) {
        log.info({ transactionId: transaction.transaction_id }, 'duplicate reconciliation rejected');
        return { status: ReconciliationStatus.DUPLICATE, action: 'rejected' };
      }

      // 2. Find matching invoice by VA number
      const invoice = await deps.invoices.findIssuedByVaNumber(transaction.va_number);

      if (!invoice) {
        // Unmatched payment — no invoice found for this VA
        const logEntry: CreateReconciliationLogInput = {
          transaction_id: transaction.transaction_id,
          invoice_id: null,
          status: ReconciliationStatus.UNMATCHED,
          expected_kobo: 0,
          received_kobo: transaction.amount_kobo,
          difference_kobo: transaction.amount_kobo,
          action_taken: 'flagged_unmatched',
        };
        await deps.reconciliation.create(logEntry);

        log.warn({ transactionId: transaction.transaction_id, vaNumber: transaction.va_number }, 'unmatched payment');
        return { status: ReconciliationStatus.UNMATCHED, action: 'flagged' };
      }

      const received = transaction.amount_kobo;
      const expected = invoice.amount_kobo - invoice.paid_amount_kobo;
      const difference = received - expected;

      // 3. Exact match
      if (received === expected) {
        transition(invoice.status, InvoiceStatus.PAID);
        await deps.invoices.updateStatus(invoice.id, InvoiceStatus.PAID, invoice.paid_amount_kobo + received);

        const logEntry: CreateReconciliationLogInput = {
          transaction_id: transaction.transaction_id,
          invoice_id: invoice.id,
          status: ReconciliationStatus.EXACT_MATCH,
          expected_kobo: expected,
          received_kobo: received,
          difference_kobo: 0,
          action_taken: 'invoice_closed',
        };
        await deps.reconciliation.create(logEntry);

        log.info({ transactionId: transaction.transaction_id, invoiceId: invoice.id }, 'exact match — invoice closed');
        return { status: ReconciliationStatus.EXACT_MATCH, action: 'invoice_closed', invoice_id: invoice.id };
      }

      // 4. Overpayment — queue auto-refund for the difference
      if (received > expected) {
        transition(invoice.status, InvoiceStatus.OVERPAID);
        await deps.invoices.updateStatus(invoice.id, InvoiceStatus.OVERPAID, invoice.paid_amount_kobo + received);

        const logEntry: CreateReconciliationLogInput = {
          transaction_id: transaction.transaction_id,
          invoice_id: invoice.id,
          status: ReconciliationStatus.OVERPAYMENT,
          expected_kobo: expected,
          received_kobo: received,
          difference_kobo: difference,
          action_taken: 'refund_queued',
        };
        await deps.reconciliation.create(logEntry);

        // Queue refund job — E04 builds the BullMQ processor
        if (deps.refundQueue) {
          await deps.refundQueue.add({
            transaction_id: transaction.transaction_id,
            amount_kobo: difference,
            recipient_account: transaction.sender_account,
            recipient_bank_code: transaction.sender_bank_code,
          });
        }

        log.warn(
          { transactionId: transaction.transaction_id, invoiceId: invoice.id, difference },
          'overpayment detected — refund queued',
        );
        return {
          status: ReconciliationStatus.OVERPAYMENT,
          action: 'refund_queued',
          invoice_id: invoice.id,
          difference_kobo: difference,
          refund_queued: true,
        };
      }

      // 5. Underpayment — record partial payment, track outstanding balance
      const outstanding = expected - received;

      transition(invoice.status, InvoiceStatus.PARTIALLY_PAID);
      await deps.invoices.updateStatus(invoice.id, InvoiceStatus.PARTIALLY_PAID, invoice.paid_amount_kobo + received);

      const logEntry: CreateReconciliationLogInput = {
        transaction_id: transaction.transaction_id,
        invoice_id: invoice.id,
        status: ReconciliationStatus.UNDERPAYMENT,
        expected_kobo: expected,
        received_kobo: received,
        difference_kobo: -outstanding,
        action_taken: 'partial_payment_recorded',
      };
      await deps.reconciliation.create(logEntry);

      log.info(
        { transactionId: transaction.transaction_id, invoiceId: invoice.id, outstanding },
        'underpayment — partial payment recorded',
      );
      return {
        status: ReconciliationStatus.UNDERPAYMENT,
        action: 'partial_payment_recorded',
        invoice_id: invoice.id,
        difference_kobo: -outstanding,
        outstanding_kobo: outstanding,
      };
    },

    async getInvoiceReconciliation(invoiceId: string) {
      return deps.reconciliation.findByInvoiceId(invoiceId);
    },

    async listLogs(status?: string, page = 1, limit = 20) {
      const offset = (page - 1) * limit;
      const [logs, total] = await Promise.all([
        deps.reconciliation.findLogs(status, limit, offset),
        deps.reconciliation.countLogs(status),
      ]);
      return {
        data: logs,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit),
        },
      };
    },
  };
}

export type ReconciliationService = ReturnType<typeof createReconciliationService>;
