import type { NextPage } from 'next';
import OAStakesTable from '@/components/OAStakesTable';

const OAStakesPage: NextPage = () => {
  return (
    <div className="p-2 sm:p-4">
      <h1 className="text-2xl font-bold mt-10 mb-4 text-center">OA (Origin Address) HEX Stakes</h1>
      <p className="text-white/60 text-center mb-8">
        Track the staking activity of the largest OA & OA-related address HEX Stakes. 
        <br></br>(*This dataset is incomplete. It covers ~150 OA-related wallets with stake principle above 50M HEX. There are thousands of smaller stakes that have not been included on each chain.)
      </p>
      <div>
        <OAStakesTable />
      </div>
    </div>
  );
};

export default OAStakesPage; 