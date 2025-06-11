'use client';

import { useState, useEffect, useMemo } from 'react';

interface HexStake {
  id: string;
  stakeId: string;
  status: 'active' | 'inactive';
  principleHex: number;
  yieldHex: number;
  tShares: number;
  startDate: string;
  endDate: string;
  progress: number;
  daysLeft: number;
  address: string;
  chain: 'ETH' | 'PLS';
}

const SUBGRAPH_URLS = {
  ETH: 'https://graph.ethereum.pulsechain.com/subgraphs/name/Codeakk/Hex',
  PLS: 'https://graph.pulsechain.com/subgraphs/name/Codeakk/Hex'
};

const calculateCurrentHexDay = () => {
  const HEX_LAUNCH_DATE = new Date('2019-12-03T00:00:00Z').getTime();
  const SECONDS_PER_DAY = 86400;
  const currentTimestamp = Date.now();
  return Math.floor((currentTimestamp - HEX_LAUNCH_DATE) / (SECONDS_PER_DAY * 1000));
};

const calculateDaysUntilMaturity = (endDay: string) => {
  const currentDay = calculateCurrentHexDay();
  const adjustedEndDay = Number(endDay) - 1;
  const daysLeft = adjustedEndDay - currentDay;
  return daysLeft > 0 ? daysLeft : 0;
};

const formatDateToISO = (hexDay: string) => {
  const HEX_LAUNCH_DATE = new Date('2019-12-03T00:00:00.000Z');
  const date = new Date(HEX_LAUNCH_DATE.getTime() + ((parseInt(hexDay) - 1) * 24 * 60 * 60 * 1000));
  return date.toISOString().split('T')[0]; // Return YYYY-MM-DD format
};

const calculateProgress = (startDay: string, endDay: string) => {
  const currentDay = calculateCurrentHexDay();
  const start = Number(startDay);
  const end = Number(endDay);
  const total = end - start;
  const elapsed = currentDay - start;
  
  if (elapsed <= 0) return 0;
  if (elapsed >= total) return 100;
  
  return Math.round((elapsed / total) * 100);
};

export const useHexStakes = (addresses: string[]) => {
  const [stakes, setStakes] = useState<HexStake[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize addresses to prevent unnecessary re-fetches
  const addressesString = useMemo(() => 
    addresses.map(addr => addr.toLowerCase()).sort().join(','), 
    [addresses]
  );

  useEffect(() => {
    if (!addresses.length) {
      setStakes([]);
      setIsLoading(false);
      return;
    }

    const fetchStakes = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const currentDay = calculateCurrentHexDay();
        const addressesParam = addresses.map(addr => addr.toLowerCase()).join('","');
        
        const fetchAllStakesFromChain = async (url: string, chain: 'ETH' | 'PLS') => {
          let allStakes: any[] = [];
          let hasMore = true;
          let skip = 0;
          const first = 1000;
          
          while (hasMore) {
            const query = `{
              stakeStarts(
                first: ${first},
                skip: ${skip},
                where: { stakerAddr_in: ["${addressesParam}"] }
                orderBy: startDay
                orderDirection: desc
              ) {
                id
                stakerAddr
                stakedHearts
                stakedDays
                stakeTShares
                startDay
                endDay
              }
            }`;

            try {
              const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query }),
              });

              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }

              const result = await response.json();
              
              if (result.errors) {
                console.error(`[${chain}] GraphQL errors:`, result.errors);
                hasMore = false;
                return allStakes;
              }

              const fetchedStakes = result.data?.stakeStarts || [];
              
              if (fetchedStakes.length > 0) {
                allStakes = [...allStakes, ...fetchedStakes];
                skip += first;
              } else {
                hasMore = false;
              }
            } catch (error) {
              console.error(`[${chain}] Error fetching stakes:`, error);
              hasMore = false;
            }
          }
          
          return allStakes.map((stake: any) => {
            const stakeEndDay = Number(stake.startDay) + Number(stake.stakedDays);
            const isActive = currentDay < stakeEndDay;
            const principleHex = Number(stake.stakedHearts) / 1e8; // Convert from Hearts to HEX
            const yieldHex = 0; // We don't have yield data from the subgraph, would need additional calculation
            const tShares = Number(stake.stakeTShares);
            
            return {
              id: `${chain}-${stake.id}`,
              stakeId: stake.id,
              status: isActive ? 'active' : 'inactive',
              principleHex: Math.round(principleHex),
              yieldHex: Math.round(yieldHex), 
              tShares: tShares,
              startDate: formatDateToISO(stake.startDay),
              endDate: formatDateToISO(stakeEndDay.toString()),
              progress: calculateProgress(stake.startDay, stakeEndDay.toString()),
              daysLeft: calculateDaysUntilMaturity(stakeEndDay.toString()),
              address: stake.stakerAddr,
              chain
            };
          });
        };

        // Fetch stakes from both chains
        const [ethStakes, plsStakes] = await Promise.all([
          fetchAllStakesFromChain(SUBGRAPH_URLS.ETH, 'ETH'),
          fetchAllStakesFromChain(SUBGRAPH_URLS.PLS, 'PLS')
        ]);

        const combinedStakes = [...ethStakes, ...plsStakes]
          .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime()); // Sort by ending soonest first

        setStakes(combinedStakes);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching HEX stakes:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch HEX stakes');
        setIsLoading(false);
      }
    };

    fetchStakes();
  }, [addressesString]); // Use memoized addresses string

  return {
    stakes,
    isLoading,
    error,
    hasStakes: stakes.length > 0
  };
}; 