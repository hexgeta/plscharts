import { useEffect, useState, useMemo } from 'react'
import useSWR from 'swr'
import { LP_TOKENS } from '@/constants/crypto'
import { LP_PRICE_CACHE_KEYS } from './utils/cache-keys'

const PULSEX_V2_SUBGRAPH = 'https://graph.pulsechain.com/subgraphs/name/pulsechain/pulsexv2'

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

async function fetchAllLPData(lpAddresses: { ticker: string; address: string }[]): Promise<LPTokenPrice[]> {
  try {
    const addresses = lpAddresses.map(lp => lp.address.toLowerCase())
    
    console.log(`[All LP Prices] Fetching data for ${addresses.length} LP tokens:`, addresses)
    
    const response = await fetch(PULSEX_V2_SUBGRAPH, {
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
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    
    if (result.errors) {
      console.error('[All LP Prices] GraphQL errors:', result.errors)
      throw new Error(`GraphQL error: ${result.errors[0]?.message || 'Unknown error'}`)
    }

    const pairs = result.data?.pairs || []
    
    // Map results back to tickers and calculate prices
    const lpPrices: LPTokenPrice[] = lpAddresses.map(({ ticker, address }) => {
      const pairData = pairs.find((pair: any) => pair.id.toLowerCase() === address.toLowerCase())
      
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
        console.log(`[All LP Prices] ${ticker}: $${pricePerToken.toFixed(6)} (${pairData?.token0?.symbol}/${pairData?.token1?.symbol})`)
      } else {
        console.warn(`[All LP Prices] No price data found for ${ticker} (${address})`)
      }
      
      return result
    })

    return lpPrices
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
      revalidateOnFocus: false
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

// Helper hook that automatically uses LP_TOKENS constant
export function useAllDefinedLPTokenPrices(tokenConstants: any[], options?: { disableRefresh?: boolean }): UseAllLPTokenPricesResult {
  const lpTokenAddresses = useMemo(() => {
    return LP_TOKENS.map(ticker => {
      const config = tokenConstants.find(token => token.ticker === ticker)
      return {
        ticker,
        address: config?.a || ''
      }
    }).filter(lp => lp.address !== '') // Only include tokens with valid addresses
  }, [tokenConstants]) // Only recreate if tokenConstants changes

  return useAllLPTokenPrices(lpTokenAddresses, options)
}