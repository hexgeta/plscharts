'use client'

import { useEffect, useState, useMemo } from 'react'
import Image from 'next/image'
import { CoinLogo } from '@/components/ui/CoinLogo'
import { useTokenPrices } from '@/hooks/crypto/useTokenPrices'
import { useTokenSupply } from '@/hooks/crypto/useTokenSupply'
import React from 'react'

interface LeagueRank {
  name: string
  icon: string
  percentage: number
  minTokens: number
  marketCap: number
  color: string
}

interface LeagueTableProps {
  tokenTicker: string
  containerStyle?: boolean
  preloadedPrices?: any // Prices from parent component for main tokens
  preloadedSupply?: number // Supply from parent component for main tokens
  supplyDeduction?: number // Amount to subtract from total supply (e.g., burned tokens)
  userBalance?: number // User's token balance to highlight current league
  showLeagueNames?: boolean // Whether to show league names next to icons (only on main leagues page)
}

// Sea creature ranks from highest to lowest
const LEAGUE_RANKS: Omit<LeagueRank, 'minTokens' | 'marketCap'>[] = [
  {
    name: 'Poseidon',
    icon: '/poseidon.png',
    percentage: 10,
    color: 'text-yellow-400'
  },
  {
    name: 'Whale',
    icon: '/whale.png',
    percentage: 1,
    color: 'text-blue-400'
  },
  {
    name: 'Shark',
    icon: '/shark.png',
    percentage: 0.1,
    color: 'text-gray-300'
  },
  {
    name: 'Dolphin',
    icon: '/dolphin.png',
    percentage: 0.01,
    color: 'text-cyan-400'
  },
  {
    name: 'Squid',
    icon: '/squid.png',
    percentage: 0.001,
    color: 'text-orange-400'
  },
  {
    name: 'Turtle',
    icon: '/turtle.png',
    percentage: 0.0001,
    color: 'text-green-400'
  },
  {
    name: 'Crab',
    icon: '/crab.png',
    percentage: 0.00001,
    color: 'text-orange-500'
  },
  {
    name: 'Shrimp',
    icon: '/shrimp.png',
    percentage: 0.000001,
    color: 'text-orange-600'
  },
  {
    name: 'Shell',
    icon: '/shell.png',
    percentage: 0.0000001,
    color: 'text-gray-400'
  }
]

// Local formatting functions to match the website's style
function formatCompactNumber(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) return '0';
  
  if (num >= 1e15) {
    const rounded = Math.round(num / 1e15)
    return rounded >= 10 ? rounded + 'Q' : (num / 1e15).toFixed(1) + 'Q'
  }
  if (num >= 1e12) {
    const rounded = Math.round(num / 1e12)
    return rounded >= 10 ? rounded + 'T' : (num / 1e12).toFixed(1) + 'T'
  }
  if (num >= 1e9) {
    const rounded = Math.round(num / 1e9)
    return rounded >= 10 ? rounded + 'B' : (num / 1e9).toFixed(1) + 'B'
  }
  if (num >= 1e6) {
    const rounded = Math.round(num / 1e6)
    return rounded >= 10 ? rounded + 'M' : (num / 1e6).toFixed(1) + 'M'
  }
  if (num >= 1e3) {
    const rounded = Math.round(num / 1e3)
    return rounded >= 10 ? rounded + 'K' : (num / 1e3).toFixed(1) + 'K'
  }
  if (num >= 1) {
    return Math.round(num).toString()
  }
  // For fractional amounts, show decimals
  if (num >= 0.01) {
    return num.toFixed(2)
  }
  if (num >= 0.001) {
    return num.toFixed(3)
  }
  return num.toFixed(4)
}

// For header market cap - uses compact notation
function formatHeaderMarketCap(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) return '$0';
  
  if (num >= 1e9) {
    const rounded = Math.round(num / 1e9)
    return rounded >= 10 ? '$' + rounded + 'B' : '$' + (num / 1e9).toFixed(1) + 'B'
  }
  if (num >= 1e6) {
    const rounded = Math.round(num / 1e6)
    return rounded >= 10 ? '$' + rounded + 'M' : '$' + (num / 1e6).toFixed(1) + 'M'
  }
  return '$' + num.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

// For league row market caps - uses 3 significant digits with smart decimal handling
function formatLeagueMarketCap(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) return '$0';
  
  if (num >= 1000) {
    // For large numbers, show raw value with no decimals (no sig fig rounding)
    return '$' + Math.round(num).toLocaleString('en-US', { maximumFractionDigits: 0 })
  }
  
  // Only apply 3 significant figures rounding to numbers < 1000
  const roundToSignificantFigures = (n: number, sig: number) => {
    if (n === 0) return 0
    const factor = Math.pow(10, sig - Math.floor(Math.log10(Math.abs(n))) - 1)
    return Math.round(n * factor) / factor
  }
  
  const rounded = roundToSignificantFigures(num, 3)
  
  if (rounded >= 100) {
    // For 100-999, no decimals needed (3 sig figs already)
    return '$' + Math.round(rounded).toString()
  }
  if (rounded >= 10) {
    // For 10-99, show 1 decimal for 3 sig figs
    return '$' + rounded.toFixed(1)
  }
  if (rounded >= 1) {
    // For 1-9, show 2 decimals for 3 sig figs
    return '$' + rounded.toFixed(2)
  }
  // For < 1, show enough decimals for 3 sig figs
  return '$' + rounded.toPrecision(3)
}

export default React.memo(function LeagueTable({ 
  tokenTicker, 
  containerStyle = true, 
  preloadedPrices,
  preloadedSupply,
  supplyDeduction,
  userBalance,
  showLeagueNames = false
}: LeagueTableProps) {
  
  const [showError, setShowError] = useState(false);
  
  // Determine if we should use preloaded data or fetch individually
  const hasPreloadedPrice = preloadedPrices && preloadedPrices[tokenTicker] && preloadedPrices[tokenTicker].price > 0;
  const hasPreloadedSupply = preloadedSupply !== undefined && preloadedSupply !== null && preloadedSupply > 0;
  
  // Only fetch prices if we don't have valid preloaded prices for this token
  const { prices: fetchedPrices, isLoading: priceLoading, error: priceError } = useTokenPrices(
    hasPreloadedPrice ? [] : [tokenTicker]
  )
  
  // For tokens starting with "we", use the "e" version for supply lookup (e.g., weDECI -> eDECI)
  const supplyTokenTicker = useMemo(() => {
    if (tokenTicker.startsWith('we')) {
      return tokenTicker.replace('we', 'e')
    }
    return tokenTicker
  }, [tokenTicker])

  // Only fetch supply if we don't have valid preloaded supply for this token
  // IMPORTANT: Pass null to skip the hook entirely when we have valid preloaded data
  const { totalSupply: fetchedSupply, loading: supplyLoading, error: supplyError } = useTokenSupply(
    hasPreloadedSupply ? null : supplyTokenTicker
  )
  
  // Use preloaded data if available, otherwise use fetched data
  const prices = preloadedPrices || fetchedPrices
  const rawTotalSupply = hasPreloadedSupply ? preloadedSupply : fetchedSupply
  
  // Apply supply deduction if provided
  const totalSupply = rawTotalSupply && supplyDeduction ? rawTotalSupply - supplyDeduction : rawTotalSupply
  
  // Memoize the specific token price data to prevent re-renders when other tokens update
  const tokenPrice = useMemo(() => {
    return prices?.[tokenTicker]
  }, [prices, tokenTicker])
  
  // Enhanced loading validation - ensure we have valid data before rendering
  const hasValidPriceData = useMemo(() => {
    return tokenPrice && tokenPrice.price && tokenPrice.price > 0
  }, [tokenPrice])
  
  const hasValidSupplyData = useMemo(() => {
    return totalSupply && totalSupply > 0
  }, [totalSupply])
  
  const loading = (hasPreloadedPrice ? false : priceLoading) || (hasPreloadedSupply ? false : supplyLoading)
  
  // Add 5-second delay before showing error messages
  useEffect(() => {
    if (!loading && (supplyError || !hasValidSupplyData)) {
      const timer = setTimeout(() => {
        setShowError(true);
      }, 5000); // 5 second delay

      return () => clearTimeout(timer);
    } else {
      setShowError(false);
    }
  }, [loading, supplyError, hasValidSupplyData]);

  // Add debugging for popup tokens
  if (!hasPreloadedPrice || !hasPreloadedSupply) {
    console.log(`LeagueTable ${tokenTicker} (individual fetch):`, {
      hasPreloadedPrice,
      hasPreloadedSupply,
    tokenPrice,
    totalSupply,
      priceLoading,
    supplyLoading,
      hasValidPriceData,
      hasValidSupplyData,
      loading,
      priceError,
      supplyError
    })
  }

  // Calculate user's current league based on their balance
  const userCurrentLeague = useMemo(() => {
    if (!userBalance || !hasValidSupplyData || userBalance <= 0) return null
    
    const userPercentage = (userBalance / totalSupply) * 100
    
    // Find the highest league they qualify for
    for (const rank of LEAGUE_RANKS) {
      if (userPercentage >= rank.percentage) {
        return rank.name
      }
    }
    return null
  }, [userBalance, totalSupply, hasValidSupplyData])

  // Memoize the league calculations to prevent recalculation on every render
  const leagueRanks = useMemo(() => {
    if (!hasValidSupplyData) return []
    
    return LEAGUE_RANKS.map(rank => {
      const minTokens = (totalSupply * rank.percentage) / 100
      // Use 0 for market cap if no price data
      const marketCap = hasValidPriceData ? minTokens * tokenPrice.price : 0
      
      return {
        ...rank,
        minTokens,
        marketCap
      }
    })
  }, [totalSupply, hasValidPriceData, tokenPrice, hasValidSupplyData])

  // Calculate total market cap (0 if no price data)
  const totalMarketCap = useMemo(() => {
    return hasValidPriceData && hasValidSupplyData ? totalSupply * tokenPrice.price : 0
  }, [hasValidPriceData, hasValidSupplyData, totalSupply, tokenPrice])

  // Show loading state if still loading
  if (loading) {
    return (
      <div className="bg-black border-2 border-white/10 rounded-2xl p-6 w-full max-w-sm">
        <div className="text-center text-gray-400">Loading {tokenTicker}...</div>
      </div>
    )
  }

  // Only show error state if we have supply errors or no supply data AND the delay has passed
  // We'll handle missing price data by showing "no price found" in the UI
  if (showError && (supplyError || !hasValidSupplyData)) {
    const errorMessage = supplyError || 'No supply data available';
    
    return (
      <div className="bg-black border-2 border-white/10 rounded-2xl p-6 w-full max-w-sm">
        <div className="text-red-400 text-center">
          <p>Error loading {tokenTicker} league data</p>
          <p className="text-sm text-gray-500 mt-2">{typeof errorMessage === 'string' ? errorMessage : 'Supply fetch failed'}</p>
        </div>
      </div>
    )
  }

  const content = (
    <div className="w-full transition-all duration-300 ease-in-out">
      {/* User Balance Header - Only show if userBalance is provided */}
      {userBalance && userBalance > 0 && (
        <div className="text-center mb-3 pb-2 border-b border-white/10">
          {hasValidPriceData && (
            <div className="text-white text-sm font-medium">
              ${Math.round(userBalance * tokenPrice.price).toLocaleString('en-US')}
            </div>
          )}
          <div className="text-gray-400 text-xs">
            {formatCompactNumber(userBalance)} {tokenTicker}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="grid grid-cols-3 items-center gap-4 mb-2">
        <div className="flex items-center space-x-3">
          <CoinLogo
            symbol={tokenTicker}
            size="xl"
            className="rounded-none"
            variant="default"
          />
          <div>
            <div className="text-white text-sm">{tokenTicker}</div>
          </div>
        </div>
        <div className="text-center ml-4 md:ml-2">
          <div className="text-gray-400 text-xs">Market Cap</div>
          <div className="text-white font-bold text-sm transition-all duration-300">
            {hasValidPriceData ? formatHeaderMarketCap(totalMarketCap) : 'No price'}
          </div>
        </div>
        <div className="text-right">
          <div className="text-gray-400 text-xs">Supply</div>
          <div className="text-white font-bold text-sm transition-all duration-300">{formatCompactNumber(totalSupply)}</div>
        </div>
      </div>

      {/* Separator */}
      <div className="border-t border-white/10 mb-2"></div>

      {/* League Table */}
      <div className="space-y-1">
        {leagueRanks.map((rank, index) => (
          <div
            key={rank.name}
            className={`grid grid-cols-3 items-center gap-4 py-1 transition-all duration-300 ${
              userCurrentLeague === rank.name 
                ? 'bg-gray-500/20 rounded-lg ml-[-12px] mr-[-12px] px-3' 
                : ''
            }`}
          >
            {/* Rank Info - Left Aligned */}
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 relative">
                <Image
                  src={rank.icon}
                  alt={rank.name}
                  width={24}
                  height={24}
                  className="object-contain"
                  priority={index < 3} // Priority load first 3 ranks (most important)
                  sizes="24px"
                />
              </div>
              {showLeagueNames && (
                <div className="text-white text-[10px] sm:text-xs font-medium">
                  {rank.name}
                </div>
              )}
            </div>

            {/* Market Cap - Center Aligned */}
            <div className="text-white font-medium text-center text-xs md:text-sm ml-4 md:ml-2 transition-all duration-300">
              {hasValidPriceData ? formatLeagueMarketCap(rank.marketCap) : 'No price'}
            </div>

            {/* Supply Required - Right Aligned */}
            <div className="text-gray-400 text-right flex items-center justify-end text-sm transition-all duration-300">
              {formatCompactNumber(rank.minTokens)}
              {(tokenTicker === 'HDRN' || tokenTicker === 'eHDRN' || tokenTicker === 'ICSA' || tokenTicker === 'eICSA') ? (
                <div className="w-4 h-4 rounded-full flex items-center justify-center ml-1">
                <img
                  src="/coin-logos/HDRN-white.svg"
                  alt={`${tokenTicker} logo`}
                    className="w-3 h-3 rounded-none"
                />
                </div>
              ) : (
                <div className="w-4 h-4 rounded-full flex items-center justify-center ml-1">
                <CoinLogo
                  symbol={tokenTicker}
                  size="sm"
                    className="brightness-0 invert rounded-none w-3 h-3"
                  variant="no-bg"
                />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  if (!containerStyle) {
    return content;
  }

  return (
    <div className="bg-black border-2 border-white/10 rounded-2xl p-6 min-w-[340px]">
      {content}
    </div>
  )
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  // Only re-render if the specific token's data has changed
  if (prevProps.tokenTicker !== nextProps.tokenTicker) return false;
  if (prevProps.containerStyle !== nextProps.containerStyle) return false;
  if (prevProps.supplyDeduction !== nextProps.supplyDeduction) return false;
  if (prevProps.showLeagueNames !== nextProps.showLeagueNames) return false;
  
  // Compare preloaded supply
  if (prevProps.preloadedSupply !== nextProps.preloadedSupply) return false;
  
  // Compare the specific token's price data
  const prevTokenPrice = prevProps.preloadedPrices?.[prevProps.tokenTicker];
  const nextTokenPrice = nextProps.preloadedPrices?.[nextProps.tokenTicker];
  
  if (!prevTokenPrice && !nextTokenPrice) return true; // Both null/undefined
  if (!prevTokenPrice || !nextTokenPrice) return false; // One is null/undefined
  
  // Compare the actual price values that matter for rendering
  return (
    prevTokenPrice.price === nextTokenPrice.price &&
    JSON.stringify(prevTokenPrice.priceChange) === JSON.stringify(nextTokenPrice.priceChange) &&
    prevTokenPrice.liquidity === nextTokenPrice.liquidity
  );
}) 
