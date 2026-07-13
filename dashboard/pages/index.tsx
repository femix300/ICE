import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/layout';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const apiKey = typeof window !== 'undefined' ? window.localStorage.getItem('ice_api_key') : null;
    if (!apiKey) {
      router.replace('/register');
      return;
    }

    const cookie = typeof document !== 'undefined' ? document.cookie : '';
    const roleMatch = cookie.match(/ice_role=([^;]+)/);
    const role = roleMatch ? decodeURIComponent(roleMatch[1]!) : 'owner';
    const target = role === 'vendor' ? '/vendor' : '/owner';
    router.replace(target);
  }, [router]);

  return (
    <Layout variant="owner">
      <div className="flex min-h-[60vh] items-center justify-center">
        <span
          className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-emerald-500"
          role="status"
          aria-label="Redirecting"
        />
      </div>
    </Layout>
  );
}
