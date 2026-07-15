import React from 'react';
import Link from 'next/link';
import { formatKoboToNaira } from '../lib/format';

export type SimulatorResult = {
  success: boolean;
  scenario: string;
  transactionId: string;
  result: {
    matched: boolean;
    invoiceId: string | null;
    action: 'reconciled' | 'misdirected' | 'flagged_duplicate' | 'manual_review';
    message: string;
  };
};

export type SimulatorResultCardProps = {
  result: SimulatorResult | null;
  error?: string | null;
  inputs?: {
    virtualAccountNumber: string;
    amount: number; // kobo
    senderName: string;
    senderAccount: string;
    senderBank: string;
    merchantId: string;
    scenario: string;
  } | null;
  onReset: () => void;
  onFireAgain: () => void;
};

export default function SimulatorResultCard({
  result,
  error,
  inputs,
  onReset,
  onFireAgain,
}: SimulatorResultCardProps) {
  if (error) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/20 text-red-500 text-lg font-bold">
              ✕
            </span>
            <h3 className="text-lg font-bold text-red-700 dark:text-red-400">
              Webhook Processing Failed
            </h3>
          </div>
          <div className="mt-4 space-y-3">
            <p className="text-sm font-semibold text-red-800 dark:text-red-300">
              {error}
            </p>
            <div className="border-t border-red-500/20 pt-3">
              <h4 className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">
                Likely Causes
              </h4>
              <ul className="mt-1 list-disc pl-4 text-xs text-red-600/90 dark:text-red-300/80 space-y-1">
                <li>Local ICE server is offline or restarting</li>
                <li>Invalid database configuration or pool failure</li>
                <li>Invalid / mismatched NOMBA_WEBHOOK_SECRET</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onFireAgain}
            className="flex-1 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-50 px-4 py-2.5 text-sm font-bold text-zinc-700 transition-all dark:border-zinc-750 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-200"
          >
            Try Again
          </button>
          <button
            type="button"
            onClick={onReset}
            className="rounded-xl border border-zinc-200 bg-zinc-100 hover:bg-zinc-200 px-4 py-2.5 text-sm font-bold text-zinc-700 transition-all dark:border-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300"
          >
            Reset
          </button>
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex h-full min-h-[300px] flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-300 bg-white/50 p-6 text-center dark:border-zinc-800 dark:bg-zinc-950/20">
        <svg
          className="h-10 w-10 text-zinc-400 dark:text-zinc-600"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9.75 3.104v13.5m.002-.004h7.5M9.75 3.104l7.5 7.5M3.75 3.104h3"
          />
        </svg>
        <h3 className="mt-4 text-sm font-bold text-zinc-900 dark:text-white">
          Awaiting Simulation Trigger
        </h3>
        <p className="mt-1 max-w-[280px] text-xs text-zinc-500 dark:text-zinc-400">
          Configure the payload on the left and click &ldquo;Fire Webhook&rdquo; to begin.
        </p>
      </div>
    );
  }

  const { action, matched, invoiceId, message } = result.result;
  const timestamp = new Date().toLocaleTimeString();

  let cardColor = 'border-zinc-300 bg-zinc-50';
  let headerText = 'Unknown State';
  let icon = '•';

  if (action === 'reconciled' && matched) {
    cardColor = 'border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10';
    headerText = 'Payment Reconciled';
    icon = '✓';
  } else if (action === 'misdirected') {
    cardColor = 'border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10';
    headerText = 'Misdirected Payment Detected';
    icon = '⚠';
  } else if (action === 'flagged_duplicate') {
    cardColor = 'border-blue-500/30 bg-blue-500/5 dark:bg-blue-500/10';
    headerText = 'Duplicate Transaction Flagged';
    icon = '⊘';
  } else if (action === 'manual_review') {
    cardColor = 'border-orange-500/30 bg-orange-500/5 dark:bg-orange-500/10';
    headerText = 'Flagged for Manual Review';
    icon = '◎';
  }

  return (
    <div className="space-y-6">
      <div className={`rounded-2xl border p-6 shadow-sm ${cardColor}`}>
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-500/10 text-lg font-bold">
            {icon}
          </span>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
            {headerText}
          </h3>
        </div>

        <div className="mt-4 space-y-4">
          <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">
            {message}
          </p>

          <div className="border-t border-zinc-200/80 dark:border-zinc-850 pt-4 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-500">Transaction ID</span>
              <span className="font-semibold text-zinc-900 dark:text-white font-mono">
                {result.transactionId}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Amount</span>
              <span className="font-semibold text-zinc-900 dark:text-white">
                {formatKoboToNaira(inputs?.amount ?? 0)}
              </span>
            </div>
            {invoiceId && (
              <div className="flex justify-between">
                <span className="text-zinc-500">Matched Invoice ID</span>
                <span className="font-semibold text-zinc-900 dark:text-white font-mono">
                  {invoiceId}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-zinc-500">Action Status</span>
              <span className="font-semibold text-zinc-900 dark:text-white uppercase tracking-wider">
                {action}
              </span>
            </div>

            {action === 'misdirected' && (
              <div className="mt-4 pt-3 border-t border-zinc-200/80 dark:border-zinc-850">
                <p className="text-zinc-500 mb-2">
                  Landed on: <span className="font-mono text-zinc-900 dark:text-white">{inputs?.virtualAccountNumber}</span>
                </p>
                <Link
                  href="/misdirected"
                  className="inline-flex items-center text-xs font-bold text-amber-600 hover:text-amber-700 transition-colors"
                >
                  View in Misdirected Payments →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Visual Pipeline Timeline */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h4 className="text-sm font-bold text-zinc-950 dark:text-white mb-4">
          Simulation Result Pipeline
        </h4>
        <div className="relative border-l-2 border-emerald-500/20 ml-3 pl-6 space-y-6">
          <div className="relative">
            <span className="absolute -left-[31px] top-0 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white text-[9px] font-bold">
              ✓
            </span>
            <p className="text-xs font-bold text-zinc-900 dark:text-white">
              Webhook Received
            </p>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              payload verified &bull; {timestamp}
            </p>
          </div>

          <div className="relative">
            <span className="absolute -left-[31px] top-0 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white text-[9px] font-bold">
              ✓
            </span>
            <p className="text-xs font-bold text-zinc-900 dark:text-white">
              Signature Verified
            </p>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              HMAC-SHA256 authenticated &bull; {timestamp}
            </p>
          </div>

          <div className="relative">
            <span className="absolute -left-[31px] top-0 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white text-[9px] font-bold">
              ✓
            </span>
            <p className="text-xs font-bold text-zinc-900 dark:text-white">
              Reconciliation Matched
            </p>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              {matched ? 'invoice record located' : 'no invoice matches VA'} &bull; {timestamp}
            </p>
          </div>

          <div className="relative">
            <span className="absolute -left-[31px] top-0 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white text-[9px] font-bold">
              ✓
            </span>
            <p className="text-xs font-bold text-zinc-900 dark:text-white">
              Action Taken
            </p>
            <p className="text-[10px] text-zinc-400 mt-0.5">
              engine resolution: {action} &bull; {timestamp}
            </p>
          </div>
        </div>
      </div>

      {/* Control Buttons */}
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onFireAgain}
          className="flex-1 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-50 px-4 py-2.5 text-sm font-bold text-zinc-700 transition-all dark:border-zinc-750 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-zinc-200"
        >
          Fire Again
        </button>
        <button
          type="button"
          onClick={onReset}
          className="rounded-xl border border-zinc-200 bg-zinc-100 hover:bg-zinc-200 px-4 py-2.5 text-sm font-bold text-zinc-700 transition-all dark:border-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-300"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
