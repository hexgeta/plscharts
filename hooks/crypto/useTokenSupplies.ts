'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'

interface TokenSupplies {
  [ticker: string]: number
}

interface UseTokenSuppliesResult {
  supplies: TokenSupplies | null
  isLoading: boolean
  error: any
}

async function fetchTokenSupplies(tickers: string[]): Promise<TokenSupplies> {
  if (tickers.length === 0) return {}
  
  console.log(`[Supply Batch Fetch] Starting fetch for ${tickers.length} tokens:`, tickers)
  
  const results: TokenSupplies = {}
  const promises = tickers.map(async (ticker) => {
    try {
      const response = await fetch(`/api/token-supply?ticker=${ticker}`)
      if (!response.ok) {
        console.warn(`[Supply Batch Fetch] Failed to fetch supply for ${ticker}: ${response.status}`)
        return
      }
      
      const data = await response.json()
      if (data.totalSupply && data.totalSupply > 0) {
        results[ticker] = data.totalSupply
        console.log(`[Supply Batch Fetch] Success for ${ticker}: ${data.totalSupply}`)
      } else {
        console.warn(`[Supply Batch Fetch] Invalid supply data for ${ticker}:`, data)
      }
    } catch (error) {
      console.error(`[Supply Batch Fetch] Error fetching supply for ${ticker}:`, error)
    }
  })
  
  await Promise.all(promises)
  
  console.log(`[Supply Batch Fetch] Completed. Got supplies for ${Object.keys(results).length}/${tickers.length} tokens`)
  return results
}

export function useTokenSupplies(tickers: string[]): UseTokenSuppliesResult {
  const [supplies, setSupplies] = useState<TokenSupplies | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<any>(null)
  
  // Create a stable key for SWR based on the tickers array
  const cacheKey = tickers.length > 0 ? `token-supplies-${tickers.sort().join(',')}` : null
  
  const { data, error: swrError, isLoading: swrLoading } = useSWR(
    cacheKey,
    () => fetchTokenSupplies(tickers),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0, // Don't auto-refresh supplies
      dedupingInterval: 60000, // Cache for 1 minute
    }
  )
  
  useEffect(() => {
    setSupplies(data || null)
    setIsLoading(swrLoading)
    setError(swrError)
  }, [data, swrLoading, swrError])
  
  return {
    supplies,
    isLoading,
    error
  }
} 