import type { NextPage } from 'next';
import OAStakesTable from '@/components/OAStakesTable';

const OAStakesPage: NextPage = () => {
  return (
    <div className="p-2 sm:p-4">
      <h1 className="text-2xl font-bold mt-10 mb-4 text-center">OA (Origin Address) HEX Stakes</h1>
      <p className="text-white/60 text-center mb-8">
        Track the staking activity of the largest OA & OA-related address HEX Stakes. 
        <br></br>(*This dataset is incomplete. It covers ~270 OA wallets with HEX stakes >50M HEX. There are 4000+ smaller stakes not included.)
      </p>
      <div>
        <OAStakesTable />
      </div>
    </div>
  );
};

export default OAStakesPage; 