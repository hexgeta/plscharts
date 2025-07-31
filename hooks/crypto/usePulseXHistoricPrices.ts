'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'

// PulseX Subgraph endpoints
const PULSEX_V1_ENDPOINT = 'https://graph.pulsechain.com/subgraphs/name/pulsechain/pulsex'
const PULSEX_V2_ENDPOINT = 'https://graph.pulsechain.com/subgraphs/name/pulsechain/pulsexv2'

interface HistoricPrice {
  timestamp: number
  priceUSD: number
  token: string
  source: 'v1' | 'v2'
}

interface UsePulseXHistoricPricesResult {
  fetchHistoricPrice: (tokenAddress: string, timestamp: number) => Promise<number | null>
  isLoading: boolean
  error: any
}

// GraphQL query to get token price at specific time
const HISTORIC_PRICE_QUERY = `
  query GetHistoricPrice($tokenAddress: String!, $timestamp: Int!) {
    tokenDayDatas(
      where: {
        token: $tokenAddress
        date_lte: $timestamp
      }
      orderBy: date
      orderDirection: desc
      first: 1
    ) {
      id
      date
      token {
        id
        symbol
        name
      }
      priceUSD
    }
  }
`

// Alternative query for token pairs if direct price not available
const TOKEN_PAIR_QUERY = `
  query GetTokenPairs($tokenAddress: String!) {
    pairs(
      where: {
        or: [
          { token0: $tokenAddress }
          { token1: $tokenAddress }
        ]
      }
      orderBy: reserveUSD
      orderDirection: desc
      first: 5
    ) {
      id
      token0 {
        id
        symbol
        name
      }
      token1 {
        id
        symbol
        name
      }
      reserve0
      reserve1
      reserveUSD
      token0Price
      token1Price
    }
  }
`

// Fetcher function for GraphQL queries
async function fetchGraphQL(endpoint: string, query: string, variables: any): Promise<any> {
  try {
    const response = await fetch(endpoint, {
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

    const data = await response.json()
    
    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`)
    }

    return data.data
  } catch (error) {
    console.error(`GraphQL fetch error for ${endpoint}:`, error)
    throw error
  }
}

/**
 * Hook to fetch historic prices from PulseX subgraphs
 * Tries both v1 and v2 endpoints to find price data
 */
export function usePulseXHistoricPrices(): UsePulseXHistoricPricesResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<any>(null)

  const fetchHistoricPrice = useCallback(async (tokenAddress: string, timestamp: number): Promise<number | null> => {
    if (!tokenAddress || !timestamp) {
      return null
    }

    setIsLoading(true)
    setError(null)

    try {
      // Convert timestamp to seconds if it's in milliseconds
      const timestampSeconds = timestamp > 1e10 ? Math.floor(timestamp / 1000) : timestamp
      
      // Convert to day timestamp (start of day)
      const dayTimestamp = Math.floor(timestampSeconds / 86400) * 86400

      console.log(`[usePulseXHistoricPrices] Fetching price for ${tokenAddress} at ${new Date(dayTimestamp * 1000).toISOString()}`)

      // Try PulseX v1 first (has more comprehensive data based on testing)
      try {
        const v1Data = await fetchGraphQL(PULSEX_V1_ENDPOINT, HISTORIC_PRICE_QUERY, {
          tokenAddress: tokenAddress.toLowerCase(),
          timestamp: dayTimestamp
        })

        if (v1Data.tokenDayDatas && v1Data.tokenDayDatas.length > 0) {
          const priceData = v1Data.tokenDayDatas[0]
          const priceUSD = parseFloat(priceData.priceUSD)
          
          if (priceUSD > 0) {
            console.log(`[usePulseXHistoricPrices] Found v1 price: $${priceUSD} for ${tokenAddress} at ${new Date(dayTimestamp * 1000).toDateString()}`)
            setIsLoading(false)
            return priceUSD
          }
        }
      } catch (v1Error) {
        console.warn('[usePulseXHistoricPrices] v1 query failed:', v1Error)
      }

      // Try PulseX v2 as fallback
      try {
        const v2Data = await fetchGraphQL(PULSEX_V2_ENDPOINT, HISTORIC_PRICE_QUERY, {
          tokenAddress: tokenAddress.toLowerCase(),
          timestamp: dayTimestamp
        })

        if (v2Data.tokenDayDatas && v2Data.tokenDayDatas.length > 0) {
          const priceData = v2Data.tokenDayDatas[0]
          const priceUSD = parseFloat(priceData.priceUSD)
          
          if (priceUSD > 0) {
            console.log(`[usePulseXHistoricPrices] Found v2 price: $${priceUSD} for ${tokenAddress} at ${new Date(dayTimestamp * 1000).toDateString()}`)
            setIsLoading(false)
            return priceUSD
          }
        }
      } catch (v2Error) {
        console.warn('[usePulseXHistoricPrices] v2 query failed:', v2Error)
      }

      // If no direct price found, try to get it from pair data
      console.log('[usePulseXHistoricPrices] No direct price found, trying pair data...')
      
      // This could be enhanced to calculate price from pair reserves
      // For now, return null if no direct price is found
      
      console.log(`[usePulseXHistoricPrices] No historic price found for ${tokenAddress}`)
      setIsLoading(false)
      return null

    } catch (error) {
      console.error('[usePulseXHistoricPrices] Error fetching historic price:', error)
      setError(error)
      setIsLoading(false)
      return null
    }
  }, [])

  return {
    fetchHistoricPrice,
    isLoading,
    error
  }
} 