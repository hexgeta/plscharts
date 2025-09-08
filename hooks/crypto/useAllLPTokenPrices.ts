import { useEffect, useState, useMemo } from 'react'
import useSWR from 'swr'
import { TOKEN_CONSTANTS } from '@/constants/crypto'
import { MORE_COINS } from '@/constants/more-coins'
import { LP_PRICE_CACHE_KEYS } from './utils/cache-keys'

const PULSEX_V2_SUBGRAPH = 'https://graph.pulsechain.com/subgraphs/name/pulsechain/pulsexv2'
const PULSEX_V1_SUBGRAPH = 'https://graph.pulsechain.com/subgraphs/name/pulsechain/pulsex'

export interface LPTokenPrice {
  ticker: string
  address: string
  pricePerToken: number | null
  data: {
    id: string
    totalSupply: string
    token0: {
      id: string
      symbol: string
      name: string
      decimals: string
    }
    token1: {
      id: string
      symbol: string
      name: string
      decimals: string
    }
    reserve0: string
    reserve1: string
    token0Price: string
    token1Price: string
    reserveUSD: string
  } | null
  loading: boolean
  error: string | null
}

export interface UseAllLPTokenPricesResult {
  lpPrices: { [ticker: string]: LPTokenPrice }
  totalValue: number
  loading: boolean
  error: string | null
}

// Batch GraphQL query to fetch multiple LP tokens at once
const BATCH_LP_QUERY = `
  query GetMultipleLPTokens($addresses: [String!]!) {
    pairs(where: { id_in: $addresses }) {
      id
      totalSupply
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
      token0Price
      token1Price
      reserveUSD
    }
  }
`

async function fetchLPDataFromEndpoint(subgraph: string, addresses: string[], endpointName: string): Promise<any[]> {
  const response = await fetch(subgraph, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query: BATCH_LP_QUERY,
      variables: {
        addresses
      }
    })
  })

  if (!response.ok) {
    throw new Error(`${endpointName} HTTP error! status: ${response.status}`)
  }

  const result = await response.json()
  
  if (result.errors) {
    console.error(`[All LP Prices] ${endpointName} GraphQL errors:`, result.errors)
    throw new Error(`${endpointName} GraphQL error: ${result.errors[0]?.message || 'Unknown error'}`)
  }

  return result.data?.pairs || []
}

async function fetchAllLPData(lpAddresses: { ticker: string; address: string }[]): Promise<LPTokenPrice[]> {
  try {
    // Separate V1, V2, and other pools based on platform in constants
    const v1Pools: { ticker: string; address: string }[] = []
    const v2Pools: { ticker: string; address: string }[] = []
    const phuxPools: { ticker: string; address: string }[] = []
    const nineInchPools: { ticker: string; address: string }[] = []
    
    lpAddresses.forEach(({ ticker, address }) => {
      const tokenConfig = [...TOKEN_CONSTANTS, ...MORE_COINS].find(token => token.ticker === ticker)
      const platform = (tokenConfig as any)?.platform
      if (platform === 'PLSX V1') {
        v1Pools.push({ ticker, address })
      } else if (platform === 'PLSX V2') {
        v2Pools.push({ ticker, address })
      } else if (platform === 'PHUX') {
        phuxPools.push({ ticker, address })
      } else if (platform === '9INCH') {
        nineInchPools.push({ ticker, address })
      } else {
        console.warn(`[All LP Prices] Unknown platform for ${ticker}: ${platform}`)
      }
    })
    
    console.log(`[All LP Prices] Separating pools - V1: ${v1Pools.length}, V2: ${v2Pools.length}, PHUX: ${phuxPools.length}, 9INCH: ${nineInchPools.length}`)
    console.log(`[All LP Prices] V1 pools:`, v1Pools.map(p => `${p.ticker} (${p.address})`))
    console.log(`[All LP Prices] V2 pools:`, v2Pools.map(p => `${p.ticker} (${p.address})`))
    console.log(`[All LP Prices] PHUX pools:`, phuxPools.map(p => `${p.ticker} (${p.address})`))
    console.log(`[All LP Prices] 9INCH pools:`, nineInchPools.map(p => `${p.ticker} (${p.address})`))
    
    const allResults: LPTokenPrice[] = []
    
    // Fetch V2 pools if any exist
    if (v2Pools.length > 0) {
      const v2Addresses = v2Pools.map(lp => lp.address.toLowerCase())
      
      try {
        console.log(`[All LP Prices] Fetching ${v2Pools.length} V2 pools from ${PULSEX_V2_SUBGRAPH}`)
        const v2Pairs = await fetchLPDataFromEndpoint(PULSEX_V2_SUBGRAPH, v2Addresses, 'V2')
        console.log(`[All LP Prices] V2 endpoint returned ${v2Pairs.length} pairs out of ${v2Addresses.length} requested`)
        
        // Process V2 results
        v2Pools.forEach(({ ticker, address }) => {
          const pairData = v2Pairs.find((pair: any) => pair.id.toLowerCase() === address.toLowerCase())
          
          let pricePerToken: number | null = null
          
          if (pairData && pairData.totalSupply && pairData.reserveUSD) {
            const totalSupply = parseFloat(pairData.totalSupply)
            const totalValueUSD = parseFloat(pairData.reserveUSD)
            
            if (totalSupply > 0) {
              pricePerToken = totalValueUSD / totalSupply
            }
          }
          
          const result: LPTokenPrice = {
            ticker,
            address,
            pricePerToken,
            data: pairData || null,
            loading: false,
            error: null
          }
          
          if (pricePerToken) {
            console.log(`[All LP Prices] ✅ V2 ${ticker}: $${pricePerToken.toFixed(6)} (${pairData?.token0?.symbol}/${pairData?.token1?.symbol})`)
          } else {
            console.warn(`[All LP Prices] ❌ No V2 price data found for ${ticker} (${address})`)
            if (pairData) {
              console.log(`[All LP Prices] V2 pair data exists but missing pricing:`, pairData)
            }
          }
          
          allResults.push(result)
        })
      } catch (error) {
        console.error('[All LP Prices] V2 fetch failed:', error)
        // Add failed results for V2 pools
        v2Pools.forEach(({ ticker, address }) => {
          allResults.push({
            ticker,
            address,
            pricePerToken: null,
            data: null,
            loading: false,
            error: `V2 fetch failed: ${error}`
          })
        })
      }
    }
    
    // Fetch V1 pools if any exist
    if (v1Pools.length > 0) {
      const v1Addresses = v1Pools.map(lp => lp.address.toLowerCase())
      
      try {
        console.log(`[All LP Prices] Fetching ${v1Pools.length} V1 pools from ${PULSEX_V1_SUBGRAPH}`)
        const v1Pairs = await fetchLPDataFromEndpoint(PULSEX_V1_SUBGRAPH, v1Addresses, 'V1')
        console.log(`[All LP Prices] V1 endpoint returned ${v1Pairs.length} pairs out of ${v1Addresses.length} requested`)
        
        // Process V1 results
        v1Pools.forEach(({ ticker, address }) => {
          const pairData = v1Pairs.find((pair: any) => pair.id.toLowerCase() === address.toLowerCase())
          
          let pricePerToken: number | null = null
          
          if (pairData && pairData.totalSupply && pairData.reserveUSD) {
            const totalSupply = parseFloat(pairData.totalSupply)
            const totalValueUSD = parseFloat(pairData.reserveUSD)
            
            if (totalSupply > 0) {
              pricePerToken = totalValueUSD / totalSupply
            }
          }
          
          const result: LPTokenPrice = {
            ticker,
            address,
            pricePerToken,
            data: pairData || null,
            loading: false,
            error: null
          }
          
          if (pricePerToken) {
            console.log(`[All LP Prices] ✅ V1 ${ticker}: $${pricePerToken.toFixed(6)} (${pairData?.token0?.symbol}/${pairData?.token1?.symbol})`)
          } else {
            console.warn(`[All LP Prices] ❌ No V1 price data found for ${ticker} (${address})`)
            if (pairData) {
              console.log(`[All LP Prices] V1 pair data exists but missing pricing:`, pairData)
            }
          }
          
          allResults.push(result)
        })
      } catch (error) {
        console.error('[All LP Prices] V1 fetch failed:', error)
        // Add failed results for V1 pools
        v1Pools.forEach(({ ticker, address }) => {
          allResults.push({
            ticker,
            address,
            pricePerToken: null,
            data: null,
            loading: false,
            error: `V1 fetch failed: ${error}`
          })
        })
      }
    }
    
    // Fetch PHUX pools if any exist
    if (phuxPools.length > 0) {
      try {
        console.log(`[All LP Prices] Processing ${phuxPools.length} PHUX pools`)
        
        // For PHUX pools, we don't fetch detailed pool data here since they use composition data
        phuxPools.forEach(({ ticker, address }) => {
          const result: LPTokenPrice = {
            ticker,
            address,
            pricePerToken: null, // Will be handled by getPhuxLPTokenPrice
            data: null, // PHUX uses composition data from token config
            loading: false,
            error: null
          }
          
          console.log(`[All LP Prices] ➡️ PHUX ${ticker}: Delegating to PHUX pricing system`)
          allResults.push(result)
        })
      } catch (error) {
        console.error('[All LP Prices] PHUX processing failed:', error)
        phuxPools.forEach(({ ticker, address }) => {
          allResults.push({
            ticker,
            address,
            pricePerToken: null,
            data: null,
            loading: false,
            error: `PHUX processing failed: ${error}`
          })
        })
      }
    }
    
    // Fetch 9INCH pools if any exist
    if (nineInchPools.length > 0) {
      try {
        console.log(`[All LP Prices] Processing ${nineInchPools.length} 9INCH pools`)
        
        // For 9INCH pools, we'll need to create a different breakdown system
        nineInchPools.forEach(({ ticker, address }) => {
          const result: LPTokenPrice = {
            ticker,
            address,
            pricePerToken: null, // Will be handled by getPhuxLPTokenPrice for 9INCH
            data: null, // 9INCH breakdown needs special handling
            loading: false,
            error: null
          }
          
          console.log(`[All LP Prices] ➡️ 9INCH ${ticker}: Delegating to 9INCH pricing system`)
          allResults.push(result)
        })
      } catch (error) {
        console.error('[All LP Prices] 9INCH processing failed:', error)
        nineInchPools.forEach(({ ticker, address }) => {
          allResults.push({
            ticker,
            address,
            pricePerToken: null,
            data: null,
            loading: false,
            error: `9INCH processing failed: ${error}`
          })
        })
      }
    }

    return allResults
  } catch (error) {
    console.error('[All LP Prices] Error fetching LP data:', error)
    throw error
  }
}

export function useAllLPTokenPrices(lpTokenAddresses: { ticker: string; address: string }[], options?: { disableRefresh?: boolean }): UseAllLPTokenPricesResult {
  const [lpPrices, setLpPrices] = useState<{ [ticker: string]: LPTokenPrice }>({})
  const [error, setError] = useState<Error | null>(null)

  // Create a unique cache key for this set of LP tokens (memoized to prevent re-renders)
  const addressesKey = useMemo(() => {
    return lpTokenAddresses.map(lp => lp.address).join(',')
  }, [lpTokenAddresses])

  const { data: lpPricesArray, error: swrError, isLoading } = useSWR(
    lpTokenAddresses.length > 0 ? LP_PRICE_CACHE_KEYS.realtime(addressesKey) : null,
    async () => {
      try {
        return await fetchAllLPData(lpTokenAddresses)
      } catch (e) {
        setError(e as Error)
        return []
      }
    },
    {
      refreshInterval: options?.disableRefresh ? 0 : 15000, // 15 seconds, same as useTokenPrices
      dedupingInterval: 5000, // 5 seconds, same as useTokenPrices
      revalidateOnFocus: false,
      errorRetryCount: 3, // Retry failed requests 3 times
      errorRetryInterval: 2000, // Wait 2 seconds between retries
      shouldRetryOnError: (error) => {
        // Retry on network errors, but not on GraphQL schema errors
        return !error.message.includes('GraphQL error')
      }
    }
  )

  useEffect(() => {
    if (lpPricesArray) {
      // Convert array to object for easier lookup
      const newLpPrices: { [ticker: string]: LPTokenPrice } = {}
      lpPricesArray.forEach(lpPrice => {
        newLpPrices[lpPrice.ticker] = lpPrice
      })
      setLpPrices(newLpPrices)
    }
    
    if (swrError) {
      setError(swrError)
    }
  }, [lpPricesArray, swrError])

  return {
    lpPrices,
    totalValue: 0, // Portfolio component calculates this using user balances
    loading: isLoading,
    error: error?.message || null
  }
}

// Helper hook that automatically finds all LP tokens with type: "lp"
export function useAllDefinedLPTokenPrices(tokenConstants: any[], options?: { disableRefresh?: boolean }): UseAllLPTokenPricesResult {
  const lpTokenAddresses = useMemo(() => {
    return tokenConstants
      .filter(token => token.type === 'lp')
      .map(token => ({
        ticker: token.ticker,
        address: token.a || ''
      }))
      .filter(lp => lp.address !== '') // Only include tokens with valid addresses
  }, [tokenConstants])

  return useAllLPTokenPrices(lpTokenAddresses, options)
}