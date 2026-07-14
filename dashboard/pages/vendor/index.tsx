import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/layout';
import StatCard from '../../components/stat-card';
import { api } from '../../lib/api';
import { createLogger } from '../../lib/logger';
import { getVendorId } from '../../lib/auth';
import { formatKoboToNaira, formatReconciliationRate } from '../../lib/format';
import { VendorStatementSchema } from '../../lib/types';

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

const WalletIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3M3.75 5.25h16.5A1.5 1.5 0 0121.75 6.75v10.5a1.5 1.5 0 01-1.5 1.5H3.75a1.5 1.5 0 01-1.5-1.5V6.75a1.5 1.5 0 011.5-1.5z"
    />
  </svg>
);

const ChartIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
    />
  </svg>
);

const AlertIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  </svg>
);

export default function VendorDashboard() {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [statement, setStatement] = useState<VendorStatement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const data = await api.get<VendorStatement>(
          `/v1/vendors/${getVendorId()}/statement`,
          {
            schema: VendorStatementSchema,
          },
        );
        if (active) setStatement(data);
      } catch (err: unknown) {
        if (active) {
          log.error({ err }, 'Failed to fetch vendor statement');
          setErrorMsg(err instanceof Error ? err.message : 'Failed to load vendor dashboard.');
        }
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

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

  return (
    <Layout variant="vendor" breadcrumbs={[{ label: 'Vendor Dashboard' }]}>
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Vendor Dashboard
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Your collections, reconciliation health, and recent customers at a glance.
          </p>
        </div>

        {errorMsg && !statement && !isLoading ? (
          <div className="mx-auto max-w-xl space-y-3 rounded-2xl border border-red-500/25 bg-red-500/10 p-6 text-center">
            <p className="text-sm font-semibold text-red-500">{errorMsg}</p>
            <button
              type="button"
              onClick={() => {
                setErrorMsg(null);
                setIsLoading(true);
                void (async () => {
                  try {
                    const data = await api.get<VendorStatement>(
                      `/v1/vendors/${getVendorId()}/statement`,
                      { schema: VendorStatementSchema },
                    );
                    setStatement(data);
                  } catch (err: unknown) {
                    setErrorMsg(err instanceof Error ? err.message : 'Failed to load vendor dashboard.');
                  } finally {
                    setIsLoading(false);
                  }
                })();
              }}
              className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-zinc-750"
            >
              Retry Connection
            </button>
          </div>
        ) : isLoading ? (
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
                trend="This month"
                icon={<WalletIcon />}
              />
              <StatCard
                label="Reconciliation Rate"
                value={formatReconciliationRate(statement.reconciliation_rate)}
                subtext="Payments matched to invoices"
                trend="This month"
                icon={<ChartIcon />}
                tone={statement.reconciliation_rate >= 90 ? 'success' : 'warning'}
              />
              <StatCard
                label="Outstanding Balance"
                value={formatKoboToNaira(statement.outstanding_balance_kobo)}
                subtext="Unreconciled amounts"
                trend="Requires action"
                icon={<AlertIcon />}
                tone={statement.outstanding_balance_kobo > 0 ? 'warning' : 'success'}
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
                <div className="mt-6 flex flex-col items-center gap-3 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A2.25 2.25 0 0112.75 21.5h-1.5a2.25 2.25 0 01-2.25-2.263V19.13m-2.625.372a9.337 9.337 0 01-4.121-.952 4.125 4.125 0 007.533-2.493M3.75 19.128v-.003c0-1.113.285-2.16.786-3.07M4.5 19.128v.109A2.25 2.25 0 006.75 21.5h1.5a2.25 2.25 0 002.25-2.263V19.13"
                      />
                    </svg>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-white">
                      No customers yet
                    </h4>
                    <p className="mt-1 max-w-sm text-xs text-zinc-500 dark:text-zinc-400">
                      Customers will appear here once payments start flowing into your virtual account.
                    </p>
                  </div>
                </div>
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
