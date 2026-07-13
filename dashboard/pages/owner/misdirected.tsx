import React, { useState, useEffect, useRef, useCallback } from 'react';
import Layout from '../../components/layout';
import MisdirectedPaymentCard, {
  type MisdirectedPayment,
} from '../../components/misdirected-payment-card';
import { api } from '../../lib/api';
import { createLogger } from '../../lib/logger';

const log = createLogger('owner-misdirected-page');

const ITEMS_PER_PAGE = 20;

type MisdirectedListResponse = {
  rows: MisdirectedPayment[];
  total: number;
};

export default function OwnerMisdirected() {
  const [payments, setPayments] = useState<MisdirectedPayment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(
    null,
  );
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((kind: 'success' | 'error', message: string) => {
    if (toastTimer.current) {
      clearTimeout(toastTimer.current);
    }
    setToast({ kind, message });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchPayments = useCallback(
    async (pageToFetch: number, fromDate: string, toDate: string) => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const params = new URLSearchParams({
          limit: String(ITEMS_PER_PAGE),
          offset: String((pageToFetch - 1) * ITEMS_PER_PAGE),
        });
        if (fromDate) params.set('from', fromDate);
        if (toDate) params.set('to', toDate);
        const res = await api.get<MisdirectedListResponse>(
          `/v1/payments/misdirected?${params.toString()}`,
        );
        if (res) {
          setPayments(res.rows);
          setTotal(res.total);
        }
      } catch (err: unknown) {
        log.error({ err }, 'Failed to fetch misdirected payments');
        setErrorMsg(
          err instanceof Error
            ? err.message
            : 'An error occurred while loading misdirected payments. Please try again.',
        );
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const isMounted = { current: true };
    void (async () => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const params = new URLSearchParams({
          limit: String(ITEMS_PER_PAGE),
          offset: String((page - 1) * ITEMS_PER_PAGE),
        });
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        const res = await api.get<MisdirectedListResponse>(
          `/v1/payments/misdirected?${params.toString()}`,
        );
        if (isMounted.current && res) {
          setPayments(res.rows);
          setTotal(res.total);
        }
      } catch (err: unknown) {
        if (isMounted.current) {
          log.error({ err }, 'Failed to fetch misdirected payments');
          setErrorMsg(
            err instanceof Error
              ? err.message
              : 'An error occurred while loading misdirected payments. Please try again.',
          );
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    })();
    return () => {
      isMounted.current = false;
    };
  }, [page, from, to]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) {
        clearTimeout(toastTimer.current);
      }
    };
  }, []);

  const handleResolved = useCallback((id: string) => {
    setPayments((prev) => prev.filter((p) => p.id !== id));
    setTotal((prev) => Math.max(0, prev - 1));
  }, []);

  // Local date-range filtering as a safety net so the filter is visible even
  // before the backend honours the from/to query params.
  const filtered = payments.filter((p) => {
    const date = new Date(p.created_at);
    if (from && date < new Date(from)) return false;
    if (to) {
      const end = new Date(to);
      end.setDate(end.getDate() + 1);
      if (date >= end) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <Layout variant="owner">
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Misdirected Payments
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Payments that could not be matched to a known vendor, customer, or invoice.
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

        <div className="flex flex-wrap items-end gap-4 rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex flex-col gap-1">
            <label
              htmlFor="fromDate"
              className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
            >
              From
            </label>
            <input
              id="fromDate"
              type="date"
              value={from}
              onChange={(e) => {
                setFrom(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label
              htmlFor="toDate"
              className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
            >
              To
            </label>
            <input
              id="toDate"
              type="date"
              value={to}
              onChange={(e) => {
                setTo(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            />
          </div>
          {(from || to) && (
            <button
              type="button"
              onClick={() => {
                setFrom('');
                setTo('');
                setPage(1);
              }}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-600 transition-all hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
            >
              Clear
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
              />
            ))}
          </div>
        ) : errorMsg ? (
          <div className="mx-auto max-w-xl space-y-3 rounded-2xl border border-red-500/25 bg-red-500/10 p-6 text-center">
            <p className="text-sm font-semibold text-red-500">{errorMsg}</p>
            <button
              type="button"
              onClick={() => fetchPayments(page, from, to)}
              className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-zinc-750"
            >
              Retry Connection
            </button>
          </div>
        ) : filtered.length === 0 ? (
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
              No misdirected payments match the current filter.
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {filtered.map((payment) => (
                <MisdirectedPaymentCard
                  key={payment.id}
                  payment={payment}
                  onResolved={handleResolved}
                  onToast={showToast}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-zinc-200 pt-5 dark:border-zinc-800">
                <p className="text-xs font-semibold text-zinc-500">
                  Showing page {page} of {totalPages} ({total} total)
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
