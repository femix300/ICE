import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/layout';
import TransactionDetail, {
  type TransactionDetail as TransactionDetailData,
  type ReconciliationDetail,
} from '../../components/transaction-detail';
import { api } from '../../lib/api';
import { createLogger } from '../../lib/logger';

const log = createLogger('transaction-detail-page');

export default function TransactionDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [transaction, setTransaction] = useState<TransactionDetailData | null>(null);
  const [reconciliation, setReconciliation] = useState<ReconciliationDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const transactionId = typeof id === 'string' ? id : '';
  const isReady = router.isReady && Boolean(transactionId);

  useEffect(() => {
    if (!isReady) return;
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLoading(true);
    setErrorMsg(null);
    void (async () => {
      try {
        const data = await api.get<TransactionDetailData>(`/v1/transactions/${transactionId}`);
        if (active) setTransaction(data);
      } catch (err: unknown) {
        if (active) {
          log.error({ err, transactionId }, 'Failed to fetch transaction detail');
          setErrorMsg(err instanceof Error ? err.message : 'Failed to load transaction detail.');
        }
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [isReady, transactionId]);

  useEffect(() => {
    if (!transaction?.invoice_id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setReconciliation(null);
      return;
    }
    let active = true;
    void (async () => {
      try {
        const recon = await api.get<ReconciliationDetail>(
          `/v1/invoices/${transaction.invoice_id}/reconciliation`,
        );
        if (active) setReconciliation(recon);
      } catch (reconErr: unknown) {
        if (active) {
          log.error(
            { err: reconErr, invoiceId: transaction.invoice_id },
            'Failed to fetch reconciliation',
          );
          setReconciliation(null);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [transaction]);

  if (!isReady || isLoading) {
    return (
      <Layout variant="vendor" breadcrumbs={[{ label: 'Transactions', href: '/transactions' }]}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-8 w-64 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
              <div className="h-4 w-48 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
            </div>
            <div className="h-6 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-full animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
            <div className="h-20 w-full bg-zinc-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-16 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
            <div className="h-16 w-full bg-zinc-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-24 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse" />
            <div className="h-32 w-full bg-zinc-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
          </div>
        </div>
      </Layout>
    );
  }

  if (errorMsg || !transaction) {
    return (
      <Layout variant="vendor" breadcrumbs={[{ label: 'Transactions', href: '/transactions' }]}>
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              Unable to Load Transaction
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-md">
              {errorMsg || 'Transaction not found or has been removed.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-800 border border-zinc-700 hover:bg-zinc-750 text-white transition-all"
          >
            Go Back
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      variant="vendor"
      breadcrumbs={[
        { label: 'Transactions', href: '/transactions' },
        { label: transaction.transaction_id },
      ]}
    >
      <TransactionDetail transaction={transaction} reconciliation={reconciliation} />
    </Layout>
  );
}
