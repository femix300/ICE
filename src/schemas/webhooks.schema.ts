import { z } from 'zod';

export const NombaEventType = {
  PAYMENT_SUCCESS: 'payment_success',
  PAYMENT_FAILED: 'payment_failed',
  PAYMENT_REVERSAL: 'payment_reversal',
} as const;

export type NombaEventType = (typeof NombaEventType)[keyof typeof NombaEventType];

export const nombaWebhookPayload = z.object({
  event: z.enum([
    NombaEventType.PAYMENT_SUCCESS,
    NombaEventType.PAYMENT_FAILED,
    NombaEventType.PAYMENT_REVERSAL,
  ]),
  data: z.object({
    transactionId: z.string().min(1),
    amount: z.number().positive(), // Nomba sends in Naira; converted to Kobo at storage
    accountNumber: z.string().min(1),
    senderName: z.string().min(1),
    senderAccountNumber: z.string().min(1),
    senderBankCode: z.string().min(1),
    status: z.string().min(1),
    currency: z.string().default('NGN'),
    timeCreated: z.string().optional(),
    paymentReference: z.string().optional(),
  }),
});

export type NombaWebhookPayload = z.infer<typeof nombaWebhookPayload>;
