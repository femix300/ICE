/* eslint-disable react-hooks/set-state-in-effect */
import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { getMerchantId } from '../lib/auth';
import { createLogger } from '../lib/logger';
import SimulatorResultCard, { type SimulatorResult } from './SimulatorResultCard';

const log = createLogger('webhook-simulator');

const BANK_OPTIONS = [
  'Zenith Bank',
  'GTBank',
  'Access Bank',
  'First Bank',
  'UBA',
  'Stanbic IBTC',
  'Fidelity Bank',
  'Union Bank',
];

type Scenario = 'exact_match' | 'misdirected' | 'duplicate' | 'overpaid' | 'underpaid';

type ScenarioPreset = {
  name: string;
  description: string;
  senderName: string;
  senderAccount: string;
  senderBank: string;
  amount: number; // in Naira for input display
  virtualAccountNumber: string;
};

export default function WebhookSimulator() {
  const [selectedScenario, setSelectedScenario] = useState<Scenario>('exact_match');
  const [merchantId, setMerchantId] = useState<string>('');
  
  // Form fields
  const [transactionId, setTransactionId] = useState<string>('');
  const [senderName, setSenderName] = useState<string>('');
  const [senderAccount, setSenderAccount] = useState<string>('');
  const [senderBank, setSenderBank] = useState<string>('Zenith Bank');
  const [amountNaira, setAmountNaira] = useState<string>('1500.00');
  const [virtualAccountNumber, setVirtualAccountNumber] = useState<string>('');

  // Loader and API status
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isFormLoading, setIsFormLoading] = useState<boolean>(true);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [simulationResult, setSimulationResult] = useState<SimulatorResult | null>(null);
  const [simulationError, setSimulationError] = useState<string | null>(null);

  // Dynamic context fetched from active merchant/vendors
  const [context, setContext] = useState<{
    vendorId?: string;
    customerVa?: string;
    recentTxId?: string;
    originalAmountKobo?: number;
  }>({});

  // Auto-generate a transaction ID
  const generateTxnId = () => {
    const randomHex = Math.floor(100000 + Math.random() * 900000);
    return `TXN-${randomHex}-${Date.now().toString().slice(-4)}`;
  };

  // Fetch real data from the merchant to populate presets dynamically
  useEffect(() => {
    let active = true;
    const loadMerchantContext = async () => {
      try {
        const mId = getMerchantId();
        setMerchantId(mId);

        // 1. Fetch vendors
        const vendorsRes = await api.get<{ data: Array<{ id: string; nomba_va_number?: string }> }>(
          `/v1/vendors?limit=10`
        );
        const vendors = vendorsRes?.data || [];
        if (vendors.length === 0) {
          setIsFormLoading(false);
          return;
        }

        const firstVendor = vendors[0];
        if (!firstVendor) return;
        const vId = firstVendor.id;

        // 2. Fetch invoices for first vendor
        const invoices = await api.get<Array<{ id: string; customer_id: string; amount_kobo: number; paid_amount_kobo: number; status: string }>>(
          `/v1/invoices/vendor/${vId}`
        );
        const openInvoice = invoices.find(
          (inv) => inv.status === 'issued' || inv.status === 'partially_paid'
        );

        let customerVa = '';
        let originalAmountKobo = 150000; // default 1500 Naira

        if (openInvoice) {
          originalAmountKobo = openInvoice.amount_kobo - openInvoice.paid_amount_kobo;
          // Fetch customer to get their VA
          try {
            const customer = await api.get<{ nomba_va_number?: string }>(
              `/v1/vendors/${vId}/customers/${openInvoice.customer_id}`
            );
            customerVa = customer?.nomba_va_number || '';
          } catch (err) {
            log.error({ err }, 'failed to fetch customer details for simulator');
          }
        }

        // If no customer VA, use vendor DVA or a placeholder
        if (!customerVa) {
          customerVa = firstVendor.nomba_va_number || '1029384756';
        }

        // 3. Fetch recent transactions for duplicate ID
        let recentTxId = '';
        try {
          const txs = await api.get<Array<{ transaction_id: string }>>(
            `/v1/vendors/${vId}/transactions?limit=1`
          );
          if (txs && txs.length > 0 && txs[0]) {
            recentTxId = txs[0].transaction_id;
          }
        } catch (err) {
          log.error({ err }, 'failed to fetch recent transactions');
        }

        if (active) {
          setContext({
            vendorId: vId,
            customerVa,
            recentTxId,
            originalAmountKobo,
          });
        }
      } catch (err) {
        log.error({ err }, 'failed to load merchant context for simulator');
      } finally {
        if (active) setIsFormLoading(false);
      }
    };

    void loadMerchantContext();
    return () => {
      active = false;
    };
  }, []);

  // Presets configuration
  const presets: Record<Scenario, ScenarioPreset> = {
    exact_match: {
      name: 'Exact Match',
      description: 'Payment matches an open invoice perfectly',
      senderName: 'Chukwuemeka Obi',
      senderAccount: '0123456789',
      senderBank: 'Zenith Bank',
      amount: (context.originalAmountKobo ?? 150000) / 100,
      virtualAccountNumber: context.customerVa || '1029384756',
    },
    misdirected: {
      name: 'Misdirected',
      description: 'Payment lands on the wrong virtual account',
      senderName: 'Fatima Abubakar',
      senderAccount: '2034567891',
      senderBank: 'GTBank',
      amount: 750.0,
      virtualAccountNumber: '9999999999', // wrong DVA
    },
    duplicate: {
      name: 'Duplicate',
      description: 'Same transaction ID sent twice',
      senderName: 'Chukwuemeka Obi',
      senderAccount: '0123456789',
      senderBank: 'Zenith Bank',
      amount: (context.originalAmountKobo ?? 150000) / 100,
      virtualAccountNumber: context.customerVa || '1029384756',
    },
    overpaid: {
      name: 'Overpaid',
      description: 'Payment exceeds invoice amount',
      senderName: 'Babatunde Adeyemi',
      senderAccount: '3045678902',
      senderBank: 'Access Bank',
      amount: ((context.originalAmountKobo ?? 150000) + 100000) / 100, // + 1000 Naira
      virtualAccountNumber: context.customerVa || '1029384756',
    },
    underpaid: {
      name: 'Underpaid',
      description: 'Payment is below invoice amount',
      senderName: 'Ngozi Eze',
      senderAccount: '4056789013',
      senderBank: 'First Bank',
      amount: Math.max(300.0, ((context.originalAmountKobo ?? 150000) - 50000) / 100), // - 500 Naira (minimum 300)
      virtualAccountNumber: context.customerVa || '1029384756',
    },
  };

  // Apply preset values whenever scenario or context changes
  useEffect(() => {
    const preset = presets[selectedScenario];
    if (preset) {
      setSenderName(preset.senderName);
      setSenderAccount(preset.senderAccount);
      setSenderBank(preset.senderBank);
      setAmountNaira(preset.amount.toFixed(2));
      setVirtualAccountNumber(preset.virtualAccountNumber);
      
      if (selectedScenario === 'duplicate') {
        setTransactionId(context.recentTxId || generateTxnId());
      } else {
        setTransactionId(generateTxnId());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedScenario, context]);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!senderName.trim()) errors.senderName = 'Sender Name is required';
    if (!senderAccount.trim()) errors.senderAccount = 'Account Number is required';
    if (!/^\d+$/.test(senderAccount)) errors.senderAccount = 'Account Number must contain only digits';
    if (!amountNaira || isNaN(Number(amountNaira)) || Number(amountNaira) <= 0) {
      errors.amountNaira = 'Please enter a valid amount';
    }
    if (!virtualAccountNumber.trim()) errors.virtualAccountNumber = 'Virtual Account is required';
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleFireWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setSimulationError(null);
    setSimulationResult(null);

    const amountKobo = Math.round(Number(amountNaira) * 100);

    try {
      const response = await api.post<SimulatorResult>('/v1/webhooks/simulate', {
        scenario: selectedScenario,
        transactionId: transactionId || undefined,
        amount: amountKobo,
        senderName,
        senderAccount,
        senderBank,
        virtualAccountNumber,
        merchantId,
      });

      setSimulationResult(response);
    } catch (err: unknown) {
      log.error({ err }, 'Simulation endpoint failed');
      setSimulationError(
        err instanceof Error ? err.message : 'An error occurred during webhook simulation'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setSimulationResult(null);
    setSimulationError(null);
    setTransactionId(generateTxnId());
  };

  if (isFormLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-300 border-t-emerald-500" />
          <p className="text-sm font-semibold text-zinc-500">Loading simulator context...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Horizontal Scenario Card Selector */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
        {(Object.keys(presets) as Scenario[]).map((key) => {
          const active = selectedScenario === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => {
                setSelectedScenario(key);
                setSimulationResult(null);
                setSimulationError(null);
              }}
              className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all hover:shadow-sm ${
                active
                  ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10'
                  : 'border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900'
              }`}
            >
              <span
                className={`text-xs font-bold uppercase tracking-wider ${
                  active ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400'
                }`}
              >
                {presets[key].name}
              </span>
              <span className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 font-medium">
                {presets[key].description}
              </span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* Left Column: Form */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <form onSubmit={handleFireWebhook} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">
                Transaction ID (auto-generated)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 bg-zinc-50 dark:border-zinc-850 dark:bg-zinc-950 dark:text-zinc-300"
                  placeholder="Enter or generate ID"
                />
                <button
                  type="button"
                  onClick={() => setTransactionId(generateTxnId())}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 hover:bg-zinc-100 px-3 py-2 text-xs font-bold text-zinc-600 dark:border-zinc-800 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-750"
                >
                  Regen
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">
                Sender Name
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className={`w-full rounded-lg border px-3 py-2 text-sm font-semibold ${
                  validationErrors.senderName
                    ? 'border-red-500/50 focus:border-red-500'
                    : 'border-zinc-200 dark:border-zinc-850'
                } bg-white dark:bg-zinc-950`}
              />
              {validationErrors.senderName && (
                <p className="mt-1 text-xs text-red-500">{validationErrors.senderName}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">
                  Sender Account Number
                </label>
                <input
                  type="text"
                  value={senderAccount}
                  onChange={(e) => setSenderAccount(e.target.value)}
                  maxLength={10}
                  className={`w-full rounded-lg border px-3 py-2 text-sm font-semibold ${
                    validationErrors.senderAccount
                      ? 'border-red-500/50 focus:border-red-500'
                      : 'border-zinc-200 dark:border-zinc-850'
                  } bg-white dark:bg-zinc-950`}
                />
                {validationErrors.senderAccount && (
                  <p className="mt-1 text-xs text-red-500">{validationErrors.senderAccount}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">
                  Sender Bank
                </label>
                <select
                  value={senderBank}
                  onChange={(e) => setSenderBank(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 bg-white dark:border-zinc-850 dark:bg-zinc-950 dark:text-zinc-300"
                >
                  {BANK_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">
                  Amount (₦)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amountNaira}
                  onChange={(e) => setAmountNaira(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm font-semibold ${
                    validationErrors.amountNaira
                      ? 'border-red-500/50 focus:border-red-500'
                      : 'border-zinc-200 dark:border-zinc-850'
                  } bg-white dark:bg-zinc-950`}
                />
                {validationErrors.amountNaira && (
                  <p className="mt-1 text-xs text-red-500">{validationErrors.amountNaira}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">
                  Target Virtual Account
                </label>
                <input
                  type="text"
                  value={virtualAccountNumber}
                  onChange={(e) => setVirtualAccountNumber(e.target.value)}
                  className={`w-full rounded-lg border px-3 py-2 text-sm font-semibold ${
                    validationErrors.virtualAccountNumber
                      ? 'border-red-500/50 focus:border-red-500'
                      : 'border-zinc-200 dark:border-zinc-850'
                  } bg-white dark:bg-zinc-950`}
                />
                {validationErrors.virtualAccountNumber && (
                  <p className="mt-1 text-xs text-red-500">{validationErrors.virtualAccountNumber}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-1">
                Merchant ID (Read-only)
              </label>
              <input
                type="text"
                readOnly
                value={merchantId}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-400 bg-zinc-50 dark:border-zinc-850 dark:bg-zinc-950 dark:text-zinc-650"
              />
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 px-4 py-3 text-sm font-bold text-white transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Firing...
                  </>
                ) : (
                  'Fire Webhook'
                )}
              </button>
              <p className="mt-3 text-center text-[10px] text-zinc-400 font-medium leading-relaxed">
                Simulates a real Nomba payment webhook — signed with HMAC-SHA256 and processed through ICE&apos;s full reconciliation pipeline.
              </p>
            </div>
          </form>
        </div>

        {/* Right Column: Results */}
        <div className="flex flex-col justify-start">
          <SimulatorResultCard
            result={simulationResult}
            error={simulationError}
            inputs={{
              virtualAccountNumber,
              amount: Math.round(Number(amountNaira) * 100),
              senderName,
              senderAccount,
              senderBank,
              merchantId,
              scenario: selectedScenario,
            }}
            onReset={handleReset}
            onFireAgain={() => {
              // Regenerate TxID if not duplicate
              if (selectedScenario !== 'duplicate') {
                setTransactionId(generateTxnId());
              }
              setSimulationResult(null);
              setSimulationError(null);
            }}
          />
        </div>
      </div>
    </div>
  );
}
