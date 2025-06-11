'use client'

import { useState, useEffect } from 'react'

interface MaxiTokenData {
  name: string
  token: {
    supply: number
    burnedSupply: number
    priceUSD: number
    priceHEX: number
    costPerTShareUSD: number
    backingPerToken: number
    discountFromBacking: number
    discountFromMint: number
  }
  stake: {
    principal: number
    tShares: number
    yieldSoFarHEX: number
    backingHEX: number
    percentageYieldEarnedSoFar: number
    hexAPY: number
    minterAPY: number
  }
  gas: {
    equivalentSoloStakeUnits: number
    endStakeUnits: number
    savingPercentage: number
  }
  dates: {
    stakeStartDate: string
    stakeEndDate: string
    daysTotal: number
    daysSinceStart: number
    daysLeft: number
    progressPercentage: number
  }
}

interface MaxiApiResponse {
  tokens: Record<string, MaxiTokenData>
  lastUpdated: string
}

export function useMaxiTokenData() {
  const [data, setData] = useState<Record<string, MaxiTokenData> | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchMaxiData = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        const response = await fetch('https://app.lookintomaxi.com/api/tokens')
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const apiData: MaxiApiResponse = await response.json()
        setData(apiData.tokens)
        
        console.log('[useMaxiTokenData] Fetched MAXI token data:', Object.keys(apiData.tokens))
      } catch (err) {
        console.error('[useMaxiTokenData] Error fetching MAXI data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch MAXI data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchMaxiData()
    
    // Refresh data every 5 minutes
    const interval = setInterval(fetchMaxiData, 5 * 60 * 1000)
    
    return () => clearInterval(interval)
  }, [])

  // Helper function to get backing per token for a specific symbol
  const getBackingPerToken = (symbol: string): number | null => {
    if (!data) return null
    
    // Map portfolio symbols to API symbols
    const symbolMap: Record<string, string> = {
      'MAXI': 'pMAXI',
      'eMAXI': 'eMAXI',
      'weMAXI': 'eMAXI', // Use eMAXI data for weMAXI
      'DECI': 'pDECI',
      'eDECI': 'eDECI',
      'weDECI': 'eDECI', // Use eDECI data for weDECI
      'LUCKY': 'pLUCKY',
      'eLUCKY': 'eLUCKY',
      'TRIO': 'pTRIO',
      'eTRIO': 'eTRIO',
      'eBASE': 'eBASE3', // Use eBASE3 data for eBASE
      'BASE3': 'pBASE3',
      'eBASE3': 'eBASE3'
    }
    
    const apiSymbol = symbolMap[symbol]
    if (!apiSymbol || !data[apiSymbol]) {
      return null
    }
    
    return data[apiSymbol].token.backingPerToken
  }

  return {
    data,
    isLoading,
    error,
    getBackingPerToken
  }
} 