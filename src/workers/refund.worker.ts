import { Worker, type Job, type Queue } from 'bullmq';
import { z } from 'zod';
import { redis } from '../lib/redis.ts';
import { createLogger } from '../lib/logger.ts';

const log = createLogger('refund-worker');

class AppError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'AppError';
  }
}

export const RefundPayloadSchema = z.object({
  transaction_id: z.string(),
  merchant_id: z.string(),
  amount_kobo: z.number().positive(),
  recipient_account: z.string(),
  recipient_bank_code: z.string(),
});

// Stubs for types
export interface RefundsRepoStub {
  update: (transaction_id: string, data: { status: 'COMPLETED' | 'FAILED'; nomba_transfer_ref?: string }) => Promise<void>;
}

export interface NombaClientStub {
  lookupBank: (params: { accountNumber: string; bankCode: string }) => Promise<{ data: { accountName: string } }>;
  transferToBank: (params: { amount: number; accountNumber: string; bankCode: string; narration: string }) => Promise<{ data: { id: string } }>;
}

export function createRefundWorker(deps: {
  nomba: NombaClientStub;
  refunds: RefundsRepoStub;
  webhookDeliveryQueue: Queue;
}) {
  const worker = new Worker(
    'refund',
    async (job: Job) => {
      const parsed = RefundPayloadSchema.safeParse(job.data);
      if (!parsed.success) {
        throw new AppError('VALIDATION_ERROR', 'Invalid refund payload');
      }

      const { transaction_id, merchant_id, amount_kobo, recipient_account, recipient_bank_code } = parsed.data;
      
      const amountNaira = amount_kobo / 100;

      // Nomba Certification Requirement: Verify account name before transfer
      log.info({ transaction_id, recipient_account, recipient_bank_code }, 'Looking up recipient account');
      let lookupResult;
      try {
        lookupResult = await deps.nomba.lookupBank({
          accountNumber: recipient_account,
          bankCode: recipient_bank_code,
        });
      } catch (err: unknown) {
        throw new AppError('NOMBA_LOOKUP_FAILED', 'Failed to look up recipient account');
      }

      const accountName = lookupResult.data.accountName;
      log.info({ transaction_id, accountName }, 'Recipient account verified. Proceeding with transfer.');

      // Execute transfer
      let transferResult;
      try {
        transferResult = await deps.nomba.transferToBank({
          amount: amountNaira,
          accountNumber: recipient_account,
          bankCode: recipient_bank_code,
          narration: `ICE refund for transaction ${transaction_id}`,
        });
      } catch (err: unknown) {
        throw new AppError('NOMBA_TRANSFER_FAILED', 'Failed to execute transfer');
      }

      // Update DB
      await deps.refunds.update(transaction_id, {
        status: 'COMPLETED',
        nomba_transfer_ref: transferResult.data.id,
      });

      // Notify merchant
      await deps.webhookDeliveryQueue.add('webhook-delivery', {
        merchant_id,
        event_type: 'payment.overpayment.refunded',
        payload: { transaction_id, amount_kobo },
      });

      log.info({ transaction_id, transfer_id: transferResult.data.id }, 'Refund completed successfully');
    },
    { connection: redis }
  );

  worker.on('failed', async (job: Job | undefined, err: Error) => {
    log.error({ err, jobId: job?.id }, 'Refund job failed');
    if (job && job.data && job.data.transaction_id) {
       await deps.refunds.update(job.data.transaction_id, { status: 'FAILED' }).catch(() => {});
    }
  });

  return worker;
}
