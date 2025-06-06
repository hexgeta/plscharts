import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { getDailyCacheKey } from '@/utils/swr-config';

interface TokenSupplyData {
  ticker: string;
  totalSupply: number;
}

// Calculate milliseconds until next 1 AM UTC
function getMillisecondsUntilNext1AMUTC(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(1, 0, 0, 0);
  return tomorrow.getTime() - now.getTime();
}

// Custom hook for fetching token supply data with caching
export function useTokenSupply(tokenTicker: string | null) {
  const [totalSupply, setTotalSupply] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  console.log(`[useTokenSupply] Starting fetch for ${tokenTicker}`);
  
  // Get cached data from localStorage if available
  const getCachedData = () => {
    if (typeof window === 'undefined' || !tokenTicker) return null;
    try {
      const cached = localStorage.getItem(`token-supply-${tokenTicker}`);
      if (cached) {
        const parsedCache = JSON.parse(cached);
        // Check if cache is still valid (expires at 1 AM UTC)
        const now = new Date();
        const cacheDate = new Date(parsedCache.timestamp);
        const nextExpiry = new Date(cacheDate);
        nextExpiry.setUTCDate(nextExpiry.getUTCDate() + 1);
        nextExpiry.setUTCHours(1, 0, 0, 0);
        
        if (now < nextExpiry) {
          console.log(`[useTokenSupply] Using cached data for ${tokenTicker}`);
          return parsedCache.data;
        } else {
          console.log(`[useTokenSupply] Cache expired for ${tokenTicker}`);
          localStorage.removeItem(`token-supply-${tokenTicker}`);
        }
      }
      return null;
    } catch (e) {
      console.error(`[useTokenSupply] Error reading cache for ${tokenTicker}:`, e);
      return null;
    }
  };

  // Skip API call for PLS since it uses hardcoded supply, or when tokenTicker is null (preloaded data), or for SKIP_FETCH when we have preloaded data
  const shouldFetch = tokenTicker && tokenTicker !== 'PLS' && tokenTicker !== 'SKIP_FETCH' && tokenTicker.trim() !== '';
  
  const { data, error: swrError, isLoading } = useSWR(
    shouldFetch ? getDailyCacheKey(`token-supply-${tokenTicker}`) : null,
    async () => {
      console.log(`[useTokenSupply] Fetching supply for ${tokenTicker} from /api/token-supply`);

      // Fetch from API route
      const response = await fetch(`/api/token-supply?ticker=${tokenTicker}`);
      console.log(`[useTokenSupply] Response status for ${tokenTicker}:`, response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[useTokenSupply] Error response for ${tokenTicker}:`, errorText);
        const errorData = errorText.startsWith('{') ? JSON.parse(errorText) : { error: errorText };
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data: TokenSupplyData = await response.json();
      console.log(`[useTokenSupply] Success data for ${tokenTicker}:`, data);
      
      if (data.totalSupply === null || data.totalSupply === undefined) {
        throw new Error('Invalid supply data received');
      }

      // Cache the result with timestamp
      if (typeof window !== 'undefined') {
        const cacheData = {
          data: data.totalSupply,
          timestamp: new Date().toISOString()
        };
        localStorage.setItem(`token-supply-${tokenTicker}`, JSON.stringify(cacheData));
        console.log(`[useTokenSupply] Cached data for ${tokenTicker}`);
      }

      return data.totalSupply;
    },
    {
      dedupingInterval: 300000, // 5 minute cache like portfolio balances
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0, // No automatic refresh
      fallbackData: shouldFetch ? getCachedData() : undefined,
      // Aggressive caching - keep data fresh for a long time
      errorRetryCount: 1,
      errorRetryInterval: 30000
    }
  );

  useEffect(() => {
    if (!tokenTicker) {
      // Skip fetching when tokenTicker is null (preloaded data)
      setTotalSupply(0);
      setLoading(false);
      setError(null);
      return;
    }

    if (tokenTicker === 'PLS') {
      // Use hardcoded supply for PLS
      console.log(`[useTokenSupply] Using hardcoded supply for PLS`);
      setTotalSupply(137000000000000); // 137T for PLS
      setLoading(false);
      setError(null);
      return;
    }

    if (tokenTicker === 'SKIP_FETCH') {
      // Skip fetching when we have preloaded data
      setTotalSupply(0);
      setLoading(false);
      setError(null);
      return;
    }

    if (data !== undefined) {
      setTotalSupply(data);
      setLoading(false);
      setError(null);
    }
    
    if (swrError) {
      console.error(`[useTokenSupply] Error fetching token supply for ${tokenTicker}:`, swrError);
      setError(swrError instanceof Error ? swrError.message : 'Unknown error occurred');
      setTotalSupply(0);
      setLoading(false);
    }
  }, [data, swrError, tokenTicker]);

  return { totalSupply, loading, error };
} 