import type { Request, Response, NextFunction } from 'express';
import { nombaWebhookPayload } from '../schemas/webhooks.schema.js';
import type { WebhookInboundService } from '../services/webhook-inbound.service.js';
import { AppError } from '../lib/errors.js';
import { ok } from '../lib/respond.js';
import { createLogger } from '../lib/logger.js';

const log = createLogger('webhook-inbound');

export function createWebhooksController(service: WebhookInboundService) {
  return {
    async receiveNombaWebhook(req: Request, res: Response, next: NextFunction) {
      try {
        const signature = req.headers['nomba-signature'];
        const timestamp = req.headers['nomba-timestamp'];
        if (typeof signature !== 'string') {
          throw new AppError(401, 'UNAUTHORIZED', 'Missing nomba-signature header');
        }
        if (typeof timestamp !== 'string') {
          throw new AppError(401, 'UNAUTHORIZED', 'Missing nomba-timestamp header');
        }

        let rawBody = (req as Request & { rawBody?: unknown }).rawBody;
        if (!rawBody && typeof req.body === 'string') {
          rawBody = req.body;
        }
        if (typeof rawBody !== 'string') {
          throw new AppError(400, 'BAD_REQUEST', 'Request body must be raw text available');
        }

        let rawJson: unknown;
        try {
          rawJson = JSON.parse(rawBody);
        } catch {
          throw new AppError(400, 'BAD_REQUEST', 'Malformed JSON body');
        }

        // TEMP: log the raw shape of the first real webhooks so we can confirm
        // exact field names beyond what the signature spec covers. Remove once verified.
        log.info({ rawJson }, 'raw webhook payload received (pre-verification)');

        const parsed = nombaWebhookPayload.safeParse(rawJson);
        if (!parsed.success) {
          log.warn({ issues: parsed.error.issues }, 'webhook payload failed schema validation');
          throw new AppError(400, 'VALIDATION_ERROR', 'Invalid webhook payload');
        }

        const result = await service.processWebhook(parsed.data, signature, timestamp);
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
