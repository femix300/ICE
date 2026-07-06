import React from 'react';

export type ReconciliationStatus =
  | 'MATCHED'
  | 'UNMATCHED'
  | 'OVERPAID'
  | 'UNDERPAID'
  | 'DUPLICATE'
  | 'REFUNDED';

export type TransactionDetail = {
  id: string;
  transaction_id: string;
  va_number: string;
  amount_kobo: number;
  sender_name: string;
  sender_account: string;
  sender_bank_code: string;
  sender_bank_name?: string;
  raw_payload: unknown;
  created_at: string;
  invoice_id?: string | null;
};

export type ReconciliationDetail = {
  id: string;
  transaction_id: string;
  invoice_id: string | null;
  status: string;
  expected_kobo: number;
  received_kobo: number;
  difference_kobo: number;
  action_taken: string;
  created_at: string;
};

type TransactionDetailProps = {
  transaction: TransactionDetail;
  reconciliation: ReconciliationDetail | null;
};

const formatKoboToNaira = (kobo: number): string => {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
  }).format(kobo / 100);
};

const getStatusConfig = (status: ReconciliationStatus) => {
  switch (status) {
    case 'MATCHED':
      return {
        color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200/50 dark:border-emerald-500/20',
        label: 'Matched',
        icon: (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        ),
      };
    case 'UNMATCHED':
      return {
        color: 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-200/50 dark:border-red-500/20',
        label: 'Unmatched',
        icon: (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        ),
      };
    case 'OVERPAID':
      return {
        color: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200/50 dark:border-amber-500/20',
        label: 'Overpaid',
        icon: (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />
          </svg>
        ),
      };
    case 'UNDERPAID':
      return {
        color: 'text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 border-orange-200/50 dark:border-orange-500/20',
        label: 'Underpaid',
        icon: (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
          </svg>
        ),
      };
    case 'DUPLICATE':
      return {
        color: 'text-zinc-700 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border-zinc-200/50 dark:border-zinc-700/50',
        label: 'Duplicate',
        icon: (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
          </svg>
        ),
      };
    case 'REFUNDED':
      return {
        color: 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-200/50 dark:border-blue-500/20',
        label: 'Refunded',
        icon: (
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
          </svg>
        ),
      };
  }
};

const ReceivedIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
  </svg>
);

const ReconciledIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
  </svg>
);

const RefundedIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
  </svg>
);

const PendingIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default function TransactionDetail({ transaction, reconciliation }: TransactionDetailProps) {
  const statusMap: Record<string, ReconciliationStatus> = {
    EXACT_MATCH: 'MATCHED',
    OVERPAYMENT: 'OVERPAID',
    UNDERPAYMENT: 'UNDERPAID',
    DUPLICATE: 'DUPLICATE',
    UNMATCHED: 'UNMATCHED',
    REFUNDED: 'REFUNDED',
  };

  const rawStatus = reconciliation?.status ?? 'UNMATCHED';
  const normalizedStatus = statusMap[rawStatus] ?? 'UNMATCHED';
  const statusConfig = getStatusConfig(normalizedStatus);

  const timeline = [
    {
      label: 'Payment Received',
      timestamp: transaction.created_at,
      icon: <ReceivedIcon />,
      completed: true,
    },
    {
      label: 'Reconciled',
      timestamp: reconciliation?.created_at ?? null,
      icon: <ReconciledIcon />,
      completed: Boolean(reconciliation),
    },
      {
        label: 'Refunded',
        timestamp: reconciliation && normalizedStatus === 'REFUNDED' ? reconciliation.created_at : null,
        icon: <RefundedIcon />,
        completed: normalizedStatus === 'REFUNDED',
      },
  ];

  const matchTypeLabel = (() => {
    if (!reconciliation) return '—';
    switch (reconciliation.action_taken) {
      case 'invoice_closed':
        return 'Exact Match';
      case 'refund_queued':
        return 'Overpayment';
      case 'partial_payment_recorded':
        return 'Partial Payment';
      case 'flagged_unmatched':
        return 'Unmatched';
      case 'rejected':
        return 'Duplicate';
      default:
        return reconciliation.action_taken;
    }
  })();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Transaction Detail
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 font-mono">
            {transaction.transaction_id}
          </p>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase border ${statusConfig.color}`}
        >
          {statusConfig.icon}
          {statusConfig.label}
        </span>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">
          Sender Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
              Sender Name
            </label>
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">
              {transaction.sender_name}
            </p>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
              Account Number
            </label>
            <p className="text-sm font-mono font-semibold text-zinc-900 dark:text-white">
              {transaction.sender_account}
            </p>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
              Bank Name
            </label>
            <p className="text-sm font-semibold text-zinc-900 dark:text-white">
              {transaction.sender_bank_name ?? transaction.sender_bank_code}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
          Amount
        </h3>
        <p className="text-3xl font-bold text-zinc-900 dark:text-white tracking-tight">
          {formatKoboToNaira(transaction.amount_kobo)}
        </p>
      </div>

      {reconciliation?.invoice_id && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-4">
            Matched Invoice
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                Invoice ID
              </label>
              <p className="text-sm font-mono font-semibold text-zinc-900 dark:text-white">
                {reconciliation.invoice_id}
              </p>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                Invoice Amount
              </label>
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                {formatKoboToNaira(reconciliation.expected_kobo)}
              </p>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
                Match Type
              </label>
              <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                {matchTypeLabel}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
        <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-6">
          Timeline
        </h3>
        <div className="space-y-0">
          {timeline.map((event, index) => (
            <div key={index} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center border ${
                    event.completed
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                      : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-400'
                  }`}
                >
                  {event.completed ? event.icon : <PendingIcon />}
                </div>
                {index < timeline.length - 1 && (
                  <div
                    className={`w-px flex-1 my-1 ${
                      event.completed ? 'bg-emerald-500/20' : 'bg-zinc-200 dark:bg-zinc-700'
                    }`}
                  />
                )}
              </div>
              <div className="pb-6">
                <p
                  className={`text-sm font-semibold ${
                    event.completed ? 'text-zinc-900 dark:text-white' : 'text-zinc-400'
                  }`}
                >
                  {event.label}
                </p>
                {event.timestamp && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    {new Date(event.timestamp).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {reconciliation && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">
            Reconciliation Log
          </h3>
          <p className="text-sm font-mono text-zinc-900 dark:text-white break-all">
            {reconciliation.id}
          </p>
        </div>
      )}
    </div>
  );
}
