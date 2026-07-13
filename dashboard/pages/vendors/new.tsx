import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { z } from 'zod';
import Layout from '../../components/layout';
import { api } from '../../lib/api';
import { AppError } from '../../lib/errors';
import { createLogger } from '../../lib/logger';

const log = createLogger('new-vendor-page');

const createVendorSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Vendor name must be at least 2 characters')
    .max(100, 'Vendor name must be at most 100 characters'),
});

interface SuccessVaInfo {
  name: string;
  nomba_va_number: string;
  nomba_bank_name: string;
}

export default function NewVendor() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [touched, setTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<SuccessVaInfo | null>(null);
  const [copied, setCopied] = useState(false);

  // Live validation
  const validation = createVendorSchema.safeParse({ name });
  const errorMsg = !validation.success ? validation.error.issues[0]?.message : null;

  const handleCopyVa = async () => {
    if (!successInfo?.nomba_va_number) return;
    try {
      await navigator.clipboard.writeText(successInfo.nomba_va_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      log.error({ err }, 'Failed to copy VA number to clipboard');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);

    if (!validation.success) return;

    setIsLoading(true);
    setFormError(null);

    try {
      const response = await api.post<{
        name: string;
        nomba_va_number: string | null;
        nomba_bank_name: string | null;
      }>('/v1/vendors', { name });

      if (response && response.nomba_va_number) {
        setSuccessInfo({
          name: response.name,
          nomba_va_number: response.nomba_va_number,
          nomba_bank_name: response.nomba_bank_name ?? 'Nomba Bank',
        });
      } else {
        throw new AppError(
          'PROVISIONING_FAILED',
          'Virtual account was not provisioned correctly. Please check server logs.',
        );
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred during vendor creation.';
      setFormError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout variant="owner">
      <div className="flex flex-col items-center justify-center py-6 sm:py-12">
        {successInfo ? (
          /* Success Screen */
          <div className="max-w-lg w-full bg-zinc-900 border border-zinc-800/80 rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl">
              <svg
                className="w-5 h-5 shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <div>
                <h4 className="text-sm font-bold text-emerald-500 tracking-tight">
                  Vendor Created Successfully
                </h4>
                <p className="text-xs text-emerald-500/90 leading-relaxed font-medium mt-0.5">
                  A Nomba Dedicated Virtual Account has been successfully provisioned.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
                  Vendor Name
                </label>
                <p className="text-sm font-semibold text-white">{successInfo.name}</p>
              </div>

              <div className="bg-zinc-950/60 border border-zinc-800 rounded-xl p-4 space-y-3">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
                  Nomba Virtual Account Details
                </span>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-lg font-mono font-bold text-white tracking-tight">
                      {successInfo.nomba_va_number}
                    </p>
                    <p className="text-xs font-semibold text-zinc-400 mt-1">
                      {successInfo.nomba_bank_name}
                    </p>
                  </div>
                  <button
                    type="button"
                    className={`p-2.5 rounded-lg border text-zinc-400 transition-all ${
                      copied
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                        : 'bg-zinc-900 border-zinc-800 hover:text-white hover:bg-zinc-800'
                    }`}
                    onClick={handleCopyVa}
                    title="Copy VA account number"
                    aria-label="Copy VA account number"
                  >
                    {copied ? (
                      <>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                          />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push('/vendors')}
              className="w-full py-3 px-4 rounded-xl text-sm font-bold tracking-tight bg-zinc-800 hover:bg-zinc-700 text-white transition-all border border-zinc-700/50"
            >
              Back to All Vendors
            </button>
          </div>
        ) : (
          /* Input Form */
          <div className="max-w-lg w-full bg-zinc-900 border border-zinc-800/80 rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="space-y-1.5 text-center sm:text-left">
              <h2 className="text-2xl font-bold tracking-tight text-white">Create New Vendor</h2>
              <p className="text-xs text-zinc-400 font-medium">
                Add a merchant vendor to instantly provision their dedicated virtual collection
                account.
              </p>
            </div>

            {formError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 p-4 rounded-xl flex gap-3 text-xs font-semibold leading-relaxed">
                <svg
                  className="w-4 h-4 shrink-0 mt-0.5"
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
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <div className="space-y-1.5">
                <label
                  htmlFor="vendorName"
                  className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block"
                >
                  Vendor Brand / Business Name
                </label>
                <input
                  id="vendorName"
                  type="text"
                  placeholder="e.g. Acme Stores Nigeria"
                  disabled={isLoading}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => setTouched(true)}
                  className={`w-full bg-zinc-950 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-white placeholder-zinc-600 transition-colors ${
                    touched && errorMsg ? 'border-red-500/60' : 'border-zinc-800/80'
                  }`}
                />
                {touched && errorMsg && (
                  <span className="text-xs font-semibold text-red-500 block pl-1">{errorMsg}</span>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => router.push('/vendors')}
                  className="flex-1 py-3 px-4 rounded-xl text-sm font-bold tracking-tight bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`flex-2 py-3 px-6 rounded-xl text-sm font-bold tracking-tight transition-all duration-200 flex items-center justify-center gap-2 ${
                    isLoading
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50'
                      : 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-md shadow-emerald-500/10 hover:translate-y-[-1px]'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <svg
                        className="animate-spin h-4 w-4 text-zinc-500 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Provisioning DVA...
                    </>
                  ) : (
                    'Create Vendor'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </Layout>
  );
}
