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

// Check if cached data is still valid (created since last 1am UTC)
const isCacheValid = (lastUpdated: string): boolean => {
  const cacheTime = new Date(lastUpdated).getTime();
  const now = Date.now();
  
  // Get the most recent 1am UTC (either today or yesterday)
  const lastOneAm = new Date();
  lastOneAm.setUTCHours(1, 0, 0, 0);
  
  // If current time is before 1am today, use yesterday's 1am
  if (now < lastOneAm.getTime()) {
    lastOneAm.setUTCDate(lastOneAm.getUTCDate() - 1);
  }
  
  // Cache is valid if it was created AFTER the most recent 1am UTC
  const isValid = cacheTime > lastOneAm.getTime();
  
  
  return isValid;
};

// Get cached data from localStorage
const getCachedHexData = (): HexDailyDataCache | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem('hex-daily-data-persistent-cache');
    if (!cached) return null;
    
    const data: HexDailyDataCache = JSON.parse(cached);
    
    // TEMPORARY: Force cache invalidation for data older than Day 2060 to fix stale cache issue
    const maxDataDay = Math.max(
      ...(data.dailyPayouts.ETH?.map(p => p.endDay) || [0]),
      ...(data.dailyPayouts.PLS?.map(p => p.endDay) || [0])
    );
    
    if (maxDataDay < 2060) {
      localStorage.removeItem('hex-daily-data-persistent-cache');
      return null;
    }
    
    // Check if cache is still valid
    if (isCacheValid(data.lastUpdated)) {
      return data;
    } else {
      localStorage.removeItem('hex-daily-data-persistent-cache');
      return null;
    }
  } catch (error) {
    localStorage.removeItem('hex-daily-data-persistent-cache');
    return null;
  }
};

// Save data to localStorage
const saveCachedHexData = (data: HexDailyDataCache): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('hex-daily-data-persistent-cache', JSON.stringify(data));
  } catch (error) {
  }
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
        hasMore = false;
        continue;
      }

      const fetchedPayouts = result.data?.dailyDataUpdates || [];
      
      if (fetchedPayouts.length > 0) {
        allPayouts = [...allPayouts, ...fetchedPayouts];
        skip += first;
        
        // Log progress every 1000 records
        if (skip % 1000 === 0) {
        }
      } else {
        hasMore = false;
      }
    } catch (error) {
      hasMore = false;
    }
  }
  
  return allPayouts;
};

// Fetch recent share rate changes from a specific chain
const fetchShareRatesFromChain = async (url: string, chain: 'ETH' | 'PLS'): Promise<ShareRatePoint[]> => {
  let allRates: ShareRatePoint[] = [];
  let hasMore = true;
  let skip = 0;
  const first = 1000;


  while (hasMore) {
  const query = `{
    shareRateChanges(
        first: ${first},
        skip: ${skip},
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
        continue;
    }

      const fetchedRates = result.data?.shareRateChanges || [];
      
      if (fetchedRates.length > 0) {
        allRates = [...allRates, ...fetchedRates];
        skip += first;
        
        // Log progress every 1000 records
        if (skip % 1000 === 0) {
        }
      } else {
        hasMore = false;
      }
  } catch (error) {
      hasMore = false;
    }
  }
  
  return allRates;
};

// Main fetcher function for SWR
const fetchHexDailyData = async (): Promise<HexDailyDataCache> => {
  // First check if we have valid cached data
  const cachedData = getCachedHexData();
  if (cachedData) {
    return cachedData; // Return cached data immediately
  }
  
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
  

  const result: HexDailyDataCache = {
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

  // Save to persistent cache
  saveCachedHexData(result);

  return result;
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

  // Helper function to get historical share rates from a specific day
  const getHistoricalShareRates = (chain: 'ETH' | 'PLS', fromDay: number): ShareRatePoint[] | null => {
    if (!data?.shareRates[chain]) return null;

    // Convert HEX day to timestamp
    const HEX_LAUNCH_DATE = new Date('2019-12-03T00:00:00Z').getTime();
    const SECONDS_PER_DAY = 86400;
    const fromTimestamp = (HEX_LAUNCH_DATE + (fromDay * SECONDS_PER_DAY * 1000)).toString();

    // Filter share rates after the fromDay and sort by timestamp
    return data.shareRates[chain]
      .filter(rate => rate.timestamp >= fromTimestamp)
      .sort((a, b) => parseInt(a.timestamp) - parseInt(b.timestamp));
  };

  return {
    data,
    error,
    isLoading,
    mutate,
    // Helper functions
    getDailyPayoutsForRange,
    getLatestShareRate,
    getHistoricalShareRates,
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
        let payoutPerTShare = Number(dayData.payoutPerTShare);
        
        // Add extra payout per T-Share for HEX day 353 (3,641.658319477 HEX per T-Share)
        // This applies to both ETH and PulseChain
        if (payoutDay === 353) {
          const extraPayoutPerTShare = 3641.658319477;
          payoutPerTShare += extraPayoutPerTShare;
        }
        
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