'use client'

import { useEffect, useState, useMemo } from 'react'
import Image from 'next/image'
import { CoinLogo } from '@/components/ui/CoinLogo'
import { useTokenPrices } from '@/hooks/crypto/useTokenPrices'
import { useTokenSupply } from '@/hooks/crypto/useTokenSupply'
import { useHexDailyDataCache } from '@/hooks/crypto/useHexDailyData'
import { useLeagueData } from '@/hooks/crypto/useLeagueData'
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
  holders?: {
    current: number
    change: number
  }
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
  showHolders?: boolean // Whether to show holders column (easy toggle)
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

// Add this mapping object after LEAGUE_RANKS
const LEAGUE_NAME_MAPPING: { [key: string]: string } = {
  '🔱': 'Poseidon',
  '🐋': 'Whale',
  '🦈': 'Shark',
  '🐬': 'Dolphin',
  '🦑': 'Squid',
  '🐢': 'Turtle',
  '🦀': 'Crab',
  '🦐': 'Shrimp',
  '🐚': 'Shell'
}

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

// Add this function before the component
function formatHolderChange(change: number) {
  if (change === 0) return '±0'
  const prefix = change > 0 ? '+' : ''
  return `${prefix}${change.toLocaleString()}`
}

export default React.memo(function LeagueTable({ 
  tokenTicker, 
  containerStyle = true, 
  preloadedPrices,
  preloadedSupply,
  supplyDeduction,
  userBalance,
  showLeagueNames = false,
  userTShares,
  showHolders = false
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
  
  // Get HEX daily data for T-shares calculations
  const { data: hexDailyData } = useHexDailyDataCache()
  
  // Determine if this token should have holders data
  const isEthereumToken = tokenTicker.startsWith('e') || tokenTicker.startsWith('we');
  const tokensWithHolders = ['HEX', 'PLSX', 'INC', 'HDRN', 'ICSA', 'COM'];
  const shouldFetchLeagueData = showHolders && tokensWithHolders.includes(tokenTicker) && !isEthereumToken;
  
  // Add this after other hooks - use generic hook for token-specific league data
  const { leagueData, isLoading: leagueLoading } = useLeagueData(shouldFetchLeagueData ? tokenTicker : null)
  
  // Map the league data to use proper league names
  const mappedLeagueData = useMemo(() => {
    if (!leagueData || leagueData.length === 0) return [];
    
    return leagueData.map(data => ({
      ...data,
      league_name: LEAGUE_NAME_MAPPING[data.league_name] || data.league_name
    }));
  }, [leagueData]);

  // Memoize T-shares calculations to prevent flickering
  const tSharesData = useMemo(() => {
    if (!userTShares || userTShares <= 0 || !hexDailyData) return null
    
    const isEthereumToken = tokenTicker.startsWith('e') || tokenTicker.startsWith('we')
    const OA_TSHARES_PLS = 35482068;
    const OA_TSHARES_ETH = 35155727;
    
    const ethLatestDay = hexDailyData?.dailyPayouts?.ETH?.[hexDailyData.dailyPayouts.ETH.length - 1]
    const plsLatestDay = hexDailyData?.dailyPayouts?.PLS?.[hexDailyData.dailyPayouts.PLS.length - 1]
    const totalTShares = isEthereumToken 
      ? (ethLatestDay ? (parseFloat(ethLatestDay.shares) / 1000000000000) - OA_TSHARES_ETH : 0)
      : (plsLatestDay ? (parseFloat(plsLatestDay.shares) / 1000000000000) - OA_TSHARES_PLS : 0)
    const tSharesPercentage = (userTShares / totalTShares) * 100
    const tSharesLeague = LEAGUE_RANKS.find(rank => tSharesPercentage >= rank.percentage)
    const rawShares = isEthereumToken ? ethLatestDay?.shares : plsLatestDay?.shares
    
    return {
      totalTShares,
      tSharesPercentage,
      tSharesLeague,
      rawShares
    }
  }, [userTShares, hexDailyData, tokenTicker])
  
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
  
  const loading = (hasPreloadedPrice ? false : priceLoading) || (hasPreloadedSupply ? false : supplyLoading) || (shouldFetchLeagueData && leagueLoading)
  
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

  // Update the leagueRanks useMemo to include holder data
  const leagueRanks = useMemo(() => {
    if (!hasValidSupplyData) return []
    
    return LEAGUE_RANKS.map(rank => {
      const minTokens = (totalSupply * rank.percentage) / 100
      const marketCap = hasValidPriceData ? minTokens * tokenPrice.price : 0
      
      // Find matching league data
      const leagueInfo = leagueData.find(l => l.league_name === rank.name)
      
      return {
        ...rank,
        minTokens,
        marketCap,
        holders: leagueInfo ? {
          current: leagueInfo.user_holders,
          change: leagueInfo.holder_change
        } : undefined
      }
    })
  }, [totalSupply, hasValidPriceData, tokenPrice, hasValidSupplyData, leagueData])

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
      <div className="bg-black border-2 border-white/10 rounded-2xl p-6 w-full min-w-2xl max-w-2xl">
        <div className="text-red-400 text-center">
          <p>Error loading {tokenTicker} league data</p>
          <p className="text-sm text-gray-500 mt-2">{typeof errorMessage === 'string' ? errorMessage : 'Supply fetch failed'}</p>
        </div>
      </div>
    )
  }

  // Show holders based on prop and token conditions - only on xl screens (1280px+)  
  const shouldShowHolders = shouldFetchLeagueData;

  const content = (
    <div className="w-full transition-all duration-300 ease-in-out">
      {/* User Balance Header - Only show if userBalance is provided */}
      {userBalance && userBalance > 0 && (
        <div className="text-center mb-3 pb-6 border-b border-white/10">
          <div className="text-white text-2xl font-bold">
            {hasValidPriceData && `$${Math.round(userBalance * tokenPrice.price).toLocaleString('en-US')}`}
          </div>
          <div className="text-gray-400 text-xs sm:text-sm flex flex-col sm:flex-row sm:items-center justify-center gap-1 py-1">
            <div className="flex items-center justify-center gap-1">
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
            </div>
            {/* T-shares display for MAXI DAO tokens - separate line on mobile */}
            {tSharesData && userTShares && (
              <div className="text-gray-400 font-medium text-xs sm:text-sm flex items-center justify-center gap-1">
                <span className="hidden sm:inline">•</span>
                {userTShares >= 1
                  ? `${formatCompactNumber(userTShares)} T-Shares`
                  : `${userTShares.toFixed(3)} T-Shares`
                } {
                  tSharesData.tSharesLeague ? (
                    <>
                      (<Image
                        src={tSharesData.tSharesLeague.icon}
                        alt={tSharesData.tSharesLeague.name}
                        width={12}
                        height={12}
                        className="object-contain inline-block align-middle mx-1"
                      />
                      {formatPercentage(tSharesData.tSharesPercentage)})
                    </>
                  ) : `(${formatPercentage(tSharesData.tSharesPercentage)})`
                }
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <div className={`grid ${shouldShowHolders ? 'grid-cols-3 xl:grid-cols-4' : 'grid-cols-3'} items-center gap-4 mb-2`}>
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
              <div className="text-gray-400 text-[10px] sm:text-[10px]">{(() => {
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
        {shouldShowHolders && (
          <div className="text-right hidden xl:block">
            <div className="text-gray-400 text-xs">Holders</div>
            <div className="text-white font-bold text-sm transition-all duration-300">
              {mappedLeagueData.find(l => l.league_name === 'TOTAL')?.user_holders === -1 
                ? 'N/A' 
                : formatCompactNumber(mappedLeagueData.find(l => l.league_name === 'TOTAL')?.user_holders) || 'N/A'}
            </div>
          </div>
        )}
        </div>

      {/* Separator */}
      <div className="border-t border-white/10 mb-2"></div>

      {/* League Table */}
      <div className="space-y-1">
        {leagueRanks.map((rank, index) => {
          const leagueHolderData = shouldShowHolders ? mappedLeagueData.find(l => l.league_name === rank.name) : null;
          const isCrabAndBelow = ['Crab', 'Shrimp', 'Shell'].includes(rank.name);
          const isCrab = rank.name === 'Crab';
          const isShrimp = rank.name === 'Shrimp';
          const isShell = rank.name === 'Shell';
          
          return (
            <div key={rank.name} className="relative">
              {/* Render the centered "Crab and below" section - only in holders column */}
              {isCrab && shouldShowHolders && (
                <div className="absolute top-0 flex items-center justify-center xl:flex hidden" style={{ 
                  height: 'calc(300% + 0.5rem)', 
                  right: '0px',
                  width: '50px' // Fixed width for proper centering
                }}>
                  <div className="bg-gray-800/50 border border-dotted border-white/20 rounded-lg ml-2 px-2 py-1 flex flex-col items-center justify-center h-full min-w-[50px]">
                    <span className="text-white/70 text-[10px] font-medium text-right">
                      {(() => {
                        const totalHolders = mappedLeagueData.find(l => l.league_name === 'TOTAL')?.user_holders || 0;
                        const higherLeagueHolders = mappedLeagueData
                          .filter(l => ['Poseidon', 'Whale', 'Shark', 'Dolphin', 'Squid', 'Turtle'].includes(l.league_name))
                          .reduce((sum, l) => sum + (l.user_holders || 0), 0);
                        const remainingHolders = totalHolders - higherLeagueHolders;
                        return remainingHolders > 0 ? `~${formatCompactNumber(remainingHolders)}` : 'N/A';
                      })()}
                    </span>
                  </div>
                </div>
              )}
              
              <div 
                className={`grid ${shouldShowHolders ? 'grid-cols-3 xl:grid-cols-4' : 'grid-cols-3'} items-center gap-4 py-1 transition-all duration-300 ${
                  userCurrentLeague === rank.name 
                    ? 'bg-gray-500/20 rounded-lg ml-[-12px] mr-[-12px] px-3' 
                    : ''
                }`}
              >
              {/* Rank Info - Left Aligned */}
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 relative flex-shrink-0">
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
                  <div className="text-white text-[10px] sm:text-[10px] font-medium">
                    {rank.name}
                  </div>
                )}
              </div>

              {/* Market Cap - Center Aligned */}
              <div className="text-white font-medium text-center text-xs md:text-sm ml-4 md:ml-2 transition-all duration-300">
                {hasValidPriceData ? formatLeagueMarketCap(rank.marketCap) : 'No price'}
              </div>

              {/* Supply Required - Aligned based on holders column visibility */}
              <div className={`text-gray-400 flex items-center justify-end text-sm transition-all duration-300 ${shouldShowHolders ? 'text-center' : 'text-right'}`}>
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

              {/* Holders Column in League Rows */}
              {shouldShowHolders && (
                <div className="text-right text-sm hidden xl:block">
                  {isCrabAndBelow ? (
                    // For Crab, Shrimp, Shell - hide individual numbers, the overlay will show combined count
                    <span className="text-transparent">-</span>
                  ) : leagueHolderData ? (
                    <div className="flex flex-col items-end">
                      <span className="text-white">
                        {leagueHolderData.user_holders === null ? 'N/A' : leagueHolderData.user_holders.toLocaleString()}
                      </span>
                      {/* <span className={`text-xs ${
                        leagueHolderData.holder_change === -1 ? 'text-gray-400' :
                        leagueHolderData.holder_change > 0 ? 'text-green-400' : 
                        leagueHolderData.holder_change < 0 ? 'text-red-400' : 
                        'text-gray-400'
                      }`}>
                        {leagueHolderData.holder_change === -1 ? 'N/A' : 
                         leagueHolderData.holder_change === 0 ? '' : 
                         formatHolderChange(leagueHolderData.holder_change)}
                      </span> */}
                    </div>
                  ) : (
                    <span className="text-gray-400">N/A</span>
                  )}
                </div>
              )}

              </div>
            </div>
          );
        })}
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
