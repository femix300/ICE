import React, { useState, useEffect } from 'react';
import type { AppProps } from 'next/app';
import '@/styles/globals.css';

export default function App({ Component, pageProps }: AppProps) {
  const [backendDown, setBackendDown] = useState(false);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        const base = process.env.NEXT_PUBLIC_API_URL || '/api';
        const res = await fetch(`${base}/healthz`, { method: 'GET', cache: 'no-store' });
        if (!res.ok) throw new Error('Health check failed');
      } catch {
        setBackendDown(true);
      }
    };
    void checkBackend();
  }, []);

  return (
    <>
      {backendDown && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-500/10 border-b border-red-500/25 px-4 py-3 text-center text-xs font-semibold text-red-600 dark:text-red-400">
          Cannot reach ICE backend. Check NEXT_PUBLIC_API_URL and ensure the backend is running.
        </div>
      )}
      <Component {...pageProps} />
    </>
  );
}
