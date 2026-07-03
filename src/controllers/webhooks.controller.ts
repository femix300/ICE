import type { Request, Response, NextFunction } from 'express';

import { nombaWebhookPayload } from '../schemas/webhooks.schema.js';
import type { WebhookInboundService } from '../services/webhook-inbound.service.js';
import { AppError } from '../lib/errors.js';
import { ok } from '../lib/respond.js';

export function createWebhooksController(service: WebhookInboundService) {
  return {
    async receiveNombaWebhook(req: Request, res: Response, next: NextFunction) {
      try {
        const signature = req.headers['x-nomba-signature'];
        if (typeof signature !== 'string') {
          throw new AppError(401, 'UNAUTHORIZED', 'Missing x-nomba-signature header');
        }

        let rawBody = (req as Request & { rawBody?: unknown }).rawBody;
        if (!rawBody && typeof req.body === 'string') {
          rawBody = req.body;
        }

        if (typeof rawBody !== 'string') {
          throw new AppError(400, 'BAD_REQUEST', 'Request body must be raw text available');
        }

        const parsed = nombaWebhookPayload.safeParse(JSON.parse(rawBody));
        if (!parsed.success) {
          throw new AppError(400, 'VALIDATION_ERROR', 'Invalid webhook payload');
        }

        const result = await service.processWebhook(rawBody, signature, parsed.data);

        return ok(res, {
          received: true,
          duplicate: result.duplicate,
          transactionId: result.transactionId,
        });
      } catch (err) {
        next(err);
      }
    },
  };
}

export type WebhooksController = ReturnType<typeof createWebhooksController>;
