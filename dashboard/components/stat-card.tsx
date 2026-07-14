import React from 'react';

type StatCardTone = 'default' | 'success' | 'warning' | 'danger';

type StatCardProps = {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: string;
  icon?: React.ReactNode;
  tone?: StatCardTone;
};

const toneStyles: Record<
  StatCardTone,
  { card: string; icon: string; value: string; accent: string }
> = {
  default: {
    card: 'border-zinc-200 dark:border-zinc-800',
    icon: 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400',
    value: 'text-zinc-900 dark:text-white',
    accent: 'bg-emerald-500',
  },
  success: {
    card: 'border-emerald-200/60 dark:border-emerald-500/20',
    icon: 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400',
    value: 'text-zinc-900 dark:text-white',
    accent: 'bg-emerald-500',
  },
  warning: {
    card: 'border-amber-200/60 dark:border-amber-500/20',
    icon: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    value: 'text-zinc-900 dark:text-white',
    accent: 'bg-amber-500',
  },
  danger: {
    card: 'border-red-300/60 dark:border-red-500/30',
    icon: 'bg-red-500/10 text-red-600 dark:text-red-400',
    value: 'text-red-600 dark:text-red-400',
    accent: 'bg-red-500',
  },
};

export default function StatCard({
  label,
  value,
  subtext,
  trend,
  icon,
  tone = 'default',
}: StatCardProps) {
  const styles = toneStyles[tone];

  return (
    <div
      className={`relative flex h-full min-w-0 flex-col justify-between overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition-colors dark:bg-zinc-900 ${styles.card}`}
    >
      <span className={`absolute inset-y-0 left-0 w-1 ${styles.accent}`} aria-hidden />
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 truncate text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {label}
        </span>
        {icon && (
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${styles.icon}`}
          >
            {icon}
          </span>
        )}
      </div>
      <div className="mt-3 min-w-0">
        <p
          className={`break-words text-xl font-bold leading-tight tracking-tight ${styles.value}`}
        >
          {value}
        </p>
        {trend && (
          <p className="mt-1 text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
            {trend}
          </p>
        )}
        {subtext && (
          <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">{subtext}</p>
        )}
      </div>
    </div>
  );
}
