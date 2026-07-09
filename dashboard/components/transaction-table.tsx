import React from 'react';
import { useRouter } from 'next/router';
import ReconciliationBadge, { ReconciliationStatus } from './reconciliation-badge';

export interface Transaction {
  id: string;
  vendor_id: string;
  sender_name: string;
  sender_account: string;
  amount: number;
  currency: string;
  reference: string;
  reconciliation_status: ReconciliationStatus;
  created_at: string;
}

interface TransactionTableProps {
  transactions: Transaction[];
  isLoading: boolean;
}

export default function TransactionTable({ transactions, isLoading }: TransactionTableProps) {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="animate-pulse flex flex-col">
          {[...Array(5)].map((_, i) => (
            <div key={i} className={`h-16 border-b border-zinc-200 dark:border-zinc-800/50 ${i % 2 === 0 ? 'bg-zinc-50 dark:bg-zinc-900/40' : 'bg-white dark:bg-zinc-900'}`} />
          ))}
        </div>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-16 bg-white dark:bg-zinc-900/20 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl p-8 mx-auto space-y-4">
        <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mx-auto text-zinc-400 dark:text-zinc-600">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>
        <div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">
            No Transactions Found
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto leading-relaxed">
            There are currently no transactions matching your criteria.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-zinc-50 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-zinc-800">
              <th className="px-6 py-4 text-[10px] uppercase tracking-wider font-bold text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                Date & Time
              </th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-wider font-bold text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                Sender
              </th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-wider font-bold text-zinc-500 dark:text-zinc-400 text-right whitespace-nowrap">
                Amount
              </th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-wider font-bold text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                Reference
              </th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-wider font-bold text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
            {transactions.map((tx) => {
              const dateObj = new Date(tx.created_at);
              const dateStr = dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
              const timeStr = dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

              return (
                <tr
                  key={tx.id}
                  onClick={() => router.push(`/transactions/${tx.id}`)}
                  className="group cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-200">{dateStr}</span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-500">{timeStr}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-200">{tx.sender_name}</span>
                      <span className="text-xs text-zinc-500 dark:text-zinc-500 font-mono tracking-tight">{tx.sender_account}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span className="text-sm font-bold text-zinc-900 dark:text-white tabular-nums tracking-tight">
                      {tx.currency} {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs font-mono tracking-tight text-zinc-500 dark:text-zinc-400">
                      {tx.reference}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <ReconciliationBadge status={tx.reconciliation_status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
