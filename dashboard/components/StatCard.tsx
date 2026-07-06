import React from 'react';

type StatCardProps = {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
};

export default function StatCard({ label, value, subtext, icon }: StatCardProps) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition-colors dark:border-zinc-800 dark:bg-zinc-900">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
          {label}
        </span>
        {icon && (
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500 dark:text-emerald-400">
            {icon}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
          {value}
        </p>
        {subtext && (
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{subtext}</p>
        )}
      </div>
    </div>
  );
}
