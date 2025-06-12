'use client';

import { useState, useEffect, useMemo } from 'react';
import { useHexDailyDataCache, useHexYieldCache, calculateYieldForStake } from './useHexDailyData';

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

  // Get cached HEX daily data and yield cache
  const { getDailyPayoutsForRange, isReady: isCacheReady } = useHexDailyDataCache();
  const { getCachedYield, cacheYields, areYieldsCached } = useHexYieldCache();

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
        
        // Use cached daily payouts instead of fetching
        const getCachedDailyPayouts = (chain: 'ETH' | 'PLS', startDay: number, endDay: number) => {
          if (!isCacheReady || !getDailyPayoutsForRange) {
            console.log(`[${chain}] Cache not ready, skipping yield calculation`);
            return [];
          }
          
          const cachedPayouts = getDailyPayoutsForRange(chain, startDay, endDay);
          console.log(`[${chain}] Using cached payouts: ${cachedPayouts.length} records for range ${startDay}-${endDay}`);
          return cachedPayouts;
        };



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
                stakeId
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
                return { stakes: [], newYields: [] };
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
          
          // Handle case where no stakes were found
          if (allStakes.length === 0) {
            console.log(`[${chain}] No stakes found`);
            return { stakes: [], newYields: [] };
          }
          
          // Get all unique day ranges for batch fetching daily payouts
          const dayRanges = allStakes.map(stake => ({
            startDay: Number(stake.startDay),
            endDay: Math.min(Number(stake.startDay) + Number(stake.stakedDays), currentDay)
          }));
          
          const minStartDay = Math.min(...dayRanges.map(r => r.startDay));
          const maxEndDay = Math.max(...dayRanges.map(r => r.endDay));
          
          // Check if yields are already cached for these stakes
          const stakeKeys = allStakes.map(stake => ({
            stakeId: stake.stakeId || stake.id,
            chain
          }));
          
          let yieldCalculations: any[] = [];
          let processedStakes: any[] = [];
          
          // Get cached daily payouts for yield calculations if needed
          const dailyPayouts = getCachedDailyPayouts(chain, minStartDay, maxEndDay);
          
          processedStakes = allStakes.map((stake: any) => {
            const stakeStartDay = Number(stake.startDay);
            const stakeEndDay = Number(stake.startDay) + Number(stake.stakedDays);
            const isActive = currentDay < stakeEndDay;
            const principleHex = Number(stake.stakedHearts) / 1e8; // Convert from Hearts to HEX
            const tShares = Number(stake.stakeTShares);
            const effectiveEndDay = isActive ? currentDay : stakeEndDay;
            const stakeId = stake.stakeId || stake.id;
            
            // Try to get cached yield first
            let yieldHex = getCachedYield(stakeId, chain, currentDay);
            
            if (yieldHex === null) {
              // Calculate yield if not cached or outdated
              yieldHex = calculateYieldForStake(dailyPayouts, tShares, stakeStartDay, effectiveEndDay);
              
              // Store calculation for caching
              yieldCalculations.push({
                stakeId,
                chain,
                stakerAddr: stake.stakerAddr,
                tShares,
                startDay: stakeStartDay,
                endDay: stakeEndDay,
                yieldHex,
                calculatedAt: new Date().toISOString(),
                effectiveEndDay
              });
              
              console.log(`[${chain}] Calculated yield for stake ${stakeId}: ${tShares} T-Shares, days ${stakeStartDay}-${effectiveEndDay}, yield: ${yieldHex.toFixed(2)} HEX`);
            } else {
              console.log(`[${chain}] Using cached yield for stake ${stakeId}: ${yieldHex.toFixed(2)} HEX`);
            }
            
            return {
              id: `${chain}-${stake.id}`,
              stakeId,
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
          
          // Cache any new yield calculations
          if (yieldCalculations.length > 0) {
            console.log(`[${chain}] Caching ${yieldCalculations.length} new yield calculations`);
            // We'll cache these after processing both chains
          }
          
          return { stakes: processedStakes, newYields: yieldCalculations };
        };

        // Fetch stakes from both chains and wait for yield calculations to complete
        console.log('[HEX Stakes] Starting fetch from both chains...');
        const [ethResult, plsResult] = await Promise.all([
          fetchAllStakesFromChain(SUBGRAPH_URLS.ETH, 'ETH'),
          fetchAllStakesFromChain(SUBGRAPH_URLS.PLS, 'PLS')
        ]);

        console.log(`[HEX Stakes] Completed: ${ethResult.stakes.length} ETH stakes, ${plsResult.stakes.length} PLS stakes`);
        
        // Combine all stakes
        const combinedStakes = [...ethResult.stakes, ...plsResult.stakes]
          .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime()); // Sort by ending soonest first

        // Combine all new yield calculations and cache them
        const allNewYields = [...ethResult.newYields, ...plsResult.newYields];
        if (allNewYields.length > 0) {
          console.log(`[HEX Stakes] Caching ${allNewYields.length} new yield calculations`);
          cacheYields(allNewYields);
        }

        // Only set loading to false after all yield calculations are complete
        console.log(`[HEX Stakes] Setting ${combinedStakes.length} stakes with calculated yields`);
        setStakes(combinedStakes);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching HEX stakes:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch HEX stakes');
        setIsLoading(false);
      }
    };

    // Only fetch stakes when we have addresses and the cache is ready
    if (isCacheReady) {
      fetchStakes();
    } else if (!isCacheReady && addresses.length > 0) {
      console.log('[HEX Stakes] Waiting for cache to be ready...');
    }
  }, [addressesString, isCacheReady]); // Include cache readiness in dependencies

  return {
    stakes,
    isLoading,
    error,
    hasStakes: stakes.length > 0
  };
}; 