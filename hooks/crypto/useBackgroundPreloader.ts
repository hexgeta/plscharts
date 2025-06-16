'use client';

import { useEffect, useRef } from 'react';
import useSWR from 'swr';
import { useHexDailyDataPreloader } from './useHexDailyData';
import { ALL_COIN_LOGOS } from '@/constants/generated-logos';

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
      console.log('[Background Preloader] Using cached token supplies:', data.count, 'tokens');
      return data;
    } else {
      console.log('[Background Preloader] Token supplies cache expired, removing');
      localStorage.removeItem(CACHE_KEYS.TOKEN_SUPPLIES);
      return null;
    }
  } catch (error) {
    console.error('[Background Preloader] Error reading token supplies cache:', error);
    localStorage.removeItem(CACHE_KEYS.TOKEN_SUPPLIES);
    return null;
  }
};

// Save token supplies to cache
const saveCachedTokenSupplies = (data: TokenSuppliesCache): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(CACHE_KEYS.TOKEN_SUPPLIES, JSON.stringify(data));
    console.log('[Background Preloader] Cached', data.count, 'token supplies');
  } catch (error) {
    console.error('[Background Preloader] Error saving token supplies cache:', error);
  }
};

const fetcher = async (url: string) => {
  console.log('[Background Preloader] Fetching from:', url);
  const response = await fetch(url);
  if (!response.ok) {
    console.error('[Background Preloader] Fetch failed:', response.status, response.statusText);
    throw new Error('Failed to fetch token supplies');
  }
  const data = await response.json();
  console.log('[Background Preloader] Successfully fetched:', data.count, 'tokens');
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
      console.log(`[Background Preloader] ${cacheKey} cache expired, will preload`);
    } else {
      console.log(`[Background Preloader] ${cacheKey} already preloaded today`);
    }
    
    return shouldReload;
  } catch (error) {
    console.log(`[Background Preloader] Error checking ${cacheKey} cache, will preload`);
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
    
    console.log(`[Background Preloader] Starting to preload ${leagueImages.length} league images...`);
    
    const preloadPromises = leagueImages.map(async (imageName) => {
      try {
        const img = new Image();
        const imageUrl = `/other-images/${imageName}`;
        
        return new Promise<void>((resolve) => {
          img.onload = () => {
            console.log(`[Background Preloader] ✅ Preloaded league image: ${imageName}`);
            resolve();
          };
          img.onerror = () => {
            console.warn(`[Background Preloader] ❌ Failed to preload league image: ${imageName}`);
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
    console.log(`[Background Preloader] Completed preloading ${leagueImages.length} league images`);
    
  } catch (error) {
    console.error('[Background Preloader] Error preloading league images:', error);
  }
};

// Preload ranking badge images
const preloadRankingBadges = async (): Promise<void> => {
  try {
    const rankingBadges = ['1.png', '2.png', '3.png'];
    
    console.log(`[Background Preloader] Starting to preload ${rankingBadges.length} ranking badges...`);
    
    const preloadPromises = rankingBadges.map(async (badgeName) => {
      try {
        const img = new Image();
        const badgeUrl = `/other-images/${badgeName}`;
        
        return new Promise<void>((resolve) => {
          img.onload = () => {
            console.log(`[Background Preloader] ✅ Preloaded ranking badge: ${badgeName}`);
            resolve();
          };
          img.onerror = () => {
            console.warn(`[Background Preloader] ❌ Failed to preload ranking badge: ${badgeName}`);
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
    console.log(`[Background Preloader] Completed preloading ${rankingBadges.length} ranking badges`);
    
  } catch (error) {
    console.error('[Background Preloader] Error preloading ranking badges:', error);
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
      console.log('[Background Preloader] Caching token supplies:', data.count, 'tokens');
      // Store in localStorage with current timestamp
      const cacheData = {
        supplies: data.supplies,
        lastUpdated: new Date().toISOString(),
        count: data.count
      };
      localStorage.setItem(CACHE_KEYS.TOKEN_SUPPLIES, JSON.stringify(cacheData));
    },
    onError: (error) => {
      console.error('[Background Preloader] Failed to fetch token supplies:', error);
    }
  });
};

// Preload coin logos in the background - ALL logos from the folder (auto-discovered)
const preloadCoinLogos = async (): Promise<void> => {
  try {
    // Use the auto-generated list of all logos in the folder
    const allLogos = ALL_COIN_LOGOS;
    
    console.log(`[Background Preloader] Starting to preload ${allLogos.length} coin logos from /coin-logos folder...`);
    
    const preloadPromises = allLogos.map(async (logoName) => {
      try {
        const img = new Image();
        const logoUrl = `/coin-logos/${logoName.toLowerCase()}.svg`;
        
        return new Promise<void>((resolve) => {
          img.onload = () => {
            console.log(`[Background Preloader] ✅ Preloaded logo: ${logoName}`);
            resolve();
          };
          img.onerror = () => {
            // Silently fail - logo might not exist for this token
            resolve();
          };
          img.src = logoUrl;
        });
      } catch (error) {
        // Silently continue if individual logo fails
        return Promise.resolve();
      }
    });
    
    await Promise.allSettled(preloadPromises);
    
    // Mark as preloaded in localStorage
    localStorage.setItem(CACHE_KEYS.COIN_LOGOS, new Date().toISOString());
    console.log(`[Background Preloader] Completed preloading ${allLogos.length} coin logos from folder`);
    
  } catch (error) {
    console.error('[Background Preloader] Error preloading coin logos:', error);
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
  
  console.log('[Background Preloader] Hook called, preload status:', hasStartedImagePreload.current);
  
  // Also trigger HEX data preloading
  useHexDailyDataPreloader();
  
  // Consolidated image preloading - check on every hook run
  useEffect(() => {
    console.log('[Background Preloader] useEffect running, checking all image preloads...');
    
    // Preload coin logos
    if (!hasStartedImagePreload.current.logos && shouldPreloadImages(CACHE_KEYS.COIN_LOGOS)) {
      hasStartedImagePreload.current.logos = true;
      console.log('[Background Preloader] Starting coin logo preload...');
      preloadCoinLogos().catch(error => {
        console.error('[Background Preloader] Coin logo preload failed:', error);
        hasStartedImagePreload.current.logos = false;
      });
    }
    
    // Preload league images
    if (!hasStartedImagePreload.current.leagues && shouldPreloadImages(CACHE_KEYS.LEAGUE_IMAGES)) {
      hasStartedImagePreload.current.leagues = true;
      console.log('[Background Preloader] Starting league image preload...');
      preloadLeagueImages().catch(error => {
        console.error('[Background Preloader] League image preload failed:', error);
        hasStartedImagePreload.current.leagues = false;
      });
    }
    
    // Preload ranking badges
    if (!hasStartedImagePreload.current.badges && shouldPreloadImages(CACHE_KEYS.RANKING_BADGES)) {
      hasStartedImagePreload.current.badges = true;
      console.log('[Background Preloader] Starting ranking badge preload...');
      preloadRankingBadges().catch(error => {
        console.error('[Background Preloader] Ranking badge preload failed:', error);
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

// Export utility functions for other hooks to use
export const getCachedSupplies = getCachedTokenSupplies;
export const isBulkCacheValid = (lastUpdated: string) => isCacheValid(lastUpdated); 