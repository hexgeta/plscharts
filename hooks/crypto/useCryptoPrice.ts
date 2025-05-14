'use client'

import useSWR from 'swr'
import { TOKEN_CONSTANTS } from '@/constants/crypto'

interface PriceResponse {
  pairs?: {
    priceUsd: string
    priceChange: {
      h24?: number
      h6?: number
      h1?: number
    }
  }[]
  pair?: {
    priceUsd: string
    priceChange: {
      h24?: number
      h6?: number
      h1?: number
    }
  }
}

export function useCryptoPrice(symbol: string) {
  const upperSymbol = symbol.toUpperCase();
  
  // Try both original and uppercase symbol for backward compatibility
  const tokenConfig = TOKEN_CONSTANTS[symbol] || TOKEN_CONSTANTS[upperSymbol];
  
  const { data, error, isLoading } = useSWR(
    typeof window !== 'undefined' ? `crypto/price/${symbol}` : null,
    async () => {
      try {
        if (!tokenConfig?.PAIR) {
          throw new Error(`No pair config found for ${symbol}`)
        }

        const { chain, pairAddress } = tokenConfig.PAIR
        
        const response = await fetch(
          `https://api.dexscreener.com/latest/dex/pairs/${chain}/${pairAddress}`
        )
        
        if (!response.ok) {
          throw new Error(`Failed to fetch ${symbol} price from DexScreener`)
        }
        
        const data = await response.json()
        console.log(`RAW_DEXSCREENER_RESPONSE_${symbol}:`, data);
        
        // Try both pairs and pair fields
        const pair = data.pair || data.pairs?.[0];
        const price = pair?.priceUsd;
        const priceChange = pair?.priceChange?.h24;
        const liquidity = pair?.liquidity?.usd;
        const marketCap = pair?.fdv || pair?.marketCap;
        const supply = pair?.baseToken?.totalSupply;

        if (!price) {
          throw new Error(`No price data found for ${symbol}`)
        }

        return {
          price: parseFloat(price),
          priceChange24h: priceChange || 0,
          liquidity: liquidity ? parseFloat(liquidity) : null,
          marketCap: marketCap ? parseFloat(marketCap) : null,
          supply: supply ? parseFloat(supply) : null,
          lastUpdated: new Date(),
          chain: chain
        }
      } catch (err) {
        console.log('RAW_DEXSCREENER_ERROR:', {
          symbol,
          error: err.message
        });
        return {
          price: 0,
          priceChange24h: 0,
          liquidity: null,
          marketCap: null,
          supply: null,
          lastUpdated: new Date(),
          chain: tokenConfig?.PAIR?.chain || (symbol.includes('p') ? 'pulsechain' : 'ethereum')
        }
      }
    },
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
      dedupingInterval: 15000,
      fallbackData: {
        price: 0,
        priceChange24h: 0,
        liquidity: null,
        marketCap: null,
        supply: null,
        lastUpdated: new Date(),
        chain: tokenConfig?.PAIR?.chain || (symbol.includes('p') ? 'pulsechain' : 'ethereum')
      }
    }
  )

  return {
    priceData: data,
    isLoading: typeof window === 'undefined' ? true : isLoading,
    error
  }
} 