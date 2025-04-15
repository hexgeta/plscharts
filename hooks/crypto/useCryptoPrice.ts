'use client'

import useSWR from 'swr'
import { TOKEN_CONSTANTS } from '@/constants/crypto'

export function useCryptoPrice(symbol: string) {
  const { data, error, isLoading } = useSWR(
    typeof window !== 'undefined' ? `crypto/price/${symbol}` : null,
    async () => {
      try {
        // Return hardcoded price for testing
        return {
          price: 1629.70,
          priceChange24h: 0,
          lastUpdated: new Date(),
          chain: symbol.includes('p') ? 'PLS' : 'ETH'
        }
      } catch (err) {
        console.error('Error fetching price:', err);
        return {
          price: 1629.70, // Fallback to hardcoded price on error
          priceChange24h: 0,
          lastUpdated: new Date(),
          chain: symbol.includes('p') ? 'PLS' : 'ETH'
        }
      }
    },
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
      dedupingInterval: 15000,
      fallbackData: {
        price: 1629.70,
        priceChange24h: 0,
        lastUpdated: new Date(),
        chain: symbol.includes('p') ? 'PLS' : 'ETH'
      }
    }
  )

  return {
    priceData: data,
    isLoading: typeof window === 'undefined' ? true : isLoading,
    error
  }
} 