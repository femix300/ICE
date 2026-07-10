import React from 'react';
import { useRouter } from 'next/router';
import Layout from '../../../components/layout';
import { api } from '../../../lib/api';
import { createLogger } from '../../../lib/logger';
import { formatKoboToNaira } from '../../../lib/format';
import { getVendorId } from '../../../lib/auth';
import { useMockFallback, mockVendorCustomerList } from '../../../lib/mockData';

const log = createLogger('vendor-customers-page');

type CustomerListItem = {
  id: string;
  name: string;
  email: string;
  last_payment_at: string | null;
  total_paid_kobo: number;
};

type CustomersListResponse = {
  rows: CustomerListItem[];
  total: number;
};

export default function VendorCustomers() {
  const router = useRouter();

  const { data, isLoading } = useMockFallback<CustomersListResponse>({
    fetcher: () =>
      api.get<CustomersListResponse>(`/v1/vendors/${getVendorId()}/customers`),
    mock: mockVendorCustomerList,
    isEmpty: (res) => res.rows.length === 0,
  });

  const customers = data?.rows ?? [];
  const headers = ['Customer Name', 'Last Payment Date', 'Total Paid'];

  return (
    <Layout
      variant="vendor"
      breadcrumbs={[
        { label: 'Customers', href: '/vendor/customers' },
        { label: 'All Customers' },
      ]}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Customers
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Everyone who pays into your virtual accounts, with lifetime totals.
          </p>
        </div>

        {isLoading ? (
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="animate-pulse divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`h-16 ${i % 2 === 0 ? 'bg-zinc-50 dark:bg-zinc-900/40' : 'bg-white dark:bg-zinc-900'}`}
                />
              ))}
            </div>
          </div>
        ) : customers.length === 0 ? (
          <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-zinc-200/60 bg-white p-8 text-center dark:border-zinc-800/60 dark:bg-zinc-900/20">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-600">
              <svg className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A2.25 2.25 0 0112.75 21.5h-1.5a2.25 2.25 0 01-2.25-2.263V19.13m-2.625.372a9.337 9.337 0 01-4.121-.952 4.125 4.125 0 007.533-2.493M3.75 19.128v-.003c0-1.113.285-2.16.786-3.07M4.5 19.128v.109A2.25 2.25 0 006.75 21.5h1.5a2.25 2.25 0 002.25-2.263V19.13"
                />
              </svg>
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">No customers yet</h3>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              Customers will appear here once payments start flowing into your virtual accounts.
            </p>
          </div>
        ) : (
          <div className="w-full overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950/50">
                    {headers.map((header) => (
                      <th
                        key={header}
                        className="px-6 py-4 text-[10px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 whitespace-nowrap"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/60 dark:divide-zinc-800/60">
                  {customers.map((customer) => (
                    <tr
                      key={customer.id}
                      onClick={() => router.push(`/vendor/customers/${customer.id}`)}
                      className="cursor-pointer transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-800/40"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-white">
                          {customer.name}
                        </p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{customer.email}</p>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-xs text-zinc-500 dark:text-zinc-400">
                          {customer.last_payment_at
                            ? new Date(customer.last_payment_at).toLocaleDateString()
                            : '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm font-mono font-semibold text-zinc-900 dark:text-white">
                          {formatKoboToNaira(customer.total_paid_kobo)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
