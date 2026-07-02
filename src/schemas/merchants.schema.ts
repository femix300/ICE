import { z } from 'zod';

export const registerMerchantBody = z.object({
  businessName: z.string().min(2).max(100),
  email: z.string().email(),
  webhookUrl: z.string().url().startsWith('https://'),
});

export type RegisterMerchantInput = z.infer<typeof registerMerchantBody>;

export const updateWebhookUrlBody = z.object({
  webhookUrl: z.string().url().startsWith('https://'),
});

export type UpdateWebhookUrlInput = z.infer<typeof updateWebhookUrlBody>;

export const idParam = z.object({
  id: z.string().uuid(),
});

export type IdParam = z.infer<typeof idParam>;
