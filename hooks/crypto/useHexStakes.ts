'use client';

import { useState, useEffect, useMemo } from 'react';
import { useHexDailyDataCache, useHexYieldCache, calculateYieldForStake } from './useHexDailyData';

interface HexStake {
  id: string;
  stakeId: string;
  status: 'active' | 'inactive';
  isOverdue?: boolean;
  isEES?: boolean;
  isBPD?: boolean;
  principleHex: number;
  yieldHex: number;
  tShares: number;
  startDate: string;
  endDate: string;      // The original promised end date
  actualEndDate: string; // The actual date the stake ended (for EES stakes)
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
  return daysLeft; // Return actual value (can be negative for overdue)
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
  
  // Calculate raw progress percentage
  const rawProgress = Math.round((elapsed / total) * 100);
  
  // If stake is completed (elapsed >= total), return 100%
  if (elapsed >= total) return 100;
  
  // If stake has days remaining but progress would show 100%, cap at 99%
  // This prevents showing 100% when there are still days left (HEX early end stake penalties)
  if (rawProgress >= 100) return 99;
  
  return rawProgress;
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
        
        const fetchAllStakesFromChain = async (url: string, chain: 'ETH' | 'PLS') => {
          let allStakes: any[] = [];
          let allStakeEnds: any[] = [];
          let hasMore = true;
          let skip = 0;
          const first = 1000;
          
          // First fetch all stake starts
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
                return { stakes: [], stakeEnds: [] };
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
          
          // Now fetch all stake ends
          hasMore = true;
          skip = 0;
          while (hasMore) {
            const query = `{
              stakeEnds(
                first: ${first},
                skip: ${skip},
                where: { stakerAddr_in: ["${addressesParam}"] }
              ) {
                id
                stakeId
                stakerAddr
                servedDays
                penalty
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
                break;
              }

              const fetchedStakeEnds = result.data?.stakeEnds || [];
              
              if (fetchedStakeEnds.length > 0) {
                allStakeEnds = [...allStakeEnds, ...fetchedStakeEnds];
                skip += first;
              } else {
                hasMore = false;
              }
            } catch (error) {
              console.error(`[${chain}] Error fetching stake ends:`, error);
              hasMore = false;
            }
          }

          return { stakes: allStakes, stakeEnds: allStakeEnds };
        };
        
        // Create a single map for all stake ends across both chains
        const allStakeEndsMap = new Map();
        let allProcessedStakes: any[] = [];
        
        // Process each chain
        const chains: ('ETH' | 'PLS')[] = ['ETH', 'PLS'];
        for (const chain of chains) {
          console.log(`Processing ${chain} chain...`);
          const { stakes: chainStakes, stakeEnds } = await fetchAllStakesFromChain(SUBGRAPH_URLS[chain], chain);
          
          // Add stake ends to the global map with chain-specific keys
          stakeEnds.forEach((stakeEnd: any) => {
            const key = `${chain}-${stakeEnd.stakeId}`;
            allStakeEndsMap.set(key, stakeEnd);
            console.log(`Added stake end to map: ${key}`, stakeEnd);
          });
          
          // Process stakes using the global stake ends map
          const processedChainStakes = chainStakes.map((stake: any) => {
            const stakeId = stake.stakeId;
            const stakeEndKey = `${chain}-${stakeId}`;
            const stakeEnd = allStakeEndsMap.get(stakeEndKey);
            
            // Debug logging
            console.log(`Processing stake ${stakeEndKey}:`, {
              hasStakeEnd: !!stakeEnd,
              penalty: stakeEnd?.penalty,
              servedDays: stakeEnd?.servedDays
            });
            
            const stakeStartDay = Number(stake.startDay);
            const stakeEndDay = Number(stake.startDay) + Number(stake.stakedDays);
            const isStillActive = currentDay < stakeEndDay;
            let status: 'active' | 'inactive' = 'active';
            let isEES = false;
            let isOverdue = false;
            
            // Calculate actual end date and progress based on stake status
            let actualEndDay = stakeEndDay;
            let actualProgress = 0;
            let daysLeft = 0;
            
            if (stakeEnd) {
              status = 'inactive';
              // Use actual served days for ended stakes
              const servedDays = Number(stakeEnd.servedDays);
              actualEndDay = stakeStartDay + servedDays;
              actualProgress = Math.min(100, Math.round((servedDays / Number(stake.stakedDays)) * 100));
              daysLeft = 0; // Stake is ended, no days left
              
              if (stakeEnd.penalty && stakeEnd.penalty !== '0') {
                isEES = true;
                console.log(`[${chain}] Stake ${stakeId}: INACTIVE (EES with penalty: ${stakeEnd.penalty} Hearts, served ${servedDays} days)`);
              } else {
                console.log(`[${chain}] Stake ${stakeId}: INACTIVE (ended successfully after ${servedDays} days)`);
              }
            } else if (!isStillActive) {
              status = 'active';
              isOverdue = true;
              actualProgress = calculateProgress(stake.startDay, stakeEndDay.toString());
              daysLeft = calculateDaysUntilMaturity(stakeEndDay.toString());
              console.log(`[${chain}] Stake ${stakeId}: ACTIVE (overdue)`);
            } else {
              status = 'active';
              actualProgress = calculateProgress(stake.startDay, stakeEndDay.toString());
              daysLeft = calculateDaysUntilMaturity(stakeEndDay.toString());
              console.log(`[${chain}] Stake ${stakeId}: ACTIVE`);
            }
            
                          // Calculate the original promised end date
              const promisedEndDay = stakeStartDay + Number(stake.stakedDays);
              
              // Check if this is a BPD stake (5555 days)
              const isBPD = Number(stake.stakedDays) === 5555;
              
              return {
                id: `${chain}-${stake.id}`,
                stakeId,
                status,
                isEES,
                isOverdue,
                isBPD,
                principleHex: Number(stake.stakedHearts) / 1e8,
                yieldHex: getCachedYield(stakeId, chain, currentDay) || 
                  calculateYieldForStake(
                    getDailyPayoutsForRange(chain, stakeStartDay, actualEndDay), 
                    Number(stake.stakeTShares), 
                    stakeStartDay, 
                    actualEndDay
                  ),
                tShares: Number(stake.stakeTShares),
                startDate: formatDateToISO(stake.startDay),
                endDate: formatDateToISO(promisedEndDay.toString()), // Use the original promised end date
                actualEndDate: formatDateToISO(actualEndDay.toString()), // Store the actual end date separately
                progress: actualProgress,
                daysLeft,
                address: stake.stakerAddr,
                chain
              };
          });
          
          allProcessedStakes = [...allProcessedStakes, ...processedChainStakes];
        }
        
        setStakes(allProcessedStakes);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching stakes:', error);
        setError('Failed to fetch stakes');
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