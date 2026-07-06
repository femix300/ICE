import React, { useState } from 'react';
import { createLogger } from '../lib/logger';

const log = createLogger('vendor-card');

export interface Vendor {
  id: string;
  merchant_id: string;
  name: string;
  nomba_va_number: string | null;
  nomba_bank_name: string | null;
  va_status: 'pending' | 'active' | 'suspended';
  created_at: string | Date;
  updated_at: string | Date;
}

interface VendorCardProps {
  vendor: Vendor;
  onSuspend: (id: string) => void;
  onGenerateKey: (id: string) => void;
}

export default function VendorCard({ vendor, onSuspend, onGenerateKey }: VendorCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyVa = async () => {
    if (!vendor.nomba_va_number) return;
    try {
      await navigator.clipboard.writeText(vendor.nomba_va_number);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      log.error({ err }, 'Failed to copy VA number to clipboard');
    }
  };

  const getStatusStyle = (status: Vendor['va_status']) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'suspended':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-5 hover:border-zinc-700/80 hover:bg-zinc-900/90 transition-all duration-200 shadow-lg flex flex-col justify-between h-full">
      <div className="space-y-4">
        {/* Header: Name and Status */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3
              className="text-lg font-bold tracking-tight text-white truncate"
              title={vendor.name}
            >
              {vendor.name}
            </h3>
            <p className="text-[10px] text-zinc-500 font-mono mt-0.5 truncate">{vendor.id}</p>
          </div>
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded border capitalize shrink-0 ${getStatusStyle(
              vendor.va_status,
            )}`}
          >
            {vendor.va_status}
          </span>
        </div>

        {/* VA Account Box */}
        <div className="bg-zinc-950/60 border border-zinc-800/60 rounded-xl p-3.5 space-y-2">
          <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">
            Nomba Virtual Account
          </span>
          {vendor.nomba_va_number ? (
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-mono font-bold text-white tracking-tight">
                  {vendor.nomba_va_number}
                </p>
                <p className="text-[10px] font-semibold text-zinc-400 mt-0.5">
                  {vendor.nomba_bank_name ?? 'Nomba Bank'}
                </p>
              </div>
              <button
                type="button"
                className={`p-2 rounded-lg border text-zinc-400 transition-all ${
                  copied
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : 'bg-zinc-900 border-zinc-800 hover:text-white hover:bg-zinc-800'
                }`}
                onClick={handleCopyVa}
                title="Copy VA account number"
                aria-label="Copy VA account number"
              >
                {copied ? (
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg
                    className="w-3.5 h-3.5"
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
                )}
              </button>
            </div>
          ) : (
            <p className="text-xs font-semibold text-zinc-500 italic py-1 leading-relaxed">
              Account provisioning pending...
            </p>
          )}
        </div>
      </div>

      {/* Footer / Actions */}
      <div className="border-t border-zinc-800/60 pt-4 mt-5 space-y-2.5">
        <div className="flex items-center justify-between text-[11px] text-zinc-500 font-medium">
          <span>Registered:</span>
          <span>{new Date(vendor.created_at).toLocaleDateString()}</span>
        </div>

        {vendor.va_status === 'active' && (
          <div className="flex gap-2 w-full pt-1">
            <button
              type="button"
              onClick={() => onSuspend(vendor.id)}
              className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold text-red-400 hover:text-red-300 bg-red-500/5 hover:bg-red-500/10 border border-red-500/15 hover:border-red-500/25 transition-all"
            >
              Suspend
            </button>
            <button
              type="button"
              onClick={() => onGenerateKey(vendor.id)}
              className="flex-1 py-2 px-3 rounded-lg text-xs font-semibold text-emerald-400 hover:text-emerald-300 bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/15 hover:border-emerald-500/25 transition-all"
            >
              API Key
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
