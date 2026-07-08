import type { TransactionsRepo } from '../repositories/transactions.repo.js';
import type { NombaWebhookPayload } from '../schemas/webhooks.schema.js';
import { NombaEventType } from '../schemas/webhooks.schema.js';
import { verifySignature } from '../lib/hmac.js';
import { AppError } from '../lib/errors.js';
import { createLogger } from '../lib/logger.js';
import type { ReconciliationService } from './reconciliation.service.js';

const log = createLogger('webhook-inbound');

type WebhookInboundDeps = {
  transactions: TransactionsRepo;
  webhookSecret: string;
  reconciliation: ReconciliationService;
};

export function createWebhookInboundService(deps: WebhookInboundDeps) {
  return {
    async processWebhook(payload: NombaWebhookPayload, signature: string, timestamp: string) {
      if (!verifySignature(payload, signature, timestamp, deps.webhookSecret)) {
        log.warn({ event: payload.event_type }, 'invalid HMAC signature');
        throw new AppError(401, 'UNAUTHORIZED', 'Invalid webhook signature');
      }

      const transactionId = payload.data.transaction.transactionId;

      const existing = await deps.transactions.byTransactionId(transactionId);
      if (existing) {
        log.info({ transactionId }, 'duplicate transaction ignored');
        return { duplicate: true, transactionId };
      }

      // TODO: transactions.create(payload) below may still expect the OLD flat
      // shape (amount, accountNumber, senderName, etc.) — those field names are
      // unconfirmed for real payloads. Check the raw payload log from the
      // controller against this call once a real webhook lands, and adjust
      // the mapping here + in transactions.repo.ts accordingly.
      const transaction = await deps.transactions.create(payload);

      log.info({ transactionId, event: payload.event_type }, 'transaction stored');

      if (payload.event_type === NombaEventType.PAYMENT_SUCCESS) {
        log.info({ transactionId }, 'dispatching to reconciliation engine');
        await deps.reconciliation.reconcile(transaction);
      }

      return { duplicate: false, transactionId: transaction.transaction_id };
    },
  };
}

export type WebhookInboundService = ReturnType<typeof createWebhookInboundService>;
