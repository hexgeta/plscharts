'use client';

import { useEffect, useRef } from 'react';
import useSWR from 'swr';
import { useHexDailyDataPreloader } from './useHexDailyData';


// Cache keys for localStorage
const CACHE_KEYS = {
  TOKEN_SUPPLIES: 'token-supplies-cache',
  COIN_LOGOS: 'coin-logos-preloaded',
  LEAGUE_IMAGES: 'league-images-preloaded',
  RANKING_BADGES: 'ranking-badges-preloaded'
};

// Check if cached data is still valid (before next 1am UTC)
const isCacheValid = (lastUpdated: string): boolean => {
  const cacheTime = new Date(lastUpdated).getTime();
  const now = Date.now();
  const next1am = getNext1amUTC();
  
  // Cache is valid if it was created before next 1am UTC AND current time is before next 1am UTC
  return cacheTime < next1am && now < next1am;
};

// Calculate next 1am UTC timestamp
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

// Token supplies cache interface
interface TokenSuppliesCache {
  supplies: Record<string, number>;
  lastUpdated: string;
  count: number;
}

// Get cached token supplies
const getCachedTokenSupplies = (): TokenSuppliesCache | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = localStorage.getItem(CACHE_KEYS.TOKEN_SUPPLIES);
    if (!cached) return null;
    
    const data: TokenSuppliesCache = JSON.parse(cached);
    
    if (isCacheValid(data.lastUpdated)) {
      return data;
    } else {
      localStorage.removeItem(CACHE_KEYS.TOKEN_SUPPLIES);
      return null;
    }
  } catch (error) {
    localStorage.removeItem(CACHE_KEYS.TOKEN_SUPPLIES);
    return null;
  }
};

// Save token supplies to cache
const saveCachedTokenSupplies = (data: TokenSuppliesCache): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(CACHE_KEYS.TOKEN_SUPPLIES, JSON.stringify(data));
  } catch (error) {
  }
};

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch token supplies');
  }
  const data = await response.json();
  return data;
};

// Check if images have been preloaded recently
const shouldPreloadImages = (cacheKey: string): boolean => {
  if (typeof window === 'undefined') return false;
  
  try {
    const lastPreloaded = localStorage.getItem(cacheKey);
    if (!lastPreloaded) return true;
    
    const preloadTime = new Date(lastPreloaded).getTime();
    const now = Date.now();
    const next1am = getNext1amUTC();
    
    // Preload if it hasn't been done yet today (before next 1am UTC)
    const shouldReload = preloadTime < (next1am - 24 * 60 * 60 * 1000) || now >= next1am;
    
    if (shouldReload) {
    } else {
    }
    
    return shouldReload;
  } catch (error) {
    return true;
  }
};

// Preload league images (sea creatures)
const preloadLeagueImages = async (): Promise<void> => {
  try {
    const leagueImages = [
      'poseidon.png', 'whale.png', 'shark.png', 'dolphin.png',
      'squid.png', 'turtle.png', 'crab.png', 'shrimp.png', 'shell.png'
    ];
    
    
    const preloadPromises = leagueImages.map(async (imageName) => {
      try {
        const img = new Image();
        const imageUrl = `/other-images/${imageName}`;
        
        return new Promise<void>((resolve) => {
          img.onload = () => {
            resolve();
          };
          img.onerror = () => {
            resolve();
          };
          img.src = imageUrl;
        });
      } catch (error) {
        return Promise.resolve();
      }
    });
    
    await Promise.allSettled(preloadPromises);
    
    // Mark as preloaded in localStorage
    localStorage.setItem(CACHE_KEYS.LEAGUE_IMAGES, new Date().toISOString());
    
  } catch (error) {
  }
};

// Preload ranking badge images
const preloadRankingBadges = async (): Promise<void> => {
  try {
    const rankingBadges = ['1.png', '2.png', '3.png'];
    
    
    const preloadPromises = rankingBadges.map(async (badgeName) => {
      try {
        const img = new Image();
        const badgeUrl = `/other-images/${badgeName}`;
        
        return new Promise<void>((resolve) => {
          img.onload = () => {
            resolve();
          };
          img.onerror = () => {
            resolve();
          };
          img.src = badgeUrl;
        });
      } catch (error) {
        return Promise.resolve();
      }
    });
    
    await Promise.allSettled(preloadPromises);
    
    // Mark as preloaded in localStorage
    localStorage.setItem(CACHE_KEYS.RANKING_BADGES, new Date().toISOString());
    
  } catch (error) {
  }
};

// SWR hook for fetching bulk token supplies
export const useTokenSuppliesCache = () => {
  return useSWR('/api/token-supply/bulk', fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    refreshInterval: 0, // Disable automatic refresh
    dedupingInterval: 24 * 60 * 60 * 1000, // 24 hours
    onSuccess: (data) => {
      // Store in localStorage with current timestamp
      const cacheData = {
        supplies: data.supplies,
        lastUpdated: new Date().toISOString(),
        count: data.count
      };
      localStorage.setItem(CACHE_KEYS.TOKEN_SUPPLIES, JSON.stringify(cacheData));
    },
    onError: (error) => {
    }
  });
};

// Import token constants to include in logo preloading
import { TOKEN_CONSTANTS } from '@/constants/crypto'
import { MORE_COINS } from '@/constants/more-coins'
import { cleanTickerForLogo } from '@/utils/ticker-display'

// Preload coin logos in the background - two-phase approach
const preloadCoinLogos = async (): Promise<void> => {
  try {
    // Phase 1: Load common/important logos first for quick performance
    const commonLogos = [
      'PLS', 'PLSX', 'HEX', 'HEXDC', 'HDRN', 'ICSA', 'INC', 'COM', 'PHIAT', 'PHAME',
      'BTC', 'ETH', 'USDC', 'USDT', 'DAI', 'WBTC', 'WETH', 'UNI', 'LINK', 'AAVE',
      'weHEX', 'weUSDC', 'weUSDT', 'weDAI', 'weLINK', 'weWBTC', 'weWETH',
      'DECI', 'MAXI', 'EARN', 'FLEX', 'ASIC', 'MINT', 'TEXAN'
    ];
    
    
    const tryLoadImage = (url: string, logoName: string): Promise<boolean> => {
      return new Promise<boolean>((resolve) => {
        const img = new Image();
        img.onload = () => {
          resolve(true);
        };
        img.onerror = () => resolve(false);
        img.src = url;
      });
    };
    
    // Phase 1: Load common logos quickly
    const commonPreloadPromises = commonLogos.map(async (logoName) => {
      try {
        const attempts = [
          `/coin-logos/${logoName}.svg`,
          `/coin-logos/${logoName}.png`,
          `/coin-logos/${logoName.toUpperCase()}.svg`,
          `/coin-logos/${logoName.toUpperCase()}.png`
        ];
        
        for (const url of attempts) {
          const success = await tryLoadImage(url, logoName);
          if (success) break;
        }
      } catch (error) {
        return Promise.resolve();
      }
    });
    
    await Promise.allSettled(commonPreloadPromises);
    
    // Phase 2: Load all remaining logos in background (comprehensive list from actual token data)
    
    // Extract tickers from all available token sources
    const allTokenTickers = [
      ...TOKEN_CONSTANTS.map(token => cleanTickerForLogo(token.ticker)),
      ...MORE_COINS.map(token => cleanTickerForLogo(token.ticker))
    ];
    
    // Combine with common logos and additional known tokens
    const allLogos: string[] = [
      ...commonLogos, // Include common ones again in case they failed
      ...allTokenTickers, // All tokens from our data sources
      // Additional tokens from various sources that might not be in our constants
      '1INCH', '9MM', 'AAVE', 'ADA', 'ALIEN', 'AXIS', 'BASE', 'BBC', 'BEAR', 'BNB', 'CST', 'CULT', 'DAIX', 'DCA', 'DMND', 'DRS', 'DWB', 'FIRE', 'GENI', 'HOA', 'IM', 'LUCKY', 'MORE', 'MOST', 'PARTY', 'PATH', 'PAXG', 'PNS', 'PRNDR', 'PRS', 'PSAND', 'PTGC', 'PTS', 'PUMP', 'SHIB', 'TBILL', 'TETRA', 'TIME', 'TON', 'TRIO', 'TRUMP', 'UFO', 'UP', 'UPX', 'VPLS', 'VRX', 'WATER', 'WATT', 'WBNB', 'XEN', 'ZKZX',
      // Ethereum bridged tokens
      'eHEX', 'eDECI', 'eHDRN', 'eMAXI', 'ePEPE',
      // PulseChain wrapped tokens  
      'pAAVE', 'pAMPL', 'pAPE', 'pBAL', 'pBAT', 'pBTT', 'pCOMP', 'pCREAM', 'pCRO', 'pCULT', 'pDAI', 'pENS', 'pFET', 'pGRT', 'pLDO', 'pLINK', 'pMANA', 'pMKR', 'pPAXG', 'pPEPE', 'pSHIB', 'pSTETH', 'pTUSD', 'pUNI', 'pUSDC', 'pUSDT', 'pWBTC', 'pWETH', 'pWPLS', 'pXEN', 'pYFI',
      // Additional we tokens
      'weBASE', 'weDAI', 'weDECI', 'weHDRN', 'weICSA', 'weLUCKY', 'weMAXI', 'wePEPE', 'weSHIB', 'weTRIO', 'weUNI'
    ];
    
    // Remove duplicates and use Set for performance
    const uniqueLogos = [...new Set(allLogos)];
    
    // Phase 2: Load remaining logos more slowly to not overwhelm the browser
    const loadRemainingLogos = async () => {
      const batchSize = 10; // Load 10 at a time
      const batches: string[][] = [];
      
      for (let i = 0; i < uniqueLogos.length; i += batchSize) {
        batches.push(uniqueLogos.slice(i, i + batchSize));
      }
      
      for (const batch of batches) {
        const batchPromises = batch.map(async (logoName) => {
          try {
            const attempts = [
              `/coin-logos/${logoName}.svg`,
              `/coin-logos/${logoName}.png`,
              `/coin-logos/${logoName.toUpperCase()}.svg`,
              `/coin-logos/${logoName.toUpperCase()}.png`
            ];
            
            for (const url of attempts) {
              const success = await tryLoadImage(url, logoName);
              if (success) break;
            }
          } catch (error) {
            return Promise.resolve();
          }
        });
        
        await Promise.allSettled(batchPromises);
        // Small delay between batches to not overwhelm the browser
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    };
    
    // Run Phase 2 in background (don't await)
    loadRemainingLogos().then(() => {
    });
    
    // Mark Phase 1 as complete in localStorage
    localStorage.setItem(CACHE_KEYS.COIN_LOGOS, new Date().toISOString());
    
  } catch (error) {
  }
};

// Main background preloader hook
export const useBackgroundPreloader = () => {
  const { data, error, isLoading } = useTokenSuppliesCache();
  const hasStartedImagePreload = useRef({
    logos: false,
    leagues: false,
    badges: false
  });
  
  
  // Also trigger HEX data preloading
  useHexDailyDataPreloader();
  
  // Consolidated image preloading - check on every hook run
  useEffect(() => {
    
    // Preload coin logos
    if (!hasStartedImagePreload.current.logos && shouldPreloadImages(CACHE_KEYS.COIN_LOGOS)) {
      hasStartedImagePreload.current.logos = true;
      preloadCoinLogos().catch(error => {
        hasStartedImagePreload.current.logos = false;
      });
    }
    
    // Preload league images
    if (!hasStartedImagePreload.current.leagues && shouldPreloadImages(CACHE_KEYS.LEAGUE_IMAGES)) {
      hasStartedImagePreload.current.leagues = true;
      preloadLeagueImages().catch(error => {
        hasStartedImagePreload.current.leagues = false;
      });
    }
    
    // Preload ranking badges
    if (!hasStartedImagePreload.current.badges && shouldPreloadImages(CACHE_KEYS.RANKING_BADGES)) {
      hasStartedImagePreload.current.badges = true;
      preloadRankingBadges().catch(error => {
        hasStartedImagePreload.current.badges = false;
      });
    }
  }, []);
  
  return {
    data,
    error,
    isLoading,
    supplies: data?.supplies || {},
    lastUpdated: data?.lastUpdated,
    totalSupplies: data?.count || 0,
  };
};

// Clear token supplies cache
export const clearTokenSuppliesCache = (): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(CACHE_KEYS.TOKEN_SUPPLIES);
  } catch (error) {
    console.error('Failed to clear token supplies cache:', error);
  }
};

// Export utility functions for other hooks to use
export const getCachedSupplies = getCachedTokenSupplies;
export const isBulkCacheValid = (lastUpdated: string) => isCacheValid(lastUpdated); 