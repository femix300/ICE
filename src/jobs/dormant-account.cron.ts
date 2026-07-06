/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-non-null-assertion */
import { createLogger } from '../lib/logger.js';

const log = createLogger('dormant-account-cron');

class AppError extends Error {
  constructor(
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export interface VendorAccountRepoStub {
  findDormantAccounts: (thresholdDays: number) => Promise<DormantAccount[]>;
  suspendAccount: (vaId: string) => Promise<void>;
}

export interface DormantAccount {
  id: string;
  vendor_id: string;
  merchant_id: string;
  nomba_account_id: string;
  last_payment_at: string | null;
}

export interface NombaClientStub {
  deleteVirtualAccount: (accountId: string) => Promise<void>;
}

export interface WebhookDeliveryQueueStub {
  add: (name: string, data: unknown) => Promise<unknown>;
}

export function createDormantAccountCron(deps: {
  repo: VendorAccountRepoStub;
  nomba: NombaClientStub;
  webhookDeliveryQueue: WebhookDeliveryQueueStub;
  dormantThresholdDays?: number;
}) {
  const THRESHOLD_DAYS = deps.dormantThresholdDays ?? 90;

  const run = async () => {
    // Gate: exit immediately if scheduler is disabled
    if (process.env.SCHEDULER_ENABLED !== 'true') {
      log.info('Dormant account cron skipped: SCHEDULER_ENABLED is not true');
      return;
    }

    log.info({ thresholdDays: THRESHOLD_DAYS }, 'Dormant account cron started');

    const dormantAccounts = await deps.repo.findDormantAccounts(THRESHOLD_DAYS);

    if (dormantAccounts.length === 0) {
      log.info('No dormant accounts found');
      return;
    }

    // Track per-merchant suspensions for the summary report
    const merchantSuspensions = new Map<string, { merchant_id: string; suspended_vas: string[] }>();
    // Deduplicate: track suspended VA IDs in this run
    const suspendedInThisRun = new Set<string>();

    for (const account of dormantAccounts) {
      // Deduplication guard: skip if already processed in this cron run
      if (suspendedInThisRun.has(account.id)) {
        continue;
      }

      try {
        // Call Nomba to delete the VA
        try {
          await deps.nomba.deleteVirtualAccount(account.nomba_account_id);
        } catch (err: unknown) {
          throw new AppError('NOMBA_DELETE_FAILED', 'Failed to delete virtual account on Nomba');
        }

        // Mark as suspended in DB
        await deps.repo.suspendAccount(account.id);

        // Notify merchant of individual suspension
        await deps.webhookDeliveryQueue.add('webhook-delivery', {
          merchant_id: account.merchant_id,
          event_type: 'system.va_suspended',
          payload: {
            vendor_id: account.vendor_id,
            nomba_account_id: account.nomba_account_id,
            reason: 'dormant_90_days',
          },
        });

        suspendedInThisRun.add(account.id);

        // Accumulate for summary
        if (!merchantSuspensions.has(account.merchant_id)) {
          merchantSuspensions.set(account.merchant_id, {
            merchant_id: account.merchant_id,
            suspended_vas: [],
          });
        }
        merchantSuspensions.get(account.merchant_id)!.suspended_vas.push(account.id);

        log.info({ vaId: account.id, vendorId: account.vendor_id }, 'Virtual account suspended');
      } catch (err: unknown) {
        log.error({ err, vaId: account.id }, 'Failed to suspend virtual account');
      }
    }

    // Send per-merchant summary report
    for (const [, summary] of merchantSuspensions) {
      await deps.webhookDeliveryQueue.add('webhook-delivery', {
        merchant_id: summary.merchant_id,
        event_type: 'system.dormant_account_summary',
        payload: {
          suspended_count: summary.suspended_vas.length,
          suspended_vas: summary.suspended_vas,
        },
      });
    }

    log.info({ suspendedCount: suspendedInThisRun.size }, 'Dormant account cron completed');
  };

  // Schedule at 02:00 daily
  const schedule = () => {
    const now = new Date();
    const nextRun = new Date();
    nextRun.setHours(2, 0, 0, 0);

    // If 02:00 has already passed today, schedule for tomorrow
    if (nextRun <= now) {
      nextRun.setDate(nextRun.getDate() + 1);
    }

    const msUntilNextRun = nextRun.getTime() - now.getTime();

    setTimeout(() => {
      run().catch((err: unknown) => log.error({ err }, 'Dormant account cron unhandled error'));
      // Repeat every 24 hours after the first run
      setInterval(
        () => {
          run().catch((err: unknown) => log.error({ err }, 'Dormant account cron unhandled error'));
        },
        24 * 60 * 60 * 1000,
      );
    }, msUntilNextRun);

    log.info({ nextRunAt: nextRun.toISOString() }, 'Dormant account cron scheduled');
  };

  return { run, schedule };
}
