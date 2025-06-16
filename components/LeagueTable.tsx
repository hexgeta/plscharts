'use client'

import { useEffect, useState, useMemo } from 'react'
import Image from 'next/image'
import { CoinLogo } from '@/components/ui/CoinLogo'
import { useTokenPrices } from '@/hooks/crypto/useTokenPrices'
import { useTokenSupply } from '@/hooks/crypto/useTokenSupply'
import { TOKEN_CONSTANTS } from '@/constants/crypto'
import { getDisplayTicker } from '@/utils/ticker-display'
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
  userTShares?: number // User's calculated T-shares for MAXI DAO tokens
}

// Sea creature ranks from highest to lowest
const LEAGUE_RANKS: Omit<LeagueRank, 'minTokens' | 'marketCap'>[] = [
  {
    name: 'Poseidon',
    icon: '/other-images/poseidon.png',
    percentage: 10,
    color: 'text-yellow-400'
  },
  {
    name: 'Whale',
    icon: '/other-images/whale.png',
    percentage: 1,
    color: 'text-blue-400'
  },
  {
    name: 'Shark',
    icon: '/other-images/shark.png',
    percentage: 0.1,
    color: 'text-gray-300'
  },
  {
    name: 'Dolphin',
    icon: '/other-images/dolphin.png',
    percentage: 0.01,
    color: 'text-cyan-400'
  },
  {
    name: 'Squid',
    icon: '/other-images/squid.png',
    percentage: 0.001,
    color: 'text-orange-400'
  },
  {
    name: 'Turtle',
    icon: '/other-images/turtle.png',
    percentage: 0.0001,
    color: 'text-green-400'
  },
  {
    name: 'Crab',
    icon: '/other-images/crab.png',
    percentage: 0.00001,
    color: 'text-orange-500'
  },
  {
    name: 'Shrimp',
    icon: '/other-images/shrimp.png',
    percentage: 0.000001,
    color: 'text-orange-600'
  },
  {
    name: 'Shell',
    icon: '/other-images/shell.png',
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

// Format percentage with at least 2 significant figures
function formatPercentage(percentage: number): string {
  if (percentage === 0) return '0%'
  if (percentage >= 10) return percentage.toFixed(0) + '%'
  if (percentage >= 1) return percentage.toFixed(1) + '%'
  if (percentage >= 0.1) return percentage.toFixed(2) + '%'
  if (percentage >= 0.01) return percentage.toFixed(3) + '%'
  if (percentage >= 0.001) return percentage.toFixed(4) + '%'
  if (percentage >= 0.0001) return percentage.toFixed(5) + '%'
  if (percentage >= 0.00001) return percentage.toFixed(6) + '%'
  
  // For very small percentages, use scientific notation to ensure 2 significant figures
  return percentage.toPrecision(2) + '%'
}

export default React.memo(function LeagueTable({ 
  tokenTicker, 
  containerStyle = true, 
  preloadedPrices,
  preloadedSupply,
  supplyDeduction,
  userBalance,
  showLeagueNames = false,
  userTShares
}: LeagueTableProps) {
  
  const displayTicker = getDisplayTicker(tokenTicker);
  
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
        <div className="text-center mb-3 pb-6 border-b border-white/10">
          <div className="text-white text-2xl font-bold">
            {hasValidPriceData && `$${Math.round(userBalance * tokenPrice.price).toLocaleString('en-US')}`}
          </div>
          <div className="text-gray-400 text-sm flex items-center justify-center gap-1 py-1">
            {formatCompactNumber(userBalance)} {displayTicker} (
            {(() => {
              const userPercentage = (userBalance / totalSupply) * 100;
              const userLeague = LEAGUE_RANKS.find(rank => userPercentage >= rank.percentage);
              return (
                <span className="flex items-center gap-1">
                  {userLeague && (
                    <Image
                      src={userLeague.icon}
                      alt={userLeague.name}
                      width={16}
                      height={16}
                      className="object-contain"
                    />
                  )}
                  {formatPercentage(userPercentage)}
                </span>
              );
            })()}
            )
            {/* T-shares display for MAXI DAO tokens - inline after supply */}
            {userTShares && userTShares > 0 && (
              <span className="text-gray-400 font-medium text-sm">
                • {userTShares >= 1
                  ? `${formatCompactNumber(userTShares)} T-Shares`
                  : `${userTShares.toFixed(3)} T-Shares`
                } {(() => {
                  // Determine chain based on token ticker and calculate T-shares percentage
                  const isEthereumToken = tokenTicker.startsWith('e') || tokenTicker.startsWith('we')
                  const totalTShares = isEthereumToken ? 7893701 : 8503220 // ETH: 7,893,701, PLS: 8,503,220
                  const tSharesPercentage = (userTShares / totalTShares) * 100
                  const tSharesLeague = LEAGUE_RANKS.find(rank => tSharesPercentage >= rank.percentage)
                  
                  return tSharesLeague ? (
                    <>
                      (<Image
                        src={tSharesLeague.icon}
                        alt={tSharesLeague.name}
                        width={12}
                        height={12}
                        className="object-contain inline-block align-middle mx-1"
                      />
                      {formatPercentage(tSharesPercentage)})
                    </>
                  ) : `(${formatPercentage(tSharesPercentage)})`
                })()}
              </span>
            )}
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
            <div className="text-white text-sm">{displayTicker}</div>
            {containerStyle && (
              <div className="text-gray-400 text-[10px] sm:text-xs">{(() => {
                const tokenConfig = TOKEN_CONSTANTS.find(t => t.ticker === tokenTicker)
                return tokenConfig?.name || tokenTicker
              })()}</div>
            )}
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
              <div className="w-4 h-4 rounded-full flex items-center justify-center ml-1">
                <CoinLogo
                  symbol={tokenTicker}
                  size="sm"
                  className="brightness-0 invert rounded-none w-3 h-3"
                  variant="no-bg"
                />
              </div>
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
    <div className="bg-black border-2 border-white/10 rounded-2xl p-6 w-full">
      {content}
    </div>
  )
}) 
