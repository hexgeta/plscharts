import { useCryptoPrice } from './useCryptoPrice'

interface RatioData {
  hexRatio: number
  lastUpdated: Date
}

export function useCryptoRatio(symbol: string) {
  const { priceData: tokenPrice, isLoading: tokenLoading } = useCryptoPrice(symbol)
  const { priceData: pHexPrice, isLoading: pHexLoading } = useCryptoPrice('pHEX')
  const { priceData: eHexPrice, isLoading: eHexLoading } = useCryptoPrice('eHEX')

  // Determine if this is an Ethereum token by checking the first character
  const isEthereumToken = symbol.startsWith('e')
  
  // Keep loading state until we have confirmed price data status
  const isLoading = tokenLoading || pHexLoading || eHexLoading

  // Return loading state if any data is still loading
  if (isLoading) {
    return {
      ratioData: null,
      isLoading: true,
      error: null
    }
  }

  // Use eHEX price for Ethereum tokens, pHEX price for Pulsechain tokens
  const hexPrice = isEthereumToken ? eHexPrice : pHexPrice

  // If we have prices, calculate ratio immediately
  if (hexPrice?.price && tokenPrice?.price && hexPrice.price > 0) {
    const ratio = Number((tokenPrice.price / hexPrice.price).toFixed(4))
    return {
      ratioData: {
        hexRatio: ratio,
        lastUpdated: new Date()
      },
      isLoading: false,
      error: null
    }
  }

  // If we have all data but prices are missing or zero, return zero ratio
  return {
    ratioData: {
      hexRatio: 0,
      lastUpdated: new Date()
    },
    isLoading: false,
    error: null
  }
} 