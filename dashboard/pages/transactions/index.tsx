import React from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../../components/layout';
import { api } from '../../lib/api';
import { createLogger } from '../../lib/logger';
import { formatKoboToNaira, formatTimestamp } from '../../lib/format';
import { useMockFallback, mockTransactionList } from '../../lib/mockData';

const log = createLogger('transactions-list-page');

type TransactionStatus = 'MATCHED' | 'UNMATCHED' | 'REFUNDED';

type TransactionListItem = {
  id: string;
  transaction_id: string;
  va_number: string;
  amount_kobo: number;
  sender_name: string;
  sender_account: string;
  sender_bank_code: string;
  sender_bank_name: string;
  created_at: string;
  status: TransactionStatus;
  invoice_id: string | null;
};

const getStatusStyle = (status: TransactionStatus): string => {
  switch (status) {
    case 'MATCHED':
      return 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200/50 dark:border-emerald-500/20';
    case 'UNMATCHED':
      return 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200/50 dark:border-amber-500/20';
    case 'REFUNDED':
      return 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-200/50 dark:border-blue-500/20';
  }
};

const PAGE_SIZE = 10;

export default function TransactionsList() {
  const router = useRouter();

  const { data, isLoading } = useMockFallback<TransactionListItem[]>({
    fetcher: () => api.get<TransactionListItem[]>(`/v1/transactions?limit=${PAGE_SIZE}`),
    mock: mockTransactionList,
    isEmpty: (rows) => rows.length === 0,
  });

  const transactions = data ?? [];

  return (
    <Layout variant="owner" breadcrumbs={[{ label: 'Transactions' }]}>
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Transactions
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Every inbound payment routed through your virtual accounts, with reconciliation status.
          </p>
        </div>

        {isLoading ? (
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="animate-pulse divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
              {[...Array(PAGE_SIZE)].map((_, i) => (
                <div
                  key={i}
                  className={`h-16 ${i % 2 === 0 ? 'bg-zinc-50 dark:bg-zinc-900/40' : 'bg-white dark:bg-zinc-900'}`}
                />
              ))}
            </div>
          </div>
        ) : transactions.length === 0 ? (
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
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              No transactions yet
            </h3>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              Inbound payments will appear here once Nomba starts routing transfers to your
              virtual accounts.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/50">
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      Transaction
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      Sender
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      Bank
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      Amount
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      Status
                    </th>
                    <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                  {transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      onClick={() => router.push(`/transactions/${tx.id}`)}
                      className="cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono font-semibold text-zinc-900 dark:text-white">
                          {tx.transaction_id}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                          {tx.sender_name}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">
                          {tx.sender_account}
                        </p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-zinc-700 dark:text-zinc-300">
                          {tx.sender_bank_name}
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
                          {tx.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {formatTimestamp(tx.created_at)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
