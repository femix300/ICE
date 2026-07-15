import React from 'react';
import Layout from '../components/layout';
import WebhookSimulator from '../components/WebhookSimulator';

export default function SimulatorPage() {
  return (
    <Layout variant="owner" breadcrumbs={[{ label: 'Webhook Simulator' }]}>
      <div className="space-y-6">
        {/* Page Headings */}
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Webhook Simulator
          </h2>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Simulate Nomba payment webhooks to test ICE&apos;s full reconciliation pipeline end-to-end.
          </p>
        </div>

        {/* Notice Banner */}
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 text-sm text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <div className="flex gap-2">
            <span className="text-base select-none">⚠</span>
            <p className="font-medium leading-relaxed text-xs">
              Nomba&apos;s account provisioning did not register our webhook subscription during the hackathon. This simulator fires HMAC-signed payloads directly to our live endpoint, exercising the identical pipeline a real Nomba webhook would trigger.
            </p>
          </div>
        </div>

        {/* Simulator Form & Results Dashboard */}
        <WebhookSimulator />
      </div>
    </Layout>
  );
}
