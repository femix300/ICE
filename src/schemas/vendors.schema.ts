import { z } from 'zod';

export const createVendorBody = z.object({
  name: z.string().min(2).max(100),
});

export type CreateVendorInput = z.infer<typeof createVendorBody>;

export const vendorIdParam = z.object({
  id: z.string().uuid(),
});

export type VendorIdParam = z.infer<typeof vendorIdParam>;
