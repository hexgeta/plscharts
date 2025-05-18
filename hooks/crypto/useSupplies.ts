'use client'

import useSWR from 'swr';
import { TOKEN_CONSTANTS } from '@/constants/crypto';

async function fetchSupplies() {
  try {
    const supplies: Record<string, string> = {};

    // Process each token that has a contract address
    for (const [token, config] of Object.entries(TOKEN_CONSTANTS)) {
      if (!config.contractAddress) continue;

      try {
        const url = `https://api.scan.pulsechain.com/api?module=stats&action=tokensupply&contractaddress=${config.contractAddress}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.status === '1' && data.result) {
          supplies[token] = data.result;
        }
      } catch (error) {
        console.error(`Error fetching supply for ${token}:`, error);
      }
    }

    return supplies;
  } catch (error) {
    console.error("Error fetching supplies:", error);
    throw error;
  }
}

export function useSupplies() {
  const { data, error, isLoading, mutate } = useSWR(
    'tokenSupplies',
    fetchSupplies,
    {
      refreshInterval: 300000, // Refresh every 5 minutes
      revalidateOnFocus: false,
      dedupingInterval: 60000, // Only revalidate once per minute
    }
  );

  return {
    supplies: data,
    isLoading,
    isError: error,
    mutate
  };
} 