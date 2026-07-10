import React from 'react';
import type { GetServerSideProps } from 'next';
import Layout from '../components/layout';

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  const role = ctx.req.cookies?.ice_role ?? 'owner';
  const target = role === 'vendor' ? '/vendor' : '/owner';
  return { redirect: { destination: target, permanent: false } };
};

export default function Home() {
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
