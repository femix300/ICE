import React from 'react';

export type WebhookDeliveryStatus = 'success' | 'failed' | 'pending' | 'dead_letter';

export type WebhookDelivery = {
  id: string;
  event_type: string;
  attempt: number;
  http_status: number | null;
  latency_ms: number | null;
  status: WebhookDeliveryStatus;
  created_at: string;
};

type WebhookDeliveryLogProps = {
  deliveries: WebhookDelivery[];
  onReplay: (id: string) => void;
  replayingId: string | null;
};

const formatTimestamp = (value: string): string => {
  const date = new Date(value);
  const datePart = date.toLocaleDateString('en-NG', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
  const timePart = date.toLocaleTimeString('en-NG', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${datePart} · ${timePart}`;
};

const getStatusBadgeStyle = (status: WebhookDeliveryStatus): string => {
  switch (status) {
    case 'success':
      return 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200/50 dark:border-emerald-500/20';
    case 'failed':
      return 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200/50 dark:border-amber-500/20';
    case 'pending':
      return 'text-zinc-700 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border-zinc-200/50 dark:border-zinc-700/50';
    case 'dead_letter':
      return 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-200/50 dark:border-red-500/20';
  }
};

const getStatusLabel = (status: WebhookDeliveryStatus): string => {
  switch (status) {
    case 'success':
      return 'Delivered';
    case 'failed':
      return 'Retrying';
    case 'pending':
      return 'Pending';
    case 'dead_letter':
      return 'Dead Letter';
  }
};

const getHttpStatusBadgeStyle = (httpStatus: number | null): string => {
  if (httpStatus === null) {
    return 'text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 border-zinc-200/50 dark:border-zinc-700/50';
  }
  if (httpStatus >= 200 && httpStatus < 300) {
    return 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200/50 dark:border-emerald-500/20';
  }
  if (httpStatus >= 400 && httpStatus < 500) {
    return 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-500/10 border-amber-200/50 dark:border-amber-500/20';
  }
  return 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-500/10 border-red-200/50 dark:border-red-500/20';
};

const Spinner = () => (
  <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

const ReplayIcon = () => (
  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m0 2l-3 3-3-3" />
  </svg>
);

export default function WebhookDeliveryLog({
  deliveries,
  onReplay,
  replayingId,
}: WebhookDeliveryLogProps) {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white shadow-sm dark:bg-zinc-900">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/50">
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                Event Type
              </th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                Attempt #
              </th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                HTTP Status
              </th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                Latency (ms)
              </th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                Timestamp
              </th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                Delivery Status
              </th>
              <th className="px-6 py-4 text-right text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
            {deliveries.map((delivery) => {
              const isDeadLetter = delivery.status === 'dead_letter';
              const isFailed = delivery.status === 'failed';
              const rowTint = isDeadLetter
                ? 'bg-red-500/5 dark:bg-red-500/10'
                : isFailed
                  ? 'bg-amber-500/5 dark:bg-amber-500/10'
                  : '';
              const isReplaying = replayingId === delivery.id;

              return (
                <tr key={delivery.id} className={`${rowTint} transition-colors`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-medium text-zinc-900 dark:text-zinc-200">
                      {delivery.event_type}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-mono text-zinc-900 dark:text-zinc-200">
                      {delivery.attempt}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase ${getHttpStatusBadgeStyle(
                        delivery.http_status,
                      )}`}
                    >
                      {delivery.http_status ?? '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-mono text-zinc-900 dark:text-zinc-200">
                      {delivery.latency_ms !== null ? `${delivery.latency_ms}ms` : '—'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {formatTimestamp(delivery.created_at)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-wide uppercase ${getStatusBadgeStyle(
                        delivery.status,
                      )}`}
                    >
                      {getStatusLabel(delivery.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    {isDeadLetter && (
                      <button
                        type="button"
                        disabled={isReplaying}
                        onClick={() => onReplay(delivery.id)}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-all ${
                          isReplaying
                            ? 'cursor-not-allowed border-zinc-200 bg-zinc-100 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800'
                            : 'border-red-500/30 bg-red-500/10 text-red-600 hover:bg-red-500/20 dark:text-red-400'
                        }`}
                      >
                        {isReplaying ? (
                          <>
                            <Spinner />
                            Replaying
                          </>
                        ) : (
                          <>
                            <ReplayIcon />
                            Replay
                          </>
                        )}
                      </button>
                    )}
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
