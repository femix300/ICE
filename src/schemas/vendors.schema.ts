import { z } from 'zod';

export const createVendorBody = z.object({
  name: z.string().min(2).max(100),
});

export type CreateVendorInput = z.infer<typeof createVendorBody>;

export const vendorIdParam = z.object({
  id: z.string().uuid(),
});

export type VendorIdParam = z.infer<typeof vendorIdParam>;

export const listVendorsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['pending', 'active', 'suspended']).optional(),
});

export type ListVendorsQuery = z.infer<typeof listVendorsQuery>;

export const updateVendorAccountBody = z.object({
  name: z.string().min(2).max(100).optional(),
  callbackUrl: z.string().url().startsWith('https://').optional(),
});

export type UpdateVendorAccountInput = z.infer<typeof updateVendorAccountBody>;
