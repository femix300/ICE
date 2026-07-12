import type { MisdirectedRepo } from '../repositories/misdirected.repo.js';
import type { InvoicesRepo } from '../repositories/invoices.repo.js';
import type { ReconciliationRepo } from '../repositories/reconciliation.repo.js';
import type { AuditRepo } from '../repositories/audit.repo.js';
import type { TransactionRow } from '../repositories/transactions.repo.js';
import { InvoiceStatus } from '../schemas/invoices.schema.js';
import { transition as invoiceTransition } from './invoices.service.js';
import { createLogger } from '../lib/logger.js';
import { AppError } from '../lib/errors.js';

const log = createLogger('misdirected');

export type WebhookDeliveryQueue = {
  add(data: { merchant_id: string; event_type: string; payload: unknown }): Promise<void>;
};

export type RefundQueue = {
  add(data: {
    transaction_id: string;
    amount_kobo: number;
    recipient_account: string;
    recipient_bank_code: string;
  }): Promise<void>;
};

export type NombaTransferClient = {
  lookupAccount(data: {
    accountNumber: string;
    bankCode: string;
  }): Promise<{ accountName: string }>;
  transfer(data: {
    amount: number;
    accountNumber: string;
    bankCode: string;
    narration: string;
  }): Promise<{ transferReference: string }>;
};

type MisdirectedServiceDeps = {
  misdirected: MisdirectedRepo;
  invoices?: InvoicesRepo;
  reconciliation?: ReconciliationRepo;
  audit?: AuditRepo;
  webhookQueue?: WebhookDeliveryQueue;
  refundQueue?: RefundQueue;
  nombaTransfer?: NombaTransferClient;
};

type ManualMatchResult = {
  payment_id: string;
  invoice_id: string;
  reconciliation_status: string;
  status: string;
};

type RefundResult = {
  payment_id: string;
  refund_reference: string;
  recipient_name: string;
  status: string;
};

export function createMisdirectedService(deps: MisdirectedServiceDeps) {
  return {
    async flagMisdirected(transaction: TransactionRow) {
      const merchantId = await deps.misdirected.findMerchantByVaNumber(transaction.va_number);

      if (!merchantId) {
        log.error(
          { transactionId: transaction.transaction_id, vaNumber: transaction.va_number },
          'misdirected payment — no merchant found for VA number',
        );
        throw new AppError(
          500,
          'INTERNAL_ERROR',
          `No merchant found for VA number ${transaction.va_number}`,
        );
      }

      const payment = await deps.misdirected.create({
        merchant_id: merchantId,
        va_number: transaction.va_number,
        amount_kobo: transaction.amount_kobo,
        sender_name: transaction.sender_name,
        raw_payload: transaction.raw_payload,
      });

      log.warn(
        { paymentId: payment.id, merchantId, transactionId: transaction.transaction_id },
        'misdirected payment flagged',
      );

      if (deps.webhookQueue) {
        await deps.webhookQueue.add({
          merchant_id: merchantId,
          event_type: 'payment.misdirected',
          payload: {
            id: payment.id,
            va_number: transaction.va_number,
            amount_kobo: transaction.amount_kobo,
            sender_name: transaction.sender_name,
            sender_account: transaction.sender_account,
            sender_bank_code: transaction.sender_bank_code,
            status: 'PENDING_REVIEW',
            created_at: payment.created_at,
          },
        });
      }

      return payment;
    },

    async listByMerchant(merchantId: string, page = 1, limit = 20) {
      const offset = (page - 1) * limit;

      const [payments, total] = await Promise.all([
        deps.misdirected.findByMerchantId(merchantId, limit, offset),
        deps.misdirected.countByMerchantId(merchantId),
      ]);

      return {
        data: payments,
        pagination: {
          page,
          limit,
          total,
          total_pages: Math.ceil(total / limit),
        },
      };
    },

    /**
     * Manually match a misdirected payment to an existing invoice.
     * Updates payment status to RESOLVED and triggers reconciliation.
     */
    async matchPayment(
      id: string,
      invoiceId: string,
      merchantId: string,
      actorId: string,
      ipAddress: string,
    ): Promise<ManualMatchResult> {
      if (!deps.invoices || !deps.reconciliation || !deps.audit) {
        throw new AppError(500, 'INTERNAL_ERROR', 'Missing dependencies for matchPayment');
      }

      const payment = await deps.misdirected.findById(id);
      if (!payment) {
        throw new AppError(404, 'NOT_FOUND', `Misdirected payment ${id} not found`);
      }

      if (payment.merchant_id !== merchantId) {
        throw new AppError(403, 'FORBIDDEN', 'Access to misdirected payment denied');
      }

      if (payment.status === 'RESOLVED') {
        throw new AppError(400, 'BAD_REQUEST', 'Misdirected payment already resolved');
      }

      const invoice = await deps.invoices.findById(invoiceId);
      if (!invoice) {
        throw new AppError(404, 'NOT_FOUND', `Invoice ${invoiceId} not found`);
      }

      if (
        invoice.status !== InvoiceStatus.ISSUED &&
        invoice.status !== InvoiceStatus.PARTIALLY_PAID
      ) {
        throw new AppError(
          400,
          'BAD_REQUEST',
          `Invoice must be issued or partially paid, found: ${invoice.status}`,
        );
      }

      // Reconcile the payment against the invoice
      const received = payment.amount_kobo;
      const expected = invoice.amount_kobo - invoice.paid_amount_kobo;
      const difference = received - expected;
      let nextStatus: InvoiceStatus;
      let actionTaken: string;
      let reconStatus: string;

      if (received === expected) {
        nextStatus = InvoiceStatus.PAID;
        actionTaken = 'invoice_closed_manual';
        reconStatus = 'EXACT_MATCH';
      } else if (received > expected) {
        nextStatus = InvoiceStatus.OVERPAID;
        actionTaken = 'refund_queued_manual';
        reconStatus = 'OVERPAYMENT';
      } else {
        nextStatus = InvoiceStatus.PARTIALLY_PAID;
        actionTaken = 'partial_payment_manual';
        reconStatus = 'UNDERPAYMENT';
      }

      // Execute transitions
      invoiceTransition(invoice.status, nextStatus);
      await deps.invoices.updateStatus(invoice.id, nextStatus, invoice.paid_amount_kobo + received);

      const rawPayload = payment.raw_payload as
        | {
            data?: {
              transaction?: { transactionId?: string };
              customer?: { accountNumber?: string; bankCode?: string };
            };
          }
        | null
        | undefined;
      const transactionId =
        rawPayload?.data?.transaction?.transactionId || `TXN-MIS-${payment.id}`;

      await deps.reconciliation.create({
        transaction_id: transactionId,
        invoice_id: invoice.id,
        status: reconStatus,
        expected_kobo: expected,
        received_kobo: received,
        difference_kobo: difference,
        action_taken: actionTaken,
      });

      // Queue overpayment refund if required
      if (received > expected && deps.refundQueue) {
        await deps.refundQueue.add({
          transaction_id: transactionId,
          amount_kobo: difference,
          recipient_account: rawPayload?.data?.customer?.accountNumber || '',
          recipient_bank_code: rawPayload?.data?.customer?.bankCode || '',
        });
      }

      // Resolve the misdirected payment status
      const updatedPayment = await deps.misdirected.updateResolution(
        id,
        `Manually matched to invoice ${invoiceId}`,
        'RESOLVED',
      );

      // Log audit trail
      await deps.audit.create({
        merchant_id: merchantId,
        actor_id: actorId,
        action: 'MANUAL_MATCH',
        resource_type: 'MISDIRECTED_PAYMENT',
        resource_id: id,
        old_values: { status: payment.status, resolution: payment.resolution },
        new_values: { status: updatedPayment.status, resolution: updatedPayment.resolution },
        ip_address: ipAddress,
      });

      log.info({ paymentId: id, invoiceId, actorId }, 'misdirected payment manually matched');

      return {
        payment_id: id,
        invoice_id: invoiceId,
        reconciliation_status: reconStatus,
        status: 'RESOLVED',
      };
    },

    /**
     * Initiate a manual refund for a misdirected payment via the Nomba Transfer API.
     * Updates payment status to RESOLVED.
     */
    async refundPayment(
      id: string,
      merchantId: string,
      actorId: string,
      ipAddress: string,
    ): Promise<RefundResult> {
      if (!deps.nombaTransfer || !deps.audit) {
        throw new AppError(500, 'INTERNAL_ERROR', 'Missing dependencies for refundPayment');
      }

      const payment = await deps.misdirected.findById(id);
      if (!payment) {
        throw new AppError(404, 'NOT_FOUND', `Misdirected payment ${id} not found`);
      }

      if (payment.merchant_id !== merchantId) {
        throw new AppError(403, 'FORBIDDEN', 'Access to misdirected payment denied');
      }

      if (payment.status === 'RESOLVED') {
        throw new AppError(400, 'BAD_REQUEST', 'Misdirected payment already resolved');
      }

      const rawPayload = payment.raw_payload as
        | {
            data?: {
              customer?: { accountNumber?: string; bankCode?: string };
            };
          }
        | null
        | undefined;
      const recipientAccount = rawPayload?.data?.customer?.accountNumber;
      const recipientBankCode = rawPayload?.data?.customer?.bankCode;

      if (!recipientAccount || !recipientBankCode) {
        throw new AppError(400, 'BAD_REQUEST', 'Missing sender account details in raw payload');
      }

      // ── Nomba Certification Requirement ──
      // 1. MUST call bank lookup before performing the transfer
      log.info(
        { recipientAccount, recipientBankCode },
        'lookup recipient account name before transfer',
      );
      const lookup = await deps.nombaTransfer.lookupAccount({
        accountNumber: recipientAccount,
        bankCode: recipientBankCode,
      });

      log.info(
        { recipientAccount, accountName: lookup.accountName },
        'recipient account name verified',
      );

      // 2. Perform the transfer via Nomba Transfer API
      const transfer = await deps.nombaTransfer.transfer({
        amount: payment.amount_kobo, // Rule 1: Always use Kobo, no conversion
        accountNumber: recipientAccount,
        bankCode: recipientBankCode,
        narration: `Refund for misdirected payment ref: ${id}`,
      });

      // Update misdirected payment status to RESOLVED
      const updatedPayment = await deps.misdirected.updateResolution(
        id,
        `Refunded via Nomba Transfer API, reference: ${transfer.transferReference}`,
        'RESOLVED',
      );

      // Log audit trail
      await deps.audit.create({
        merchant_id: merchantId,
        actor_id: actorId,
        action: 'MANUAL_REFUND',
        resource_type: 'MISDIRECTED_PAYMENT',
        resource_id: id,
        old_values: { status: payment.status, resolution: payment.resolution },
        new_values: { status: updatedPayment.status, resolution: updatedPayment.resolution },
        ip_address: ipAddress,
      });

      log.info(
        { paymentId: id, transferReference: transfer.transferReference, actorId },
        'misdirected payment refunded',
      );

      return {
        payment_id: id,
        refund_reference: transfer.transferReference,
        recipient_name: lookup.accountName,
        status: 'RESOLVED',
      };
    },
  };
}

export type MisdirectedService = ReturnType<typeof createMisdirectedService>;
