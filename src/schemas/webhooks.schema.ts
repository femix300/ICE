import { z } from 'zod';

export const NombaEventType = {
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',
  PAYMENT_REVERSAL: 'payment_reversal',
} as const;

export type NombaEventType = (typeof NombaEventType)[keyof typeof NombaEventType];

// NOTE: merchant/transaction required fields below are confirmed from Nomba's
// signature spec. Other transaction fields (amount, accountNumber, etc.) are
// unconfirmed guesses until we capture a real payload — see raw payload log
// in webhook-inbound.service.ts. Using passthrough() so unknown fields don't
// cause validation to reject the payload.
export const nombaWebhookPayload = z
  .object({
    event_type: z.enum([
      NombaEventType.PAYMENT_SUCCESS,
      NombaEventType.PAYMENT_FAILED,
      NombaEventType.PAYMENT_REVERSAL,
    ]),
    requestId: z.string().min(1),
    data: z
      .object({
        merchant: z
          .object({
            userId: z.string().min(1),
            walletId: z.string().min(1),
          })
          .passthrough(),
        transaction: z
          .object({
            transactionId: z.string().min(1),
            type: z.string().min(1),
            time: z.string().min(1),
            responseCode: z.string().optional(),
          })
          .passthrough(),
      })
      .passthrough(),
  })
  .passthrough();

export type NombaWebhookPayload = z.infer<typeof nombaWebhookPayload>;
