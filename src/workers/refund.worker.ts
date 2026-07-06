/* eslint-disable @typescript-eslint/no-explicit-any */
import { Worker, type Job, type Queue } from 'bullmq';
import { z } from 'zod';
import { redis } from '../lib/redis.js';
import { createLogger } from '../lib/logger.js';
import { AppError } from '../lib/errors.js';
import type { NombaClient } from '../lib/nomba.js';
import type { RefundsRepo } from '../repositories/refunds.repo.js';
import type { createMerchantsRepo } from '../repositories/merchants.repo.js';

const log = createLogger('refund-worker');

export const RefundPayloadSchema = z.object({
  transaction_id: z.string(),
  merchant_id: z.string(),
  amount_kobo: z.number().int().positive(),
  recipient_account: z.string(),
  recipient_bank_code: z.string(),
});

export type RefundPayload = z.infer<typeof RefundPayloadSchema>;

const transferResponseSchema = z.object({
  data: z.object({
    id: z.string(),
    status: z.string(),
  }),
});

export function createRefundWorker(deps: {
  nomba: NombaClient;
  refunds: RefundsRepo;
  merchants: ReturnType<typeof createMerchantsRepo>;
  webhookDeliveryQueue: Queue;
}) {
  const worker = new Worker(
    'refund',
    async (job: Job<RefundPayload>) => {
      const parsed = RefundPayloadSchema.safeParse(job.data);
      if (!parsed.success) {
        throw new AppError(400, 'VALIDATION_ERROR', 'Invalid refund payload');
      }

      const { transaction_id, merchant_id, amount_kobo, recipient_account, recipient_bank_code } =
        parsed.data;

      const merchant = await deps.merchants.byId(merchant_id);
      if (!merchant) {
        throw new AppError(404, 'NOT_FOUND', `Merchant ${merchant_id} not found for refund`);
      }

      let transferResult: unknown;
      try {
        transferResult = await deps.nomba.transferToBank({
          amount: amount_kobo,
          accountNumber: recipient_account,
          bankCode: recipient_bank_code,
          merchantTxRef: transaction_id,
          senderName: merchant.business_name,
          narration: `ICE refund for transaction ${transaction_id}`,
        });
      } catch (err: unknown) {
        await deps.refunds.update(transaction_id, { status: 'FAILED' });
        if (err instanceof AppError) throw err;
        throw new AppError(502, 'NOMBA_ERROR', 'Failed to execute Nomba transfer');
      }

      const parsedTransfer = transferResponseSchema.safeParse(transferResult);
      if (!parsedTransfer.success) {
        await deps.refunds.update(transaction_id, { status: 'FAILED' });
        throw new AppError(502, 'NOMBA_ERROR', 'Unexpected response shape from Nomba transfer');
      }

      const transferRef = parsedTransfer.data.data.id;
      await deps.refunds.update(transaction_id, {
        status: 'COMPLETED',
        nomba_transfer_ref: transferRef,
      });

      await deps.webhookDeliveryQueue.add('webhook-delivery', {
        merchant_id,
        event_type: 'payment.overpayment.refunded',
        payload: { transaction_id, amount_kobo },
      });
    },
    { connection: redis as any },
  );

  worker.on('failed', (job: Job<RefundPayload> | undefined, err: Error) => {
    log.error({ err, jobId: job?.id }, 'refund job failed');
  });

  return worker;
}
