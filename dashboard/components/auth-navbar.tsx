import React from 'react';
import Link from 'next/link';

type Page = 'login' | 'register';

interface AuthNavbarProps {
  readonly page: Page;
}

export default function AuthNavbar({ page }: AuthNavbarProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black border-b border-zinc-800">
      <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-bold text-white tracking-wider text-sm">ICE</span>
          <span className="text-zinc-500 text-xs">by Nomba</span>
        </Link>
        <div className="flex items-center gap-6">
          {page === 'login' ? (
            <Link href="/register" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Get started
            </Link>
          ) : (
            <Link href="/login" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
