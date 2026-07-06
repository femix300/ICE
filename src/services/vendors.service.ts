import crypto from 'node:crypto';
import { z } from 'zod';
import type { VendorsRepo } from '../repositories/vendors.repo.js';
import type { NombaClient } from '../lib/nomba.js';
import type { CreateVendorInput } from '../schemas/vendors.schema.js';
import { AppError } from '../lib/errors.js';
import { createLogger } from '../lib/logger.js';
import { generate, hash } from '../lib/api-key.js';

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

      const { api_key_hash: _hash, api_key_prefix: _prefix, ...safeVendor } = vendor;
      return safeVendor;
    },

    getVendor: async (id: string) => {
      const vendor = await deps.vendors.byId(id);
      if (!vendor) {
        throw new AppError(404, 'VENDOR_NOT_FOUND', 'Vendor not found');
      }
      const { api_key_hash: _hash, api_key_prefix: _prefix, ...safeVendor } = vendor;
      return safeVendor;
    },

    generateApiKey: async (id: string, merchantId: string) => {
      const vendor = await deps.vendors.byId(id);
      if (!vendor || vendor.merchant_id !== merchantId) {
        throw new AppError(404, 'VENDOR_NOT_FOUND', 'Vendor not found');
      }

      const rawKey = generate();
      const prefix = rawKey.substring(0, 12);
      const hashedKey = await hash(rawKey);

      await deps.vendors.updateApiKey(id, hashedKey, prefix);

      return {
        api_key: rawKey,
        message: 'Please store this key securely. It will not be shown again.',
      };
    },

    suspendAccount: async (id: string, merchantId: string) => {
      const vendor = await deps.vendors.byId(id);
      if (!vendor || vendor.merchant_id !== merchantId) {
        throw new AppError(404, 'VENDOR_NOT_FOUND', 'Vendor not found');
      }

      if (vendor.va_status === 'suspended') {
        throw new AppError(400, 'BAD_REQUEST', 'Vendor account is already suspended');
      }

      try {
        await deps.nomba.deleteVirtualAccount(`${vendor.merchant_id}_${vendor.id}`);
      } catch (err) {
        log.error({ err, id, merchantId }, 'Failed to suspend Nomba virtual account');
        throw new AppError(502, 'NOMBA_ERROR', 'Failed to suspend virtual account via Nomba');
      }

      const updated = await deps.vendors.updateStatus(id, 'suspended');
      const { api_key_hash: _hash, api_key_prefix: _prefix, ...safeVendor } = updated;
      return safeVendor;
    },

    listVendors: async (merchantId: string, page: number, pageSize: number, status?: string) => {
      const offset = (page - 1) * pageSize;
      const { data, total } = await deps.vendors.list(merchantId, pageSize, offset, status);

      const safeData = data.map((v) => {
        const { api_key_hash: _hash, api_key_prefix: _prefix, ...safeVendor } = v;
        return safeVendor;
      });

      return {
        data: safeData,
        meta: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    },

    updateAccount: async (
      id: string,
      merchantId: string,
      data: { name?: string; callbackUrl?: string },
    ) => {
      const vendor = await deps.vendors.byId(id);
      if (!vendor || vendor.merchant_id !== merchantId) {
        throw new AppError(404, 'VENDOR_NOT_FOUND', 'Vendor not found');
      }

      if (data.name) {
        try {
          await deps.nomba.updateVirtualAccount(`${vendor.merchant_id}_${vendor.id}`, {
            accountName: data.name,
          });
        } catch (err) {
          log.error({ err, id, merchantId }, 'Failed to update Nomba virtual account');
          throw new AppError(502, 'NOMBA_ERROR', 'Failed to update virtual account via Nomba');
        }
      }

      const updated = await deps.vendors.updateAccount(id, data.name, data.callbackUrl);
      const { api_key_hash: _hash, api_key_prefix: _prefix, ...safeVendor } = updated;
      return safeVendor;
    },
  };
}
