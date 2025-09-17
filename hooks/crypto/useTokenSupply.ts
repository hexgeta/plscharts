'use client'

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { getDailyCacheKey } from '@/utils/swr-config';
import { getCachedSupplies } from './useBackgroundPreloader';

interface TokenSupplyData {
  totalSupply: number;
}

interface UseTokenSupplyResult {
  totalSupply: number;
  loading: boolean;
  error: any;
}

const fetcher = async (url: string): Promise<TokenSupplyData> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error('Failed to fetch token supply');
  }
  return response.json();
};

// Calculate milliseconds until next 1 AM UTC
function getMillisecondsUntilNext1AMUTC(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(1, 0, 0, 0);
  return tomorrow.getTime() - now.getTime();
}

export const useTokenSupply = (tokenTicker: string | null): UseTokenSupplyResult => {
  
  // First try to get supply from bulk cache
  const cachedSupplies = getCachedSupplies();
  const cachedSupply = cachedSupplies && tokenTicker ? cachedSupplies.supplies[tokenTicker] : null;
  
  // Only make API call if not in cache and ticker is provided
  const shouldFetch = tokenTicker && !cachedSupply;
  
  const { data, error: swrError, isLoading } = useSWR(
    shouldFetch ? `/api/token-supply?ticker=${tokenTicker}` : null,
    fetcher,
    {
      dedupingInterval: 24 * 60 * 60 * 1000, // Cache for 24 hours since supplies don't change often
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0, // No automatic refresh
      // Aggressive caching - keep data fresh for a long time
      errorRetryCount: 1,
      errorRetryInterval: 2000,
      onSuccess: (data: TokenSupplyData) => {
        if (data && tokenTicker) {
        }
      },
      onError: (error) => {
      }
    }
  );

  // Return cached supply if available, otherwise API data
  if (cachedSupply) {
    return {
      totalSupply: cachedSupply,
      loading: false,
      error: null
    };
  }

  return {
    totalSupply: data?.totalSupply || 0,
    loading: isLoading,
    error: swrError
  };
}; 