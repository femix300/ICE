import React, { useState, useEffect } from 'react';

interface ApiKeyDisplayProps {
  apiKey: string;
  onContinue: () => void;
}

export default function ApiKeyDisplay({ apiKey, onContinue }: ApiKeyDisplayProps) {
  const [isRevealed, setIsRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);

  // Masked Key Logic
  const getMaskedKey = (key: string) => {
    if (key.length <= 12) return '••••••••';
    const prefix = key.slice(0, 8);
    const suffix = key.slice(-4);
    const maskedLength = Math.max(8, key.length - 12);
    return `${prefix}${'•'.repeat(maskedLength)}${suffix}`;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => setCopied(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  return (
    <div className="max-w-lg w-full mx-auto bg-zinc-900 border border-zinc-800/80 rounded-2xl p-6 sm:p-8 space-y-6">
      {/* Warning Banner */}
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
          <h4 className="text-sm font-bold text-red-700 dark:text-red-400 tracking-tight">
            Security Warning
          </h4>
          <p className="text-xs text-red-600/90 dark:text-red-400/90 leading-relaxed font-medium">
            Save this key now. It will never be shown again. If you navigate away or refresh, you
            must generate a new key to re-authenticate.
          </p>
        </div>
      </div>

      {/* API Key Box */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
          Your Merchant API Key
        </label>
        <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-xl p-3 font-mono text-sm tracking-tight text-white select-all">
          <span className="flex-1 overflow-x-auto whitespace-nowrap pr-2 scrollbar-none">
            {isRevealed ? apiKey : getMaskedKey(apiKey)}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Reveal/Hide toggle */}
            <button
              type="button"
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 border border-transparent transition-colors"
              onClick={() => setIsRevealed(!isRevealed)}
              title={isRevealed ? 'Hide API key' : 'Show API key'}
            >
              {isRevealed ? (
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
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                  />
                </svg>
              ) : (
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
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              )}
            </button>

            {/* Copy button */}
            <button
              type="button"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                copied
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800'
              }`}
              onClick={handleCopy}
            >
              {copied ? (
                <>
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
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
                  Copy
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Acknowledgment Checkbox */}
      <label className="flex items-start gap-3 cursor-pointer group select-none">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
          className="w-4 h-4 shrink-0 rounded border-zinc-800 bg-zinc-950 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-900 mt-0.5 accent-emerald-500"
        />
        <span className="text-xs font-medium text-zinc-400 group-hover:text-zinc-300 leading-relaxed">
          I have securely copied this API key and understand it will never be displayed again.
        </span>
      </label>

      {/* Action Button */}
      <button
        type="button"
        disabled={!acknowledged}
        onClick={onContinue}
        className={`w-full py-3 px-4 rounded-xl text-sm font-bold tracking-tight transition-all duration-200 ${
          acknowledged
            ? 'bg-emerald-500 text-white hover:bg-emerald-400 shadow-md shadow-emerald-500/10 hover:translate-y-[-1px]'
            : 'bg-zinc-800 text-zinc-500 cursor-not-allowed border border-zinc-700/50'
        }`}
      >
        Continue to Dashboard
      </button>
    </div>
  );
}
