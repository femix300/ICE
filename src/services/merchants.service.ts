import crypto from 'node:crypto';
import type { MerchantsRepo, MerchantRow } from '../repositories/merchants.repo.js';
import type {
  WebhookDeliveriesRepo,
  WebhookDeliveryRow,
} from '../repositories/webhook-deliveries.repo.js';
import type { RegisterMerchantInput } from '../schemas/merchants.schema.js';
import { generate, hash } from '../lib/api-key.js';
import { AppError } from '../lib/errors.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('merchants-service');

export type MerchantProfile = Omit<MerchantRow, 'api_key_hash' | 'api_key_prefix'>;

export interface MerchantsService {
  register(data: RegisterMerchantInput): Promise<{ merchant: MerchantProfile; api_key: string }>;
  getById(id: string): Promise<MerchantProfile>;
  updateWebhookUrl(id: string, webhookUrl: string): Promise<MerchantProfile>;
  rotateApiKey(id: string): Promise<{ api_key: string }>;
  listWebhookDeliveries(
    merchantId: string,
    limit?: number,
    offset?: number,
  ): Promise<WebhookDeliveryRow[]>;
}

export function createMerchantsService(deps: {
  merchants: MerchantsRepo;
  webhookDeliveries?: WebhookDeliveriesRepo;
}): MerchantsService {
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

      log.info(
        { merchantId: id, businessName: data.businessName },
        'Merchant registered successfully',
      );

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
    updateWebhookUrl: async (id: string, webhookUrl: string) => {
      const existing = await deps.merchants.byId(id);
      if (!existing) {
        throw new AppError(404, 'MERCHANT_NOT_FOUND', 'Merchant not found');
      }

      const row = await deps.merchants.updateWebhookUrl(id, webhookUrl);
      log.info({ merchantId: id, webhookUrl }, 'Merchant webhook URL updated');

      const { api_key_hash: _hash, api_key_prefix: _prefix, ...merchant } = row;
      return merchant;
    },
    rotateApiKey: async (id: string) => {
      const existing = await deps.merchants.byId(id);
      if (!existing) {
        throw new AppError(404, 'MERCHANT_NOT_FOUND', 'Merchant not found');
      }

      const rawKey = generate();
      const hashedKey = await hash(rawKey);
      const prefix = rawKey.slice(0, 8);

      await deps.merchants.updateApiKey(id, hashedKey, prefix);
      log.info({ merchantId: id }, 'Merchant API key rotated');

      return { api_key: rawKey };
    },

    listWebhookDeliveries: async (
      merchantId: string,
      limit = 20,
      offset = 0,
    ): Promise<WebhookDeliveryRow[]> => {
      if (!deps.webhookDeliveries) {
        throw new AppError(500, 'INTERNAL_ERROR', 'Webhook deliveries repository not injected');
      }
      return deps.webhookDeliveries.listByMerchantId(merchantId, limit, offset);
    },
  };
}
