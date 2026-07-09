import { useEffect, useRef, useState } from 'react';
import { createLogger } from './logger';

import type { PlatformSummary } from '../components/SummaryMetrics';
import type { MisdirectedPayment } from '../components/MisdirectedPaymentCard';
import type { WebhookDelivery } from '../components/WebhookDeliveryLog';
import type { ReconciliationDetail, TransactionDetail } from '../components/TransactionDetail';
import type { AnomalyAlert } from '../components/AnomalyAlertPanel';

const log = createLogger('mock-data');

const DAY_MS = 86_400_000;

const daysAgo = (days: number, hour = 10, minute = 0): string => {
  const date = new Date();
  date.setTime(date.getTime() - days * DAY_MS);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
};

const NIGERIAN_NAMES = [
  'Adaeze Okafor',
  'Chidi Okoro',
  'Ngozi Eze',
  'Tunde Bakare',
  'Amaka Nwosu',
  'Emeka Obi',
  'Fatima Bello',
  'Yusuf Abdullahi',
  'Blessing Adeyemi',
  'Olalekan Cole',
];

const BANKS = ['GTBank', 'Access Bank', 'Zenith Bank', 'First Bank', 'UBA', 'Providus Bank'];

/* ------------------------------------------------------------------ */
/* Owner dashboard                                                    */
/* ------------------------------------------------------------------ */

export const mockPlatformSummary: PlatformSummary = {
  total_collected_kobo: 1_284_750_000, // N12,847,500
  reconciliation_rate: 94.3,
  active_vendors: 7,
  total_refunds_kobo: 34_000_000, // N340,000
  misdirected_count: 2,
};

export const mockMisdirectedList: { rows: MisdirectedPayment[]; total: number } = {
  total: 2,
  rows: [
    {
      id: 'mdp_8f3a21',
      sender_name: 'Adaeze Okafor',
      amount_kobo: 75_000_00, // N75,000
      va_number: '8023456781',
      created_at: daysAgo(1, 14, 12),
    },
    {
      id: 'mdp_4c9b77',
      sender_name: 'Tunde Bakare',
      amount_kobo: 220_000_00, // N220,000
      va_number: '8023456781',
      created_at: daysAgo(2, 9, 41),
    },
  ],
};

export type MockVendor = {
  id: string;
  merchant_id: string;
  name: string;
  nomba_va_number: string | null;
  nomba_bank_name: string | null;
  va_status: 'pending' | 'active' | 'suspended';
  created_at: string;
  updated_at: string;
};

export const mockVendors: { rows: MockVendor[]; total: number } = {
  total: 3,
  rows: [
    {
      id: 'vend_aa01',
      merchant_id: '00000000-0000-0000-0000-000000000000',
      name: 'Lagos Fresh Mart',
      nomba_va_number: '8023456781',
      nomba_bank_name: 'Providus Bank',
      va_status: 'active',
      created_at: daysAgo(40, 9, 0),
      updated_at: daysAgo(2, 10, 0),
    },
    {
      id: 'vend_bb02',
      merchant_id: '00000000-0000-0000-0000-000000000000',
      name: 'Abuja Tech Hub',
      nomba_va_number: '8023456792',
      nomba_bank_name: 'Providus Bank',
      va_status: 'active',
      created_at: daysAgo(28, 9, 0),
      updated_at: daysAgo(5, 10, 0),
    },
    {
      id: 'vend_cc03',
      merchant_id: '00000000-0000-0000-0000-000000000000',
      name: 'Enugu Spice Co.',
      nomba_va_number: null,
      nomba_bank_name: null,
      va_status: 'pending',
      created_at: daysAgo(3, 9, 0),
      updated_at: daysAgo(3, 9, 0),
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Vendor dashboard                                                   */
/* ------------------------------------------------------------------ */

export type MockCustomerSummary = {
  id: string;
  name: string;
  email: string;
  last_payment_at: string | null;
  total_paid_kobo: number;
};

export type MockVendorStatement = {
  vendor_id: string;
  va_number: string | null;
  va_bank_name: string | null;
  total_collected_kobo: number;
  reconciliation_rate: number;
  outstanding_balance_kobo: number;
  recent_customers: MockCustomerSummary[];
};

export const mockVendorStatement: MockVendorStatement = {
  vendor_id: '11111111-1111-1111-1111-111111111111',
  va_number: '8023456781',
  va_bank_name: 'Providus Bank',
  total_collected_kobo: 124_000_000, // N1,240,000
  reconciliation_rate: 91.2,
  outstanding_balance_kobo: 8_750_000, // N87,500
  recent_customers: [
    {
      id: 'cust_aa01',
      name: 'Adaeze Okafor',
      email: 'adaeze.okafor@gmail.com',
      last_payment_at: daysAgo(1, 11, 15),
      total_paid_kobo: 45_000_00,
    },
    {
      id: 'cust_bb02',
      name: 'Chidi Okoro',
      email: 'chidi.okoro@yahoo.com',
      last_payment_at: daysAgo(2, 16, 40),
      total_paid_kobo: 120_000_00,
    },
    {
      id: 'cust_cc03',
      name: 'Ngozi Eze',
      email: 'ngozi.eze@outlook.com',
      last_payment_at: daysAgo(3, 9, 5),
      total_paid_kobo: 30_500_00,
    },
    {
      id: 'cust_dd04',
      name: 'Tunde Bakare',
      email: 'tunde.bakare@gmail.com',
      last_payment_at: daysAgo(5, 13, 22),
      total_paid_kobo: 200_000_00,
    },
  ],
};

export const mockCustomers: { rows: { id: string; name: string }[] } = {
  rows: mockVendorStatement.recent_customers.map((c) => ({ id: c.id, name: c.name })),
};

export const mockVendorCustomerList: { rows: MockCustomerSummary[] } = {
  rows: mockVendorStatement.recent_customers,
};

/* ------------------------------------------------------------------ */
/* Statements (vendor + customer)                                     */
/* ------------------------------------------------------------------ */

export type MockRawTransaction = {
  id: string;
  date: string;
  amount_kobo: number;
  status: string;
  description?: string;
  invoice_id?: string | null;
};

export type MockVendorStatementResponse = {
  vendor: { id: string; name: string };
  opening_balance_kobo: number;
  transactions: MockRawTransaction[];
};

export type MockCustomerStatementResponse = {
  customer: { id: string; name: string; email: string };
  opening_balance_kobo: number;
  transactions: MockRawTransaction[];
};

const buildStatementTransactions = (): MockRawTransaction[] => [
  {
    id: 'txn_s01',
    date: daysAgo(6, 8, 10),
    amount_kobo: 45_000_00,
    status: 'MATCHED',
    description: 'Invoice INV-2026-0142 — Adaeze Okafor',
    invoice_id: 'INV-2026-0142',
  },
  {
    id: 'txn_s02',
    date: daysAgo(5, 12, 30),
    amount_kobo: 120_000_00,
    status: 'MATCHED',
    description: 'Invoice INV-2026-0143 — Chidi Okoro',
    invoice_id: 'INV-2026-0143',
  },
  {
    id: 'txn_s03',
    date: daysAgo(4, 15, 5),
    amount_kobo: 200_000_00,
    status: 'MATCHED',
    description: 'Invoice INV-2026-0144 — Tunde Bakare',
    invoice_id: 'INV-2026-0144',
  },
  {
    id: 'txn_s04',
    date: daysAgo(4, 9, 50),
    amount_kobo: 30_500_00,
    status: 'MATCHED',
    description: 'Invoice INV-2026-0145 — Ngozi Eze',
    invoice_id: 'INV-2026-0145',
  },
  {
    id: 'txn_s05',
    date: daysAgo(3, 10, 12),
    amount_kobo: 15_000_00,
    status: 'UNMATCHED',
    description: 'Unsolicited transfer — Blessing Adeyemi',
    invoice_id: null,
  },
  {
    id: 'txn_s06',
    date: daysAgo(2, 14, 2),
    amount_kobo: 87_500_00,
    status: 'MATCHED',
    description: 'Invoice INV-2026-0146 — Amaka Nwosu',
    invoice_id: 'INV-2026-0146',
  },
  {
    id: 'txn_s07',
    date: daysAgo(1, 11, 45),
    amount_kobo: 250_000_00,
    status: 'REFUNDED',
    description: 'Refund — duplicate payment Emeka Obi',
    invoice_id: 'INV-2026-0147',
  },
  {
    id: 'txn_s08',
    date: daysAgo(1, 9, 30),
    amount_kobo: 60_000_00,
    status: 'MATCHED',
    description: 'Invoice INV-2026-0148 — Fatima Bello',
    invoice_id: 'INV-2026-0148',
  },
  {
    id: 'txn_s09',
    date: daysAgo(0, 10, 0),
    amount_kobo: 18_750_00,
    status: 'MATCHED',
    description: 'Invoice INV-2026-0149 — Yusuf Abdullahi',
    invoice_id: 'INV-2026-0149',
  },
  {
    id: 'txn_s10',
    date: daysAgo(0, 8, 20),
    amount_kobo: 12_500_00,
    status: 'DUPLICATE',
    description: 'Duplicate — Olalekan Cole',
    invoice_id: null,
  },
];

export const mockVendorStatementResponse: MockVendorStatementResponse = {
  vendor: { id: '11111111-1111-1111-1111-111111111111', name: 'Lagos Fresh Mart' },
  opening_balance_kobo: 320_000_00,
  transactions: buildStatementTransactions(),
};

export const mockCustomerStatementResponse: MockCustomerStatementResponse = {
  customer: {
    id: 'cust_aa01',
    name: 'Adaeze Okafor',
    email: 'adaeze.okafor@gmail.com',
  },
  opening_balance_kobo: 12_500_00,
  transactions: [
    {
      id: 'txn_c01',
      date: daysAgo(6, 8, 10),
      amount_kobo: 15_000_00,
      status: 'MATCHED',
      description: 'Invoice INV-2026-0101',
      invoice_id: 'INV-2026-0101',
    },
    {
      id: 'txn_c02',
      date: daysAgo(3, 9, 5),
      amount_kobo: 30_000_00,
      status: 'MATCHED',
      description: 'Invoice INV-2026-0114',
      invoice_id: 'INV-2026-0114',
    },
    {
      id: 'txn_c03',
      date: daysAgo(1, 11, 15),
      amount_kobo: 45_000_00,
      status: 'MATCHED',
      description: 'Invoice INV-2026-0128',
      invoice_id: 'INV-2026-0128',
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Webhook delivery log                                              */
/* ------------------------------------------------------------------ */

export const mockWebhookList: {
  rows: WebhookDelivery[];
  total: number;
  deadLetterCount: number;
} = {
  total: 7,
  deadLetterCount: 1,
  rows: [
    {
      id: 'wh_aa01',
      event_type: 'payment.received',
      attempt: 1,
      http_status: 200,
      latency_ms: 142,
      status: 'success',
      created_at: daysAgo(0, 12, 5),
    },
    {
      id: 'wh_aa02',
      event_type: 'payment.matched',
      attempt: 1,
      http_status: 200,
      latency_ms: 98,
      status: 'success',
      created_at: daysAgo(0, 11, 20),
    },
    {
      id: 'wh_aa03',
      event_type: 'payment.received',
      attempt: 4,
      http_status: 500,
      latency_ms: 5031,
      status: 'dead_letter',
      created_at: daysAgo(0, 10, 40),
    },
    {
      id: 'wh_aa04',
      event_type: 'refund.initiated',
      attempt: 1,
      http_status: 200,
      latency_ms: 211,
      status: 'success',
      created_at: daysAgo(1, 9, 12),
    },
    {
      id: 'wh_aa05',
      event_type: 'payment.matched',
      attempt: 2,
      http_status: 200,
      latency_ms: 320,
      status: 'success',
      created_at: daysAgo(1, 14, 2),
    },
    {
      id: 'wh_aa06',
      event_type: 'payment.received',
      attempt: 1,
      http_status: null,
      latency_ms: null,
      status: 'pending',
      created_at: daysAgo(2, 8, 50),
    },
    {
      id: 'wh_aa07',
      event_type: 'payment.received',
      attempt: 2,
      http_status: 503,
      latency_ms: 4120,
      status: 'failed',
      created_at: daysAgo(2, 13, 30),
    },
  ],
};

/* ------------------------------------------------------------------ */
/* Transactions list + detail                                         */
/* ------------------------------------------------------------------ */

export type MockTransactionListItem = {
  id: string;
  transaction_id: string;
  va_number: string;
  amount_kobo: number;
  sender_name: string;
  sender_account: string;
  sender_bank_code: string;
  sender_bank_name: string;
  created_at: string;
  status: 'MATCHED' | 'UNMATCHED' | 'REFUNDED';
  invoice_id: string | null;
};

const TRANSACTION_STATUSES: MockTransactionListItem['status'][] = [
  'MATCHED',
  'MATCHED',
  'UNMATCHED',
  'MATCHED',
  'REFUNDED',
  'MATCHED',
  'UNMATCHED',
  'MATCHED',
  'MATCHED',
  'REFUNDED',
];

export const mockTransactionList: MockTransactionListItem[] = Array.from(
  { length: 10 },
  (_, i): MockTransactionListItem => ({
    id: `txn_l${String(i + 1).padStart(2, '0')}`,
    transaction_id: `TXN-2026-${String(4821 + i)}`,
    va_number: '8023456781',
    amount_kobo: [75_000_00, 45_000_00, 15_000_00, 120_000_00, 250_000_00, 30_500_00, 18_750_00, 60_000_00, 200_000_00, 87_500_00][i] ?? 50_000_00,
    sender_name: NIGERIAN_NAMES[i] ?? NIGERIAN_NAMES[0] ?? 'Unknown',
    sender_account: `0${100000000 + i * 137}${i}`,
    sender_bank_code: String(11 + i),
    sender_bank_name: BANKS[i % BANKS.length] ?? { code: '000', name: 'Unknown Bank' },
    created_at: daysAgo(i % 7, 9 + (i % 8), i * 7),
    status: TRANSACTION_STATUSES[i] ?? 'MATCHED',
    invoice_id:
      TRANSACTION_STATUSES[i] === 'MATCHED' ? `INV-2026-0${140 + i}` : null,
  }),
);

export const mockTransactionDetail = (id: string): TransactionDetail => ({
  id,
  transaction_id: `TXN-2026-${id.replace(/\D/g, '') || '4821'}`,
  va_number: '8023456781',
  amount_kobo: 75_000_00,
  sender_name: 'Adaeze Okafor',
  sender_account: '0123456789',
  sender_bank_code: '058',
  sender_bank_name: 'GTBank',
  raw_payload: {},
  created_at: daysAgo(1, 14, 12),
  invoice_id: 'INV-2026-0142',
  refund_status: undefined,
});

export const mockReconciliationDetail: ReconciliationDetail = {
  id: 'recon_9f21',
  transaction_id: 'TXN-2026-4821',
  invoice_id: 'INV-2026-0142',
  status: 'EXACT_MATCH',
  expected_kobo: 75_000_00,
  received_kobo: 75_000_00,
  difference_kobo: 0,
  action_taken: 'invoice_closed',
  created_at: daysAgo(1, 14, 15),
};

export const mockAnomalies: AnomalyAlert[] = [
  {
    id: 'anom_77f1',
    rule: 'LARGE_UNMATCHED_TRANSFER',
    transaction_id: 'TXN-2026-4992',
    severity: 'HIGH',
    timestamp: daysAgo(0, 9, 30),
  },
  {
    id: 'anom_22c4',
    rule: 'DUPLICATE_REFUND_ATTEMPT',
    transaction_id: 'TXN-2026-4837',
    severity: 'MEDIUM',
    timestamp: daysAgo(1, 14, 10),
  },
  {
    id: 'anom_91b8',
    rule: 'VELOCITY_SPIKE',
    transaction_id: 'TXN-2026-5011',
    severity: 'LOW',
    timestamp: daysAgo(2, 11, 5),
  },
];

/* ------------------------------------------------------------------ */
/* useMockFallback hook                                               */
/* ------------------------------------------------------------------ */

export type UseMockFallbackOptions<T> = {
  fetcher: () => Promise<T>;
  mock: T;
  isEmpty?: (data: T) => boolean;
  deps?: ReadonlyArray<unknown>;
};

export type UseMockFallbackResult<T> = {
  data: T | null;
  isLoading: boolean;
  errorMsg: string | null;
  isMock: boolean;
  refetch: () => void;
};

export function useMockFallback<T>({
  fetcher,
  mock,
  isEmpty,
  deps = [],
}: UseMockFallbackOptions<T>): UseMockFallbackResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMock, setIsMock] = useState(false);
  const [nonce, setNonce] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    void (async () => {
      setIsLoading(true);
      setErrorMsg(null);
      try {
        const result = await fetcher();
        if (!mounted.current) return;
        if (result === null || result === undefined || (isEmpty?.(result) ?? false)) {
          setData(mock);
          setIsMock(true);
        } else {
          setData(result);
          setIsMock(false);
        }
      } catch (err: unknown) {
        if (!mounted.current) return;
        log.warn({ err }, 'API request failed; serving demo mock data');
        setData(mock);
        setIsMock(true);
      } finally {
        if (mounted.current) setIsLoading(false);
      }
    })();
    return () => {
      mounted.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce]);

  return {
    data,
    isLoading,
    errorMsg,
    isMock,
    refetch: () => setNonce((n) => n + 1),
  };
}

export { NIGERIAN_NAMES, BANKS };
