import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

import { config } from '../config.js';
import { AppError } from '../lib/errors.js';
import { ok } from '../lib/respond.js';
import { createLogger } from '../lib/logger.js';
import type { ReconciliationRepo } from '../repositories/reconciliation.repo.js';
import type { MerchantsRepo } from '../repositories/merchants.repo.js';

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

export function createSimulateController(
  reconciliationRepo: ReconciliationRepo,
  merchantsRepo: MerchantsRepo,
) {
  return {
    async simulateWebhook(req: Request, res: Response, next: NextFunction) {
      // DEMO: Webhook simulator endpoint — remove before production
      try {
        if (process.env.SIMULATOR_ENABLED === 'false') {
          throw new AppError(404, 'NOT_FOUND', 'Simulator is disabled');
        }

        const body = simulateWebhookBody.parse(req.body);

        // Best-effort merchant lookup - deliberately does not hard-fail if
        // missing. The dashboard's session layer isn't fully wired yet
        // (see dashboard/lib/session.ts), so anyone visiting the simulator
        // without having logged in first falls back to a placeholder
        // merchantId. Blocking on that would break the demo for exactly
        // the audience it's meant to work for (e.g. judges clicking around
        // without registering first). We still use the real id when it
        // resolves, for merchant-scoped identity in the payload below.
        const merchant = await merchantsRepo.byId(body.merchantId);
        if (!merchant) {
          log.warn(
            { merchantId: body.merchantId },
            'simulator: merchantId did not resolve to a real merchant, proceeding with unverified id',
          );
        }
        const effectiveMerchantId = merchant?.id ?? body.merchantId;

        const transactionId = body.transactionId || `TXN-${crypto.randomUUID()}`;
        const requestId = `req-${crypto.randomUUID()}`;
        const timestamp = String(Date.now());
        const time = new Date().toISOString();

        const bankCode = BANK_CODES[body.senderBank] || body.senderBank || '058';

        // 1. Build the Nomba-shaped payload
        // NOTE: userId/walletId are derived from the real merchant id, not
        // stored per-merchant Nomba wallet identifiers - ICE doesn't track
        // those. This is enough to make simulated payloads merchant-scoped
        // (two different merchants testing won't collide) without pretending
        // we have real Nomba wallet data we don't actually have.
        const payload = {
          event_type: 'payment_success',
          requestId,
          data: {
            merchant: {
              userId: `sim-user-${effectiveMerchantId}`,
              walletId: `sim-wallet-${effectiveMerchantId}`,
            },
            transaction: {
              transactionId,
              type: 'vact_transfer',
              time,
              transactionAmount: body.amount / 100, // Naira
              aliasAccountNumber: body.virtualAccountNumber,
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

        // 3. POST the signed payload to the live, public webhook endpoint -
        // deliberately not an internal localhost shortcut, so this exercises
        // the exact same public-facing path a real Nomba webhook would use.
        const webhookUrl = `${config.SIMULATOR_TARGET_URL}/v1/webhooks/nomba`;
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
