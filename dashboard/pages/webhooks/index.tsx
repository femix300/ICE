import React, { useState, useEffect, useCallback, useRef } from 'react';
import Layout from '../../components/layout';
import WebhookDeliveryLog, {
  type WebhookDelivery,
  type WebhookDeliveryStatus,
} from '../../components/webhook-delivery-log';
import DeadLetterAlert from '../../components/dead-letter-alert';
import { api } from '../../lib/api';
import { createLogger } from '../../lib/logger';

const log = createLogger('webhook-log-page');

const ITEMS_PER_PAGE = 20;

type WebhookListResponse = {
  rows: WebhookDelivery[];
  total: number;
  deadLetterCount: number;
};

export default function WebhooksIndex() {
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [total, setTotal] = useState(0);
  const [deadLetterCount, setDeadLetterCount] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [replayingId, setReplayingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(
    null,
  );
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const deadLetterRef = useRef<HTMLDivElement | null>(null);

  const fetchDeliveries = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const offset = (page - 1) * ITEMS_PER_PAGE;
      const data = await api.get<WebhookListResponse>(
        `/v1/webhook-deliveries?limit=${ITEMS_PER_PAGE}&offset=${offset}`,
      );
      setDeliveries(data.rows);
      setTotal(data.total);
      setDeadLetterCount(data.deadLetterCount);
    } catch (err: unknown) {
      log.error({ err }, 'Failed to fetch webhook deliveries');
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'An error occurred while loading webhook deliveries. Please try again.',
      );
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

        {errorMsg && !isLoading && deliveries.length === 0 && (
          <div className="bg-red-500/10 border border-red-500/25 rounded-2xl p-6 text-center max-w-xl mx-auto space-y-3">
            <p className="text-sm font-semibold text-red-500">{errorMsg}</p>
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setIsLoading(true);
                void fetchDeliveries();
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-800 border border-zinc-700 hover:bg-zinc-750 text-white transition-all"
            >
              Retry Connection
            </button>
          </div>
        )}

        {!isLoading && deadLetterCount > 0 && (
          <div ref={deadLetterRef}>
            <DeadLetterAlert count={deadLetterCount} onView={scrollToDeadLetter} />
          </div>
        )}

        {isLoading ? (
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
        ) : deliveries.length === 0 ? (
          <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-zinc-200/60 bg-white p-8 text-center dark:border-zinc-800/60 dark:bg-zinc-900/20">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-600">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                No Webhook Deliveries Yet
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                Once Nomba events start flowing to your connected endpoint, delivery attempts and
                their statuses will appear here.
              </p>
            </div>
          </div>
        ) : (
          <>
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
