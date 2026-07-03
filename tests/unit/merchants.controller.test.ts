import { describe, it, expect, vi, type Mock } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { createMerchantsController } from '../../src/controllers/merchants.controller.js';
import { AppError } from '../../src/lib/errors.js';
import type { MerchantsService } from '../../src/services/merchants.service.js';

describe('Merchants Controller', () => {
  it('updateWebhookUrl throws INVALID_WEBHOOK_URL if URL is not HTTPS', async () => {
    const mockService = {
      register: vi.fn(),
      getById: vi.fn(),
      updateWebhookUrl: vi.fn(),
      rotateApiKey: vi.fn(),
    };

    const controller = createMerchantsController(mockService as unknown as MerchantsService);

    const validId = '123e4567-e89b-12d3-a456-426614174000';
    const req = {
      params: { id: validId },
      body: { webhookUrl: 'http://example.com/webhook' },
      principal: { tier: 'merchant', id: validId },
    } as unknown as Request;

    const res = {} as Response;
    const next = vi.fn() as NextFunction;

    await controller.updateWebhookUrl(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const err = (next as Mock).mock.calls[0][0];
    expect(err.errorCode).toBe('INVALID_WEBHOOK_URL');
    expect(err.status).toBe(400);
    expect(err.message).toBe('Webhook URL must be HTTPS');
    expect(mockService.updateWebhookUrl).not.toHaveBeenCalled();
  });
});
