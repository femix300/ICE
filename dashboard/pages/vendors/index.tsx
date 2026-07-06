import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/layout';
import VendorCard, { Vendor } from '../../components/vendor-card';
import { api } from '../../lib/api';
import { createLogger } from '../../lib/logger';

const log = createLogger('vendors-list-page');
const ITEMS_PER_PAGE = 6;

export default function VendorsIndex() {
  const router = useRouter();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'pending'>(
    'all',
  );
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal states
  const [suspendingId, setSuspendingId] = useState<string | null>(null);
  const [isSuspending, setIsSuspending] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const fetchVendors = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const offset = (page - 1) * ITEMS_PER_PAGE;
      const res = await api.get<{ rows: Vendor[]; total: number }>(
        `/v1/vendors?limit=${ITEMS_PER_PAGE}&offset=${offset}`,
      );
      if (res) {
        setVendors(res.rows);
        setTotal(res.total);
      }
    } catch (err: unknown) {
      log.error({ err }, 'Failed to fetch vendors');
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'An error occurred while loading vendors. Please try again.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, [page]);

  // Filtering on frontend (in a real app this would be backend query parameters, but frontend filter gives instant feedback for MVP)
  const filteredVendors = vendors.filter((v) => {
    if (statusFilter === 'all') return true;
    return v.va_status === statusFilter;
  });

  const handleSuspendClick = (id: string) => {
    setSuspendingId(id);
  };

  const confirmSuspend = async () => {
    if (!suspendingId) return;
    setIsSuspending(true);
    try {
      await api.post(`/v1/vendors/${suspendingId}/suspend`, {});
      setSuspendingId(null);
      await fetchVendors(); // Refresh
    } catch (err: unknown) {
      log.error({ err, id: suspendingId }, 'Failed to suspend vendor');
      alert(err instanceof Error ? err.message : 'Failed to suspend vendor');
    } finally {
      setIsSuspending(false);
    }
  };

  const handleGenerateKey = async (id: string) => {
    try {
      const res = await api.post<{ apiKey: string }>(`/v1/vendors/${id}/api-keys`, {});
      if (res?.apiKey) {
        setGeneratedKey(res.apiKey);
      }
    } catch (err: unknown) {
      log.error({ err, id }, 'Failed to generate API key');
      alert(err instanceof Error ? err.message : 'Failed to generate API key');
    }
  };

  const handleCopyKey = async () => {
    if (!generatedKey) return;
    try {
      await navigator.clipboard.writeText(generatedKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } catch (err) {
      log.error({ err }, 'Failed to copy key');
    }
  };

  const totalPages = Math.ceil(total / ITEMS_PER_PAGE);

  return (
    <Layout variant="owner">
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
              Marketplace Vendors
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              Onboard and manage merchant collection sub-accounts.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/vendors/new')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-emerald-500 hover:bg-emerald-400 shadow-md shadow-emerald-500/10 transition-all hover:translate-y-[-1px] self-start sm:self-auto"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add New Vendor
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4">
          <div className="flex gap-1.5 bg-zinc-100 dark:bg-zinc-900/60 p-1 rounded-xl border border-zinc-200/50 dark:border-zinc-800/40">
            {(['all', 'active', 'pending', 'suspended'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all capitalize ${
                  statusFilter === status
                    ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Main List Workspace */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 animate-pulse">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-zinc-900/40 border border-zinc-800/40 rounded-2xl h-60" />
            ))}
          </div>
        ) : errorMsg ? (
          <div className="bg-red-500/10 border border-red-500/25 rounded-2xl p-6 text-center max-w-xl mx-auto space-y-3">
            <p className="text-sm font-semibold text-red-500">{errorMsg}</p>
            <button
              type="button"
              onClick={fetchVendors}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-800 border border-zinc-700 hover:bg-zinc-750 text-white transition-all"
            >
              Retry Connection
            </button>
          </div>
        ) : filteredVendors.length === 0 ? (
          <div className="text-center py-16 bg-white dark:bg-zinc-900/20 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl p-8 max-w-lg mx-auto space-y-4">
            <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mx-auto text-zinc-400 dark:text-zinc-600">
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A2.25 2.25 0 0112.75 21.5h-1.5a2.25 2.25 0 01-2.25-2.263V19.13m-2.625.372a9.337 9.337 0 01-4.121-.952 4.125 4.125 0 007.533-2.493M3.75 19.128v-.003c0-1.113.285-2.16.786-3.07M4.5 19.128v.109A2.25 2.25 0 006.75 21.5h1.5a2.25 2.25 0 002.25-2.263V19.13"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                No Vendors Found
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto leading-relaxed">
                {statusFilter === 'all'
                  ? 'Get started by creating your very first marketplace merchant vendor.'
                  : `There are currently no vendors matching the "${statusFilter}" status filter.`}
              </p>
            </div>
            {statusFilter === 'all' && (
              <button
                type="button"
                onClick={() => router.push('/vendors/new')}
                className="px-4 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-white shadow-sm transition-all inline-flex items-center gap-1.5"
              >
                Create First Vendor
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredVendors.map((vendor) => (
                <VendorCard
                  key={vendor.id}
                  vendor={vendor}
                  onSuspend={handleSuspendClick}
                  onGenerateKey={handleGenerateKey}
                />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 pt-5">
                <p className="text-xs font-semibold text-zinc-500">
                  Showing page {page} of {totalPages} ({total} total vendors)
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-lg text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Suspend Confirmation Dialog Modal */}
        {suspendingId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setSuspendingId(null)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-title"
              className="relative max-w-md w-full bg-zinc-900 border border-zinc-850 rounded-2xl p-6 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            >
              <div className="flex gap-3 text-red-400">
                <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 id="modal-title" className="text-base font-bold text-white tracking-tight">
                    Suspend Vendor Account?
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1 leading-relaxed font-medium">
                    This will disable the vendor's Nomba Dedicated Virtual Account immediately. Any
                    transfers sent to this account will fail or be rejected.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={isSuspending}
                  onClick={() => setSuspendingId(null)}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSuspending}
                  onClick={confirmSuspend}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-red-500 hover:bg-red-450 text-white transition-all shadow-md shadow-red-500/10"
                >
                  {isSuspending ? 'Suspending...' : 'Yes, Suspend'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Generated API Key Dialog Modal */}
        {generatedKey && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setGeneratedKey(null)}
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="key-modal-title"
              className="relative max-w-lg w-full bg-zinc-900 border border-zinc-850 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
            >
              <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-xl flex gap-3">
                <svg
                  className="w-5 h-5 shrink-0 mt-0.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div className="space-y-1">
                  <h4
                    id="key-modal-title"
                    className="text-sm font-bold text-red-700 dark:text-red-400 tracking-tight"
                  >
                    Security Warning
                  </h4>
                  <p className="text-xs text-red-600/90 dark:text-red-400/90 leading-relaxed font-medium">
                    This scoped vendor API key is only shown once. Keep it secure — if lost, you
                    must rotate/generate a new one to re-authenticate.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
                  Scoped Vendor API Key
                </label>
                <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl p-3 font-mono text-sm tracking-tight text-white select-all">
                  <span className="flex-1 overflow-x-auto whitespace-nowrap pr-2">
                    {generatedKey}
                  </span>
                  <button
                    type="button"
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      copiedKey
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800'
                    }`}
                    onClick={handleCopyKey}
                    title="Copy API key"
                    aria-label="Copy API key"
                  >
                    {copiedKey ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setGeneratedKey(null)}
                className="w-full py-3 px-4 rounded-xl text-sm font-bold tracking-tight bg-zinc-850 hover:bg-zinc-800 text-white transition-all border border-zinc-800"
              >
                Close Window
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
