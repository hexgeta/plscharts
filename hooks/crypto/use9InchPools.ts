'use client'

import useSWR from 'swr'

// Types for the 9INCH GraphQL API response (PancakeSwap V2 schema)
interface NineInchToken {
  id: string
  symbol: string
  name: string
  decimals: string
}

interface NineInchPair {
  id: string
  token0: NineInchToken
  token1: NineInchToken
  reserve0: string
  reserve1: string
  reserveUSD: string
  totalSupply: string
}

interface NineInchPairsResponse {
  data: {
    pairs: NineInchPair[]
  }
}

// GraphQL queries (PancakeSwap V2 schema)
const PAIRS_QUERY = `
  query GetPairs($first: Int!, $skip: Int, $orderBy: String, $orderDirection: String) {
    pairs(
      first: $first, 
      skip: $skip, 
      orderBy: $orderBy, 
      orderDirection: $orderDirection
    ) {
      id
      token0 {
        id
        symbol
        name
        decimals
      }
      token1 {
        id
        symbol
        name
        decimals
      }
      reserve0
      reserve1
      reserveUSD
      totalSupply
    }
  }
`

const PAIR_BY_ID_QUERY = `
  query GetPair($id: String!) {
    pair(id: $id) {
      id
      token0 {
        id
        symbol
        name
        decimals
      }
      token1 {
        id
        symbol
        name
        decimals
      }
      reserve0
      reserve1
      reserveUSD
      totalSupply
    }
  }
`

// GraphQL fetcher
const graphqlFetcher = async (query: string, variables: any = {}): Promise<any> => {
  const response = await fetch('https://subgraphs.9inch.io/subgraphs/name/pulsechain/v2', {
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
    throw new Error(`9INCH GraphQL request failed: ${response.status} ${response.statusText}`)
  }

  const result = await response.json()

  if (result.errors) {
    throw new Error(`9INCH GraphQL errors: ${result.errors.map((e: any) => e.message).join(', ')}`)
  }

  return result
}

// Hook to fetch specific 9INCH pools by address
export function use9InchSpecificPools(addresses: string[]) {
  const { data, error, isLoading, mutate } = useSWR(
    ['9inch-specific-pools', addresses.join(',')],
    async () => {
      const pools = []
      
      // Fetch each pool individually by address
      for (const address of addresses) {
        try {
          const result = await graphqlFetcher(PAIR_BY_ID_QUERY, { id: address.toLowerCase() })
          
          if (result.data?.pair) {
            const pair = result.data.pair
            const totalLiquidity = parseFloat(pair.reserveUSD) || 0
            const totalShares = parseFloat(pair.totalSupply) || 0
            const pricePerShare = totalShares > 0 ? totalLiquidity / totalShares : 0
            
            
            pools.push({
              id: pair.id,
              name: `${pair.token0.symbol} / ${pair.token1.symbol}`,
              symbol: `${pair.token0.symbol}-${pair.token1.symbol}`,
              address: pair.id,
              totalLiquidity: pair.reserveUSD,
              totalShares: pair.totalSupply,
              swapFee: '0.003',
              poolType: 'weighted',
              tokens: [
                {
                  address: pair.token0.id,
                  symbol: pair.token0.symbol,
                  name: pair.token0.name,
                  decimals: parseInt(pair.token0.decimals)
                },
                {
                  address: pair.token1.id,
                  symbol: pair.token1.symbol,
                  name: pair.token1.name,
                  decimals: parseInt(pair.token1.decimals)
                }
              ]
            })
          } else {
          }
        } catch (err) {
        }
      }
      
      return pools
    },
    {
      refreshInterval: 5 * 60 * 1000,
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      revalidateOnFocus: true,
      revalidateOnReconnect: false,
      fallbackData: []
    }
  )

  return {
    pools: data || [],
    isLoading,
    error,
    refetch: mutate
  }
}

// Main hook to fetch all pairs (for backward compatibility)
export function use9InchPools(options: {
  first?: number
  skip?: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
} = {}) {
  const {
    first = 1000,
    skip = 0,
    orderBy = 'reserveUSD',
    orderDirection = 'desc'
  } = options

  const { data, error, isLoading, mutate } = useSWR<NineInchPairsResponse>(
    ['9inch-pairs', first, skip, orderBy, orderDirection],
    () => graphqlFetcher(PAIRS_QUERY, { first, skip, orderBy, orderDirection }),
    {
      refreshInterval: 5 * 60 * 1000,
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      revalidateOnFocus: true,
      revalidateOnReconnect: false,
      fallbackData: { data: { pairs: [] } }
    }
  )

  const pairs = data?.data?.pairs || []
  
  // Convert pairs to pools format for compatibility
  
  const pools = pairs.map(pair => {
    // Calculate price per share from the two key metrics
    const totalLiquidity = parseFloat(pair.reserveUSD) || 0
    const totalShares = parseFloat(pair.totalSupply) || 0
    const pricePerShare = totalShares > 0 ? totalLiquidity / totalShares : 0
    
    
    // Check if this is the BBC pool we're looking for
    if (pair.id.toLowerCase() === '0xb543812ddebc017976f867da710ddb30cca22929') {
    }
    
    return {
      id: pair.id,
      name: `${pair.token0.symbol} / ${pair.token1.symbol}`,
      symbol: `${pair.token0.symbol}-${pair.token1.symbol}`,
      address: pair.id, // Use pair ID as address
      totalLiquidity: pair.reserveUSD,
      totalShares: pair.totalSupply,
      swapFee: '0.003', // Default 0.3% for PancakeSwap V2
      poolType: 'weighted',
      tokens: [
        {
          address: pair.token0.id,
          symbol: pair.token0.symbol,
          name: pair.token0.name,
          decimals: parseInt(pair.token0.decimals)
        },
        {
          address: pair.token1.id,
          symbol: pair.token1.symbol,
          name: pair.token1.name,
          decimals: parseInt(pair.token1.decimals)
        }
      ]
    }
  })

  return {
    pools, // Return converted pools for compatibility
    pairs, // Also return raw pairs
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

    getPoolByAddress: (address: string) => {
      return pools.find(pool => 
        pool.address.toLowerCase() === address.toLowerCase()
      )
    },

    // Statistics
    getTotalTVL: () => {
      return pools.reduce((sum, pool) => {
        return sum + (parseFloat(pool.totalLiquidity) || 0)
      }, 0)
    },

    getPoolCount: () => pools.length
  }
}

// Hook for a specific pair by ID
export function use9InchPool(pairId: string) {
  const { data, error, isLoading, mutate } = useSWR<{ data: { pair: NineInchPair } }>(
    pairId ? ['9inch-pair', pairId] : null,
    () => graphqlFetcher(PAIR_BY_ID_QUERY, { id: pairId }),
    {
      refreshInterval: 5 * 60 * 1000,
      errorRetryCount: 3,
      revalidateOnFocus: true,
    }
  )

  const pair = data?.data?.pair
  const pool = pair ? {
    id: pair.id,
    name: `${pair.token0.symbol} / ${pair.token1.symbol}`,
    symbol: `${pair.token0.symbol}-${pair.token1.symbol}`,
    address: pair.id,
    totalLiquidity: pair.reserveUSD,
    totalShares: pair.totalSupply,
    swapFee: '0.003',
    poolType: 'weighted',
    tokens: [
      {
        address: pair.token0.id,
        symbol: pair.token0.symbol,
        name: pair.token0.name,
        decimals: parseInt(pair.token0.decimals)
      },
      {
        address: pair.token1.id,
        symbol: pair.token1.symbol,
        name: pair.token1.name,
        decimals: parseInt(pair.token1.decimals)
      }
    ]
  } : null

  return {
    pool,
    pair,
    isLoading,
    error,
    refetch: mutate,
    exists: !!pair
  }
}

// Hook for pools containing a specific token
export function use9InchPoolsByToken(tokenSymbol: string) {
  const { pools, isLoading, error, getPoolsByToken } = use9InchPools()
  
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
export function format9InchPoolData(pool: any) {
  const totalLiquidity = parseFloat(pool.totalLiquidity) || 0
  const totalShares = parseFloat(pool.totalShares) || 0
  const pricePerShare = totalShares > 0 ? totalLiquidity / totalShares : 0

  return {
    ...pool,
    totalLiquidityFormatted: totalLiquidity.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }),
    totalSharesFormatted: totalShares.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }),
    pricePerShare,
    pricePerShareFormatted: pricePerShare.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    })
  }
}

export type { NineInchPair, NineInchToken, NineInchPairsResponse }
