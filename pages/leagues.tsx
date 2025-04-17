import { LeaguesTable } from "@/components/LeaguesTable";
import { LeaguesTableEToken } from "@/components/LeaguesTableEToken";
import { LeaguesTableTShares } from "@/components/LeaguesTableTShares";
import { LeaguesTableETShares } from "@/components/LeaguesTableETShares";
import Head from 'next/head';
import { withAuth } from '@/components/withAuth';

const LeaguesPage = () => {
  return (
    <div className="p-2 sm:p-4">
      <h1 className="text-2xl font-bold mt-10 mb-4 text-center">Leagues</h1>
      <p className="text-white/60 text-center mb-8">
        These tables show the token requirements for each liquid holding and t-share league.
      </p>
      <div className="space-y-8">
        <div>
          <h2 className="text-xl font-semibold mb-1 text-left text-gray-400 ml-2">T-Share Leagues on PLS</h2>
          <LeaguesTableTShares/>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-1 text-left text-gray-400 ml-2">T-Share Leagues on ETH</h2>
          <LeaguesTableETShares/>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-1 text-left text-gray-400 ml-2">Liquid Leagues on PLS</h2>
          <LeaguesTable/>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-1 text-left text-gray-400 ml-2">Liquid Leagues on ETH</h2>
          <LeaguesTableEToken/>
        </div>
      </div>
    </div>
  );
};

export default withAuth(LeaguesPage); 