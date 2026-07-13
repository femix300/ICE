import React, { useState, useEffect } from 'react';
import Link from 'next/link';

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white antialiased">
      {/* — NAV — */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 bg-black border-b transition-colors duration-200 ${
          scrolled ? 'border-zinc-800' : 'border-zinc-900'
        }`}
      >
        <div className="mx-auto max-w-7xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white tracking-wider text-sm">ICE</span>
            <span className="text-zinc-500 text-xs">by Nomba</span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/login"
              className="text-sm text-zinc-400 hover:text-white transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="text-sm font-semibold bg-emerald-500 text-white px-4 py-2 rounded-md hover:bg-emerald-400 transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* — HERO — */}
      <section className="pt-32 pb-24 px-6">
        <div className="mx-auto max-w-7xl">
          <p className="text-emerald-500 text-[11px] font-semibold uppercase tracking-widest mb-6">
            Intelligent Collection Engine
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] max-w-4xl">
            Payments land.
            <br />
            ICE reconciles them.
            <br />
            You scale.
          </h1>
          <p className="mt-8 text-zinc-400 text-base md:text-lg max-w-[480px] leading-relaxed">
            Reconciliation on top of Nomba virtual accounts. Auto-match payments, resolve misdirected transfers, deliver webhooks.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <Link
              href="/register"
              className="bg-emerald-500 text-white px-6 py-3 rounded-md text-sm font-bold hover:bg-emerald-400 transition-colors"
            >
              Start building
            </Link>
            <Link
              href="/docs"
              className="border border-zinc-700 text-white px-6 py-3 rounded-md text-sm font-bold hover:border-zinc-600 transition-colors"
            >
              View docs
            </Link>
          </div>
          <p className="mt-8 text-xs text-zinc-600">
            Built on Nomba&apos;s payment infrastructure · Nomba x DevCareer Hackathon 2026
          </p>
        </div>
      </section>

      {/* — PROBLEM — */}
      <section className="py-24 px-6 border-t border-zinc-800">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-16">
            Reconciliation is broken.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
            <div>
              <p className="text-zinc-400 text-lg leading-relaxed">
                Payments arrive with no context.
                <br />
                Misdirected payments sit unresolved, blocking cash flow.
                <br />
                Reconciliation is a manual spreadsheet nightmare.
              </p>
            </div>
            <div className="space-y-6">
              {[
                {
                  title: 'Payments arrive with no context',
                  desc: 'No invoice match, no sender intent — just funds appearing in an account.',
                },
                {
                  title: 'Misdirected payments block cash flow',
                  desc: 'Wrong-account payments sit unresolved until someone manually fixes them.',
                },
                {
                  title: 'No audit trail',
                  desc: 'Reconciliation lives in spreadsheets that break the moment a team member leaves.',
                },
              ].map((item) => (
                <div key={item.title} className="border border-zinc-800 p-6">
                  <h3 className="text-white font-bold mb-2">{item.title}</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* — HOW IT WORKS — */}
      <section className="py-24 px-6 border-t border-zinc-800">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-16">
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                num: '01',
                title: 'Receive',
                desc: 'Payments hit your Nomba virtual accounts automatically.',
              },
              {
                num: '02',
                title: 'Reconcile',
                desc: 'ICE matches each payment to an invoice in real time.',
              },
              {
                num: '03',
                title: 'Resolve',
                desc: 'Misdirected payments are flagged and resolved with one action.',
              },
            ].map((step) => (
              <div key={step.num}>
                <div className="border-t border-zinc-800 pt-4 mb-4">
                  <span className="text-emerald-500 font-bold text-sm tracking-wider">
                    {step.num}
                  </span>
                </div>
                <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* — CAPABILITIES — */}
      <section className="py-24 px-6 border-t border-zinc-800">
        <div className="mx-auto max-w-7xl">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-16">
            Everything you need to reconcile at scale
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: 'Real-time reconciliation',
                desc: 'Auto-match incoming payments to invoices as they land.',
              },
              {
                title: 'Virtual account management',
                desc: 'Per-vendor VAs on Nomba infrastructure, provisioned in clicks.',
              },
              {
                title: 'Misdirected payment resolution',
                desc: 'Detect, match, or refund misdirected payments in one click.',
              },
              {
                title: 'Webhook delivery log',
                desc: 'Full audit trail with dead-letter replay for failed deliveries.',
              },
            ].map((cap) => (
              <div key={cap.title} className="border border-zinc-800 p-8">
                <h3 className="text-lg font-bold mb-2">{cap.title}</h3>
                <p className="text-zinc-400 text-sm leading-relaxed">{cap.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* — CTA — */}
      <section className="py-24 px-6 border-t border-zinc-800">
        <div className="mx-auto max-w-7xl">
          <div className="border border-zinc-800 bg-zinc-950 p-12 md:p-16">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-4">
              Start reconciling payments today.
            </h2>
            <p className="text-zinc-400 mb-8 max-w-xl">
              One API key. Infinite virtual accounts. Zero reconciliation headaches.
            </p>
            <Link
              href="/register"
              className="inline-block bg-emerald-500 text-white px-8 py-4 rounded-md text-sm font-bold hover:bg-emerald-400 transition-colors"
            >
              Get started
            </Link>
          </div>
        </div>
      </section>

      {/* — FOOTER — */}
      <footer className="border-t border-zinc-800 py-8 px-6">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-bold text-white tracking-wider text-sm">ICE</span>
          <span className="text-zinc-500 text-sm">
            Built on Nomba · Nomba x DevCareer 2026
          </span>
        </div>
      </footer>
    </div>
  );
}
