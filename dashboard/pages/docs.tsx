import React from 'react';
import Layout from '../components/layout';

export default function Docs() {
  return (
    <Layout variant="owner">
      <div className="h-screen w-full">
        <iframe src="/api/redoc" className="w-full h-full border-0" title="API Documentation" />
      </div>
    </Layout>
  );
}
