import React from 'react';

export type RefundStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

type RefundStatusBadgeProps = {
  status: RefundStatus;
};

const Spinner = () => (
  <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

const getStyle = (status: RefundStatus): string => {
  switch (status) {
    case 'PENDING':
      return 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200/50 dark:border-amber-500/20';
    case 'PROCESSING':
      return 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-200/50 dark:border-blue-500/20';
    case 'COMPLETED':
      return 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200/50 dark:border-emerald-500/20';
    case 'FAILED':
      return 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-200/50 dark:border-red-500/20';
  }
};

export default function RefundStatusBadge({ status }: RefundStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide ${getStyle(
        status,
      )}`}
    >
      {status === 'PROCESSING' && <Spinner />}
      {status}
    </span>
  );
}
