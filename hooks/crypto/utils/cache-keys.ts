import { getDailyCacheKey, getMinuteCacheKey, getSecondCacheKey } from '@/utils/swr-config'

// HEX data URLs and their cache keys
export const HEX_DATA = {
  pulsechain: {
    url: 'https://hexdailystats.com/fulldatapulsechain',
    getCacheKey: () => getDailyCacheKey('hex-daily-stats-pulsechain')
  },
  ethereum: {
    url: 'https://hexdailystats.com/fulldata',
    getCacheKey: () => getDailyCacheKey('hex-daily-stats-ethereum')
  }
}

// Price data cache keys with different update frequencies
export const PRICE_CACHE_KEYS = {
  // Daily cache for historic data
  daily: (symbol: string) => getDailyCacheKey(`price-daily-${symbol.toLowerCase()}`),
  
  // 5-minute cache for less frequent updates
  fiveMin: (symbol: string) => getMinuteCacheKey(`price-${symbol.toLowerCase()}`, 5),
  
  // Real-time prices (15-second updates)
  realtime: (symbol: string) => getSecondCacheKey(`price-${symbol.toLowerCase()}`, 15)
}

// Shared fetcher for HEX data
export const HEX_DATA_URLS = {
  pulsechain: 'https://hexdailystats.com/fulldatapulsechain',
  ethereum: 'https://hexdailystats.com/fulldata',
} 