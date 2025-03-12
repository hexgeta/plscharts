export interface TokenData {
  symbol: string
  price?: number
}

export interface ApiTokenData {
  priceUsd: string
  priceChange24h: number
}

export interface PairData {
  pairAddress: string
  tokenAddress: string
}

export type Percentage = number & { __brand: 'percentage' }

export interface TokenMetrics {
  price: number
  priceChange24h: Percentage
  hexRatio: number
  lastUpdated: Date
  chain: string
} 