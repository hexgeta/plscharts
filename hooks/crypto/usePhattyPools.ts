'use client'

import useSWR from 'swr'

// Types for the pool data (adjust based on actual API response)
interface PhattyPool {
  id: string
  name: string
  token0: {
    address: string
    symbol: string
    decimals: number
  }
  token1: {
    address: string
    symbol: string
    decimals: number
  }
  tvl?: number
  volume24h?: number
  fee?: number
  // Add more fields based on actual API response
}

interface PhattyPoolsResponse {
  pools: PhattyPool[]
  // Add more fields based on actual API response
}

// Fetcher function for the pools data
const fetcher = async (url: string): Promise<PhattyPoolsResponse> => {
  const response = await fetch(url)
  
  if (!response.ok) {
    throw new Error(`Failed to fetch pools: ${response.status} ${response.statusText}`)
  }
  
  const data = await response.json()
  return data
}

// Custom hook to fetch pool data from phatty.io
export function usePhattyPools() {
  const { data, error, isLoading, mutate } = useSWR<PhattyPoolsResponse>(
    'https://sub3.phatty.io/api/pools/allPools',
    fetcher,
    {
      // Refresh every 5 minutes
      refreshInterval: 5 * 60 * 1000,
      // Retry on error
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      // Revalidate on focus
      revalidateOnFocus: true,
      // Don't revalidate on reconnect to avoid spam
      revalidateOnReconnect: false,
      // Fallback to cache on error
      fallbackData: { pools: [] },
      // Only fetch on client side
      ...(typeof window === 'undefined' ? { fallback: { pools: [] } } : {})
    }
  )

  return {
    pools: data?.pools || [],
    isLoading,
    error,
    refetch: mutate,
    // Helper functions
    getPoolByTokens: (token0Symbol: string, token1Symbol: string) => {
      return data?.pools?.find(pool => 
        (pool.token0.symbol === token0Symbol && pool.token1.symbol === token1Symbol) ||
        (pool.token0.symbol === token1Symbol && pool.token1.symbol === token0Symbol)
      )
    },
    getPoolsByToken: (tokenSymbol: string) => {
      return data?.pools?.filter(pool => 
        pool.token0.symbol === tokenSymbol || pool.token1.symbol === tokenSymbol
      ) || []
    },
    getTotalTVL: () => {
      return data?.pools?.reduce((total, pool) => total + (pool.tvl || 0), 0) || 0
    }
  }
}

// Hook for a specific pool
export function usePhattyPool(poolId: string) {
  const { pools, isLoading, error } = usePhattyPools()
  
  const pool = pools.find(p => p.id === poolId)
  
  return {
    pool,
    isLoading,
    error,
    exists: !!pool
  }
}

// Hook for pools containing a specific token
export function usePhattyPoolsByToken(tokenSymbol: string) {
  const { pools, isLoading, error, getPoolsByToken } = usePhattyPools()
  
  return {
    pools: getPoolsByToken(tokenSymbol),
    isLoading,
    error,
    count: getPoolsByToken(tokenSymbol).length
  }
}
