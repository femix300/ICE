import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

interface SidebarProps {
  variant: 'owner' | 'vendor';
  isOpen?: boolean;
  onClose?: () => void;
}

interface NavItem {
  name: string;
  path: string;
  icon: React.ReactNode;
}

// Icon Components using raw SVG path definitions for crisp rendering
const HomeIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
    />
  </svg>
);

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
    />
  </svg>
);

const ChartSquareIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z"
    />
  </svg>
);

const AlertCircleIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
    />
  </svg>
);

const RefreshCwIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 7.89M9 11l3-3 3 3m0 2l-3 3-3-3"
    />
  </svg>
);

const FileTextIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
    />
  </svg>
);

export default function Sidebar({ variant, isOpen = false, onClose }: SidebarProps) {
  const router = useRouter();
  const currentPath = router.pathname;

  const ownerLinks: NavItem[] = [
    { name: 'Dashboard', path: '/', icon: <HomeIcon /> },
    { name: 'All Vendors', path: '/vendors', icon: <UsersIcon /> },
    { name: 'Summary', path: '/summary', icon: <ChartSquareIcon /> },
    { name: 'Misdirected Payments', path: '/misdirected', icon: <AlertCircleIcon /> },
  ];

  const vendorLinks: NavItem[] = [
    { name: 'Dashboard', path: '/vendor', icon: <HomeIcon /> },
    { name: 'Transactions', path: '/transactions', icon: <RefreshCwIcon /> },
    { name: 'Statements', path: '/statements', icon: <FileTextIcon /> },
    { name: 'Customers', path: '/customers', icon: <UsersIcon /> },
  ];

  const links = variant === 'owner' ? ownerLinks : vendorLinks;

  const checkIsActive = (path: string) => {
    if (path === '/' || path === '/vendor') {
      return currentPath === path;
    }
    return currentPath.startsWith(path);
  };

  const renderContent = () => (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-400 border-r border-zinc-800/80">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-zinc-800/60">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-bold text-lg">
          I
        </div>
        <div>
          <span className="font-semibold text-white tracking-wider text-sm block">NOMBA ICE</span>
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium">
            {variant === 'owner' ? 'Platform Control' : 'Vendor Portal'}
          </span>
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {links.map((link) => {
          const active = checkIsActive(link.path);
          return (
            <Link
              key={link.path}
              href={link.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                active
                  ? 'bg-zinc-900 text-white border border-zinc-800'
                  : 'hover:bg-zinc-900/50 hover:text-zinc-200 border border-transparent'
              }`}
              onClick={onClose}
            >
              <span className={active ? 'text-emerald-400' : 'text-zinc-500'}>{link.icon}</span>
              {link.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer Profile placeholder */}
      <div className="p-4 border-t border-zinc-800/60 bg-zinc-950/50">
        <div className="flex items-center gap-3 px-2 py-1.5">
          <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700/60 flex items-center justify-center font-bold text-white text-xs">
            {variant === 'owner' ? 'AD' : 'VE'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-zinc-200 truncate">
              {variant === 'owner' ? 'Admin Operator' : 'Vendor Merchant'}
            </p>
            <p className="text-[10px] text-zinc-500 truncate">
              {variant === 'owner' ? 'ops@ice.nomba.com' : 'vendor@ice.nomba.com'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Fixed Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-30">
        {renderContent()}
      </aside>

      {/* Mobile Drawer Sidebar */}
      <div
        className={`md:hidden fixed inset-0 z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        {/* Dark Backdrop overlay */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
          onClick={onClose}
        />
        {/* Drawer container */}
        <div
          className={`absolute inset-y-0 left-0 w-64 transform transition-transform duration-300 ease-in-out ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {renderContent()}
        </div>
      </div>
    </>
  );
}
