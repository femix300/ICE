import React, { useState } from 'react';
import Sidebar from './Sidebar';

interface LayoutProps {
  variant: 'owner' | 'vendor';
  children: React.ReactNode;
}

export default function Layout({ variant, children }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 flex">
      {/* Navigation Sidebar (fixed on desktop, drawer on mobile) */}
      <Sidebar
        variant={variant}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0 transition-all duration-200">
        {/* Topbar */}
        <header className="sticky top-0 z-20 flex h-16 w-full shrink-0 items-center justify-between border-b border-zinc-200/80 bg-white/80 dark:border-zinc-800/60 dark:bg-zinc-950/80 backdrop-blur-md px-4 sm:px-6">
          {/* Left: Mobile hamburger menu trigger & breadcrumbs */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="md:hidden flex items-center justify-center p-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800"
              onClick={() => setIsSidebarOpen(true)}
            >
              <span className="sr-only">Open sidebar</span>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Title / Breadcrumb */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 rounded">
                ICE
              </span>
              <span className="text-zinc-300 dark:text-zinc-700">/</span>
              <h1 className="text-sm font-semibold tracking-tight text-zinc-700 dark:text-zinc-200">
                {variant === 'owner' ? 'Platform Management' : 'Vendor Terminal'}
              </h1>
            </div>
          </div>

          {/* Right: Actions / User Profile Avatar */}
          <div className="flex items-center gap-4">
            {/* Profile Avatar */}
            <div className="flex items-center gap-3">
              <div className="relative w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center font-bold text-xs text-zinc-600 dark:text-zinc-300 select-none">
                {variant === 'owner' ? 'OP' : 'VD'}
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Workspace Wrapper */}
        <main className="flex-1 overflow-y-auto px-4 py-8 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
