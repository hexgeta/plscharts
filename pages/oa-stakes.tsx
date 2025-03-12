import type { NextPage } from 'next';
import OAStakesTable from '@/components/OAStakesTable';

const OAStakesPage: NextPage = () => {
  return (
    <div className="p-2 sm:p-4">
      <h1 className="text-2xl font-bold mt-10 mb-4 text-center">OA HEX Stakes</h1>
      <p className="text-white/60 text-center mb-8">
        Track the staking activity of HEX Origin Addresses (OA) & OA-related addresses. This page shows both active and ended HEX stakes, 
        allowing you to monitor the T-shares, principles, and stake lengths of these significant stakes.
      </p>
      <div>
        <OAStakesTable />
      </div>
    </div>
  );
};

export default OAStakesPage; 