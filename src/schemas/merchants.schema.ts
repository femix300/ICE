import { z } from 'zod';

export const registerMerchantBody = z.object({
  businessName: z.string().min(2).max(100),
  email: z.string().email(),
  webhookUrl: z.string().url().startsWith('https://'),
});

export type RegisterMerchantInput = z.infer<typeof registerMerchantBody>;

export const idParam = z.object({
  id: z.string().uuid(),
});

export type IdParam = z.infer<typeof idParam>;
