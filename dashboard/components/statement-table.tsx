import React, { useMemo } from 'react';
import { formatKoboToNaira, formatTimestamp } from '../lib/format';

export type StatementStatus = 'MATCHED' | 'UNMATCHED' | 'REFUNDED' | 'DUPLICATE';

export type StatementTransaction = {
  id: string;
  date: string;
  description: string;
  amount_kobo: number;
  status: StatementStatus;
  invoice_id?: string | null;
};

type StatementTableProps = {
  transactions: StatementTransaction[];
  showRunningBalance?: boolean;
  openingBalanceKobo?: number;
};

const getStatusStyle = (status: StatementStatus): string => {
  switch (status) {
    case 'MATCHED':
      return 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200/50 dark:border-emerald-500/20';
    case 'UNMATCHED':
      return 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200/50 dark:border-amber-500/20';
    case 'REFUNDED':
      return 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-200/50 dark:border-blue-500/20';
    case 'DUPLICATE':
      return 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-200/50 dark:border-red-500/20';
    default:
      return 'text-zinc-700 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border-zinc-200/50 dark:border-zinc-700/50';
  }
};

export default function StatementTable({
  transactions,
  showRunningBalance = false,
  openingBalanceKobo = 0,
}: StatementTableProps) {
  const rows = useMemo(() => {
    const result = transactions.reduce<{
      running: number;
      list: (StatementTransaction & { runningBalanceKobo: number })[];
    }>(
      (acc, tx) => {
        const next = acc.running + tx.amount_kobo;
        return { running: next, list: [...acc.list, { ...tx, runningBalanceKobo: next }] };
      },
      { running: openingBalanceKobo, list: [] },
    );
    return result.list;
  }, [transactions, openingBalanceKobo]);

  if (transactions.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
          No transactions in this period
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/50">
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                Date
              </th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                Description
              </th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                Amount
              </th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                Status
              </th>
              {showRunningBalance && (
                <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                  Running Balance
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
            {rows.map((tx) => (
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
                  <span className="text-sm font-medium text-zinc-900 dark:text-white">
                    {tx.description}
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
                {showRunningBalance && (
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-mono font-semibold text-zinc-900 dark:text-white">
                      {formatKoboToNaira(tx.runningBalanceKobo)}
                    </span>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
