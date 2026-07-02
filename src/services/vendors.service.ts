import crypto from 'node:crypto';
import { z } from 'zod';
import type { VendorsRepo } from '../repositories/vendors.repo.js';
import type { NombaClient } from '../lib/nomba.js';
import type { CreateVendorInput } from '../schemas/vendors.schema.js';
import { AppError } from '../lib/errors.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('vendors-service');

export function createVendorsService(deps: { vendors: VendorsRepo; nomba: NombaClient }) {
  return {
    createVendor: async (merchantId: string, data: CreateVendorInput) => {
      const existing = await deps.vendors.byNameAndMerchant(data.name, merchantId);
      if (existing) {
        throw new AppError(409, 'VENDOR_EXISTS', 'Vendor name already exists for this merchant');
      }

      const id = crypto.randomUUID();
      let vendor = await deps.vendors.create({
        id,
        merchant_id: merchantId,
        name: data.name,
        va_status: 'active',
      });

      try {
        const nombaRes = await deps.nomba.createVirtualAccount({
          accountRef: `${merchantId}_${id}`,
          accountName: data.name,
        });

        const nombaSchema = z.object({
          data: z.object({
            accountNumber: z.string(),
            bankName: z.string().optional(),
          }),
        });

        const parsed = nombaSchema.safeParse(nombaRes);
        if (!parsed.success) {
          throw new AppError(502, 'NOMBA_ERROR', 'Invalid response format from Nomba');
        }

        const { accountNumber, bankName } = parsed.data.data;
        vendor = await deps.vendors.updateVa(id, accountNumber, bankName ?? 'Nombank');
      } catch (err) {
        log.error({ err, id, merchantId }, 'Nomba VA provisioning failed, rolling back vendor');
        await deps.vendors.delete(id);
        throw err;
      }

      const { api_key_hash, api_key_prefix, ...safeVendor } = vendor;
      return safeVendor;
    },

    getVendor: async (id: string) => {
      const vendor = await deps.vendors.byId(id);
      if (!vendor) {
        throw new AppError(404, 'VENDOR_NOT_FOUND', 'Vendor not found');
      }
      const { api_key_hash, api_key_prefix, ...safeVendor } = vendor;
      return safeVendor;
    },
  };
}
