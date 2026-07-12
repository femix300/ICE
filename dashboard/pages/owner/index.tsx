import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Layout from '../../components/layout';
import SummaryMetrics, { type PlatformSummary } from '../../components/SummaryMetrics';
import MisdirectedPaymentCard, {
  type MisdirectedPayment,
} from '../../components/MisdirectedPaymentCard';
import AnomalyAlertPanel from '../../components/AnomalyAlertPanel';
import { api } from '../../lib/api';
import { createLogger } from '../../lib/logger';
import { getMerchantId } from '../../lib/auth';
import { PlatformSummarySchema, MisdirectedListResponseSchema, type MisdirectedListResponse } from '../../lib/types';

const log = createLogger('owner-dashboard-page');

export default function OwnerDashboard() {
  const [summary, setSummary] = useState<PlatformSummary | null>(null);
  const [payments, setPayments] = useState<MisdirectedPayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(
    null,
  );
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSummary = useCallback(async () => {
    try {
      const data = await api.get<PlatformSummary>(
        `/v1/merchants/${getMerchantId()}/summary`,
        {
          schema: PlatformSummarySchema,
          expectedShape: {
            total_collected_kobo: 0,
            reconciliation_rate: 0,
            active_vendors: 0,
            total_refunds_kobo: 0,
            misdirected_count: 0,
          },
          shapeDescription: 'totalCollected, reconciliationRate, activeVendors, refundsIssued, pendingMisdirected',
        },
      );
      setSummary(data);
    } catch (err: unknown) {
      log.error({ err }, 'Failed to fetch platform summary');
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load platform summary.');
    }
  }, []);

  const fetchPayments = useCallback(async () => {
    try {
      const data = await api.get<MisdirectedListResponse>(
        '/v1/payments?status=misdirected',
        {
          schema: MisdirectedListResponseSchema,
        },
      );
      setPayments(data.rows);
    } catch (err: unknown) {
      log.error({ err }, 'Failed to fetch misdirected payments');
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load misdirected payments.');
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      setIsLoading(true);
      setErrorMsg(null);
      await Promise.all([fetchSummary(), fetchPayments()]);
      if (active) setIsLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [fetchSummary, fetchPayments]);

  const showToast = useCallback((kind: 'success' | 'error', message: string) => {
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }
    setToast({ kind, message });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const handleResolved = useCallback((id: string) => {
    setPayments((prev) => prev.filter((p) => p.id !== id));
    setSummary((prev) =>
      prev ? { ...prev, misdirected_count: Math.max(0, prev.misdirected_count - 1) } : prev,
    );
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, []);

  return (
    <Layout variant="owner" breadcrumbs={[{ label: 'Platform Dashboard' }]}>
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Platform Dashboard
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Collection health and misdirected payments across all vendors.
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

        {errorMsg && !summary && !isLoading ? (
          <div className="mx-auto max-w-xl space-y-3 rounded-2xl border border-red-500/25 bg-red-500/10 p-6 text-center">
            <p className="text-sm font-semibold text-red-500">{errorMsg}</p>
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setIsLoading(true);
                void Promise.all([fetchSummary(), fetchPayments()]).then(() => setIsLoading(false));
              }}
              className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-zinc-750"
            >
              Retry Connection
            </button>
          </div>
        ) : isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                />
              ))}
            </div>
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div
                  key={i}
                  className="h-24 animate-pulse rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                />
              ))}
            </div>
          </div>
        ) : (
          <>
            {summary && <SummaryMetrics summary={summary} />}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                  Misdirected Payments Requiring Review
                </h3>
                <Link
                  href="/owner/misdirected"
                  className="text-xs font-semibold text-emerald-600 transition-colors hover:text-emerald-500 dark:text-emerald-400"
                >
                  View all
                </Link>
              </div>

              {payments.length === 0 ? (
                <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                    All payments reconciled
                  </h3>
                  <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                    There are no misdirected payments waiting for review right now.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <MisdirectedPaymentCard
                      key={payment.id}
                      payment={payment}
                      onResolved={handleResolved}
                      onToast={showToast}
                    />
                  ))}
                </div>
              )}
            </div>
            <AnomalyAlertPanel onToast={showToast} />
          </>
        )}
      </div>
    </Layout>
  );
}
