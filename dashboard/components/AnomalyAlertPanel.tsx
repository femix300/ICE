import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { api } from '../lib/api';
import { createLogger } from '../lib/logger';

const log = createLogger('anomaly-alert-panel');

export type AnomalyAlert = {
  id: string;
  rule: string;
  transaction_id: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp: string;
};

type AnomalyAlertPanelProps = {
  onToast: (kind: 'success' | 'error', message: string) => void;
};

const severityColor = {
  LOW: {
    color: 'text-zinc-600 bg-zinc-100 border-zinc-200 dark:text-zinc-400 dark:bg-zinc-800 dark:border-zinc-700',
    dot: false,
  },
  MEDIUM: {
    color: 'text-amber-700 bg-amber-50 border-amber-200/50 dark:text-amber-400 dark:bg-amber-500/10 dark:border-amber-500/20',
    dot: false,
  },
  HIGH: {
    color: 'text-orange-700 bg-orange-50 border-orange-200/50 dark:text-orange-400 dark:bg-orange-500/10 dark:border-orange-500/20',
    dot: false,
  },
  CRITICAL: {
    color: 'text-red-600 bg-red-50 border-red-200/50 dark:text-red-400 dark:bg-red-500/10 dark:border-red-500/20',
    dot: true,
  },
};

const PulsingDot = () => (
  <span className="relative flex h-2.5 w-2.5">
    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
  </span>
);

const CheckCircle = () => (
  <svg className="h-8 w-8 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

export default function AnomalyAlertPanel({ onToast }: AnomalyAlertPanelProps) {
  const router = useRouter();
  const [alerts, setAlerts] = useState<AnomalyAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [dismissingIds, setDismissingIds] = useState<Set<string>>(new Set());

  const fetchAlerts = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await api.get<AnomalyAlert[]>('/v1/anomalies');
      setAlerts(data ?? []);
    } catch (err: unknown) {
      log.error({ err }, 'Failed to fetch anomaly alerts');
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load anomaly alerts.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const isMounted = { current: true };
    void (async () => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const data = await api.get<AnomalyAlert[]>('/v1/anomalies');
        if (isMounted.current) {
          setAlerts(data ?? []);
        }
      } catch (err: unknown) {
        if (isMounted.current) {
          log.error({ err }, 'Failed to fetch anomaly alerts');
          setErrorMsg(err instanceof Error ? err.message : 'Failed to load anomaly alerts.');
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
  }, []);

  const handleInvestigate = (transactionId: string) => {
    router.push(`/transactions/${transactionId}`);
  };

  const handleDismiss = async (alert: AnomalyAlert) => {
    setDismissingIds((prev) => new Set(prev).add(alert.id));
    try {
      await api.delete(`/v1/anomalies/${alert.id}`);
      onToast('success', `Alert dismissed: ${alert.rule}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to dismiss alert.';
      log.error({ err, alertId: alert.id }, 'Failed to dismiss anomaly');
      onToast('error', message);
      setErrorMsg(message);
      setDismissingIds((prev) => {
        const next = new Set(prev);
        next.delete(alert.id);
        return next;
      });
      return;
    }
    setTimeout(() => {
      setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
      setDismissingIds((prev) => {
        const next = new Set(prev);
        next.delete(alert.id);
        return next;
      });
    }, 300);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
        Anomaly Alerts
      </h3>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
            />
          ))}
        </div>
      ) : errorMsg && alerts.length === 0 ? (
        <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-center">
          <p className="text-sm font-semibold text-red-500">{errorMsg}</p>
          <button
            type="button"
            onClick={fetchAlerts}
            className="mt-2 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-zinc-750"
          >
            Retry
          </button>
        </div>
      ) : alerts.length === 0 ? (
        <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
            <CheckCircle />
          </div>
          <h4 className="text-base font-bold text-zinc-900 dark:text-white">
            No anomalies detected — system operating normally
          </h4>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => {
            const isDismissing = dismissingIds.has(alert.id);
            const color = severityColor[alert.severity] ?? severityColor.LOW;
            return (
              <div
                key={alert.id}
                className={`rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 transition-opacity duration-300 ${
                  isDismissing ? 'opacity-0' : 'opacity-100'
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-1 flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono font-bold text-zinc-900 dark:text-white">
                        {alert.rule}
                      </code>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${color.color}`}
                      >
                        {color.dot && <PulsingDot />}
                        {alert.severity}
                      </span>
                    </div>
                    <Link
                      href={`/transactions/${alert.transaction_id}`}
                      className="text-sm font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
                    >
                      {alert.transaction_id}
                    </Link>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      {new Date(alert.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => handleInvestigate(alert.transaction_id)}
                      className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 transition-all hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                    >
                      Investigate
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDismiss(alert)}
                      className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 transition-all hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
