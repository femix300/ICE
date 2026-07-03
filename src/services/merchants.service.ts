import crypto from 'node:crypto';
import type { MerchantsRepo, MerchantRow } from '../repositories/merchants.repo.js';
import type { RegisterMerchantInput } from '../schemas/merchants.schema.js';
import { generate, hash } from '../lib/api-key.js';
import { AppError } from '../lib/errors.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('merchants-service');

export type MerchantProfile = Omit<MerchantRow, 'api_key_hash' | 'api_key_prefix'>;

export interface MerchantsService {
  register(data: RegisterMerchantInput): Promise<{ merchant: MerchantProfile; api_key: string }>;
  getById(id: string): Promise<MerchantProfile>;
}

export function createMerchantsService(deps: { merchants: MerchantsRepo }): MerchantsService {
  return {
    register: async (data: RegisterMerchantInput) => {
      const existing = await deps.merchants.byEmail(data.email);
      if (existing) {
        throw new AppError(409, 'EMAIL_IN_USE', 'Email already in use');
      }

      const rawKey = generate();
      const hashedKey = await hash(rawKey);
      const prefix = rawKey.slice(0, 8);
      const id = crypto.randomUUID();

      const row = await deps.merchants.create({
        id,
        business_name: data.businessName,
        email: data.email,
        api_key_hash: hashedKey,
        api_key_prefix: prefix,
        webhook_url: data.webhookUrl,
      });

      log.info({ merchantId: id, businessName: data.businessName }, 'Merchant registered successfully');

      const { api_key_hash: _hash, api_key_prefix: _prefix, ...merchant } = row;
      return { merchant, api_key: rawKey };
    },
    getById: async (id: string) => {
      const row = await deps.merchants.byId(id);
      if (!row) {
        throw new AppError(404, 'MERCHANT_NOT_FOUND', 'Merchant not found');
      }
      const { api_key_hash: _hash, api_key_prefix: _prefix, ...merchant } = row;
      return merchant;
    },
  };
}
