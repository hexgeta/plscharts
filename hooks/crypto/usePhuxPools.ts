'use client'

import useSWR from 'swr'

// Types for the PHUX GraphQL API response
interface PhuxToken {
  address: string
  symbol: string
  name: string
  decimals: number
  weight: string
  balance: string
}

interface PhuxPool {
  id: string
  name: string
  symbol: string
  address: string
  totalLiquidity: string
  totalShares: string
  swapFee: string
  poolType: string
  tokens: PhuxToken[]
}

interface PhuxPoolsResponse {
  data: {
    pools: PhuxPool[]
  }
}

// GraphQL queries
const POOLS_QUERY = `
  query GetPools($first: Int!, $skip: Int, $orderBy: String, $orderDirection: String) {
    pools(
      first: $first, 
      skip: $skip, 
      orderBy: $orderBy, 
      orderDirection: $orderDirection
    ) {
      id
      name
      symbol
      address
      totalLiquidity
      totalShares
      swapFee
      poolType
      tokens {
        address
        symbol
        name
        decimals
        weight
        balance
      }
    }
  }
`

const POOL_BY_ID_QUERY = `
  query GetPoolById($id: String!) {
    pool(id: $id) {
      id
      address
      totalLiquidity
      totalShares
      swapFee
      poolType
      tokens {
        address
        symbol
        name
        decimals
        weight
        balance
      }
    }
  }
`

// GraphQL fetcher
const graphqlFetcher = async (query: string, variables: any = {}): Promise<any> => {
  const response = await fetch('https://sub6.phatty.io/subgraphs/name/phux/pools-v3', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  })

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`)
  }

  const result = await response.json()
  
  if (result.errors) {
    throw new Error(`GraphQL errors: ${result.errors.map((e: any) => e.message).join(', ')}`)
  }

  return result
}

// Main hook to fetch all pools
export function usePhuxPools(options: {
  first?: number
  skip?: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
} = {}) {
  const {
    first = 100,
    skip = 0,
    orderBy = 'totalLiquidity',
    orderDirection = 'desc'
  } = options

  const { data, error, isLoading, mutate } = useSWR<PhuxPoolsResponse>(
    ['phux-pools', first, skip, orderBy, orderDirection],
    () => graphqlFetcher(POOLS_QUERY, { first, skip, orderBy, orderDirection }),
    {
      refreshInterval: 5 * 60 * 1000, // 5 minutes
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      revalidateOnFocus: true,
      revalidateOnReconnect: false,
      fallbackData: { data: { pools: [] } }
    }
  )

  const pools = data?.data?.pools || []

  return {
    pools,
    isLoading,
    error,
    refetch: mutate,
    
    // Helper functions
    getPoolByTokens: (token0Symbol: string, token1Symbol: string) => {
      return pools.find(pool => {
        const symbols = pool.tokens.map(t => t.symbol.toUpperCase())
        return symbols.includes(token0Symbol.toUpperCase()) && 
               symbols.includes(token1Symbol.toUpperCase())
      })
    },
    
    getPoolsByToken: (tokenSymbol: string) => {
      return pools.filter(pool => 
        pool.tokens.some(token => 
          token.symbol.toUpperCase() === tokenSymbol.toUpperCase()
        )
      )
    },
    
    getTotalTVL: () => {
      return pools.reduce((total, pool) => {
        const liquidity = parseFloat(pool.totalLiquidity) || 0
        return total + liquidity
      }, 0)
    },
    
    getTopPoolsByTVL: (limit: number = 10) => {
      return [...pools]
        .sort((a, b) => parseFloat(b.totalLiquidity) - parseFloat(a.totalLiquidity))
        .slice(0, limit)
    },
    
    getPoolsByType: (poolType: string) => {
      return pools.filter(pool => pool.poolType === poolType)
    }
  }
}

// Hook for a specific pool by ID
export function usePhuxPool(poolId: string) {
  const { data, error, isLoading, mutate } = useSWR<{ data: { pool: PhuxPool } }>(
    poolId ? ['phux-pool', poolId] : null,
    () => graphqlFetcher(POOL_BY_ID_QUERY, { id: poolId }),
    {
      refreshInterval: 5 * 60 * 1000,
      errorRetryCount: 3,
      revalidateOnFocus: true,
    }
  )

  return {
    pool: data?.data?.pool,
    isLoading,
    error,
    refetch: mutate,
    exists: !!data?.data?.pool
  }
}

// Hook for pools containing a specific token
export function usePhuxPoolsByToken(tokenSymbol: string) {
  const { pools, isLoading, error, getPoolsByToken } = usePhuxPools()
  
  const tokenPools = getPoolsByToken(tokenSymbol)
  
  return {
    pools: tokenPools,
    isLoading,
    error,
    count: tokenPools.length,
    totalTVL: tokenPools.reduce((sum, pool) => {
      return sum + (parseFloat(pool.totalLiquidity) || 0)
    }, 0)
  }
}

// Helper function to format pool data for display
export function formatPhuxPool(pool: PhuxPool) {
  const tvl = parseFloat(pool.totalLiquidity) || 0
  const fee = parseFloat(pool.swapFee) * 100 // Convert to percentage
  
  return {
    ...pool,
    tvlFormatted: '$' + tvl.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }),
    feeFormatted: `${fee}%`,
    // Use the pool's actual name, fallback to token pair if name is empty
    displayName: pool.name || pool.tokens.map(t => t.symbol).join(' / '),
    tokenPair: pool.tokens.map(t => t.symbol).join(' / '),
    isWeighted: pool.poolType === 'Weighted',
    isStable: pool.poolType === 'Stable'
  }
}
