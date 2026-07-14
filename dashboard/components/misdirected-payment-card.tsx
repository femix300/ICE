import React, { useState } from 'react';
import { api } from '../lib/api';
import { createLogger } from '../lib/logger';
import { formatKoboToNaira, formatTimestamp } from '../lib/format';

const log = createLogger('misdirected-payment-card');

type MisdirectedPayment = {
  id: string;
  sender_name: string;
  amount_kobo: number;
  va_number: string;
  created_at: string;
};

type MisdirectedPaymentCardProps = {
  payment: MisdirectedPayment;
  onResolved: (id: string) => void;
  onToast: (kind: 'success' | 'error', message: string) => void;
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

export default function MisdirectedPaymentCard({
  payment,
  onResolved,
  onToast,
}: MisdirectedPaymentCardProps) {
  const [matchOpen, setMatchOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [invoiceId, setInvoiceId] = useState('');
  const [matchLoading, setMatchLoading] = useState(false);
  const [refundLoading, setRefundLoading] = useState(false);

  const handleMatch = async () => {
    const trimmed = invoiceId.trim();
    if (!trimmed) return;
    setMatchLoading(true);
    try {
      await api.post(`/v1/payments/${payment.id}/match`, { invoiceId: trimmed });
      onToast('success', `Payment matched to invoice ${trimmed}.`);
      onResolved(payment.id);
    } catch (err: unknown) {
      log.error({ err, id: payment.id }, 'Failed to match misdirected payment');
      onToast('error', err instanceof Error ? err.message : 'Failed to match payment.');
    } finally {
      setMatchLoading(false);
    }
  };

  const handleRefund = async () => {
    setRefundLoading(true);
    try {
      await api.post(`/v1/payments/${payment.id}/refund`, {});
      onToast('success', `Refund of ${formatKoboToNaira(payment.amount_kobo)} initiated.`);
      onResolved(payment.id);
    } catch (err: unknown) {
      log.error({ err, id: payment.id }, 'Failed to refund misdirected payment');
      onToast('error', err instanceof Error ? err.message : 'Failed to refund payment.');
    } finally {
      setRefundLoading(false);
    }
  };

  return (
    <>
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="grid flex-1 grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Sender
              </p>
              <p className="mt-1 text-sm font-semibold text-zinc-900 dark:text-white">
                {payment.sender_name}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Amount
              </p>
              <p className="mt-1 text-sm font-mono font-semibold text-zinc-900 dark:text-white">
                {formatKoboToNaira(payment.amount_kobo)}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                VA Number
              </p>
              <p className="mt-1 text-sm font-mono font-semibold text-zinc-900 dark:text-white">
                {payment.va_number}
              </p>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Timestamp
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {formatTimestamp(payment.created_at)}
              </p>
            </div>
          </div>

          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              disabled={matchLoading || refundLoading}
              onClick={() => setMatchOpen(true)}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-700 transition-all hover:bg-zinc-100 hover:text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white"
            >
              {matchLoading ? <Spinner /> : 'Match to Invoice'}
            </button>
            <button
              type="button"
              disabled={matchLoading || refundLoading}
              onClick={() => setRefundOpen(true)}
              className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-600 transition-all hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40 dark:text-red-400"
            >
              {refundLoading ? <Spinner /> : 'Initiate Refund'}
            </button>
          </div>
        </div>
      </div>

      {matchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMatchOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="match-title"
            className="relative max-w-md w-full rounded-2xl border border-zinc-850 bg-zinc-900 p-6 space-y-5 shadow-2xl"
          >
            <h3 id="match-title" className="text-base font-bold tracking-tight text-white">
              Match to Invoice
            </h3>
            <p className="text-xs text-zinc-400">
              Enter the invoice ID this payment should be reconciled against.
            </p>
            <input
              type="text"
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
              placeholder="e.g. inv_abc123"
              disabled={matchLoading}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white placeholder-zinc-600 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <div className="flex gap-3">
              <button
                type="button"
                disabled={matchLoading}
                onClick={() => setMatchOpen(false)}
                className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs font-bold text-zinc-400 transition-all hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={matchLoading || !invoiceId.trim()}
                onClick={handleMatch}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {matchLoading && <Spinner />}
                Confirm Match
              </button>
            </div>
          </div>
        </div>
      )}

      {refundOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setRefundOpen(false)} />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="refund-title"
            className="relative max-w-md w-full rounded-2xl border border-zinc-850 bg-zinc-900 p-6 space-y-5 shadow-2xl"
          >
            <div className="flex gap-3 text-red-400">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <h3 id="refund-title" className="text-base font-bold tracking-tight text-white">
                  Initiate Refund
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-zinc-400">
                  Are you sure you want to refund {formatKoboToNaira(payment.amount_kobo)} to{' '}
                  {payment.sender_name}? This action returns the funds to the payer.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={refundLoading}
                onClick={() => setRefundOpen(false)}
                className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-xs font-bold text-zinc-400 transition-all hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={refundLoading}
                onClick={handleRefund}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-red-500 px-4 py-2.5 text-xs font-bold text-white transition-all hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {refundLoading && <Spinner />}
                Confirm Refund
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export type { MisdirectedPayment };
