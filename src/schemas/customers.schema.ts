import { z } from 'zod';

export const createCustomerBody = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  provisionDva: z.boolean().optional().default(false),
});

export type CreateCustomerInput = z.infer<typeof createCustomerBody>;

export const customerIdParam = z.object({
  id: z.string().uuid(),
  cid: z.string().uuid(),
});

export type CustomerIdParam = z.infer<typeof customerIdParam>;

export const vendorIdParam = z.object({
  id: z.string().uuid(),
});

export type VendorIdParam = z.infer<typeof vendorIdParam>;
