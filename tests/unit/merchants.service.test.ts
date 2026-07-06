import { describe, it, expect, vi } from 'vitest';
import { createMerchantsService } from '../../src/services/merchants.service.js';
import type { MerchantsRepo, MerchantRow } from '../../src/repositories/merchants.repo.js';

describe('merchants.service', () => {
  it('should register a new merchant and return api_key', async () => {
    const fakeMerchants: MerchantsRepo = {
      create: vi.fn().mockImplementation(async (data) => ({
        id: data.id,
        business_name: data.business_name,
        email: data.email,
        api_key_hash: data.api_key_hash,
        api_key_prefix: data.api_key_prefix,
        webhook_url: data.webhook_url,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date()
      })),
      byId: vi.fn(),
      byEmail: vi.fn().mockResolvedValue(null),
      findByKeyPrefix: vi.fn(),
      updateWebhookUrl: vi.fn(),
      updateApiKey: vi.fn(),
    };

    const service = createMerchantsService({ merchants: fakeMerchants });

    const result = await service.register({
      businessName: 'Test Business',
      email: 'test@example.com',
      webhookUrl: 'https://example.com/webhook',
    });

    expect(result).toHaveProperty('api_key');
    expect(result.api_key.startsWith('ice_')).toBe(true);
    expect(result.merchant.business_name).toBe('Test Business');
    expect(result.merchant.email).toBe('test@example.com');
    expect(result.merchant.webhook_url).toBe('https://example.com/webhook');
    expect(result.merchant).not.toHaveProperty('api_key_hash');
    expect(result.merchant).not.toHaveProperty('api_key_prefix');
    expect(fakeMerchants.create).toHaveBeenCalledOnce();
    expect(fakeMerchants.byEmail).toHaveBeenCalledWith('test@example.com');
  });

  it('should throw 409 if email already exists', async () => {
    const fakeMerchants: MerchantsRepo = {
      create: vi.fn(),
      byId: vi.fn(),
      byEmail: vi.fn().mockResolvedValue({ id: 'existing' } as MerchantRow),
      findByKeyPrefix: vi.fn(),
      updateWebhookUrl: vi.fn(),
      updateApiKey: vi.fn(),
    };

    const service = createMerchantsService({ merchants: fakeMerchants });

    await expect(service.register({
      businessName: 'Test Business',
      email: 'test@example.com',
      webhookUrl: 'https://example.com/webhook',
    })).rejects.toThrow('Email already in use');
  });

  it('should retrieve a merchant by ID without sensitive fields', async () => {
    const fakeMerchants: MerchantsRepo = {
      create: vi.fn(),
      byId: vi.fn().mockResolvedValue({
        id: 'some-id',
        business_name: 'Test',
        email: 'test@example.com',
        api_key_hash: 'hash',
        api_key_prefix: 'prefix',
      } as MerchantRow),
      byEmail: vi.fn(),
      findByKeyPrefix: vi.fn(),
      updateWebhookUrl: vi.fn(),
      updateApiKey: vi.fn(),
    };

    const service = createMerchantsService({ merchants: fakeMerchants });

    const result = await service.getById('some-id');
    expect(result.id).toBe('some-id');
    expect(result.business_name).toBe('Test');
    expect(result.email).toBe('test@example.com');
    expect(result).not.toHaveProperty('api_key_hash');
    expect(result).not.toHaveProperty('api_key_prefix');
    expect(fakeMerchants.byId).toHaveBeenCalledWith('some-id');
  });

  it('should throw an error if merchant not found', async () => {
    const fakeMerchants: MerchantsRepo = {
      create: vi.fn(),
      byId: vi.fn().mockResolvedValue(null),
      byEmail: vi.fn(),
      findByKeyPrefix: vi.fn(),
      updateWebhookUrl: vi.fn(),
      updateApiKey: vi.fn(),
    };

    const service = createMerchantsService({ merchants: fakeMerchants });

    await expect(service.getById('unknown')).rejects.toThrow('Merchant not found');
  });

  it('should update merchant webhook url', async () => {
    const fakeMerchants: MerchantsRepo = {
      create: vi.fn(),
      byId: vi.fn().mockResolvedValue({ id: 'some-id' } as MerchantRow),
      byEmail: vi.fn(),
      findByKeyPrefix: vi.fn(),
      updateWebhookUrl: vi.fn().mockResolvedValue({
        id: 'some-id',
        business_name: 'Test',
        email: 'test@example.com',
        webhook_url: 'https://new.example.com/webhook',
        api_key_hash: 'hash',
        api_key_prefix: 'prefix',
      } as MerchantRow),
      updateApiKey: vi.fn(),
    };

    const service = createMerchantsService({ merchants: fakeMerchants });

    const result = await service.updateWebhookUrl('some-id', 'https://new.example.com/webhook');
    expect(result.webhook_url).toBe('https://new.example.com/webhook');
    expect(result).not.toHaveProperty('api_key_hash');
    expect(result).not.toHaveProperty('api_key_prefix');
    expect(fakeMerchants.updateWebhookUrl).toHaveBeenCalledWith('some-id', 'https://new.example.com/webhook');
  });

  it('should throw an error if updating webhook url for unknown merchant', async () => {
    const fakeMerchants: MerchantsRepo = {
      create: vi.fn(),
      byId: vi.fn().mockResolvedValue(null),
      byEmail: vi.fn(),
      findByKeyPrefix: vi.fn(),
      updateWebhookUrl: vi.fn(),
      updateApiKey: vi.fn(),
    };

    const service = createMerchantsService({ merchants: fakeMerchants });

    await expect(service.updateWebhookUrl('unknown', 'https://example.com')).rejects.toThrow('Merchant not found');
  });

  it('should rotate API key for a merchant', async () => {
    const fakeMerchants: MerchantsRepo = {
      create: vi.fn(),
      byId: vi.fn().mockResolvedValue({ id: 'some-id' } as MerchantRow),
      byEmail: vi.fn(),
      findByKeyPrefix: vi.fn(),
      updateWebhookUrl: vi.fn(),
      updateApiKey: vi.fn().mockResolvedValue({ id: 'some-id' } as MerchantRow),
    };

    const service = createMerchantsService({ merchants: fakeMerchants });

    const result = await service.rotateApiKey('some-id');
    expect(result).toHaveProperty('api_key');
    expect(result.api_key.startsWith('ice_')).toBe(true);
    expect(fakeMerchants.updateApiKey).toHaveBeenCalledWith('some-id', expect.any(String), expect.any(String));
  });

  it('should throw an error if rotating api key for unknown merchant', async () => {
    const fakeMerchants: MerchantsRepo = {
      create: vi.fn(),
      byId: vi.fn().mockResolvedValue(null),
      byEmail: vi.fn(),
      findByKeyPrefix: vi.fn(),
      updateWebhookUrl: vi.fn(),
      updateApiKey: vi.fn(),
    };

    const service = createMerchantsService({ merchants: fakeMerchants });

    await expect(service.rotateApiKey('unknown')).rejects.toThrow('Merchant not found');
  });
});
