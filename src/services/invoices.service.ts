import type { InvoicesRepo } from '../repositories/invoices.repo.js';
import type { CreateInvoiceInput, InvoiceStatus } from '../schemas/invoices.schema.js';
import { TRANSITIONS, InvoiceStatus as Status } from '../schemas/invoices.schema.js';
import { AppError } from '../lib/errors.js';
import { createLogger } from '../lib/logger.js';
// import type { ReconciliationRepo } from '../repositories/reconciliation.repo.js';
// import type { AuditService } from './audit.service.js';

const log = createLogger('invoices-service');

interface ReconciliationRepo {
  findByInvoiceId(id: string): Promise<unknown>;
}

interface AuditService {
  logAction(opts: unknown): Promise<void>;
}

type InvoicesServiceDeps = {
  invoices: InvoicesRepo;
  reconciliation?: ReconciliationRepo;
  audit?: AuditService;
};

/**
 * Validates that a state transition is allowed per the invoice state machine.
 * Throws AppError with INVALID_TRANSITION if the transition is not permitted.
 */
export function transition(current: InvoiceStatus, next: InvoiceStatus): void {
  const allowed = TRANSITIONS[current];
  if (!allowed || !allowed.includes(next)) {
    throw new AppError(400, 'INVALID_TRANSITION', `Cannot move from ${current} to ${next}`);
  }
}

export function createInvoicesService(deps: InvoicesServiceDeps) {
  return {
    async createInvoice(input: CreateInvoiceInput) {
      const invoice = await deps.invoices.create(input);

      log.info(
        { invoiceId: invoice.id, vendorId: input.vendor_id, customerId: input.customer_id },
        'invoice created',
      );

      return invoice;
    },

    async getInvoice(id: string) {
      const invoice = await deps.invoices.findById(id);
      if (!invoice) {
        throw new AppError(404, 'NOT_FOUND', `Invoice ${id} not found`);
      }
      return invoice;
    },

    async listByVendor(vendorId: string) {
      return deps.invoices.findByVendorId(vendorId);
    },

    async issueInvoice(id: string) {
      const invoice = await deps.invoices.findById(id);
      if (!invoice) {
        throw new AppError(404, 'NOT_FOUND', `Invoice ${id} not found`);
      }

      transition(invoice.status, Status.ISSUED);

      const updated = await deps.invoices.updateStatus(id, Status.ISSUED);

      log.info({ invoiceId: id }, 'invoice issued');
      return updated;
    },

    async applyPayment(id: string, paymentAmountKobo: number) {
      const invoice = await deps.invoices.findById(id);
      if (!invoice) {
        throw new AppError(404, 'NOT_FOUND', `Invoice ${id} not found`);
      }

      const newPaidAmount = invoice.paid_amount_kobo + paymentAmountKobo;
      let nextStatus: InvoiceStatus;

      if (newPaidAmount > invoice.amount_kobo) {
        nextStatus = Status.OVERPAID;
      } else if (newPaidAmount === invoice.amount_kobo) {
        nextStatus = Status.PAID;
      } else {
        nextStatus = Status.PARTIALLY_PAID;
      }

      transition(invoice.status, nextStatus);

      const updated = await deps.invoices.updateStatus(id, nextStatus, newPaidAmount);

      log.info(
        { invoiceId: id, paymentAmountKobo, newPaidAmount, status: nextStatus },
        'payment applied to invoice',
      );

      return updated;
    },

    async markRefunded(id: string) {
      const invoice = await deps.invoices.findById(id);
      if (!invoice) {
        throw new AppError(404, 'NOT_FOUND', `Invoice ${id} not found`);
      }

      transition(invoice.status, Status.REFUNDED);

      const updated = await deps.invoices.updateStatus(id, Status.REFUNDED);

      log.info({ invoiceId: id }, 'invoice marked as refunded');
      return updated;
    },

    async markInvoiceAsPaid(id: string, actorId: string, ipAddress: string) {
      const invoice = await deps.invoices.findById(id);
      if (!invoice) {
        throw new AppError(404, 'NOT_FOUND', `Invoice ${id} not found`);
      }

      // Check transition to paid
      transition(invoice.status, Status.PAID);

      const updated = await deps.invoices.updateStatus(id, Status.PAID, invoice.amount_kobo);

      log.info({ invoiceId: id, actorId }, 'invoice manually marked as paid');

      if (deps.audit) {
        // Resolve merchant_id for the audit log
        const merchantId = await deps.invoices.findMerchantIdByInvoiceId(id);
        if (merchantId) {
          await deps.audit.logAction({
            merchant_id: merchantId,
            actor_id: actorId,
            action: 'invoice.mark_paid',
            resource_type: 'invoice',
            resource_id: id,
            old_values: { status: invoice.status },
            new_values: { status: 'paid' },
            ip_address: ipAddress,
          });
        }
      }

      return updated;
    },

    async getReconciliation(invoiceId: string) {
      const invoice = await deps.invoices.findById(invoiceId);
      if (!invoice) {
        throw new AppError(404, 'NOT_FOUND', `Invoice ${invoiceId} not found`);
      }

      if (!deps.reconciliation) {
        throw new AppError(500, 'INTERNAL_ERROR', 'Reconciliation repository not injected');
      }

      return deps.reconciliation.findByInvoiceId(invoiceId);
    },
  };
}

export type InvoicesService = ReturnType<typeof createInvoicesService>;
