import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createDormantAccountCron } from '../../src/jobs/dormant-account.cron.ts';

describe('dormantAccountCron', () => {
  let mockRepo: any;
  let mockNomba: any;
  let mockQueue: any;
  let cron: any;
  let originalEnv: any;

  beforeEach(() => {
    originalEnv = process.env;
    process.env = { ...originalEnv, SCHEDULER_ENABLED: 'true' };

    mockRepo = {
      findDormantAccounts: vi.fn().mockResolvedValue([]),
      suspendAccount: vi.fn().mockResolvedValue(undefined),
    };
    mockNomba = {
      deleteVirtualAccount: vi.fn().mockResolvedValue(undefined),
    };
    mockQueue = {
      add: vi.fn().mockResolvedValue(undefined),
    };

    cron = createDormantAccountCron({
      repo: mockRepo,
      nomba: mockNomba,
      webhookDeliveryQueue: mockQueue,
      dormantThresholdDays: 90
    });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('exits if SCHEDULER_ENABLED is not true', async () => {
    process.env.SCHEDULER_ENABLED = 'false';
    await cron.run();
    expect(mockRepo.findDormantAccounts).not.toHaveBeenCalled();
  });

  it('does nothing if no dormant accounts found', async () => {
    await cron.run();
    expect(mockRepo.suspendAccount).not.toHaveBeenCalled();
  });

  it('suspends accounts and enqueues webhooks', async () => {
    mockRepo.findDormantAccounts.mockResolvedValue([
      { id: 'va-1', vendor_id: 'v-1', merchant_id: 'm-1', nomba_account_id: 'n-1' },
      { id: 'va-2', vendor_id: 'v-2', merchant_id: 'm-1', nomba_account_id: 'n-2' }
    ]);

    await cron.run();

    expect(mockNomba.deleteVirtualAccount).toHaveBeenCalledTimes(2);
    expect(mockRepo.suspendAccount).toHaveBeenCalledTimes(2);
    expect(mockQueue.add).toHaveBeenCalledTimes(3); // 2 individual + 1 summary
  });

  it('catches and logs errors without crashing loop', async () => {
    mockRepo.findDormantAccounts.mockResolvedValue([
      { id: 'va-1', vendor_id: 'v-1', merchant_id: 'm-1', nomba_account_id: 'n-1' },
      { id: 'va-2', vendor_id: 'v-2', merchant_id: 'm-1', nomba_account_id: 'n-2' }
    ]);
    mockNomba.deleteVirtualAccount.mockRejectedValueOnce(new Error('nomba error'));

    await cron.run();

    // The first one fails, the second one should still succeed
    expect(mockRepo.suspendAccount).toHaveBeenCalledTimes(1);
    expect(mockQueue.add).toHaveBeenCalledTimes(2); // 1 individual + 1 summary
  });
});
