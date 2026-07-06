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
    async processWebhook(rawBody: string, signature: string, payload: NombaWebhookPayload) {
      if (!verifySignature(rawBody, signature, deps.webhookSecret)) {
        log.warn({ event: payload.event }, 'invalid HMAC signature');
        throw new AppError(401, 'UNAUTHORIZED', 'Invalid webhook signature');
      }

      const existing = await deps.transactions.byTransactionId(payload.data.transactionId);
      if (existing) {
        log.info({ transactionId: payload.data.transactionId }, 'duplicate transaction ignored');
        return { duplicate: true, transactionId: payload.data.transactionId };
      }

      const transaction = await deps.transactions.create(payload);

      log.info(
        { transactionId: payload.data.transactionId, event: payload.event },
        'transaction stored',
      );

      if (payload.event === NombaEventType.PAYMENT_SUCCESS) {
        log.info(
          { transactionId: payload.data.transactionId },
          'dispatching to reconciliation engine',
        );
        await deps.reconciliation.reconcile(transaction);
      }

      return { duplicate: false, transactionId: transaction.transaction_id };
    },
  };
}

export type WebhookInboundService = ReturnType<typeof createWebhookInboundService>;
