import React from 'react';
import Link from 'next/link';
import CryptoDashboard from '@/components/crypto-dashboard';
import { TopStats } from '@/components/stats-tables/TopStats';
import { withAuth } from '@/components/withAuth';

const Stats = () => {
  return (
    <div className="p-6 sm:p-6 my-2 sm:my-4 space-y-8">
      <CryptoDashboard />
      <TopStats />
    </div>
  );
};

export default withAuth(Stats);