import { z } from 'zod';

export const misdirectedIdParamSchema = z.object({
  id: z.string().min(1),
});

export const matchPaymentBodySchema = z.object({
  invoiceId: z.string().min(1),
});
