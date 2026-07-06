import { AppError } from '../lib/errors.js';
import { z } from 'zod';
import { createLogger } from '../lib/logger.js';

const log = createLogger('anomaly-service');

// ---------- Types ----------

export const InboundTransactionSchema = z.object({
  id: z.string(),
  va_number: z.string(),
  vendor_id: z.string(),
  merchant_id: z.string(),
  sender_account: z.string(),
  amount_kobo: z.number().positive(),
  received_at: z.string(),
});

export type InboundTransaction = z.infer<typeof InboundTransactionSchema>;

export interface AnomalyRepoStub {
  countRecentPayments: (vaNumber: string, withinMinutes: number) => Promise<number>;
  getRecentAmounts: (vaNumber: string, count: number) => Promise<number[]>;
  hasDuplicateSender: (
    senderAccount: string,
    amountKobo: number,
    vaNumber: string,
    withinMinutes: number,
  ) => Promise<boolean>;
  isVaSuspended: (vaNumber: string, suspendedDaysThreshold: number) => Promise<boolean>;
}

export interface WebhookDeliveryQueueStub {
  add: (name: string, data: unknown) => Promise<unknown>;
}

export interface DetectedAnomaly {
  type: string;
  transaction_id: string;
  vendor_id: string;
  merchant_id: string;
}

// ---------- Service ----------

export function createAnomalyService(deps: {
  repo: AnomalyRepoStub;
  webhookDeliveryQueue: WebhookDeliveryQueueStub;
}) {
  const isRoundNumber = (amountKobo: number) => amountKobo % 100 === 0;

  const queueAlert = async (anomalyType: string, tx: InboundTransaction) => {
    await deps.webhookDeliveryQueue.add('webhook-delivery', {
      merchant_id: tx.merchant_id,
      event_type: 'payment.anomaly_detected',
      payload: {
        anomaly_type: anomalyType,
        transaction_id: tx.id,
        vendor_id: tx.vendor_id,
        va_number: tx.va_number,
      },
    });
  };

  const rules: Array<{
    name: string;
    check: (tx: InboundTransaction) => Promise<boolean>;
  }> = [
    {
      name: 'velocity_spike',
      check: async (tx) => {
        const count = await deps.repo.countRecentPayments(tx.va_number, 10);
        return count >= 5;
      },
    },
    {
      name: 'round_number_flooding',
      check: async (tx) => {
        if (!isRoundNumber(tx.amount_kobo)) return false;
        const recentAmounts = await deps.repo.getRecentAmounts(tx.va_number, 3);
        return recentAmounts.length >= 2 && recentAmounts.every(isRoundNumber);
      },
    },
    {
      name: 'duplicate_sender',
      check: async (tx) => {
        return await deps.repo.hasDuplicateSender(
          tx.sender_account,
          tx.amount_kobo,
          tx.va_number,
          5,
        );
      },
    },
    {
      name: 'dormant_account_payment',
      check: async (tx) => {
        return await deps.repo.isVaSuspended(tx.va_number, 30);
      },
    },
  ];

  return {
    analyze: async (rawTx: unknown): Promise<DetectedAnomaly[]> => {
      const parsed = InboundTransactionSchema.safeParse(rawTx);
      if (!parsed.success) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Invalid transaction payload for anomaly detection');
      }
      const tx = parsed.data;

      const triggered: DetectedAnomaly[] = [];

      for (const rule of rules) {
        try {
          const isTriggered = await rule.check(tx);
          if (isTriggered) {
            log.warn(
              { anomalyType: rule.name, transactionId: tx.id, vaNumber: tx.va_number },
              'Payment anomaly detected',
            );
            await queueAlert(rule.name, tx);
            triggered.push({
              type: rule.name,
              transaction_id: tx.id,
              vendor_id: tx.vendor_id,
              merchant_id: tx.merchant_id,
            });
          }
        } catch (err: unknown) {
          log.error({ err, rule: rule.name, transactionId: tx.id }, 'Anomaly rule check failed');
        }
      }

      return triggered;
    },
  };
}
