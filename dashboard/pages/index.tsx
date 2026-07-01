import React from 'react';
import Layout from '../components/Layout';

export default function Home() {
  return (
    <Layout variant="owner">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-white">
          Welcome to ICE
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          This is the Intelligent Collection Engine (ICE) platform dashboard.
        </p>
      </div>
    </Layout>
  );
}
