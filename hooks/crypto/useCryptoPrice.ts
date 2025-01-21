import useSWR from 'swr'
import { TOKEN_CONSTANTS } from '@/constants/crypto'

export function useCryptoPrice(symbol: string) {
  const { data, error, isLoading } = useSWR(
    symbol ? `crypto/price/${symbol}` : null,
    async () => {
      const startTime = new Date()
      console.log(`Fetching price for ${symbol} at ${startTime.toISOString()}`)
      
      // Use our cached API for HEX
      if (symbol === 'pHEX') {
        const response = await fetch('/api/prices/hex')
        const data = await response.json()
        if (data.error) throw new Error(data.error)
        return data
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
      
      if (!data.pairs?.[0]) {
        console.error(`No pair data found for ${symbol}`)
        return {
          price: 0,
          priceChange24h: 0,
          lastUpdated: new Date(),
          chain
        }
      }

      const pair = data.pairs[0]
      const price = pair.priceUsd ? parseFloat(pair.priceUsd) : 0
      const priceChange24h = pair.priceChange?.h24 ? parseFloat(pair.priceChange.h24) / 100 : 0
      
      console.log(`Price update for ${symbol}:`, {
        price,
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
      refreshInterval: 1000, // Back to 500ms (2 updates per second)
      revalidateOnFocus: true,
      dedupingInterval: 500,
    }
  )

  return {
    priceData: data,
    isLoading,
    error
  }
} 