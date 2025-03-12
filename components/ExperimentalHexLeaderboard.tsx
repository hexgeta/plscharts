import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface StakeData {
  id: string;
  address: string;
  stakeId: string;
  totalHex: string;
  stakeLength: string;
  startDay: string;
  endDay: string;
  stakeEnd: boolean;
  stakeTShares: string;
  isAutoStake: boolean;
  referrerAddr: string;
  referrerShares: string;
  timestamp: string;
}

const ExperimentalHexLeaderboard = () => {
  const [leaderboardData, setLeaderboardData] = useState<StakeData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addressFilter, setAddressFilter] = useState('');
  const [currentDay, setCurrentDay] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'ended'>('all');
  const [sortBy, setSortBy] = useState<'totalHex' | 'stakeTShares' | 'daysLeft'>('totalHex');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const ITEMS_PER_PAGE = 100;

  // Calculate current HEX day
  useEffect(() => {
    const HEX_LAUNCH_DATE = new Date('2019-12-03T00:00:00Z').getTime();
    const SECONDS_PER_DAY = 86400;
    const currentTimestamp = Date.now();
    const currentHexDay = Math.floor((currentTimestamp - HEX_LAUNCH_DATE) / (SECONDS_PER_DAY * 1000));
    setCurrentDay(currentHexDay);
  }, []);

  const fetchStakes = async (pageNumber: number) => {
    try {
      const skip = pageNumber * ITEMS_PER_PAGE;
      
      const query = `{
        stakeStarts(
          first: ${ITEMS_PER_PAGE},
          skip: ${skip},
          orderBy: stakedHearts,
          orderDirection: desc,
          where: { stakedHearts_gt: "0" }
        ) {
          id
          stakerAddr
          stakeId
          stakedHearts
          stakedDays
          isAutoStake
          stakeTShares
          startDay
          endDay
          stakeEnd
          blockNumber
          timestamp
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

      const fetchedStakes = data.data.stakeStarts;
      
      // Check if we have more data to load
      setHasMore(fetchedStakes.length === ITEMS_PER_PAGE);

      // Format the stakes
      const formattedStakes = fetchedStakes.map((stake: any) => {
        const isEnded = currentDay >= parseInt(stake.endDay);
        return {
          id: stake.id,
          stakeId: stake.stakeId,
          address: stake.stakerAddr,
          totalHex: stake.stakedHearts,
          stakeLength: stake.stakedDays,
          startDay: stake.startDay,
          endDay: stake.endDay,
          stakeEnd: isEnded,
          stakeTShares: stake.stakeTShares,
          isAutoStake: stake.isAutoStake,
          referrerAddr: stake.referrerAddr,
          referrerShares: stake.referrerShares,
          timestamp: stake.timestamp
        };
      });

      return formattedStakes;
    } catch (error) {
      throw error;
    }
  };

  // Initial data load
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const initialStakes = await fetchStakes(0);
        setLeaderboardData(initialStakes);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching initial stakes:', error);
        setError(error instanceof Error ? error.message : 'Failed to fetch data');
        setIsLoading(false);
      }
    };

    loadInitialData();

    // Refresh every 5 minutes
    const interval = setInterval(() => {
      loadInitialData();
      console.log('Refreshing leaderboard data...');
    }, 300000);

    return () => clearInterval(interval);
  }, []);

  // Load more data function
  const loadMore = async () => {
    if (isLoadingMore || !hasMore) return;

    try {
      setIsLoadingMore(true);
      const nextPage = page + 1;
      const newStakes = await fetchStakes(nextPage);
      setLeaderboardData(prev => [...prev, ...newStakes]);
      setPage(nextPage);
    } catch (error) {
      console.error('Error loading more stakes:', error);
      setError(error instanceof Error ? error.message : 'Failed to load more data');
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Add scroll handler for infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 1000) {
        loadMore();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [page, isLoadingMore, hasMore]);

  // Enhanced filter logic
  const filteredAndSortedData = useMemo(() => {
    let filtered = [...leaderboardData];

    // Apply address filter
    if (addressFilter) {
      filtered = filtered.filter(entry => 
        entry.address.toLowerCase().includes(addressFilter.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(entry => 
        statusFilter === 'active' ? !entry.stakeEnd : entry.stakeEnd
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'totalHex':
          comparison = parseFloat(b.totalHex) - parseFloat(a.totalHex);
          break;
        case 'stakeTShares':
          comparison = parseFloat(b.stakeTShares) - parseFloat(a.stakeTShares);
          break;
        case 'daysLeft':
          const daysA = calculateDaysRemaining(a.startDay, a.endDay);
          const daysB = calculateDaysRemaining(b.startDay, b.endDay);
          comparison = daysB - daysA;
          break;
      }
      return sortDirection === 'desc' ? comparison : -comparison;
    });

    return filtered;
  }, [leaderboardData, addressFilter, statusFilter, sortBy, sortDirection]);

  if (error) {
    return (
      <div className="w-full h-full p-5 bg-black border border-white/20 rounded-xl text-white mt-8">
        <div className="py-8">
          <h2 className="text-2xl font-semibold leading-tight mb-4 text-[#00FF00]">T-Share LEADERBOARD</h2>
          <div className="text-red-500">Error: {error}</div>
        </div>
      </div>
    );
  }

  if (isLoading && leaderboardData.length === 0) {
    return (
      <div className="w-full h-full p-5 bg-black border border-white/20 rounded-xl text-white mt-8">
        <div className="py-8">
          <h2 className="text-2xl font-semibold leading-tight mb-4">Experimental HEX Leaderboard</h2>
          <div className="flex flex-col items-center justify-center gap-4">
            <div className="text-white/60">Loading all stake data...</div>
            <div className="text-sm text-white/40">This may take a few moments to fetch all stakes</div>
          </div>
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
    return `${days}`;
  };

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const formatStakeId = (stakeId: string) => {
    return `#${stakeId}`;
  };

  const calculateDaysRemaining = (startDay: string, endDay: string) => {
    const stakeEndDay = parseInt(endDay);
    return stakeEndDay - currentDay;
  };

  const formatNumber = (value: string) => {
    if (!value) return '0.00';
    
    // Parse the value and convert to number
    const num = parseFloat(value);
    
    // Format based on size
    if (num >= 1000000000000) { // >= 1T
      return (num / 1000000000000).toFixed(2) + 'T';
    } else if (num >= 1000000000) { // >= 1B
      return (num / 1000000000).toFixed(2) + 'B';
    } else if (num >= 1000000) { // >= 1M
      return (num / 1000000).toFixed(2) + 'M';
    } else if (num >= 1000) { // >= 1K
      return (num / 1000).toFixed(2) + 'K';
    } else {
      return num.toFixed(2);
    }
  };

  return (
    <div className="w-full h-full p-5 bg-black border border-white/20 rounded-xl text-white mt-8">
      <div className="py-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold leading-tight">Experimental HEX Leaderboard</h2>
          <div className="text-sm text-white/60">
            Showing top {leaderboardData.length} stakes
          </div>
        </div>

        {/* Filters Section */}
        <div className="flex flex-col lg:flex-row items-center gap-4 mb-8">
          <input
            type="text"
            placeholder="Filter by address..."
            value={addressFilter}
            onChange={(e) => setAddressFilter(e.target.value)}
            className="w-full max-w-md px-4 py-2 bg-black border border-white/20 rounded text-white"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'ended')}
            className="w-full max-w-md px-4 py-2 bg-black border border-white/20 rounded text-white"
          >
            <option value="all">All Stakes</option>
            <option value="active">Active Only</option>
            <option value="ended">Ended Only</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'totalHex' | 'stakeTShares' | 'daysLeft')}
            className="w-full max-w-md px-4 py-2 bg-black border border-white/20 rounded text-white"
          >
            <option value="totalHex">Sort by Total HEX</option>
            <option value="stakeTShares">Sort by T-Shares</option>
            <option value="daysLeft">Sort by Days Left</option>
          </select>

          <select
            value={sortDirection}
            onChange={(e) => setSortDirection(e.target.value as 'asc' | 'desc')}
            className="w-full max-w-md px-4 py-2 bg-black border border-white/20 rounded text-white"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <div className="inline-block min-w-full rounded-lg overflow-hidden">
            <table className="min-w-full leading-normal">
              <thead>
                <tr>
                  <th className="px-5 py-3 border-b border-white/20 text-center text-xs font-semibold uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-5 py-3 border-b border-white/20 text-center text-xs font-semibold uppercase tracking-wider">
                    Stake ID
                  </th>
                  <th className="px-5 py-3 border-b border-white/20 text-center text-xs font-semibold uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-5 py-3 border-b border-white/20 text-center text-xs font-semibold uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-5 py-3 border-b border-white/20 text-center text-xs font-semibold uppercase tracking-wider">
                    Total HEX
                  </th>
                  <th className="px-5 py-3 border-b border-white/20 text-center text-xs font-semibold uppercase tracking-wider">
                    Length
                  </th>
                  <th className="px-5 py-3 border-b border-white/20 text-center text-xs font-semibold uppercase tracking-wider">
                    T-Shares
                  </th>
                  <th className="px-5 py-3 border-b border-white/20 text-center text-xs font-semibold uppercase tracking-wider">
                    Days Left
                  </th>
                  <th className="px-5 py-3 border-b border-white/20 text-center text-xs font-semibold uppercase tracking-wider">
                    Auto Stake
                  </th>
                  <th className="px-5 py-3 border-b border-white/20 text-center text-xs font-semibold uppercase tracking-wider">
                    Referrer
                  </th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filteredAndSortedData.map((entry, index) => (
                    <motion.tr
                      key={entry.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="border-b border-white/20"
                    >
                      <td className="px-5 py-5 text-sm text-center">
                        #{index + 1}
                      </td>
                      <td className="px-5 py-5 text-sm text-center">
                        <p className="text-white/60">{formatStakeId(entry.stakeId)}</p>
                      </td>
                      <td className="px-5 py-5 text-sm text-center">
                        <div className="flex items-center justify-center">
                          <a 
                            href={`https://hexscout.com/${entry.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            {formatAddress(entry.address)}
                          </a>
                        </div>
                      </td>
                      <td className="px-5 py-5 text-sm text-center">
                        <span className="relative inline-block px-3 py-1 font-semibold leading-tight">
                          <span
                            aria-hidden
                            className={`absolute inset-0 ${!entry.stakeEnd ? 'bg-green-500/20' : 'bg-red-500/20'} rounded-full`}
                          ></span>
                          <span className="relative">{!entry.stakeEnd ? "1/1" : "0/1"}</span>
                        </span>
                      </td>
                      <td className="px-5 py-5 text-sm text-center">
                        <p className="whitespace-no-wrap">
                          {formatHex(entry.totalHex)}
                        </p>
                      </td>
                      <td className="px-5 py-5 text-sm text-center">
                        <p className="whitespace-no-wrap">
                          {formatStakeLength(entry.stakeLength)}D
                        </p>
                      </td>
                      <td className="px-5 py-5 text-sm text-center">
                        <p className="whitespace-no-wrap">
                          {formatNumber(entry.stakeTShares)}
                        </p>
                      </td>
                      <td className="px-5 py-5 text-sm text-center">
                        <p className="whitespace-no-wrap">
                          {calculateDaysRemaining(entry.startDay, entry.endDay)}
                        </p>
                      </td>
                      <td className="px-5 py-5 text-sm text-center">
                        <span className="relative inline-block px-3 py-1 font-semibold leading-tight">
                          <span
                            aria-hidden
                            className={`absolute inset-0 ${entry.isAutoStake ? 'bg-green-500/20' : 'bg-yellow-500/20'} rounded-full`}
                          ></span>
                          <span className="relative">{entry.isAutoStake ? "Yes" : "No"}</span>
                        </span>
                      </td>
                      <td className="px-5 py-5 text-sm text-center">
                        {entry.referrerAddr ? (
                          <a 
                            href={`https://hexscout.com/${entry.referrerAddr}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            {formatAddress(entry.referrerAddr)}
                          </a>
                        ) : (
                          <span className="text-white/40">None</span>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>

        {/* Loading more indicator */}
        {isLoadingMore && (
          <div className="text-center py-4">
            <div className="text-white/60">Loading more stakes...</div>
          </div>
        )}
        
        {/* End of results message */}
        {!hasMore && !isLoadingMore && leaderboardData.length > 0 && (
          <div className="text-center py-4">
            <div className="text-white/60">No more stakes to load</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExperimentalHexLeaderboard;

 