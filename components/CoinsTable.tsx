'use client'

import { useState, useMemo, useEffect } from 'react'
import { TOKEN_CONSTANTS } from '@/constants/crypto'
import { MORE_COINS } from '@/constants/more-coins'
import { CoinLogo } from '@/components/ui/CoinLogo'
import { getDisplayTicker } from '@/utils/ticker-display'
import { useTokenPrices } from '@/hooks/crypto/useTokenPrices'

interface CoinData {
  chain: number
  address: string
  ticker: string
  name: string
  decimals: number
  price?: number
}

type SortField = 'alphabetical' | 'price' | 'change' | 'volume' | 'liquidity' | 'marketcap'
type SortDirection = 'asc' | 'desc'

export default function CoinsTable() {
  const [mounted, setMounted] = useState(false)
  
  // Force re-render after mount to help with logo loading
  useEffect(() => {
    setMounted(true)
  }, [])

  // Combine all tokens and filter to only PulseChain coins (chain 369) and exclude LP tokens and deposits
  const allCoins = useMemo(() => {
    const combined = [...TOKEN_CONSTANTS, ...MORE_COINS]
    return combined
      .filter(token => token.chain === 369) // Only PulseChain tokens
      .filter(token => token.type !== 'lp') // Exclude LP tokens
      .filter(token => !token.ticker.includes('PHIAT deposit') && !token.ticker.includes('PHAME deposit')) // Exclude PHIAT/PHAME deposits
      .filter(token => !token.name.includes('PHIAT deposit') && !token.name.includes('PHAME deposit')) // Exclude PHIAT/PHAME deposits by name too
      .filter(token => token.ticker !== 'WPLS') // Exclude WPLS (Wrapped PLS)
      .filter(token => !token.ticker.includes('(EARN)')) // Exclude EARN staked tokens
      .filter(token => !token.name.includes('(EARN)')) // Exclude EARN staked tokens by name too
      .filter(token => !token.ticker.startsWith('st')) // Exclude all staked tokens (stPLSX, stLOAN, etc.)
      .map(token => ({
        chain: token.chain,
        address: token.a,
        ticker: token.ticker,
        name: token.name,
        decimals: token.decimals
      }))
      .sort((a, b) => a.ticker.localeCompare(b.ticker)) // Default alphabetical sort
  }, [])

  // Get unique tickers for price fetching
  const uniqueTickers = useMemo(() => {
    const tickerSet = new Set(allCoins.map(coin => coin.ticker))
    return Array.from(tickerSet)
  }, [allCoins])

  // Fetch prices for all tokens
  const { prices, isLoading: pricesLoading } = useTokenPrices(uniqueTickers)

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('liquidity')
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc')

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')

  // Enrich coins with price data and apply filtering
  const enrichedCoins = useMemo(() => {
    let filtered = allCoins.map(coin => ({
      ...coin,
      price: prices?.[coin.ticker]?.price || 0
    }))

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(coin => 
        coin.ticker.toLowerCase().includes(query) ||
        coin.name.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [allCoins, prices, searchQuery])

  // Apply sorting
  const sortedCoins = useMemo(() => {
    const sorted = [...enrichedCoins]
    
    sorted.sort((a, b) => {
      let comparison = 0
      
      switch (sortField) {
        case 'alphabetical':
          comparison = a.ticker.localeCompare(b.ticker)
          break
        case 'price':
          comparison = (a.price || 0) - (b.price || 0)
          break
        case 'change':
          const aChange = prices?.[a.ticker]?.priceChange?.h24 || 0
          const bChange = prices?.[b.ticker]?.priceChange?.h24 || 0
          comparison = aChange - bChange
          break
        case 'volume':
          const aVolume = prices?.[a.ticker]?.volume?.h24 || 0
          const bVolume = prices?.[b.ticker]?.volume?.h24 || 0
          comparison = aVolume - bVolume
          break
        case 'liquidity':
          const aLiquidity = prices?.[a.ticker]?.liquidity || 0
          const bLiquidity = prices?.[b.ticker]?.liquidity || 0
          comparison = aLiquidity - bLiquidity
          break
        case 'marketcap':
          // Calculate market cap for sorting
          const getMarketCap = (ticker: string, price: number) => {
            const estimatedSupplies: Record<string, number> = {
              'PLS': 421_000_000_000_000,
              'PLSX': 10_000_000_000_000,
              'HEX': 633_542_658_369,
              'pHEX': 633_542_658_369,
              'INC': 1_000_000_000,
              'HDRN': 5_555_555_555,
              'ICSA': 555_555_555,
              'COM': 1_000_000_000,
              '9MM': 100_000_000,
              '9INCH': 69_000_000,
            }
            const supply = estimatedSupplies[ticker]
            return supply ? price * supply : 0
          }
          
          const aMarketCap = getMarketCap(a.ticker, a.price || 0)
          const bMarketCap = getMarketCap(b.ticker, b.price || 0)
          comparison = aMarketCap - bMarketCap
          break
      }
      
      return sortDirection === 'asc' ? comparison : -comparison
    })
    
    return sorted
  }, [enrichedCoins, sortField, sortDirection, prices])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('desc')
    }
  }

  const formatPrice = (price: number): string => {
    if (price === 0) return '--'
    if (price < 0.000001) return `$${price.toExponential(2)}`
    if (price < 0.01) return `$${price.toFixed(6)}`
    if (price < 1) return `$${price.toFixed(4)}`
    return `$${price.toFixed(2)}`
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Controls */}
      <div className="bg-black/60 backdrop-blur-md rounded-2xl p-0 mb-4">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          {/* Search */}
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="Search coins..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 bg-black/50 border border-2 border-white/10 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-white/40"
            />
          </div>




        </div>

      </div>

      {/* Table */}
      <div className="bg-black/60 backdrop-blur-md border-2 border-white/10 rounded-2xl p-1 sm:p-6 mb-8">
        {/* Table Headers */}
        <div className="grid grid-cols-[minmax(20px,auto)_2fr_1fr_1fr_1fr_1fr_1fr] xs:grid-cols-[minmax(20px,auto)_1fr_1fr_1fr_1fr_1fr_1fr] sm:grid-cols-[minmax(20px,auto)_2fr_1fr_1fr_1fr_1fr_1fr] items-center gap-2 sm:gap-4 px-2 sm:px-4 py-3 border-b border-white/20 text-xs md:text-[16px] font-medium">
          <div></div>
          <button 
            onClick={() => handleSort('alphabetical')}
            className={`text-left hover:text-white transition-colors ${
              sortField === 'alphabetical' ? 'text-white' : 'text-gray-400'
            }`}
          >
            Coin {sortField === 'alphabetical' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
          </button>
          <button 
            onClick={() => handleSort('price')}
            className={`text-center hidden sm:block hover:text-white transition-colors ${
              sortField === 'price' ? 'text-white' : 'text-gray-400'
            }`}
          >
            Price {sortField === 'price' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
          </button>
          <button 
            onClick={() => handleSort('change')}
            className={`text-center hover:text-white transition-colors ${
              sortField === 'change' ? 'text-white' : 'text-gray-400'
            }`}
          >
            24h {sortField === 'change' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
          </button>
          <button 
            onClick={() => handleSort('volume')}
            className={`text-center hover:text-white transition-colors ${
              sortField === 'volume' ? 'text-white' : 'text-gray-400'
            }`}
          >
            Volume {sortField === 'volume' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
          </button>
          <button 
            onClick={() => handleSort('liquidity')}
            className={`text-center hover:text-white transition-colors ${
              sortField === 'liquidity' ? 'text-white' : 'text-gray-400'
            }`}
          >
            Liquidity {sortField === 'liquidity' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
          </button>
          <button 
            onClick={() => handleSort('marketcap')}
            className={`text-center hidden sm:block hover:text-white transition-colors ${
              sortField === 'marketcap' ? 'text-white' : 'text-gray-400'
            }`}
          >
            Market Cap {sortField === 'marketcap' ? (sortDirection === 'asc' ? '↑' : '↓') : ''}
          </button>
        </div>

        {sortedCoins.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            No coins found matching your criteria
          </div>
        ) : (
          <div className="pt-2">
            {sortedCoins.map((coin, index) => (
              <div 
                key={`${coin.chain}-${coin.address}-${coin.ticker}-${index}`}
                className="grid grid-cols-[minmax(20px,auto)_2fr_1fr_1fr_1fr_1fr_1fr] xs:grid-cols-[minmax(20px,auto)_1fr_1fr_1fr_1fr_1fr_1fr] sm:grid-cols-[minmax(20px,auto)_2fr_1fr_1fr_1fr_1fr_1fr] items-center gap-2 sm:gap-4 border-b border-white/10 mx-2 sm:mx-4 py-4 last:border-b-0 overflow-hidden"
              >
                {/* Chain Icon - Furthest Left Column */}
                <div className="flex space-x-2 items-center justify-center min-w-[18px]">
                  <CoinLogo
                    symbol="PLS-white" // Only PulseChain coins now
                    size="sm"
                    className="grayscale opacity-50"
                  />
                </div>
                
                {/* Token Info - Left Column */}
                <div className="flex items-center space-x-2 sm:space-x-3 min-w-[70px] md:min-w-[140px] overflow-hidden">
                  <div className="flex-shrink-0">
                    <CoinLogo
                      key={`logo-${coin.ticker}-${coin.address}`}
                      symbol={coin.ticker}
                      size="md"
                      className="rounded-none"
                      variant="default"
                      priority={true}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium text-sm md:text-md break-words">
                      {getDisplayTicker(coin.ticker)}
                    </div>
                    <div className="text-gray-400 text-[10px] break-words leading-tight">
                      <span className="hidden sm:block">{coin.name}</span>
                    </div>
                  </div>
                </div>
                
                {/* Price Column - Hidden on Mobile */}
                <div className="hidden sm:block text-center">
                  <div className="text-white text-xs font-medium">
                    {pricesLoading ? (
                      <div className="animate-pulse bg-white h-4 w-16 rounded mx-auto"></div>
                    ) : (
                      coin.price === 0 ? '--' : formatPrice(coin.price)
                    )}
                  </div>
                </div>

                {/* 24h Price Change Column */}
                <div className="text-center">
                  <div className={`text-[10px] md:text-xs font-bold ${
                    !prices?.[coin.ticker]?.priceChange?.h24
                      ? 'text-gray-400'
                      : prices[coin.ticker].priceChange.h24! >= 0 
                      ? 'text-[#00ff55]' 
                      : 'text-red-500'
                  }`}>
                    {!prices?.[coin.ticker]?.priceChange?.h24
                      ? '--'
                      : `${prices[coin.ticker].priceChange.h24! >= 0 ? '+' : ''}${prices[coin.ticker].priceChange.h24!.toFixed(1)}%`
                    }
                  </div>
                </div>

                {/* Volume Column */}
                <div className="text-center">
                  <div className="text-white text-xs">
                    {prices?.[coin.ticker]?.volume?.h24 ? 
                      `$${(prices[coin.ticker]!.volume!.h24! / 1000).toFixed(1)}K` : 
                      '--'
                    }
                  </div>
                </div>

                {/* Liquidity Column */}
                <div className="text-center">
                  <div className="text-white text-xs">
                    {prices?.[coin.ticker]?.liquidity ? 
                      `$${(prices[coin.ticker]!.liquidity! / 1000).toFixed(1)}K` : 
                      '--'
                    }
                  </div>
                </div>

                {/* Market Cap Column - Hidden on Mobile */}
                <div className="text-center hidden sm:block">
                  <div className="text-white text-xs">
                    {(() => {
                      const price = coin.price || 0
                      if (price === 0) return '--'
                      
                      // For well-known tokens, we can use estimated supplies
                      const estimatedSupplies: Record<string, number> = {
                        'PLS': 421_000_000_000_000, // ~421T PLS
                        'PLSX': 10_000_000_000_000, // ~10T PLSX  
                        'HEX': 633_542_658_369, // Current HEX supply
                        'pHEX': 633_542_658_369, // Same as HEX
                        'INC': 1_000_000_000, // 1B INC
                        'HDRN': 5_555_555_555, // ~5.5B HDRN
                        'ICSA': 555_555_555, // ~555M ICSA
                        'COM': 1_000_000_000, // 1B COM
                        '9MM': 100_000_000, // 100M 9MM
                        '9INCH': 69_000_000, // 69M 9INCH
                      }
                      
                      const supply = estimatedSupplies[coin.ticker]
                      if (!supply) return '--'
                      
                      const marketCap = price * supply
                      if (marketCap >= 1_000_000) {
                        return `$${(marketCap / 1_000_000).toFixed(1)}M`
                      } else if (marketCap >= 1_000) {
                        return `$${(marketCap / 1_000).toFixed(1)}K`
                      } else {
                        return `$${marketCap.toFixed(0)}`
                      }
                    })()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
