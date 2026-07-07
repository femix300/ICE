import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/layout';
import StatCard from '../../components/StatCard';
import { api } from '../../lib/api';
import { createLogger } from '../../lib/logger';
import { formatKoboToNaira, formatReconciliationRate } from '../../lib/format';
import { CURRENT_VENDOR_ID } from '../../lib/session';

const log = createLogger('vendor-dashboard-page');

type CustomerSummary = {
  id: string;
  name: string;
  email: string;
  last_payment_at: string | null;
  total_paid_kobo: number;
};

type VendorStatement = {
  vendor_id: string;
  va_number: string | null;
  va_bank_name: string | null;
  total_collected_kobo: number;
  reconciliation_rate: number;
  outstanding_balance_kobo: number;
  recent_customers: CustomerSummary[];
};

const CopyIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
    />
  </svg>
);

const CheckIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

export default function VendorDashboard() {
  const router = useRouter();
  const [statement, setStatement] = useState<VendorStatement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCopyVa = async (vaNumber: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(vaNumber);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = vaNumber;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      log.error({ err }, 'Failed to copy VA number to clipboard');
    }
  };

  useEffect(() => {
    const isMounted = { current: true };
    void (async () => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const res = await api.get<VendorStatement>(
          `/v1/vendors/${CURRENT_VENDOR_ID}/statement`,
        );
        if (isMounted.current && res) {
          setStatement(res);
        }
      } catch (err: unknown) {
        if (isMounted.current) {
          log.error({ err }, 'Failed to fetch vendor statement');
          setErrorMsg(
            err instanceof Error
              ? err.message
              : 'An error occurred while loading your dashboard. Please try again.',
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
  }, []);

  return (
    <Layout variant="vendor">
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Vendor Dashboard
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Your collections, reconciliation health, and recent customers at a glance.
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-28 animate-pulse rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                />
              ))}
            </div>
            <div className="h-48 animate-pulse rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
          </div>
        ) : errorMsg ? (
          <div className="mx-auto max-w-xl space-y-3 rounded-2xl border border-red-500/25 bg-red-500/10 p-6 text-center">
            <p className="text-sm font-semibold text-red-500">{errorMsg}</p>
            <button
              type="button"
              onClick={() => router.reload()}
              className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-zinc-750"
            >
              Retry Connection
            </button>
          </div>
        ) : statement ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="VA Number"
                value={statement.va_number ?? 'Not provisioned'}
                subtext={statement.va_bank_name ?? 'Nomba Bank'}
                icon={
                  statement.va_number ? (
                    <button
                      type="button"
                      onClick={() => handleCopyVa(statement.va_number as string)}
                      title={copied ? 'Copied!' : 'Copy VA number'}
                      aria-label="Copy VA number"
                      className={`transition-colors ${
                        copied ? 'text-emerald-500' : 'hover:text-emerald-400'
                      }`}
                    >
                      {copied ? <CheckIcon /> : <CopyIcon />}
                    </button>
                  ) : undefined
                }
              />
              <StatCard
                label="Collected This Month"
                value={formatKoboToNaira(statement.total_collected_kobo)}
                subtext="Total inflow for the current month"
              />
              <StatCard
                label="Reconciliation Rate"
                value={formatReconciliationRate(statement.reconciliation_rate)}
                subtext="Payments matched to invoices"
              />
              <StatCard
                label="Outstanding Balance"
                value={formatKoboToNaira(statement.outstanding_balance_kobo)}
                subtext="Unreconciled amounts"
              />
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Recent Customers
                </h3>
                <button
                  type="button"
                  onClick={() => router.push('/vendor/customers')}
                  className="text-xs font-semibold text-emerald-600 transition-colors hover:text-emerald-500 dark:text-emerald-400"
                >
                  View all
                </button>
              </div>

              {statement.recent_customers.length === 0 ? (
                <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
                  No customers yet.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                  {statement.recent_customers.map((customer) => (
                    <li key={customer.id}>
                      <button
                        type="button"
                        onClick={() => router.push(`/vendor/customers/${customer.id}`)}
                        className="flex w-full items-center justify-between gap-4 py-3 text-left transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-zinc-900 dark:text-white">
                            {customer.name}
                          </p>
                          <p className="truncate text-xs text-zinc-500 dark:text-zinc-400">
                            {customer.email}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-mono font-semibold text-zinc-900 dark:text-white">
                            {formatKoboToNaira(customer.total_paid_kobo)}
                          </p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400">
                            {customer.last_payment_at
                              ? new Date(customer.last_payment_at).toLocaleDateString()
                              : 'No payments'}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        ) : null}
      </div>
    </Layout>
  );
}
