import React from 'react';

type DeadLetterAlertProps = {
  count: number;
  onView?: () => void;
};

export default function DeadLetterAlert({ count, onView }: DeadLetterAlertProps) {
  if (count <= 0) {
    return null;
  }

  return (
    <div className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4 sm:px-5">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/15 text-red-500">
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-bold text-red-600 dark:text-red-400">
          {count} {count === 1 ? 'event' : 'events'} in dead-letter queue
        </p>
        <p className="mt-0.5 text-xs text-red-600/80 dark:text-red-400/80">
          These webhook deliveries exhausted all retries and require manual replay.
        </p>
      </div>
      {onView && (
        <button
          type="button"
          onClick={onView}
          className="shrink-0 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-600 transition-all hover:bg-red-500/20 dark:text-red-400"
        >
          View
        </button>
      )}
    </div>
  );
}
