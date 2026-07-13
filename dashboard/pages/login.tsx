import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Layout from '../components/layout';
import { setApiKey, getMerchantId, setMerchantId } from '../lib/auth';
import { AppError } from '../lib/errors';

export default function Login() {
  const router = useRouter();
  const [apiKey, setApiKeyValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      });

      if (!response.ok) {
        throw new AppError('LOGIN_FAILED', 'Invalid API key. Please check and try again.');
      }

      setApiKey(apiKey.trim());
      setMerchantId(getMerchantId());
      router.push('/owner');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout variant="owner">
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="w-full max-w-md">
          <div className="border border-zinc-800 p-8">
            <div className="mb-8">
              <h1 className="text-2xl font-bold tracking-tight">Sign in to ICE</h1>
              <p className="text-zinc-400 text-sm mt-2">
                Enter your merchant API key to access the dashboard.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label
                  htmlFor="apiKey"
                  className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block"
                >
                  API Key
                </label>
                <input
                  id="apiKey"
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKeyValue(e.target.value)}
                  placeholder="e.g. ice_sk_..."
                  disabled={isLoading}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !apiKey.trim()}
                className="w-full bg-emerald-500 text-white py-3 rounded-md text-sm font-bold hover:bg-emerald-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-zinc-500">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-emerald-500 hover:text-emerald-400">
                Register
              </Link>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
