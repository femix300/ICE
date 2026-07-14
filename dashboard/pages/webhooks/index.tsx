import React, { useState, useEffect, useCallback, useRef } from 'react';
import Layout from '../../components/layout';
import WebhookDeliveryLog, {
  type WebhookDelivery,
} from '../../components/webhook-delivery-log';
import DeadLetterAlert from '../../components/dead-letter-alert';
import { api } from '../../lib/api';
import { createLogger } from '../../lib/logger';
import { getMerchantId } from '../../lib/auth';

const log = createLogger('webhook-log-page');

const ITEMS_PER_PAGE = 20;

type WebhookListResponse = {
  rows: WebhookDelivery[];
  total: number;
  deadLetterCount: number;
};

export default function WebhooksIndex() {
  const [page, setPage] = useState(1);
  const [replayingId, setReplayingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(
    null,
  );
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deadLetterRef = useRef<HTMLDivElement | null>(null);

  const [data, setData] = useState<WebhookListResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchDeliveries = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const offset = (page - 1) * ITEMS_PER_PAGE;
      const result = await api.get<WebhookDelivery[]>(
        `/v1/merchants/${getMerchantId()}/webhook-deliveries?limit=${ITEMS_PER_PAGE}&offset=${offset}`,
      );
      const rows = Array.isArray(result) ? result : [];
      const deadLetterCount = rows.filter((d) => d.status === 'dead_letter').length;
      setData({ rows, total: rows.length, deadLetterCount });
    } catch (err: unknown) {
      log.error({ err }, 'Failed to fetch webhook deliveries');
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load webhook deliveries.');
    } finally {
      setIsLoading(false);
    }
  }, [page]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchDeliveries();
  }, [fetchDeliveries]);

  const showToast = useCallback((kind: 'success' | 'error', message: string) => {
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }
    setToast({ kind, message });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, []);

  const handleReplay = async (id: string) => {
    setReplayingId(id);
    try {
      await api.post(`/v1/webhook-deliveries/${id}/replay`, {});
      showToast('success', 'Webhook re-queued for delivery.');
      setReplayingId(null);
    } catch (err: unknown) {
      log.error({ err, id }, 'Failed to replay webhook delivery');
      showToast(
        'error',
        err instanceof Error ? err.message : 'Failed to replay webhook delivery.',
      );
      setReplayingId(null);
    }
  };

  const scrollToDeadLetter = () => {
    deadLetterRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const deliveries = data?.rows ?? [];
  const deadLetterCount = data?.deadLetterCount ?? 0;
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <Layout variant="owner" breadcrumbs={[{ label: 'Webhook Delivery Log' }]}>
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Webhook Delivery Log
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Outbound webhook deliveries to your registered merchant endpoint, with retry and
            dead-letter status.
          </p>
        </div>

        {toast && (
          <div
            role="status"
            className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold ${
              toast.kind === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                : 'border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400'
            }`}
          >
            <span>{toast.message}</span>
          </div>
        )}

        {errorMsg && deliveries.length === 0 && !isLoading ? (
          <div className="mx-auto max-w-xl space-y-3 rounded-2xl border border-red-500/25 bg-red-500/10 p-6 text-center">
            <p className="text-sm font-semibold text-red-500">{errorMsg}</p>
            <button
              type="button"
              onClick={fetchDeliveries}
              className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-zinc-750"
            >
              Retry Connection
            </button>
          </div>
        ) : isLoading && deliveries.length === 0 ? (
          <div className="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white shadow-sm dark:bg-zinc-900">
            <div className="animate-pulse divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className={`h-16 ${i % 2 === 0 ? 'bg-zinc-50 dark:bg-zinc-900/40' : 'bg-white dark:bg-zinc-900'}`}
                />
              ))}
            </div>
          </div>
        ) : (
          <>
            {!isLoading && deadLetterCount > 0 && (
              <div ref={deadLetterRef}>
                <DeadLetterAlert count={deadLetterCount} onView={scrollToDeadLetter} />
              </div>
            )}

            <WebhookDeliveryLog
              deliveries={deliveries}
              onReplay={handleReplay}
              replayingId={replayingId}
            />

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-zinc-200 pt-5 dark:border-zinc-800">
                <p className="text-xs font-semibold text-zinc-500">
                  Showing page {page} of {totalPages} ({total} total deliveries)
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600 transition-all hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600 transition-all hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-white"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
