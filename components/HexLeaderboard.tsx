import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface StakeData {
  id: string;
  address: string;
  stakes: number;
  totalHex: string;
  avgHexPerStake: string;
  avgLength: string;
}

const HexLeaderboard = () => {
  const [leaderboardData, setLeaderboardData] = useState<StakeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addressFilter, setAddressFilter] = useState('');

  useEffect(() => {
    const fetchLeaderboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const query = `{
          stakeStarts(
            first: 10,
            orderBy: stakedHearts,
            orderDirection: desc,
            where: { stakedHearts_gt: "0" }
          ) {
            id
            stakedHearts
            stakedDays
            stakerAddr
          }
        }`;

        const response = await fetch('https://graph.pulsechain.com/subgraphs/name/Codeakk/Hex', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query }),
        });

        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.errors) {
          throw new Error(data.errors[0].message);
        }

        const formattedData = data.data.stakeStarts.map((stake: any) => ({
          id: stake.id,
          address: stake.stakerAddr,
          stakes: 1,
          totalHex: stake.stakedHearts,
          avgHexPerStake: stake.stakedHearts,
          avgLength: stake.stakedDays,
        }));

        setLeaderboardData(formattedData);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching leaderboard data:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch data');
        setIsLoading(false);
      }
    };

    // Initial fetch
    fetchLeaderboardData();

    // Update every 30 seconds
    const interval = setInterval(() => {
      fetchLeaderboardData();
      console.log('Leaderboard Updated');
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Filter data based on address
  const filteredData = addressFilter
    ? leaderboardData.filter(entry => 
        entry.address.toLowerCase().includes(addressFilter.toLowerCase())
      )
    : leaderboardData;

  if (error) {
    return (
      <div className="w-full h-full p-5 bg-black border border-white/20 rounded-xl text-white mt-8">
        <div className="py-8">
          <h2 className="text-2xl font-semibold leading-tight mb-4 text-[#00FF00]">Largest Stakers</h2>
          <div className="text-red-500">Error: {error}</div>
        </div>
      </div>
    );
  }

  if (isLoading && leaderboardData.length === 0) {
    return (
      <div className="w-full h-full p-5 bg-black border border-white/20 rounded-xl text-white mt-8">
        <div className="py-8">
          <h2 className="text-2xl font-semibold leading-tight mb-4 text-[#00FF00]">PAGE LEADERBOARD</h2>
          <div className="text-white/60">Loading leaderboard data...</div>
        </div>
      </div>
    );
  }

  const formatHex = (amount: string) => {
    // Divide by 100000000 (10^8)
    const num = Math.floor(parseFloat(amount) / 100000000);
    if (num === 0) return "0";
    
    // Format with commas every 3 digits
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const formatStakeLength = (days: string) => {
    return `${days}.0D`;
  };

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  return (
    <div className="w-full h-full p-5 bg-black text-white mt-8 font-mono">
      <h2 className="text-2xl font-bold mb-4 text-[#00FF00]">PAGE LEADERBOARD</h2>
      
      {/* Address Filter Input */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Filter by address..."
          value={addressFilter}
          onChange={(e) => setAddressFilter(e.target.value)}
          className="w-full max-w-md px-4 py-2 bg-black border border-white/20 rounded text-white font-mono"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="text-[#00FF00]">
              <th className="text-left px-4 py-2">RANK</th>
              <th className="text-left px-4 py-2">ADDRESS</th>
              <th className="text-left px-4 py-2">STAKES</th>
              <th className="text-left px-4 py-2">TOTAL HEX ↓</th>
              <th className="text-left px-4 py-2">AVG HEX/STAKE</th>
              <th className="text-left px-4 py-2">AVG LENGTH</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {filteredData.map((entry, index) => (
                <motion.tr
                  key={entry.id}
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="border-b border-white/10"
                >
                  <td className="px-4 py-2">
                    <span className="text-[#00FF00]">#{index + 1}</span>
                  </td>
                  <td className="px-4 py-2">
                    <a 
                      href={`https://hexscout.com/${entry.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#0000FF] hover:underline font-mono"
                    >
                      {formatAddress(entry.address)}
                    </a>
                  </td>
                  <td className="px-4 py-2">
                    {entry.stakes}
                  </td>
                  <td className="px-4 py-2 text-[#00FF00]">
                    {formatHex(entry.totalHex)}
                  </td>
                  <td className="px-4 py-2 text-[#00FF00]">
                    {formatHex(entry.avgHexPerStake)}
                  </td>
                  <td className="px-4 py-2 text-[#00FF00]">
                    {formatStakeLength(entry.avgLength)}
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default HexLeaderboard; 