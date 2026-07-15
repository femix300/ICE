import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

import { config } from '../config.js';
import { AppError } from '../lib/errors.js';
import { ok } from '../lib/respond.js';
import { createLogger } from '../lib/logger.js';
import type { ReconciliationRepo } from '../repositories/reconciliation.repo.js';

const log = createLogger('simulate-controller');

const BANK_CODES: Record<string, string> = {
  'Zenith Bank': '057',
  'GTBank': '058',
  'Access Bank': '044',
  'First Bank': '011',
  'UBA': '033',
  'Stanbic IBTC': '219',
  'Fidelity Bank': '070',
  'Union Bank': '032',
};

const simulateWebhookBody = z.object({
  scenario: z.enum(['exact_match', 'misdirected', 'duplicate', 'overpaid', 'underpaid']),
  transactionId: z.string().optional(),
  amount: z.number().int().positive(), // in kobo
  senderName: z.string().min(1),
  senderAccount: z.string().min(1),
  senderBank: z.string().min(1),
  virtualAccountNumber: z.string().min(1),
  merchantId: z.string().min(1),
});

export function createSimulateController(reconciliationRepo: ReconciliationRepo) {
  return {
    async simulateWebhook(req: Request, res: Response, next: NextFunction) {
      // DEMO: Webhook simulator endpoint — remove before production
      try {
        const body = simulateWebhookBody.parse(req.body);
        const transactionId = body.transactionId || `TXN-${crypto.randomUUID()}`;
        const requestId = `req-${crypto.randomUUID()}`;
        const timestamp = String(Date.now());
        const time = new Date().toISOString();

        const bankCode = BANK_CODES[body.senderBank] || body.senderBank || '058';

        // 1. Build the Nomba-shaped payload
        const payload = {
          event_type: 'payment_success',
          requestId,
          data: {
            merchant: {
              userId: 'user-1',
              walletId: 'wallet-1',
            },
            transaction: {
              transactionId,
              type: 'credit',
              time,
              transactionAmount: body.amount / 100, // Naira
              aliasAccountNumber: body.virtualAccountNumber,
              currency: 'NGN',
              status: 'SUCCESS',
            },
            customer: {
              senderName: body.senderName,
              accountNumber: body.senderAccount,
              bankCode,
            },
          },
        };

        // 2. Sign it using HMAC-SHA256
        const signedString = [
          payload.event_type,
          payload.requestId,
          payload.data.merchant.userId,
          payload.data.merchant.walletId,
          payload.data.transaction.transactionId,
          payload.data.transaction.type,
          payload.data.transaction.time,
          '', // responseCode is empty
          timestamp,
        ].join(':');

        const signature = crypto
          .createHmac('sha256', config.NOMBA_WEBHOOK_SECRET)
          .update(signedString)
          .digest('base64');

        // 3. POST the signed payload to POST /v1/webhooks/nomba internally
        const webhookUrl = `http://localhost:${config.PORT}/v1/webhooks/nomba`;
        log.info({ transactionId, webhookUrl }, 'firing simulated webhook internally');

        try {
          const fetchRes = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'nomba-signature': signature,
              'nomba-timestamp': timestamp,
            },
            body: JSON.stringify(payload),
          });
          if (!fetchRes.ok) {
            const errText = await fetchRes.text();
            throw new Error(`Webhook receiver status ${fetchRes.status}: ${errText}`);
          }
          const responseJson = await fetchRes.json() as { ok: boolean; data?: { duplicate?: boolean } };
          
          // 4. Retrieve reconciliation result and build simulator response
          // Wait, if it was a duplicate, the webhook receiver logic will successfully return duplicate: true
          const isDuplicate = responseJson.data?.duplicate === true;
          
          if (isDuplicate || body.scenario === 'duplicate') {
            return ok(res, {
              success: true,
              scenario: body.scenario,
              transactionId,
              result: {
                matched: false,
                invoiceId: null,
                action: 'flagged_duplicate',
                message: 'Duplicate transaction detected; signature verified but transaction was previously processed.',
              },
            });
          }

          // Fetch reconciliation log from DB
          const reconLog = await reconciliationRepo.findByTransactionId(transactionId);
          if (!reconLog) {
            return ok(res, {
              success: true,
              scenario: body.scenario,
              transactionId,
              result: {
                matched: false,
                invoiceId: null,
                action: 'manual_review',
                message: 'Webhook payload received but no reconciliation log was found. Please check manual review.',
              },
            });
          }

          let matched = false;
          let action = 'manual_review';
          let message = 'Transaction flagged for manual review.';

          if (reconLog.status === 'EXACT_MATCH') {
            matched = true;
            action = 'reconciled';
            message = 'Payment matches an open invoice perfectly.';
          } else if (reconLog.status === 'UNMATCHED') {
            matched = false;
            action = 'misdirected';
            message = 'Payment landed on a virtual account that is not associated with an open invoice.';
          } else if (reconLog.status === 'OVERPAYMENT') {
            matched = true;
            action = 'manual_review';
            message = `Payment exceeds invoice amount. Overpaid by ₦${(reconLog.difference_kobo / 100).toFixed(2)}. Refund queued.`;
          } else if (reconLog.status === 'UNDERPAYMENT') {
            matched = true;
            action = 'manual_review';
            message = `Payment is below invoice amount. Partial payment recorded. Outstanding: ₦${(Math.abs(reconLog.difference_kobo) / 100).toFixed(2)}.`;
          }

          return ok(res, {
            success: true,
            scenario: body.scenario,
            transactionId,
            result: {
              matched,
              invoiceId: reconLog.invoice_id,
              action,
              message,
            },
          });
        } catch (err: unknown) {
          log.error({ err, transactionId }, 'failed to execute local webhook request');
          throw new AppError(500, 'SIMULATION_ERROR', err instanceof Error ? err.message : 'Simulation endpoint request failed');
        }
      } catch (err) {
        next(err);
      }
    },
  };
}
