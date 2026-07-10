import React, { useState } from 'react';
import { useRouter } from 'next/router';
import { z } from 'zod';
import Layout from '../components/layout';
import ApiKeyDisplay from '../components/api-key-display';
import { api } from '../lib/api';
import { AppError } from '../lib/errors';
import {
  setApiKey as persistApiKey,
  setMerchantId,
} from '../lib/auth';

// Validation Schema with Zod
const registerSchema = z.object({
  businessName: z
    .string()
    .trim()
    .min(3, 'Business name must be at least 3 characters')
    .max(100, 'Business name must be at most 100 characters'),
  email: z.string().trim().min(1, 'Email is required').email('Invalid email address'),
  webhookUrl: z
    .string()
    .trim()
    .min(1, 'Webhook URL is required')
    .url('Invalid URL format')
    .startsWith('https://', 'Webhook URL must be secure (https://)'),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const registerResponseSchema = z.union([
  z.object({ api_key: z.string(), merchant: z.object({ id: z.string() }).passthrough() }),
  z.object({ apiKey: z.string(), merchant: z.object({ id: z.string() }).passthrough() }),
  z.string(),
]);

type RegisterResponse = z.infer<typeof registerResponseSchema>;

export default function Register() {
  const router = useRouter();

  // Form Fields State
  const [values, setValues] = useState<RegisterFormValues>({
    businessName: '',
    email: '',
    webhookUrl: '',
  });

  // Touch & Submit States for Validation Triggering
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Success API Key State
  const [apiKey, setApiKey] = useState<string | null>(null);

  // Live validation parsing
  const validationResult = registerSchema.safeParse(values);
  const inlineErrors: Record<string, string> = {};
  if (!validationResult.success) {
    for (const issue of validationResult.error.issues) {
      const field = issue.path[0] as string;
      if (!inlineErrors[field]) {
        inlineErrors[field] = issue.message;
      }
    }
  }

  const handleInputChange = (field: keyof RegisterFormValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleBlur = (field: keyof RegisterFormValues) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const shouldShowError = (field: keyof RegisterFormValues): boolean => {
    return !!((touched[field] || submitAttempted) && inlineErrors[field]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitAttempted(true);

    if (!validationResult.success) {
      return;
    }

    setIsLoading(true);
    setFormError(null);

    try {
      const response = await api.post<RegisterResponse>(
        '/v1/merchants/register',
        values,
        { schema: registerResponseSchema },
      );
      const generatedKey =
        typeof response === 'string'
          ? response
          : 'api_key' in response
            ? response.api_key
            : response.apiKey;
      const merchantId =
        typeof response === 'string' ? undefined : response.merchant.id;

      if (generatedKey) {
        persistApiKey(generatedKey);
        setApiKey(generatedKey); // <-- Fix: Update local state to render the success screen
        if (merchantId) {
          setMerchantId(merchantId);
        }
      } else {
        throw new AppError('REGISTRATION_FAILED', 'API key was not returned by the server');
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : 'An unexpected error occurred during merchant registration.';
      setFormError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = () => {
    router.push('/');
  };

  return (
    <Layout variant="owner">
      <div className="flex flex-col items-center justify-center py-6 sm:py-12">
        {apiKey ? (
          /* Success Screen: ApiKeyDisplay is rendered in-place of form */
          <ApiKeyDisplay apiKey={apiKey} onContinue={handleContinue} />
        ) : (
          /* Registration Form Screen */
          <div className="max-w-lg w-full bg-zinc-900 border border-zinc-800/80 rounded-2xl p-6 sm:p-8 space-y-6">
            <div className="space-y-1.5 text-center sm:text-left">
              <h2 className="text-2xl font-bold tracking-tight text-white">
                Register Platform Merchant
              </h2>
              <p className="text-xs text-zinc-400 font-medium">
                Onboard your marketplace to provision virtual accounts and configure webhooks.
              </p>
            </div>

            {/* Form-Level Error Banner */}
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
              {/* Business Name Field */}
              <div className="space-y-1.5">
                <label
                  htmlFor="businessName"
                  className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block"
                >
                  Business Name
                </label>
                <input
                  id="businessName"
                  type="text"
                  placeholder="e.g. StyleHub Marketplace"
                  disabled={isLoading}
                  value={values.businessName}
                  onChange={(e) => handleInputChange('businessName', e.target.value)}
                  onBlur={() => handleBlur('businessName')}
                  className={`w-full bg-zinc-950 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-white placeholder-zinc-600 transition-colors ${
                    shouldShowError('businessName') ? 'border-red-500/60' : 'border-zinc-800/80'
                  }`}
                />
                {shouldShowError('businessName') && (
                  <span className="text-xs font-semibold text-red-500 block pl-1">
                    {inlineErrors.businessName}
                  </span>
                )}
              </div>

              {/* Email Address Field */}
              <div className="space-y-1.5">
                <label
                  htmlFor="email"
                  className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  placeholder="e.g. operations@stylehub.com"
                  disabled={isLoading}
                  value={values.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  onBlur={() => handleBlur('email')}
                  className={`w-full bg-zinc-950 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-white placeholder-zinc-600 transition-colors ${
                    shouldShowError('email') ? 'border-red-500/60' : 'border-zinc-800/80'
                  }`}
                />
                {shouldShowError('email') && (
                  <span className="text-xs font-semibold text-red-500 block pl-1">
                    {inlineErrors.email}
                  </span>
                )}
              </div>

              {/* Webhook URL Field */}
              <div className="space-y-1.5">
                <label
                  htmlFor="webhookUrl"
                  className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block"
                >
                  Webhook URL
                </label>
                <input
                  id="webhookUrl"
                  type="url"
                  placeholder="e.g. https://api.stylehub.com/webhooks/nomba"
                  disabled={isLoading}
                  value={values.webhookUrl}
                  onChange={(e) => handleInputChange('webhookUrl', e.target.value)}
                  onBlur={() => handleBlur('webhookUrl')}
                  className={`w-full bg-zinc-950 border rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 text-white placeholder-zinc-600 transition-colors ${
                    shouldShowError('webhookUrl') ? 'border-red-500/60' : 'border-zinc-800/80'
                  }`}
                />
                {shouldShowError('webhookUrl') && (
                  <span className="text-xs font-semibold text-red-500 block pl-1">
                    {inlineErrors.webhookUrl}
                  </span>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3 px-4 rounded-xl text-sm font-bold tracking-tight transition-all duration-200 mt-2 flex items-center justify-center gap-2 ${
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
                    Registering Merchant...
                  </>
                ) : (
                  'Register Merchant'
                )}
              </button>
            </form>
          </div>
        )}
      </div>
    </Layout>
  );
}
