'use client';

import { useState, useEffect, useMemo } from 'react';
import { useHexDailyDataCache, useHexYieldCache, calculateYieldForStake } from './useHexDailyData';

interface HsiStake {
  id: string;
  stakeId: string;
  status: 'active' | 'inactive';
  isOverdue?: boolean;
  isEES?: boolean;
  isBPD?: boolean;
  principleHex: number;
  yieldHex: number;
  penaltyHex: number;     // Penalty amount in HEX
  netYieldHex: number;    // Yield after subtracting penalty
  totalHex: number;       // Principal + net yield (after penalty)
  tShares: number;
  startDate: string;
  endDate: string;      // The original promised end date
  actualEndDate: string; // The actual date the stake ended (for EES stakes)
  progress: number;
  daysLeft: number;
  address: string;
  chain: 'ETH' | 'PLS';
  // HSI-specific fields
  isHdrnHsi: boolean;
  isHdrnHsiTokenized: boolean;
  hdrnHsiAddress?: string;
  hdrnHsiTokenId?: string;
  hdrnLaunchBonus: number;
  hdrnMintedDays: number;
}

const HSI_SUBGRAPH_URLS = {
  ETH: 'https://graph.eth.pulsefusion.io/subgraphs/name/hedron',
  PLS: 'https://graph.pulsefusion.io/subgraphs/name/hedron'
};

const calculateCurrentHexDay = () => {
  const HEX_LAUNCH_DATE = new Date('2019-12-03T00:00:00Z').getTime();
  const SECONDS_PER_DAY = 86400;
  const currentTimestamp = Date.now();
  return Math.floor((currentTimestamp - HEX_LAUNCH_DATE) / (SECONDS_PER_DAY * 1000));
};

const formatDateToISO = (hexDay: string): string => {
  const HEX_LAUNCH_DATE = new Date('2019-12-03T00:00:00Z').getTime();
  const SECONDS_PER_DAY = 86400;
  const timestamp = HEX_LAUNCH_DATE + (Number(hexDay) * SECONDS_PER_DAY * 1000);
  return new Date(timestamp).toISOString();
};

const calculateProgress = (startDay: string, endDay: string): number => {
  const currentDay = calculateCurrentHexDay();
  const start = Number(startDay);
  const end = Number(endDay);
  
  if (currentDay <= start) return 0;
  if (currentDay >= end) return 100;
  
  return Math.round(((currentDay - start) / (end - start)) * 100);
};

const calculateDaysUntilMaturity = (endDay: string): number => {
  const currentDay = calculateCurrentHexDay();
  const end = Number(endDay);
  return end - currentDay;
};

export const useHsiStakes = (addresses: string[]) => {
  const [stakes, setStakes] = useState<HsiStake[]>([]);
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

    const fetchHsiStakes = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const currentDay = calculateCurrentHexDay();
        const addressesParam = addresses.map(addr => addr.toLowerCase()).join('","');
        
        const fetchAllHsiStakesFromChain = async (url: string, chain: 'ETH' | 'PLS') => {
          let allStakes: any[] = [];
          let hasMore = true;
          let skip = 0;
          const first = 1000;
          
          while (hasMore) {
            const query = `{
              hexstakes(
                first: ${first},
                skip: ${skip},
                where: { 
                  owner_in: ["${addressesParam}"],
                  isHdrnHsi: true
                }
                orderBy: stakeStartDay
                orderDirection: desc
              ) {
                id
                stakeId
                owner { id }
                isActive
                isHdrnHsi
                isHdrnHsiTokenized
                stakeAmount
                stakeShares
                stakedDays
                stakeStartDay
                stakeEndDayScheduled
                stakeEndDayActual
                stakePayout
                stakePenalty
                hdrnLaunchBonus
                hdrnMintedDays
                hdrnHsiAddress
                hdrnHsiTokenId
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
                hasMore = false;
                return [];
              }

              const fetchedStakes = result.data?.hexstakes || [];
              
              if (fetchedStakes.length > 0) {
                allStakes = [...allStakes, ...fetchedStakes];
                skip += first;
              } else {
                hasMore = false;
              }
            } catch (error) {
              hasMore = false;
            }
          }
          
          return allStakes;
        };
        
        let allProcessedStakes: any[] = [];
        
        // Process each chain
        const chains: ('ETH' | 'PLS')[] = ['ETH', 'PLS'];
        for (const chain of chains) {
          const chainStakes = await fetchAllHsiStakesFromChain(HSI_SUBGRAPH_URLS[chain], chain);
          
          const processedChainStakes = chainStakes.map((stake: any) => {
            const stakeId = stake.stakeId;
            const stakeStartDay = Number(stake.stakeStartDay);
            const stakeEndDay = Number(stake.stakeEndDayScheduled);
            const isStillActive = stake.isActive;
            
            let status: 'active' | 'inactive' = isStillActive ? 'active' : 'inactive';
            let isEES = false;
            let isOverdue = false;
            
            // Calculate actual end date and progress based on stake status
            let actualEndDay = stakeEndDay;
            let actualProgress = 0;
            let daysLeft = 0;
            
            if (!isStillActive && stake.stakeEndDayActual) {
              // Stake has ended
              actualEndDay = Number(stake.stakeEndDayActual);
              const servedDays = actualEndDay - stakeStartDay;
              actualProgress = Math.min(100, Math.round((servedDays / Number(stake.stakedDays)) * 100));
              daysLeft = 0;
              
              if (stake.stakePenalty && Number(stake.stakePenalty) > 0) {
                const promisedEndDay = stakeStartDay + Number(stake.stakedDays);
                // Check if ended before or after promised end date
                if (actualEndDay < promisedEndDay) {
                  // Ended early = EES
                  isEES = true;
                } else if (actualEndDay > promisedEndDay) {
                  // Ended late = Late End (not EES)
                  isOverdue = true;
                  const daysLate = actualEndDay - promisedEndDay;
                } else {
                  // Ended exactly on time but with penalty (rare edge case)
                }
              } else {
              }
            } else if (!isStillActive) {
              // Stake ended but no actual end day recorded
              actualProgress = 100;
              daysLeft = 0;
            } else {
              // Active stake
              const currentStakeDay = calculateCurrentHexDay();
              if (currentStakeDay > stakeEndDay) {
                isOverdue = true;
              }
              actualProgress = calculateProgress(stake.stakeStartDay, stakeEndDay.toString());
              daysLeft = calculateDaysUntilMaturity(stakeEndDay.toString());
            }
            
            // Calculate the original promised end date
            const promisedEndDay = stakeStartDay + Number(stake.stakedDays);
            
            // Check if this is a BPD stake (5555 days)
            const isBPD = Number(stake.stakedDays) === 5555;
            
            // Calculate yield using the same method as native stakes
            let yieldHex = 0;
            
            // Debug logging for yield calculation
            console.log(`[${chain}] HSI Stake ${stakeId} yield calculation:`, {
              stakePayout: stake.stakePayout,
              stakeAmount: stake.stakeAmount,
              isActive: stake.isActive,
              actualEndDay,
              stakeStartDay
            });
            
            if (stake.stakePayout && Number(stake.stakePayout) > 0) {
              // For ended stakes with payout data
              // Let's test different scales to find the right conversion
              const payoutRaw = Number(stake.stakePayout);
              const principalRaw = Number(stake.stakeAmount);
              
              
              // Test different conversions
              const payout8 = payoutRaw / 1e8;
              const principal8 = principalRaw / 1e8;
              const principal12 = principalRaw / 1e12;
              const principal16 = principalRaw / 1e16;
              
              
              // Use the scale that makes sense (payout > principal)
              let payoutHex = payout8;
              let principalHex = principal8;
              
              if (payout8 < principal8 && payout8 > principal12) {
                principalHex = principal12;
              } else if (payout8 < principal12 && payout8 > principal16) {
                principalHex = principal16;
              }
              
              yieldHex = Math.max(0, payoutHex - principalHex);
            } else {
              // Fallback to calculation method
              
              const cachedYield = getCachedYield(stakeId, chain, currentDay);
              
              if (!cachedYield) {
                const dailyPayouts = getDailyPayoutsForRange(chain, stakeStartDay, actualEndDay);
                
                const calculatedYield = calculateYieldForStake(
                  dailyPayouts, 
                  Number(stake.stakeShares) / 1e12, // Convert T-Shares to decimal for yield calculation
                  stakeStartDay, 
                  actualEndDay
                );
                yieldHex = calculatedYield;
              } else {
                yieldHex = cachedYield;
              }
            }
            
            // Calculate penalty in HEX
            const penaltyHex = stake.stakePenalty ? Number(stake.stakePenalty) / 1e8 : 0;
            
            const finalYieldHex = Math.max(0, yieldHex);
            const principleHex = Number(stake.stakeAmount) / 1e8;
            // Calculate net total: principal + yield - penalty (can be less than principal if penalty is large)
            const totalHex = Math.max(0, principleHex + finalYieldHex - penaltyHex);
            // Net yield is the effective yield after penalty (can be negative if penalty > yield)
            const netYieldHex = finalYieldHex - penaltyHex;
            
            
            return {
              id: `${chain}-hsi-${stake.id}`,
              stakeId,
              status,
              isEES,
              isOverdue,
              isBPD,
              principleHex,
              yieldHex: finalYieldHex,
              penaltyHex,
              netYieldHex,
              totalHex,
              tShares: Number(stake.stakeShares) / 1e12, // Convert from raw integer to decimal
              startDate: formatDateToISO(stake.stakeStartDay),
              endDate: formatDateToISO(promisedEndDay.toString()),
              actualEndDate: formatDateToISO(actualEndDay.toString()),
              progress: actualProgress,
              daysLeft,
              address: stake.owner.id,
              chain,
              // HSI-specific fields
              isHdrnHsi: stake.isHdrnHsi,
              isHdrnHsiTokenized: stake.isHdrnHsiTokenized,
              hdrnHsiAddress: stake.hdrnHsiAddress,
              hdrnHsiTokenId: stake.hdrnHsiTokenId,
              hdrnLaunchBonus: Number(stake.hdrnLaunchBonus) / 1e8,
              hdrnMintedDays: Number(stake.hdrnMintedDays)
            };
          });
          
          allProcessedStakes = [...allProcessedStakes, ...processedChainStakes];
        }
        
        setStakes(allProcessedStakes);
        setIsLoading(false);
      } catch (error) {
        setError('Failed to fetch HSI stakes');
        setIsLoading(false);
      }
    };

    // Only fetch stakes when we have addresses and the cache is ready
    if (isCacheReady) {
      fetchHsiStakes();
    } else if (!isCacheReady && addresses.length > 0) {
      console.log('[HSI Stakes] Waiting for cache to be ready...');
    }
  }, [addressesString, isCacheReady]);

  return {
    stakes,
    isLoading,
    error,
    hasStakes: stakes.length > 0
  };
}; 