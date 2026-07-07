import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Layout from '../../../components/layout';
import { api } from '../../../lib/api';
import { createLogger } from '../../../lib/logger';
import { formatKoboToNaira, formatTimestamp } from '../../../lib/format';
import { CURRENT_VENDOR_ID } from '../../../lib/session';

const log = createLogger('vendor-customer-statement-page');

type CustomerTransaction = {
  id: string;
  date: string;
  amount_kobo: number;
  status: string;
  invoice_id: string | null;
};

type CustomerStatement = {
  customer: { id: string; name: string; email: string };
  running_balance_kobo: number;
  transactions: CustomerTransaction[];
};

const getStatusStyle = (status: string): string => {
  switch (status) {
    case 'paid':
    case 'MATCHED':
      return 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200/50 dark:border-emerald-500/20';
    case 'overpaid':
    case 'OVERPAID':
      return 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200/50 dark:border-amber-500/20';
    case 'partially_paid':
    case 'UNDERPAID':
      return 'text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 border-orange-200/50 dark:border-orange-500/20';
    case 'refunded':
    case 'REFUNDED':
      return 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-200/50 dark:border-blue-500/20';
    case 'unmatched':
    case 'UNMATCHED':
    case 'rejected':
    case 'DUPLICATE':
      return 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-200/50 dark:border-red-500/20';
    default:
      return 'text-zinc-700 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border-zinc-200/50 dark:border-zinc-700/50';
  }
};

const getStatusLabel = (status: string): string => {
  const map: Record<string, string> = {
    paid: 'Paid',
    overpaid: 'Overpaid',
    partially_paid: 'Partially Paid',
    refunded: 'Refunded',
    draft: 'Draft',
    issued: 'Issued',
    unmatched: 'Unmatched',
    MATCHED: 'Matched',
    OVERPAID: 'Overpaid',
    UNDERPAID: 'Underpaid',
    REFUNDED: 'Refunded',
    UNMATCHED: 'Unmatched',
    DUPLICATE: 'Duplicate',
    REJECTED: 'Rejected',
  };
  return map[status] ?? status;
};

const BreadcrumbChevron = () => (
  <svg className="h-3.5 w-3.5 text-zinc-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
  </svg>
);

export default function VendorCustomerStatement() {
  const router = useRouter();
  const { id } = router.query;
  const [statement, setStatement] = useState<CustomerStatement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!router.isReady || !id || typeof id !== 'string') {
      return;
    }
    const isMounted = { current: true };
    void (async () => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const res = await api.get<CustomerStatement>(
          `/v1/vendors/${CURRENT_VENDOR_ID}/customers/${id}/statement`,
        );
        if (isMounted.current && res) {
          setStatement(res);
        }
      } catch (err: unknown) {
        if (isMounted.current) {
          log.error({ err, customerId: id }, 'Failed to fetch customer statement');
          setErrorMsg(
            err instanceof Error
              ? err.message
              : 'An error occurred while loading this customer. Please try again.',
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
  }, [router.isReady, id]);

  const transactions =
    statement?.transactions.slice().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()) ??
    [];

  const customerName = statement?.customer.name ?? 'Customer';

  return (
    <Layout variant="vendor">
      <div className="space-y-6">
        <nav className="flex items-center gap-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          <Link href="/vendor" className="transition-colors hover:text-zinc-900 dark:hover:text-white">
            Vendor Dashboard
          </Link>
          <BreadcrumbChevron />
          <Link
            href="/vendor/customers"
            className="transition-colors hover:text-zinc-900 dark:hover:text-white"
          >
            Customers
          </Link>
          <BreadcrumbChevron />
          <span className="truncate text-zinc-900 dark:text-white">{customerName}</span>
        </nav>

        {isLoading ? (
          <div className="space-y-6">
            <div className="h-20 animate-pulse rounded-2xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900" />
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="animate-pulse divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-16 ${i % 2 === 0 ? 'bg-zinc-50 dark:bg-zinc-900/40' : 'bg-white dark:bg-zinc-900'}`}
                  />
                ))}
              </div>
            </div>
          </div>
        ) : errorMsg || !statement ? (
          <div className="mx-auto max-w-xl space-y-3 rounded-2xl border border-red-500/25 bg-red-500/10 p-6 text-center">
            <p className="text-sm font-semibold text-red-500">
              {errorMsg ?? 'Customer statement could not be loaded.'}
            </p>
            <button
              type="button"
              onClick={() => router.push('/vendor/customers')}
              className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-zinc-750"
            >
              Back to Customers
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
                {statement.customer.name}
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">{statement.customer.email}</p>
            </div>

            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Running Balance
              </span>
              <p className="mt-1 text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
                {formatKoboToNaira(statement.running_balance_kobo)}
              </p>
            </div>

            {transactions.length === 0 ? (
              <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-zinc-200/60 bg-white p-8 text-center dark:border-zinc-800/60 dark:bg-zinc-900/20">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  No transactions yet
                </h3>
                <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
                  This customer has not made any payments into your virtual account.
                </p>
              </div>
            ) : (
              <div className="w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/50">
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                          Date
                        </th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                          Amount
                        </th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                          Status
                        </th>
                        <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                          Invoice ID
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                      {transactions.map((tx) => (
                        <tr
                          key={tx.id}
                          className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-xs text-zinc-500 dark:text-zinc-400">
                              {formatTimestamp(tx.date)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-mono font-semibold text-zinc-900 dark:text-white">
                              {formatKoboToNaira(tx.amount_kobo)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase ${getStatusStyle(
                                tx.status,
                              )}`}
                            >
                              {getStatusLabel(tx.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-xs font-mono text-zinc-500 dark:text-zinc-400">
                              {tx.invoice_id ?? '—'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
