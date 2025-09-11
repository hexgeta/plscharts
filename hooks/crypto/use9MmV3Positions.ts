'use client'

import useSWR from 'swr'

// Types for 9MM V3 GraphQL API response (Uniswap V3 schema)
interface NineMmToken {
  id: string
  symbol: string
  name: string
  decimals: string
}

interface NineMmPool {
  id: string
  token0: NineMmToken
  token1: NineMmToken
  feeTier: string
  tick: string
  sqrtPrice: string
  token0Price: string
  token1Price: string
  totalValueLockedUSD: string
  volumeUSD: string
  liquidity: string
}

interface NineMmPosition {
  id: string
  owner: string
  pool: NineMmPool
  tickLower: string
  tickUpper: string
  liquidity: string
  depositedToken0: string
  depositedToken1: string
  withdrawnToken0: string
  withdrawnToken1: string
  collectedFeesToken0: string
  collectedFeesToken1: string
}

interface NineMmPositionsResponse {
  data: {
    positions: NineMmPosition[]
  }
}

interface NineMmPoolsResponse {
  data: {
    pools: NineMmPool[]
  }
}

// GraphQL queries for V3 positions
const POSITIONS_BY_OWNER_QUERY = `
  query GetPositions($owner: String!, $first: Int!) {
    positions(where: { owner: $owner }, first: $first, orderBy: liquidity, orderDirection: desc) {
      id
      owner
      pool {
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
        feeTier
        tick
        sqrtPrice
        token0Price
        token1Price
        totalValueLockedUSD
        volumeUSD
        liquidity
      }
      tickLower
      tickUpper
      liquidity
      depositedToken0
      depositedToken1
      withdrawnToken0
      withdrawnToken1
      collectedFeesToken0
      collectedFeesToken1
    }
  }
`

const POOLS_BY_IDS_QUERY = `
  query GetPools($ids: [String!]!) {
    pools(where: { id_in: $ids }) {
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
      feeTier
      tick
      sqrtPrice
      token0Price
      token1Price
      totalValueLockedUSD
      volumeUSD
      liquidity
    }
  }
`

// GraphQL fetcher for 9MM V3
const graphqlFetcher = async (query: string, variables: any = {}): Promise<any> => {
  console.log('[9MM V3 GraphQL] Making request to 9MM V3 API...')
  const response = await fetch('https://graph.9mm.pro/subgraphs/name/pulsechain/9mm-v3-latest', {
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
    console.error(`[9MM V3 GraphQL] Request failed: ${response.status} ${response.statusText}`)
    throw new Error(`9MM V3 GraphQL request failed: ${response.status} ${response.statusText}`)
  }

  const result = await response.json()
  console.log(`[9MM V3 GraphQL] Response received:`, result)

  if (result.errors) {
    console.error('9MM V3 GraphQL errors:', result.errors)
    throw new Error(`9MM V3 GraphQL errors: ${result.errors.map((e: any) => e.message).join(', ')}`)
  }

  return result
}

// Helper function to calculate V3 position value
// Note: This needs access to USD prices from the Portfolio component's pricing system
function calculateV3PositionValue(position: NineMmPosition, getTokenPrice?: (symbol: string) => number): {
  currentValue: number
  feesValue: number
  totalValue: number
  token0Amount: number
  token1Amount: number
} {
  const pool = position.pool
  const token0Decimals = parseInt(pool.token0.decimals)
  const token1Decimals = parseInt(pool.token1.decimals)
  
  // Calculate current token amounts based on deposited minus withdrawn
  let token0Amount = 0
  let token1Amount = 0
  
  // Calculate net token amounts (deposited - withdrawn)
  const netToken0 = parseFloat(position.depositedToken0) - parseFloat(position.withdrawnToken0)
  const netToken1 = parseFloat(position.depositedToken1) - parseFloat(position.withdrawnToken1)
  
  // The V3 subgraph already returns human-readable amounts (not raw blockchain values)
  // For current position value, we only count positive net amounts (remaining liquidity)
  token0Amount = Math.max(0, netToken0) // Only positive amounts represent actual remaining tokens
  token1Amount = Math.max(0, netToken1) // Negative means more withdrawn than deposited
  
  // Get USD prices with fallback strategy
  let token0USDPrice = getTokenPrice ? getTokenPrice(pool.token0.symbol) : 0
  let token1USDPrice = getTokenPrice ? getTokenPrice(pool.token1.symbol) : 0
  
  // If USD prices not available, use V3 subgraph relative prices + PLS price as fallback
  if (token0USDPrice === 0 || token1USDPrice === 0) {
    const plsPrice = getTokenPrice ? getTokenPrice('PLS') : 0
    const plsSymbols = ['PLS', 'WPLS', 'PULSE']
    
    
    if (plsPrice > 0) {
      // Get relative prices from V3 subgraph (these are token0/token1 relative prices)
      const token0RelativePrice = parseFloat(pool.token0Price) || 0
      const token1RelativePrice = parseFloat(pool.token1Price) || 0
      
      // If one of the tokens is PLS/WPLS, we can calculate the other
      if (plsSymbols.includes(pool.token0.symbol.toUpperCase()) && token1RelativePrice > 0) {
        token0USDPrice = plsPrice
        token1USDPrice = plsPrice * token1RelativePrice
      } else if (plsSymbols.includes(pool.token1.symbol.toUpperCase()) && token0RelativePrice > 0) {
        token1USDPrice = plsPrice
        token0USDPrice = plsPrice * token0RelativePrice
      }
    }
  }
  
  // Calculate current position value using USD prices
  const currentValue = (token0Amount * token0USDPrice) + (token1Amount * token1USDPrice)
  
  // Calculate unclaimed fees value
  const feesToken0 = parseFloat(position.collectedFeesToken0) / Math.pow(10, token0Decimals)
  const feesToken1 = parseFloat(position.collectedFeesToken1) / Math.pow(10, token1Decimals)
  const feesValue = (feesToken0 * token0USDPrice) + (feesToken1 * token1USDPrice)
  
  
  const totalValue = currentValue + feesValue
  
  return {
    currentValue,
    feesValue,
    totalValue,
    token0Amount,
    token1Amount,
    // Also return raw net amounts for display purposes
    netToken0Amount: netToken0,
    netToken1Amount: netToken1
  }
}

// Hook to fetch V3 positions for a specific wallet address
export function use9MmV3Positions(walletAddress: string | null, options: {
  first?: number
  getTokenPrice?: (symbol: string) => number
} = {}) {
  const { first = 1000, getTokenPrice } = options

  const { data, error, isLoading, mutate } = useSWR<NineMmPositionsResponse>(
    walletAddress ? ['9mm-v3-positions', walletAddress.toLowerCase(), first] : null,
    () => graphqlFetcher(POSITIONS_BY_OWNER_QUERY, { 
      owner: walletAddress!.toLowerCase(), 
      first 
    }),
    {
      refreshInterval: 5 * 60 * 1000, // 5 minutes
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      revalidateOnFocus: true,
      revalidateOnReconnect: false,
      fallbackData: { data: { positions: [] } }
    }
  )

  const positions = data?.data?.positions || []
  
  console.log(`[9MM V3 Positions] Loaded ${positions.length} positions for ${walletAddress}`)
  
  // Log each raw position for debugging duplicates
  if (positions.length > 0) {
    console.log(`[9MM V3 Raw Positions]:`)
    positions.forEach((pos, index) => {
      console.log(`  ${index + 1}. ID: ${pos.id}, Pool: ${pos.pool.token0.symbol}/${pos.pool.token1.symbol}, Fee: ${pos.pool.feeTier}, Liquidity: ${pos.liquidity}`)
    })
  }
  
  // Calculate values for each position
  const positionsWithValues = positions.map(position => {
    const values = calculateV3PositionValue(position, getTokenPrice)
    const feePercent = parseInt(position.pool.feeTier) / 10000 // Convert to percentage
    
    console.log(`[9MM V3 Position] ${position.pool.token0.symbol}/${position.pool.token1.symbol} ${feePercent}%:`)
    console.log(`  - Position ID: ${position.id}`)
    console.log(`  - Current Value: $${values.currentValue.toFixed(2)}`)
    console.log(`  - Fees Value: $${values.feesValue.toFixed(2)}`)
    console.log(`  - Total Value: $${values.totalValue.toFixed(2)}`)
    
    return {
      ...position,
      values,
      feePercent,
      displayName: `${position.pool.token0.symbol} / ${position.pool.token1.symbol} ${feePercent}%`,
      poolAddress: position.pool.id
    }
  })

  // Calculate total portfolio value
  const totalValue = positionsWithValues.reduce((sum, pos) => sum + pos.values.totalValue, 0)
  const totalCurrentValue = positionsWithValues.reduce((sum, pos) => sum + pos.values.currentValue, 0)
  const totalFeesValue = positionsWithValues.reduce((sum, pos) => sum + pos.values.feesValue, 0)

  return {
    positions: positionsWithValues,
    rawPositions: positions,
    isLoading,
    error,
    refetch: mutate,
    
    // Statistics
    totalValue,
    totalCurrentValue,
    totalFeesValue,
    positionCount: positions.length,
    
    // Helper functions
    getPositionsByPool: (token0Symbol: string, token1Symbol: string) => {
      return positionsWithValues.filter(pos => {
        const symbols = [pos.pool.token0.symbol.toUpperCase(), pos.pool.token1.symbol.toUpperCase()]
        return symbols.includes(token0Symbol.toUpperCase()) && 
               symbols.includes(token1Symbol.toUpperCase())
      })
    },

    getPositionsByToken: (tokenSymbol: string) => {
      return positionsWithValues.filter(pos => 
        pos.pool.token0.symbol.toUpperCase() === tokenSymbol.toUpperCase() ||
        pos.pool.token1.symbol.toUpperCase() === tokenSymbol.toUpperCase()
      )
    },

    getPositionById: (positionId: string) => {
      return positionsWithValues.find(pos => pos.id === positionId)
    }
  }
}

// Hook to fetch specific pools by their addresses (for general pool info)
export function use9MmV3Pools(poolAddresses: string[]) {
  const { data, error, isLoading, mutate } = useSWR<NineMmPoolsResponse>(
    poolAddresses.length > 0 ? ['9mm-v3-pools', poolAddresses.join(',')] : null,
    () => graphqlFetcher(POOLS_BY_IDS_QUERY, { 
      ids: poolAddresses.map(addr => addr.toLowerCase()) 
    }),
    {
      refreshInterval: 5 * 60 * 1000,
      errorRetryCount: 3,
      errorRetryInterval: 5000,
      revalidateOnFocus: true,
      revalidateOnReconnect: false,
      fallbackData: { data: { pools: [] } }
    }
  )

  const pools = data?.data?.pools || []
  
  console.log(`[9MM V3 Pools] Loaded ${pools.length} pools`)
  
  // Convert pools to a more usable format
  const poolsWithMeta = pools.map(pool => {
    const feePercent = parseInt(pool.feeTier) / 10000
    const tvl = parseFloat(pool.totalValueLockedUSD)
    const volume = parseFloat(pool.volumeUSD)
    
    return {
      ...pool,
      feePercent,
      tvl,
      volume,
      displayName: `${pool.token0.symbol} / ${pool.token1.symbol} ${feePercent}%`,
      address: pool.id
    }
  })

  return {
    pools: poolsWithMeta,
    rawPools: pools,
    isLoading,
    error,
    refetch: mutate,
    
    getPoolByAddress: (address: string) => {
      return poolsWithMeta.find(pool => 
        pool.address.toLowerCase() === address.toLowerCase()
      )
    },
    
    getTotalTVL: () => {
      return poolsWithMeta.reduce((sum, pool) => sum + pool.tvl, 0)
    }
  }
}

// Helper function to format position data for display
export function format9MmV3PositionData(position: any) {
  const { values, feePercent } = position
  
  return {
    ...position,
    currentValueFormatted: values.currentValue.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }),
    feesValueFormatted: values.feesValue.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }),
    totalValueFormatted: values.totalValue.toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }),
    feePercentFormatted: `${feePercent}%`,
    token0AmountFormatted: values.token0Amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }),
    token1AmountFormatted: values.token1Amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    })
  }
}

export type { 
  NineMmPosition, 
  NineMmPool, 
  NineMmToken, 
  NineMmPositionsResponse,
  NineMmPoolsResponse
}
