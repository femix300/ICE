import React from 'react';

export const ReconciliationStatus = {
  EXACT_MATCH: 'EXACT_MATCH',
  OVERPAYMENT: 'OVERPAYMENT',
  UNDERPAYMENT: 'UNDERPAYMENT',
  MISDIRECTED: 'MISDIRECTED',
  DUPLICATE: 'DUPLICATE',
  REFUNDED: 'REFUNDED',
} as const;

export type ReconciliationStatus = (typeof ReconciliationStatus)[keyof typeof ReconciliationStatus];

interface ReconciliationBadgeProps {
  status: ReconciliationStatus;
  className?: string;
}

const statusConfig: Record<ReconciliationStatus, { color: string; label: string }> = {
  EXACT_MATCH: {
    color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200/50 dark:border-emerald-500/20',
    label: 'Exact Match',
  },
  OVERPAYMENT: {
    color: 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200/50 dark:border-amber-500/20',
    label: 'Overpayment',
  },
  UNDERPAYMENT: {
    color: 'text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-500/10 border-orange-200/50 dark:border-orange-500/20',
    label: 'Underpayment',
  },
  MISDIRECTED: {
    color: 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-200/50 dark:border-red-500/20',
    label: 'Misdirected',
  },
  DUPLICATE: {
    color: 'text-zinc-700 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border-zinc-200/50 dark:border-zinc-700/50',
    label: 'Duplicate',
  },
  REFUNDED: {
    color: 'text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 border-blue-200/50 dark:border-blue-500/20',
    label: 'Refunded',
  },
};

export default function ReconciliationBadge({ status, className = '' }: ReconciliationBadgeProps) {
  const config = statusConfig[status];

  if (!config) return null;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase border ${config.color} ${className}`}
    >
      {config.label}
    </span>
  );
}
