import React from 'react';
import StatCard from './stat-card';
import { formatKoboToNaira, formatReconciliationRate } from '../lib/format';

export type PlatformSummary = {
  total_collected_kobo: number;
  reconciliation_rate_percent: number;
  active_vendors: number;
  refunds_issued_kobo: number;
  pending_misdirected_count: number;
};

type SummaryMetricsProps = {
  summary: PlatformSummary;
};

const WalletIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3M3.75 5.25h16.5A1.5 1.5 0 0121.75 6.75v10.5a1.5 1.5 0 01-1.5 1.5H3.75a1.5 1.5 0 01-1.5-1.5V6.75a1.5 1.5 0 011.5-1.5z"
    />
  </svg>
);

const ChartIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
    />
  </svg>
);

const UsersIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A2.25 2.25 0 0112.75 21.5h-1.5a2.25 2.25 0 01-2.25-2.263V19.13m-2.625.372a9.337 9.337 0 01-4.121-.952 4.125 4.125 0 007.533-2.493M3.75 19.128v-.003c0-1.113.285-2.16.786-3.07M4.5 19.128v.109A2.25 2.25 0 006.75 21.5h1.5a2.25 2.25 0 002.25-2.263V19.13"
    />
  </svg>
);

const RefundIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
    />
  </svg>
);

const AlertIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  </svg>
);

export default function SummaryMetrics({ summary }: SummaryMetricsProps) {
  const hasMisdirected = summary.pending_misdirected_count > 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <StatCard
        label="Total Collected"
        value={formatKoboToNaira(summary.total_collected_kobo)}
        subtext="Across all vendors"
        trend="This month"
        icon={<WalletIcon />}
      />
      <StatCard
        label="Reconciliation Rate"
        value={formatReconciliationRate(summary.reconciliation_rate_percent)}
        subtext="Payments matched to invoices"
        trend="This month"
        icon={<ChartIcon />}
        tone={summary.reconciliation_rate_percent >= 90 ? 'success' : 'warning'}
      />
      <StatCard
        label="Active Vendors"
        value={summary.active_vendors}
        subtext="Collecting payments"
        trend="Live"
        icon={<UsersIcon />}
      />
      <StatCard
        label="Total Refunds Issued"
        value={formatKoboToNaira(summary.refunds_issued_kobo)}
        subtext="Returned to payers"
        trend="This month"
        icon={<RefundIcon />}
        tone="warning"
      />
      <StatCard
        label="Pending Misdirected"
        value={summary.pending_misdirected_count}
        subtext={hasMisdirected ? 'Needs review' : 'All clear'}
        trend="Requires action"
        icon={<AlertIcon />}
        tone={hasMisdirected ? 'danger' : 'success'}
      />
    </div>
  );
}
