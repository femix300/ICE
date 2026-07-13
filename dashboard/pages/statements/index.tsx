import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/layout';
import DateRangePicker from '../../components/date-range-picker';
import StatementTable, {
  type StatementTransaction,
  type StatementStatus,
} from '../../components/statement-table';
import { api } from '../../lib/api';
import { createLogger } from '../../lib/logger';
import { formatKoboToNaira, formatDate } from '../../lib/format';
import { getVendorId } from '../../lib/auth';
import { StatementResponseSchema, CustomerListResponseSchema } from '../../lib/types';

const log = createLogger('statements-page');

const STATUS_VALUES = ['MATCHED', 'UNMATCHED', 'REFUNDED', 'DUPLICATE'] as const;

const STATUS_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Matched', value: 'MATCHED' },
  { label: 'Unmatched', value: 'UNMATCHED' },
  { label: 'Refunded', value: 'REFUNDED' },
];

type RawTransaction = {
  id: string;
  date: string;
  amount_kobo: number;
  status: string;
  description?: string;
  invoice_id?: string | null;
};

type VendorStatementResponse = {
  vendor: { id: string; name: string };
  opening_balance_kobo: number;
  transactions: RawTransaction[];
};

type CustomerStatementResponse = {
  customer: { id: string; name: string; email: string };
  opening_balance_kobo: number;
  transactions: RawTransaction[];
};

type CustomerOption = {
  id: string;
  name: string;
};

type StatementResponse = VendorStatementResponse | CustomerStatementResponse;

const normalizeStatus = (status: string): StatementStatus => {
  const upper = status.toUpperCase();
  return (STATUS_VALUES as readonly string[]).includes(upper)
    ? (upper as StatementStatus)
    : 'UNMATCHED';
};

const statusLabel = (status: string): string =>
  status.toUpperCase().replace(/_/g, ' ');

const mapTransaction = (tx: RawTransaction): StatementTransaction => ({
  id: tx.id,
  date: tx.date,
  description: tx.description ?? (tx.invoice_id ? `Invoice ${tx.invoice_id}` : statusLabel(tx.status)),
  amount_kobo: tx.amount_kobo,
  status: normalizeStatus(tx.status),
  invoice_id: tx.invoice_id,
});

const toInputValue = (date: Date | null): string => {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const buildParams = (from: Date | null, to: Date | null, status: string): string => {
  const params = new URLSearchParams();
  if (from) params.set('from', toInputValue(from));
  if (to) params.set('to', toInputValue(to));
  if (status) params.set('status', status);
  return params.toString();
};

const startOfMonth = (): Date => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

export default function StatementsPage() {
  const [tab, setTab] = useState<'vendor' | 'customer'>('vendor');

  const [draftFrom, setDraftFrom] = useState<Date | null>(startOfMonth());
  const [draftTo, setDraftTo] = useState<Date | null>(new Date());
  const [draftStatus, setDraftStatus] = useState('');

  const [applied, setApplied] = useState({ from: draftFrom, to: draftTo, status: draftStatus });

  const [vendorName, setVendorName] = useState<string>('');
  const [openingBalance, setOpeningBalance] = useState(0);
  const [transactions, setTransactions] = useState<StatementTransaction[]>([]);

  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedCustomerName, setSelectedCustomerName] = useState<string>('');

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [isCustomersLoading, setIsCustomersLoading] = useState(true);
  const [customersError, setCustomersError] = useState<string | null>(null);

  const [statementError, setStatementError] = useState<string | null>(null);
  const [isStatementLoading, setIsStatementLoading] = useState(true);

  const applyFilters = useCallback(() => {
    setApplied({ from: draftFrom, to: draftTo, status: draftStatus });
  }, [draftFrom, draftTo, draftStatus]);

  useEffect(() => {
    let active = true;
    void (async () => {
      setIsCustomersLoading(true);
      setCustomersError(null);
      try {
        const data = await api.get<{ rows: CustomerOption[] }>(
          `/v1/vendors/${getVendorId()}/customers`,
          {
            schema: CustomerListResponseSchema,
          },
        );
        const options = data.rows.map((c) => ({ id: c.id, name: c.name }));
        if (active) setCustomers(options);
      } catch (err: unknown) {
        if (active) {
          log.error({ err }, 'Failed to fetch customers for statement page');
          setCustomersError(err instanceof Error ? err.message : 'Failed to load customers.');
        }
      } finally {
        if (active) setIsCustomersLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      setIsStatementLoading(true);
      setStatementError(null);
      try {
        const params = buildParams(applied.from, applied.to, applied.status);
        const path =
          tab === 'vendor'
            ? `/v1/vendors/${getVendorId()}/statement?${params}`
            : selectedCustomerId
              ? `/v1/vendors/${getVendorId()}/customers/${selectedCustomerId}/statement?${params}`
              : null;

        if (!path) {
          if (active) {
            setIsStatementLoading(false);
            setOpeningBalance(0);
            setTransactions([]);
            setVendorName('');
            setSelectedCustomerName('');
          }
          return;
        }

        const data = await api.get<StatementResponse>(path, {
          schema: StatementResponseSchema,
        });
        if (active) {
          setOpeningBalance(data.opening_balance_kobo);
          setTransactions(data.transactions.map(mapTransaction));
          if ('vendor' in data) {
            setVendorName(data.vendor.name);
          } else {
            setSelectedCustomerName(data.customer.name);
          }
        }
      } catch (err: unknown) {
        if (active) {
          log.error({ err, tab, selectedCustomerId }, 'Failed to fetch statement');
          setStatementError(err instanceof Error ? err.message : 'Failed to load statement.');
        }
      } finally {
        if (active) setIsStatementLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [tab, applied, selectedCustomerId]);

  const isLoading = isStatementLoading;
  const netChange = transactions.reduce((sum, tx) => sum + tx.amount_kobo, 0);
  const closingBalance = openingBalance + netChange;

  const printHeaderName = tab === 'vendor' ? vendorName : selectedCustomerName;
  const breadcrumbs =
    tab === 'vendor'
      ? [{ label: 'Statements' }]
      : selectedCustomerId
        ? [
            { label: 'Statements', href: '/statements' },
            { label: 'Customers', href: '/vendor/customers' },
            { label: selectedCustomerName || 'Customer' },
          ]
        : [
            { label: 'Statements', href: '/statements' },
            { label: 'Customers' },
          ];

  return (
    <Layout variant="vendor" breadcrumbs={breadcrumbs}>
      <style jsx global>{`
        @media print {
          aside,
          header,
          .no-print {
            display: none !important;
          }
          main {
            padding: 0 !important;
            max-width: 100% !important;
          }
          .print-only {
            display: block !important;
          }
        }
        .print-only {
          display: none;
        }
      `}</style>

      <div className="space-y-6">
        <div className="flex flex-col gap-1 print-only">
          <h1 className="text-xl font-bold text-zinc-900">ICE Statement</h1>
          <p className="text-sm text-zinc-600">
            {printHeaderName || 'Statement'}
            {applied.from && applied.to
              ? ` · ${formatDate(applied.from)} – ${formatDate(applied.to)}`
              : ''}
          </p>
        </div>

        <div className="flex flex-col gap-1 no-print">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Statements
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Transaction statements for your virtual accounts.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 no-print">
          <div className="inline-flex rounded-xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900/60">
            <button
              type="button"
              onClick={() => {
                setTab('vendor');
                setSelectedCustomerId(null);
                setSelectedCustomerName('');
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                tab === 'vendor'
                  ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white'
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              Vendor Statement
            </button>
            <button
              type="button"
              onClick={() => setTab('customer')}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                tab === 'customer'
                  ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-white'
                  : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              }`}
            >
              Customer Statement
            </button>
          </div>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-600 transition-all hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
          >
            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.72 6.72a.75.75 0 011.06 0l3.22 3.22 3.22-3.22a.75.75 0 111.06 1.06l-3.75 3.75a.75.75 0 01-1.06 0l-3.75-3.75a.75.75 0 010-1.06zM6 12a.75.75 0 01.75.75v2.5h9.5v-2.5a.75.75 0 011.5 0v3.25a.75.75 0 01-.75.75h-11a.75.75 0 01-.75-.75v-3.25A.75.75 0 016 12z"
              />
            </svg>
            Print
          </button>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900 no-print">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <DateRangePicker
              from={draftFrom}
              to={draftTo}
              onChange={(from, to) => {
                setDraftFrom(from);
                setDraftTo(to);
              }}
            />
            <div className="flex flex-col gap-1">
              <label
                htmlFor="status-filter"
                className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
              >
                Status
              </label>
              <select
                id="status-filter"
                value={draftStatus}
                onChange={(e) => setDraftStatus(e.target.value)}
                className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={applyFilters}
              className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-emerald-400"
            >
              Apply
            </button>
          </div>
        </div>

        {tab === 'customer' && !selectedCustomerId ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <label
              htmlFor="customer-select"
              className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
            >
              Select a customer
            </label>
            <select
              id="customer-select"
              value=""
              onChange={(e) => setSelectedCustomerId(e.target.value || null)}
              className="mt-2 w-full max-w-sm rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
            >
              <option value="" disabled>
                Choose a customer…
              </option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {isCustomersLoading && (
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">Loading customers…</p>
            )}
            {customersError && (
              <p className="mt-2 text-xs text-red-500">{customersError}</p>
            )}
            {!isCustomersLoading && customers.length === 0 && (
              <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                No customers found for this vendor.
              </p>
            )}
          </div>
        ) : statementError && transactions.length === 0 && !isLoading ? (
          <div className="mx-auto max-w-xl space-y-3 rounded-2xl border border-red-500/25 bg-red-500/10 p-6 text-center">
            <p className="text-sm font-semibold text-red-500">{statementError}</p>
            <button
              type="button"
              onClick={() => {
                setStatementError(null);
                setIsStatementLoading(true);
                void (async () => {
                  try {
                    const params = buildParams(applied.from, applied.to, applied.status);
                    const path =
                      tab === 'vendor'
                        ? `/v1/vendors/${getVendorId()}/statement?${params}`
                        : selectedCustomerId
                          ? `/v1/vendors/${getVendorId()}/customers/${selectedCustomerId}/statement?${params}`
                          : null;
                    if (!path) return;
                    const data = await api.get<StatementResponse>(path, {
                      schema: StatementResponseSchema,
                    });
                    setOpeningBalance(data.opening_balance_kobo);
                    setTransactions(data.transactions.map(mapTransaction));
                    if ('vendor' in data) {
                      setVendorName(data.vendor.name);
                    } else {
                      setSelectedCustomerName(data.customer.name);
                    }
                  } catch (err: unknown) {
                    setStatementError(err instanceof Error ? err.message : 'Failed to load statement.');
                  } finally {
                    setIsStatementLoading(false);
                  }
                })();
              }}
              className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-zinc-750"
            >
              Retry Connection
            </button>
          </div>
        ) : isLoading && transactions.length === 0 ? (
          <div className="space-y-3">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
              />
            ))}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 no-print">
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Opening Balance
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                  {formatKoboToNaira(openingBalance)}
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Net Change
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                  {formatKoboToNaira(netChange)}
                </p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Closing Balance
                </p>
                <p className="mt-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                  {formatKoboToNaira(closingBalance)}
                </p>
              </div>
            </div>

            <StatementTable
              transactions={transactions}
              showRunningBalance={tab === 'vendor'}
              openingBalanceKobo={openingBalance}
            />
          </>
        )}
      </div>
    </Layout>
  );
}
