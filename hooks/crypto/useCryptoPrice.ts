'use client'

import useSWR from 'swr'
import { TOKEN_CONSTANTS } from '@/constants/crypto'

export function useCryptoPrice(symbol: string) {
  const { data, error, isLoading } = useSWR(
    symbol ? `crypto/price/${symbol}` : null,
    async () => {
      const startTime = new Date()
      console.log(`Fetching price for ${symbol} at ${startTime.toISOString()}`)
      
      // Temporary hardcode for testing
      if (symbol === 'WETH') {
        console.log('Using hardcoded WETH price: $1629.70')
        return {
          price: 1629.70,
          priceChange24h: -2.68,
          lastUpdated: new Date(),
          chain: 'ethereum'
        }
      }

      // Regular fetching for other tokens
      const tokenConfig = TOKEN_CONSTANTS[symbol]
      if (!tokenConfig?.PAIR) {
        throw new Error(`No pair configuration found for ${symbol}`)
      }

      const { chain, pairAddress } = tokenConfig.PAIR
      const url = `https://api.dexscreener.com/latest/dex/pairs/${chain}/${pairAddress}`
      
      const response = await fetch(url)
      const data = await response.json()
      
      console.log('DexScreener response:', data)

      // Check both pairs[0] and pair for the price data
      const pairData = data.pairs?.[0] || data.pair
      if (!pairData) {
        console.error(`No pair data found for ${symbol}`, { data })
        return {
          price: 0,
          priceChange24h: 0,
          lastUpdated: new Date(),
          chain
        }
      }

      const price = pairData.priceUsd ? parseFloat(pairData.priceUsd) : 0
      const priceChange24h = pairData.priceChange?.h24 ? parseFloat(pairData.priceChange.h24) / 100 : 0
      
      console.log(`Price update for ${symbol}:`, {
        price,
        priceUsd: pairData.priceUsd,
        pairData,
        fetchTime: new Date().toISOString(),
        fetchDuration: new Date().getTime() - startTime.getTime()
      })
      
      return {
        price,
        priceChange24h,
        lastUpdated: new Date(),
        chain
      }
    },
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      revalidateOnFocus: true,
      dedupingInterval: 15000, // Minimum 15 seconds between requests
    }
  )

  return {
    priceData: data,
    isLoading,
    error
  }
} 