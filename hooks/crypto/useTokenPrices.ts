import useSWR from 'swr'
import { TOKEN_CONSTANTS } from '@/constants/crypto'

export interface TokenPriceData {
  price: number
  priceChange: {
    m5: number
    h1: number
    h6: number
    h24: number
  }
  liquidity: number | null
  marketCap: number | null
  supply: number | null
  lastUpdated: Date
  chain: string
  txns: {
    [key: string]: {
      buys: number
      sells: number
    }
  }
  volume: {
    [key: string]: number
  }
}

export type TokenPrices = {
  [symbol: string]: TokenPriceData
}

const DEFAULT_PRICE_DATA: TokenPriceData = {
  price: 0,
  priceChange: {
    m5: 0,
    h1: 0,
    h6: 0,
    h24: 0
  },
  liquidity: null,
  marketCap: null,
  supply: null,
  lastUpdated: new Date(),
  chain: 'pulsechain',
  txns: {},
  volume: {}
}

export function useTokenPrices(symbols: string[]) {
  const { data, error, isLoading } = useSWR(
    symbols.length > 0 ? `crypto/prices/${symbols.join(',')}` : null,
    async () => {
      try {
        // Create a map of promises for each token's price data
        const pricePromises = symbols.map(async (symbol) => {
          const upperSymbol = symbol.toUpperCase()
          const tokenConfig = TOKEN_CONSTANTS[symbol] || TOKEN_CONSTANTS[upperSymbol]
          
          if (!tokenConfig?.PAIR) {
            console.warn(`No pair config found for ${symbol}`)
            return [symbol, DEFAULT_PRICE_DATA]
          }

          const { chain, pairAddress } = tokenConfig.PAIR
          
          try {
            const response = await fetch(
              `https://api.dexscreener.com/latest/dex/pairs/${chain}/${pairAddress}`
            )
            
            if (!response.ok) {
              throw new Error(`Failed to fetch ${symbol} price from DexScreener`)
            }
            
            const data = await response.json()
            const pair = data.pair || data.pairs?.[0]
            
            if (!pair?.priceUsd) {
              throw new Error(`No price data found for ${symbol}`)
            }

            // Process market cap for PLS token
            let marketCap = pair.marketCap ? Number(pair.marketCap) : null
            if (symbol === 'PLS') {
              try {
                const supplyResponse = await fetch('https://api.scan.pulsechain.com/api?module=stats&action=coinsupply')
                const supply = await supplyResponse.text()
                if (supply && pair.priceUsd) {
                  marketCap = Number(pair.priceUsd) * Number(supply)
                }
              } catch (err) {
                console.error('Failed to fetch PLS supply:', err)
                const PLS_TOTAL_SUPPLY = 2_000_000_000_000_000
                marketCap = pair.priceUsd ? Number(pair.priceUsd) * PLS_TOTAL_SUPPLY : null
              }
            }

            return [symbol, {
              price: Number(pair.priceUsd),
              priceChange: {
                m5: Number(pair.priceChange?.m5 || 0),
                h1: Number(pair.priceChange?.h1 || 0),
                h6: Number(pair.priceChange?.h6 || 0),
                h24: Number(pair.priceChange?.h24 || 0)
              },
              liquidity: pair.liquidity?.usd ? Number(pair.liquidity.usd) : null,
              marketCap,
              supply: pair.baseToken?.totalSupply ? Number(pair.baseToken.totalSupply) : null,
              lastUpdated: new Date(),
              chain,
              txns: {
                m5: pair.txns?.m5 || { buys: 0, sells: 0 },
                h1: pair.txns?.h1 || { buys: 0, sells: 0 },
                h6: pair.txns?.h6 || { buys: 0, sells: 0 },
                h24: pair.txns?.h24 || { buys: 0, sells: 0 }
              },
              volume: {
                m5: Number(pair.volume?.m5 || 0),
                h1: Number(pair.volume?.h1 || 0),
                h6: Number(pair.volume?.h6 || 0),
                h24: Number(pair.volume?.h24 || 0)
              }
            } as TokenPriceData]
          } catch (err) {
            console.error(`Error fetching ${symbol} price:`, err)
            return [symbol, DEFAULT_PRICE_DATA]
          }
        })

        // Wait for all promises to resolve
        const results = await Promise.all(pricePromises)
        
        // Convert results array to object
        return Object.fromEntries(results) as TokenPrices
      } catch (err) {
        console.error('Error fetching token prices:', err)
        return symbols.reduce((acc, symbol) => {
          acc[symbol] = DEFAULT_PRICE_DATA
          return acc
        }, {} as TokenPrices)
      }
    },
    {
      refreshInterval: 30000,
      revalidateOnFocus: true,
      dedupingInterval: 15000
    }
  )

  return {
    prices: data || {},
    isLoading: typeof window === 'undefined' ? true : isLoading,
    error
  }
} 