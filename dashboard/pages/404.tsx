import React from 'react';
import Layout from '../components/layout';
import Link from 'next/link';

export default function NotFound() {
  return (
    <Layout variant="owner">
      <div className="mx-auto max-w-lg text-center space-y-4 py-16">
        <h1 className="text-6xl font-bold text-zinc-900 dark:text-white">404</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          The page you are looking for does not exist or has been moved.
        </p>
        <Link
          href="/owner"
          className="inline-block rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-bold text-white transition-all hover:bg-zinc-750"
        >
          Go to Dashboard
        </Link>
      </div>
    </Layout>
  );
}
