import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout';
import TransactionTable, { Transaction } from '../../components/transaction-table';
import { ReconciliationStatus } from '../../components/reconciliation-badge';
import { api } from '../../lib/api';
import { createLogger } from '../../lib/logger';

const log = createLogger('transactions-feed');
const ITEMS_PER_PAGE = 20;
const REFRESH_INTERVAL_MS = 10000; // 10 seconds per requirements

const STATUS_FILTERS: { value: 'ALL' | ReconciliationStatus; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'EXACT_MATCH', label: 'Exact Match' },
  { value: 'OVERPAYMENT', label: 'Overpayment' },
  { value: 'UNDERPAYMENT', label: 'Underpayment' },
  { value: 'MISDIRECTED', label: 'Misdirected' },
  { value: 'DUPLICATE', label: 'Duplicate' },
  { value: 'REFUNDED', label: 'Refunded' },
];

export default function TransactionsIndex() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'ALL' | ReconciliationStatus>('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchTransactions = async (showLoadingState = true) => {
    if (showLoadingState) setIsLoading(true);
    setErrorMsg(null);
    try {
      const offset = (page - 1) * ITEMS_PER_PAGE;
      const res = await api.get<{ rows: Transaction[]; total: number }>(
        `/v1/transactions?limit=${ITEMS_PER_PAGE}&offset=${offset}`,
      );
      if (res) {
        setTransactions(res.rows);
        setTotal(res.total);
      }
    } catch (err: unknown) {
      log.error({ err }, 'Failed to fetch transactions');
      if (showLoadingState) {
        setErrorMsg(
          err instanceof Error
            ? err.message
            : 'An error occurred while loading transactions.',
        );
      }
    } finally {
      if (showLoadingState) setIsLoading(false);
    }
  };

  // Initial fetch and dependency on page change
  useEffect(() => {
    fetchTransactions(true);
  }, [page]);

  // Polling setup (10s auto-refresh)
  useEffect(() => {
    const intervalId = setInterval(() => {
      // Pass false to avoid flashing loading state during background refresh
      fetchTransactions(false);
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [page]); // Re-bind interval if page changes so we refresh the correct page

  // Client-side filtering for MVP (instant visual feedback)
  const filteredTransactions = transactions.filter((tx) => {
    if (statusFilter === 'ALL') return true;
    return tx.reconciliation_status === statusFilter;
  });

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <Layout variant="owner">
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Reconciliation Feed
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Live view of incoming transactions and their reconciliation status.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-zinc-500 bg-zinc-100 dark:bg-zinc-900/50 px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Live (10s)
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div className="flex flex-wrap gap-1.5 bg-zinc-100 dark:bg-zinc-900/60 p-1 rounded-xl border border-zinc-200/50 dark:border-zinc-800/40">
            {STATUS_FILTERS.map((status) => (
              <button
                key={status.value}
                type="button"
                onClick={() => setStatusFilter(status.value)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold tracking-wide transition-all uppercase ${
                  statusFilter === status.value
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>

        {/* Main Workspace */}
        {errorMsg && transactions.length === 0 ? (
          <div className="bg-red-500/10 border border-red-500/25 rounded-2xl p-6 text-center max-w-xl mx-auto space-y-3">
            <p className="text-sm font-semibold text-red-500">{errorMsg}</p>
            <button
              type="button"
              onClick={() => fetchTransactions(true)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-800 border border-zinc-700 hover:bg-zinc-750 text-white transition-all"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <TransactionTable transactions={filteredTransactions} isLoading={isLoading && transactions.length === 0} />

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-5">
                <p className="text-xs font-semibold text-zinc-500">
                  Showing page {page} of {totalPages} ({total} total transactions)
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
