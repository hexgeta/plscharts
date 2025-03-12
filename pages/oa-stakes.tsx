import type { NextPage } from 'next';
import OAStakesTable from '@/components/OAStakesTable';

const OAStakesPage: NextPage = () => {
  return (
    <div className="p-2 sm:p-4">
      <h1 className="text-2xl font-bold mt-10 mb-4 text-center">OA HEX Stakes</h1>
      <p className="text-white/60 text-center mb-8">
        Track the staking activity of the largest HEX Origin Addresses (OA) & OA-related address HEX Stakes.
      </p>
      <div>
        <OAStakesTable />
      </div>
    </div>
  );
};

export default OAStakesPage; 