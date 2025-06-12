'use client';

import useSWR from 'swr';

interface DailyDataPoint {
  beginDay: number;
  endDay: number;
  payoutPerTShare: string;
  payout: string;
  shares: string;
  timestamp: string;
}

interface ShareRatePoint {
  id: string;
  stakeId: string;
  shareRate: string;
  tShareRateHearts: string;
  tShareRateHex: string;
  timestamp: string;
  blockNumber: string;
}

interface HexDailyDataCache {
  dailyPayouts: {
    ETH: DailyDataPoint[];
    PLS: DailyDataPoint[];
  };
  shareRates: {
    ETH: ShareRatePoint[];
    PLS: ShareRatePoint[];
  };
  lastUpdated: string;
  dataRange: {
    minDay: number;
    maxDay: number;
  };
}

interface YieldCalculation {
  stakeId: string;
  chain: 'ETH' | 'PLS';
  stakerAddr: string;
  tShares: number;
  startDay: number;
  endDay: number;
  yieldHex: number;
  calculatedAt: string;
  effectiveEndDay: number;
}

interface YieldCache {
  yields: YieldCalculation[];
  lastUpdated: string;
}

const SUBGRAPH_URLS = {
  ETH: 'https://graph.ethereum.pulsechain.com/subgraphs/name/Codeakk/Hex',
  PLS: 'https://graph.pulsechain.com/subgraphs/name/Codeakk/Hex'
};

// Calculate next 1am UTC timestamp for cache invalidation
const getNext1amUTC = (): number => {
  const now = new Date();
  const next1am = new Date();
  next1am.setUTCHours(1, 0, 0, 0);
  
  // If it's already past 1am today, set for tomorrow
  if (now.getTime() > next1am.getTime()) {
    next1am.setUTCDate(next1am.getUTCDate() + 1);
  }
  
  return next1am.getTime();
};

// Calculate current HEX day
const calculateCurrentHexDay = (): number => {
  const HEX_LAUNCH_DATE = new Date('2019-12-03T00:00:00Z').getTime();
  const SECONDS_PER_DAY = 86400;
  const currentTimestamp = Date.now();
  return Math.floor((currentTimestamp - HEX_LAUNCH_DATE) / (SECONDS_PER_DAY * 1000));
};

// Fetch daily payouts from a specific chain
const fetchDailyPayoutsFromChain = async (url: string, chain: 'ETH' | 'PLS'): Promise<DailyDataPoint[]> => {
  let allPayouts: DailyDataPoint[] = [];
  let hasMore = true;
  let skip = 0;
  const first = 1000;
  
  console.log(`[HEX Daily Cache] Fetching daily payouts from ${chain}...`);
  
  while (hasMore) {
    const query = `{
      dailyDataUpdates(
        first: ${first},
        skip: ${skip},
        orderBy: beginDay
        orderDirection: asc
      ) {
        beginDay
        endDay
        payoutPerTShare
        payout
        shares
        timestamp
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
        continue;
      }

      const fetchedPayouts = result.data?.dailyDataUpdates || [];
      
      if (fetchedPayouts.length > 0) {
        allPayouts = [...allPayouts, ...fetchedPayouts];
        skip += first;
        
        // Log progress every 1000 records
        if (skip % 1000 === 0) {
          console.log(`[${chain}] Fetched ${allPayouts.length} daily payout records...`);
        }
      } else {
        hasMore = false;
      }
    } catch (error) {
      console.error(`[${chain}] Error fetching daily payouts:`, error);
      hasMore = false;
    }
  }
  
  console.log(`[${chain}] Completed: ${allPayouts.length} daily payout records`);
  return allPayouts;
};

// Fetch recent share rate changes from a specific chain
const fetchShareRatesFromChain = async (url: string, chain: 'ETH' | 'PLS'): Promise<ShareRatePoint[]> => {
  const query = `{
    shareRateChanges(
      first: 1000,
      orderBy: timestamp
      orderDirection: desc
    ) {
      id
      stakeId
      shareRate
      tShareRateHearts
      tShareRateHex
      timestamp
      blockNumber
    }
  }`;

  try {
    console.log(`[HEX Daily Cache] Fetching share rates from ${chain}...`);
    
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
      return [];
    }

    const shareRates = result.data?.shareRateChanges || [];
    console.log(`[${chain}] Fetched ${shareRates.length} share rate records`);
    return shareRates;
  } catch (error) {
    console.error(`[${chain}] Error fetching share rates:`, error);
    return [];
  }
};

// Main fetcher function for SWR
const fetchHexDailyData = async (): Promise<HexDailyDataCache> => {
  console.log('[HEX Daily Cache] Starting background fetch of all daily data...');
  const startTime = Date.now();
  
  // Fetch data from both chains in parallel
  const [ethPayouts, plsPayouts, ethShareRates, plsShareRates] = await Promise.all([
    fetchDailyPayoutsFromChain(SUBGRAPH_URLS.ETH, 'ETH'),
    fetchDailyPayoutsFromChain(SUBGRAPH_URLS.PLS, 'PLS'),
    fetchShareRatesFromChain(SUBGRAPH_URLS.ETH, 'ETH'),
    fetchShareRatesFromChain(SUBGRAPH_URLS.PLS, 'PLS'),
  ]);

  // Calculate data range
  const allPayouts = [...ethPayouts, ...plsPayouts];
  const minDay = allPayouts.length > 0 ? Math.min(...allPayouts.map(p => p.beginDay)) : 0;
  const maxDay = allPayouts.length > 0 ? Math.max(...allPayouts.map(p => p.endDay)) : 0;

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;
  
  console.log(`[HEX Daily Cache] Completed in ${duration.toFixed(2)}s: ETH(${ethPayouts.length} payouts, ${ethShareRates.length} rates), PLS(${plsPayouts.length} payouts, ${plsShareRates.length} rates)`);
  console.log(`[HEX Daily Cache] Data range: Day ${minDay} to ${maxDay}`);

  return {
    dailyPayouts: {
      ETH: ethPayouts,
      PLS: plsPayouts,
    },
    shareRates: {
      ETH: ethShareRates,
      PLS: plsShareRates,
    },
    lastUpdated: new Date().toISOString(),
    dataRange: {
      minDay,
      maxDay,
    },
  };
};

// Custom SWR hook with 1am UTC cache invalidation
export const useHexDailyDataCache = () => {
  const { data, error, isLoading, mutate } = useSWR(
    'hex-daily-data-cache',
    fetchHexDailyData,
    {
      // Cache until next 1am UTC
      refreshInterval: 0, // Don't auto-refresh
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: getNext1amUTC() - Date.now(), // Cache until 1am UTC
      // Only revalidate if data is older than 1am UTC today
      revalidateIfStale: (() => {
        const now = new Date();
        const today1am = new Date();
        today1am.setUTCHours(1, 0, 0, 0);
        return now.getTime() > today1am.getTime();
      })(),
      // Background fetch - don't block UI
      suspense: false,
      // Keep data fresh for 23+ hours (until next 1am)
      focusThrottleInterval: 60000, // 1 minute minimum between focus refreshes
    }
  );

  // Helper function to get daily payouts for a specific chain and date range
  const getDailyPayoutsForRange = (
    chain: 'ETH' | 'PLS',
    startDay: number,
    endDay: number
  ): DailyDataPoint[] => {
    if (!data?.dailyPayouts[chain]) return [];
    
    return data.dailyPayouts[chain].filter(
      payout => payout.endDay >= startDay && payout.endDay <= endDay
    );
  };

  // Helper function to get latest share rate for a chain
  const getLatestShareRate = (chain: 'ETH' | 'PLS'): ShareRatePoint | null => {
    if (!data?.shareRates[chain] || data.shareRates[chain].length === 0) return null;
    return data.shareRates[chain][0]; // Already sorted by timestamp desc
  };

  return {
    data,
    error,
    isLoading,
    mutate,
    // Helper functions
    getDailyPayoutsForRange,
    getLatestShareRate,
    // Status info
    isReady: !!data && !error,
    lastUpdated: data?.lastUpdated,
    dataRange: data?.dataRange,
    // Force refresh function
    refresh: () => mutate(),
  };
};

// Calculate yield for a specific stake using cached daily payouts
export const calculateYieldForStake = (
  dailyPayouts: DailyDataPoint[], 
  tShares: number, 
  startDay: number, 
  endDay: number
): number => {
  let totalYield = 0;
  
  for (const dayData of dailyPayouts) {
    const payoutDay = dayData.endDay;
    
    // Only count payouts for days the stake was active
    if (payoutDay >= startDay && payoutDay <= endDay) {
      const payoutPerTShare = Number(dayData.payoutPerTShare);
      totalYield += payoutPerTShare * tShares;
    }
  }
  
  return totalYield;
};

// Yield cache fetcher function
const fetchYieldCache = async (): Promise<YieldCache> => {
  // This is a placeholder - the actual yields will be calculated and stored
  // by the useHexStakes hook when it processes stakes
  return {
    yields: [],
    lastUpdated: new Date().toISOString(),
  };
};

// Hook for managing yield cache
export const useHexYieldCache = () => {
  const { data, error, isLoading, mutate } = useSWR(
    'hex-yield-cache',
    fetchYieldCache,
    {
      // Cache until next 1am UTC (same as daily data)
      refreshInterval: 0,
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: getNext1amUTC() - Date.now(),
      revalidateIfStale: (() => {
        const now = new Date();
        const today1am = new Date();
        today1am.setUTCHours(1, 0, 0, 0);
        return now.getTime() > today1am.getTime();
      })(),
      suspense: false,
      focusThrottleInterval: 60000,
    }
  );

  // Function to store calculated yields
  const cacheYields = (yields: YieldCalculation[]) => {
    const newCache: YieldCache = {
      yields,
      lastUpdated: new Date().toISOString(),
    };
    
    console.log(`[HEX Yield Cache] Caching ${yields.length} yield calculations`);
    mutate(newCache, false); // Update cache without revalidation
  };

  // Function to get cached yield for a specific stake
  const getCachedYield = (
    stakeId: string, 
    chain: 'ETH' | 'PLS', 
    currentDay: number
  ): number | null => {
    if (!data?.yields) return null;
    
    const cachedYield = data.yields.find(
      y => y.stakeId === stakeId && y.chain === chain
    );
    
    if (!cachedYield) return null;
    
    // If stake is still active and we have a newer effective end day, 
    // we need to recalculate
    if (cachedYield.effectiveEndDay < Math.min(currentDay, cachedYield.endDay)) {
      return null; // Force recalculation
    }
    
    return cachedYield.yieldHex;
  };

  // Function to check if yields are cached for given stakes
  const areYieldsCached = (stakes: Array<{stakeId: string, chain: 'ETH' | 'PLS'}>) => {
    if (!data?.yields) return false;
    
    return stakes.every(stake => 
      data.yields.some(y => y.stakeId === stake.stakeId && y.chain === stake.chain)
    );
  };

  return {
    data,
    error,
    isLoading,
    cacheYields,
    getCachedYield,
    areYieldsCached,
    isReady: !!data && !error,
    lastUpdated: data?.lastUpdated,
    totalCachedYields: data?.yields?.length || 0,
    refresh: () => mutate(),
  };
};

// Background preloader hook - call this on app startup
export const useHexDailyDataPreloader = () => {
  const { isReady, lastUpdated } = useHexDailyDataCache();
  
  // This hook just triggers the cache loading in the background
  // The actual data fetching happens via SWR automatically
  
  return {
    isPreloaded: isReady,
    lastUpdated,
  };
}; 