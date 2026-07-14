import React from 'react';

type DateRangePickerProps = {
  from: Date | null;
  to: Date | null;
  onChange: (from: Date | null, to: Date | null) => void;
};

const toInputValue = (date: Date | null): string => {
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const fromInputValue = (value: string): Date | null => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

export default function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1">
        <label
          htmlFor="range-from"
          className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
        >
          From
        </label>
        <input
          id="range-from"
          type="date"
          value={toInputValue(from)}
          max={toInputValue(to) || undefined}
          onChange={(e) => onChange(fromInputValue(e.target.value), to)}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label
          htmlFor="range-to"
          className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400"
        >
          To
        </label>
        <input
          id="range-to"
          type="date"
          value={toInputValue(to)}
          min={toInputValue(from) || undefined}
          onChange={(e) => onChange(from, fromInputValue(e.target.value))}
          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-zinc-800 dark:bg-zinc-950 dark:text-white"
        />
      </div>
      {(from || to) && (
        <button
          type="button"
          onClick={() => onChange(null, null)}
          className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-600 transition-all hover:bg-zinc-100 hover:text-zinc-900 dark:border-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
        >
          Clear
        </button>
      )}
    </div>
  );
}
