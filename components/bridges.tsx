'use client'

import { useMemo, useEffect, useState } from 'react'
import { CoinLogo } from '@/components/ui/CoinLogo'
import { useTokenPrices } from '@/hooks/crypto/useTokenPrices'
import { getCachedSupplies, clearTokenSuppliesCache } from '@/hooks/crypto/useBackgroundPreloader'
import { useTokenSupply } from '@/hooks/crypto/useTokenSupply'
import { useBridgeBalanceCheck } from '@/hooks/crypto/useBridgeBalanceCheck'
import { motion, AnimatePresence } from 'framer-motion'
import { TOKEN_CONSTANTS } from '@/constants/crypto'
import { getDisplayTicker } from '@/utils/ticker-display'

// Hardcoded addresses to check
const PULSECHAIN_BRIDGE_ADDRESS = '0x1715a3e4a142d8b698131108995174f37aeba10d' // PulseChain bridge address
const BSC_BRIDGE_ADDRESS = '0xB4005881e81a6eCD2C1f75D58E8e41f28D59c6b1' // BSC bridge address

export default function Bridge() {
  // Hardcoded list of ALL tokens that should appear on the bridge page
  const EXPECTED_BRIDGE_TOKENS = {
    main: ['DAI', 'eHEX', 'WETH', 'USDC', 'USDT', 'WBTC'],
    maximus: ['eMAXI', 'eDECI', 'eLUCKY', 'eTRIO', 'eBASE']
  }
  
  // All tokens we need prices for (including 'w' prefix for maximus tokens and BSC tokens)
  const ALL_PRICE_TICKERS = [
    ...EXPECTED_BRIDGE_TOKENS.main,
    ...EXPECTED_BRIDGE_TOKENS.maximus.map(token => `w${token}`),
    // BSC tokens
    'WBNB', 'BSC-USD'
  ]
  
  // Track client-side hydration to prevent hydration mismatches
  const [isClient, setIsClient] = useState(false)
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)

  // Set isClient to true after component mounts (client-side only)
  useEffect(() => {
    setIsClient(true)
  }, [])



  // Fetch balances using custom hook for PulseChain bridge
  const { balances, isLoading: balancesLoading, error: balancesError } = useBridgeBalanceCheck(PULSECHAIN_BRIDGE_ADDRESS)
  
  // Fetch BSC balances separately
  const { balances: bscBalances, isLoading: bscBalancesLoading, error: bscBalancesError } = useBridgeBalanceCheck(BSC_BRIDGE_ADDRESS)
  
  console.log('[Bridge Debug] Balance state:', {
    balancesLoading,
    balancesError: !!balancesError,
    balancesLength: balances ? balances.length : 0,
    balancesContent: balances ? balances.map(b => ({
      chain: b.chain,
      tokenCount: b.tokenBalances?.length || 0,
      tokens: b.tokenBalances?.map(t => t.symbol) || []
    })) : []
  })

  // Debug BSC specifically
  const bscBalance = bscBalances?.find(b => b.chain === 'bsc')
  console.log('[Bridge Debug] BSC Balance:', {
    hasBSC: !!bscBalance,
    bscTokenCount: bscBalance?.tokenBalances?.length || 0,
    bscTokens: bscBalance?.tokenBalances?.map(t => `${t.symbol}: ${t.balanceFormatted}`) || [],
    bscError: bscBalance?.error,
    bscAddress: BSC_BRIDGE_ADDRESS,
    allBSCBalances: bscBalances?.map(b => ({ chain: b.chain, error: b.error, tokenCount: b.tokenBalances?.length }))
  })

  // Get CST and hUSDC supply from cached supplies - only on client to prevent hydration mismatch
  const cachedSupplies = isClient ? getCachedSupplies() : null
  const cstSupplyPulseChain = cachedSupplies?.supplies?.['CST'] || 0
  
  // Use individual token supply hook for hUSDC as fallback if not in cache
  const { totalSupply: husdcFromAPI } = useTokenSupply(
    isClient && (!cachedSupplies?.supplies?.['hUSDC'] || cachedSupplies.supplies['hUSDC'] === 0) ? 'hUSDC' : null
  )
  const husdcSupplyPulseChain = cachedSupplies?.supplies?.['hUSDC'] || husdcFromAPI || 0

  console.log('[Bridge] CST supply from cache:', cstSupplyPulseChain)
  console.log('[Bridge] hUSDC supply from cache:', husdcSupplyPulseChain)
  console.log('[Bridge] Full cached supplies:', cachedSupplies)
  console.log('[Bridge] Available supply keys:', cachedSupplies?.supplies ? Object.keys(cachedSupplies.supplies) : 'No supplies')

  // Get all unique token tickers from balances for price fetching
  const allTokenTickers = useMemo(() => {
    // Always use the hardcoded list of expected tokens - no more race conditions!
    console.log('[Bridge Debug] Using hardcoded token list for price fetching:', ALL_PRICE_TICKERS)
    return ALL_PRICE_TICKERS
  }, []) // No dependencies - this list never changes

  // Fetch prices for all tokens with balances plus CST
  const { prices, isLoading: pricesLoading } = useTokenPrices(allTokenTickers)
  
  console.log('[Bridge Debug] Price fetching state:', {
    allTokenTickers,
    pricesLoading,
    pricesLoaded: prices ? Object.keys(prices).length : 0,
    prices: prices ? Object.keys(prices) : []
  })

  // Calculate total USD value from ALL tokens with balances (not just displayed ones) + CST supply value
  const { allTokensValue, cstValue, totalUsdValue } = useMemo(() => {
    // Prevent calculation on server to avoid hydration mismatch
    if (!isClient || !balances || !Array.isArray(balances)) {
      const cstVal = cstSupplyPulseChain ? cstSupplyPulseChain * 1 : 0
      const husdcVal = husdcSupplyPulseChain ? husdcSupplyPulseChain * 1 : 0
      return { allTokensValue: 0, cstValue: cstVal, husdcValue: husdcVal, totalUsdValue: cstVal + husdcVal }
    }

    // Calculate PulseChain bridge tokens value
    const pulseChainTokensValue = balances.flatMap(addressData => 
      addressData.tokenBalances?.map(token => {
        let tokenPrice = 0
        
        // Use $1 for stablecoins
        if (token.symbol === 'DAI' || token.symbol === 'USDC' || token.symbol === 'USDT') {
          tokenPrice = 1
        }
        // Use "w" prefix for Maximus tokens
        else if (EXPECTED_BRIDGE_TOKENS.maximus.includes(token.symbol)) {
          const priceTicker = `w${token.symbol}`
          tokenPrice = prices[priceTicker]?.price || 0
        }
        // Use regular ticker for other tokens
        else {
          tokenPrice = prices[token.symbol]?.price || 0
        }
        
        return token.balanceFormatted * tokenPrice
      }) || []
    ).reduce((total, value) => total + value, 0)

    // Calculate BSC bridge tokens value
    const bscTokensValue = bscBalances && Array.isArray(bscBalances) ? bscBalances.flatMap(addressData => 
      addressData.tokenBalances?.map(token => {
        let tokenPrice = 0
        
        // Use $1 for BSC-USD stablecoin
        if (token.symbol === 'BSC-USD') {
          tokenPrice = 1
        }
        // Use regular ticker for other BSC tokens (like WBNB)
        else {
          tokenPrice = prices[token.symbol]?.price || 0
        }
        
        return token.balanceFormatted * tokenPrice
      }) || []
    ).reduce((total, value) => total + value, 0) : 0

    const tokensValue = pulseChainTokensValue + bscTokensValue

    // Add CST and hUSDC value to total (both use $1 pricing)
    const cstVal = cstSupplyPulseChain ? cstSupplyPulseChain * 1 : 0
    const husdcVal = husdcSupplyPulseChain ? husdcSupplyPulseChain * 1 : 0
    const totalVal = tokensValue + cstVal + husdcVal

    return { allTokensValue: tokensValue, cstValue: cstVal, husdcValue: husdcVal, totalUsdValue: totalVal }
  }, [isClient, balances, bscBalances, prices, cstSupplyPulseChain, husdcSupplyPulseChain])

  // Simplified loading check - show content if we have meaningful data and we're on client
  const hasAnyBalanceData = isClient && balances && balances.length > 0 && balances.some(b => b.tokenBalances && b.tokenBalances.length > 0)
  const hasAnyPriceData = isClient && prices && Object.keys(prices).length > 0
  const hasCSTData = isClient && cstSupplyPulseChain > 0
  const hasHusdcData = isClient && husdcSupplyPulseChain > 0
  
  // Wait for BOTH balance data AND price data to be ready before showing content
  // This prevents the flash where CST shows first, then other tokens appear
  const hasCompleteData = hasAnyBalanceData && hasAnyPriceData
  
  // Mark as loaded once we have complete data (not just CST)
  useEffect(() => {
    if (hasCompleteData && !hasLoadedOnce) {
      console.log('[Bridge Debug] Marking as loaded - has complete data')
      setHasLoadedOnce(true)
    }
  }, [hasCompleteData, hasLoadedOnce])

  // Show loading if we don't have complete data yet
  const shouldShowLoading = !hasLoadedOnce || (!hasCompleteData && balancesLoading)

  console.log('[Bridge Debug] Loading states:', {
    isClient,
    balancesLoading,
    pricesLoading,
    hasAnyBalanceData,
    hasAnyPriceData,
    hasCSTData,
    hasCompleteData,
    hasLoadedOnce,
    shouldShowLoading,
    balancesError: !!balancesError
  })

  // Get main tokens with balances from Ethereum chain - only on client
  const mainTokensWithBalances = useMemo(() => {
    if (!isClient || !balances || !Array.isArray(balances)) return []
    
    const filteredTokens = balances.flatMap(addressData => 
      addressData.tokenBalances?.filter(token => 
        EXPECTED_BRIDGE_TOKENS.main.includes(token.symbol)
      ).map(token => ({
        ...token,
        chain: addressData.chain
      })) || []
    )
    
    console.log('[Bridge Debug] Main tokens found:', {
      expectedTokens: EXPECTED_BRIDGE_TOKENS.main,
      allTokenSymbols: balances.flatMap(b => b.tokenBalances?.map(t => t.symbol) || []),
      filteredTokens: filteredTokens.map(t => `${t.symbol}: ${t.balanceFormatted}`)
    })
    
    return filteredTokens
  }, [isClient, balances])

  // Main tokens without CST (CST gets its own section)
  const mainTokensWithoutCST = useMemo(() => {
    if (!isClient) return []
    
    console.log('[Bridge Debug] mainTokensWithoutCST created with tokens:', mainTokensWithBalances.map(t => `${t.symbol}:${t.balanceFormatted}`))
    
    return mainTokensWithBalances
  }, [isClient, mainTokensWithBalances])

  // Get Maximus tokens with balances from Ethereum chain - only on client
  const maximusTokensWithBalances = useMemo(() => {
    if (!isClient || !balances || !Array.isArray(balances)) {
      return []
    }
    
    // Only include tokens that actually have balances > 0
    const tokensWithBalances = balances.flatMap(addressData => 
      addressData.tokenBalances?.filter(token => 
        EXPECTED_BRIDGE_TOKENS.maximus.includes(token.symbol) && token.balanceFormatted > 0
      ).map(token => ({
        ...token,
        chain: addressData.chain
      })) || []
    )
    
    console.log('[Bridge Debug] maximusTokensWithBalances created with tokens:', tokensWithBalances.map(t => `${t.symbol}:${t.balanceFormatted}`))
    
    return tokensWithBalances
  }, [isClient, balances])

  // Get BSC tokens with balances - only on client
  const bscTokensWithBalances = useMemo(() => {
    if (!isClient || !bscBalances || !Array.isArray(bscBalances)) {
      return []
    }
    
    // Only include BSC tokens that actually have balances > 0 and exclude MEGALAND
    const tokensWithBalances = bscBalances.flatMap(addressData => 
      addressData.tokenBalances?.filter(token => 
        addressData.chain === 'bsc' && token.balanceFormatted > 0 && token.symbol !== 'MEGALAND'
      ).map(token => ({
        ...token,
        chain: addressData.chain
      })) || []
    )
    
    console.log('[Bridge Debug] bscTokensWithBalances created with tokens:', tokensWithBalances.map(t => `${t.symbol}:${t.balanceFormatted}`))
    
    return tokensWithBalances
  }, [isClient, bscBalances])

  // Format balance for display
  const formatBalance = (balance: number): string => {
    if (balance === 0) return '0'
    return Math.floor(balance).toLocaleString('en-US')
  }

  // Format supply for display
  const formatSupply = (supply: number): string => {
    if (supply === 0) return '0'
    
    if (supply >= 1e15) {
      const rounded = Math.round(supply / 1e15)
      return rounded >= 10 ? rounded + 'Q' : (supply / 1e15).toFixed(1) + 'Q'
    }
    if (supply >= 1e12) {
      const rounded = Math.round(supply / 1e12)
      return rounded >= 10 ? rounded + 'T' : (supply / 1e12).toFixed(1) + 'T'
    }
    if (supply >= 1e9) {
      const rounded = Math.round(supply / 1e9)
      return rounded >= 10 ? rounded + 'B' : (supply / 1e9).toFixed(1) + 'B'
    }
    return Math.round(supply).toLocaleString('en-US')
  }

  // Format address for display
  const formatAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // Helper function to get token supply from constants
  const getTokenSupply = (symbol: string): number | null => {
    const tokenConfig = TOKEN_CONSTANTS.find(token => token.ticker === symbol)
    return tokenConfig?.supply || null
  }

  // Helper function to format percentage
  const formatPercentage = (percentage: number): string => {
    if (percentage >= 10) return percentage.toFixed(0) + '%'
    if (percentage >= 1) return percentage.toFixed(1) + '%'
    if (percentage >= 0.1) return percentage.toFixed(2) + '%'
    if (percentage >= 0.01) return percentage.toFixed(3) + '%'
    return percentage.toFixed(4) + '%'
  }

  // Show loading state only on initial load if no data or not client-side yet
  if (!isClient || shouldShowLoading) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          duration: 0.5,
          delay: 0.1,
          ease: [0.23, 1, 0.32, 1]
        }}
        className="bg-black border-2 border-white/10 rounded-full p-6 text-center max-w-[660px] w-full mx-auto"
      >
        <div className="text-gray-400">
          Loading bridge data...
        </div>
      </motion.div>
    )
  }

  // Show error state if any critical errors occurred
  if (balancesError && !hasAnyBalanceData && !hasCSTData) {
    return (
      <div className="space-y-6">
        <div className="bg-black border-2 border-white/10 rounded-2xl p-6">
          <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
            Error: {balancesError?.message || balancesError || 'Failed to load data'}
          </div>
        </div>
      </div>
    )
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ 
        duration: 0.6,
        ease: [0.23, 1, 0.32, 1]
      }}
      className="space-y-6 flex flex-col items-center"
    >
      
      {/* Total Value */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ 
          duration: 0.5,
          delay: 0.1,
          ease: [0.23, 1, 0.32, 1]
        }}
        className="bg-black border-2 border-white/10 rounded-2xl p-6 text-center max-w-[460px] w-full"
      >
        <h2 className="text-2xl font-bold mb-2">Total Bridged Value</h2>
        <div className="text-3xl font-bold text-green-400">
          ${formatBalance(totalUsdValue)}
        </div>
        {pricesLoading && (
          <div className="text-xs text-gray-500 mt-1">
            Updating prices...
          </div>
        )}
      </motion.div>

      {/* Main Tokens Table */}
      {mainTokensWithoutCST.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: 0.5,
            delay: 0.15,
            ease: [0.23, 1, 0.32, 1]
          }}
          className="bg-black border-2 border-white/10 rounded-2xl p-6 max-w-[460px] w-full z-10"
        >
          <div className="text-center mb-4">
            <h3 className="text-lg font-bold text-gray-400/30">Official Bridge</h3>
          </div>
          <div className="space-y-3">
            {mainTokensWithoutCST
              .sort((a, b) => {
                const aPrice = (a.symbol === 'DAI' || a.symbol === 'USDC' || a.symbol === 'USDT') ? 1 : 
                             (prices[a.symbol]?.price || 0)
                const bPrice = (b.symbol === 'DAI' || b.symbol === 'USDC' || b.symbol === 'USDT') ? 1 : 
                             (prices[b.symbol]?.price || 0)
                const aValue = a.balanceFormatted * aPrice
                const bValue = b.balanceFormatted * bPrice
                
                // Primary sort by USD value descending
                const valueDiff = bValue - aValue
                if (Math.abs(valueDiff) > 0.01) { // If USD values differ by more than 1 cent
                  return valueDiff
                }
                
                // Secondary sort by token amount descending
                return b.balanceFormatted - a.balanceFormatted
              })
              .map((token, tokenIndex) => {
                const tokenPrice = (token.symbol === 'DAI' || token.symbol === 'USDC' || token.symbol === 'USDT') ? 1 : 
                                 (prices[token.symbol]?.price || 0)
                const usdValue = token.balanceFormatted * tokenPrice
                
                const displayAmount = formatBalance(token.balanceFormatted)
                
                return (
                <div key={`${token.chain}-${token.symbol}-${tokenIndex}`} className="flex items-center justify-between py-0">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <CoinLogo
                        symbol={token.symbol}
                        size="md"
                        className="rounded-none"
                        variant="default"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium text-sm md:text-md">
                        {displayAmount} {token.symbol}
                      </div>
                      {/* Supply percentage - small text underneath token */}
                      <div className="text-gray-400 text-[10px]">
                        {(() => {
                          const supply = getTokenSupply(token.symbol)
                          if (!supply || token.balanceFormatted === 0) return ''
                          const percentage = (token.balanceFormatted / supply) * 100
                          return formatPercentage(percentage)
                        })()}
                      </div>
                    </div>
                  </div>
                  {/* USD value only */}
                  <div className="flex items-center">
                    <div className="text-white font-medium text-sm md:text-lg">
                      ${formatBalance(usdValue)}
                    </div>
                  </div>
                </div>
              )})}
          </div>
        </motion.div>
      )}

      {/* Maximus Tokens Table */}
      {maximusTokensWithBalances.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: -38 }}
          transition={{ 
            duration: 0.5,
            delay: 0.18,
            ease: [0.23, 1, 0.32, 1]
          }}
          className="bg-black border-2 border-white/10 rounded-b-2xl p-6 max-w-[330px] md:max-w-[440px]  w-full relative"
        >
          <div className="space-y-1">
            {maximusTokensWithBalances
              .sort((a, b) => {
                const aPriceTicker = `w${a.symbol}`
                const bPriceTicker = `w${b.symbol}`
                const aPrice = prices[aPriceTicker]?.price || 0
                const bPrice = prices[bPriceTicker]?.price || 0
                const aValue = a.balanceFormatted * aPrice
                const bValue = b.balanceFormatted * bPrice
                
                // Primary sort by USD value descending
                const valueDiff = bValue - aValue
                if (Math.abs(valueDiff) > 0.01) { // If USD values differ by more than 1 cent
                  return valueDiff
                }
                
                // Secondary sort by token amount descending
                return b.balanceFormatted - a.balanceFormatted
              })
              .map((token, tokenIndex) => {
                const priceTicker = `w${token.symbol}`
                const tokenPrice = prices[priceTicker]?.price || 0
                const usdValue = token.balanceFormatted * tokenPrice
                
                const displayAmount = formatBalance(token.balanceFormatted)
                
                return (
                <div key={`${token.chain}-${token.symbol}-${tokenIndex}`} className="flex items-center justify-between py-1">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <CoinLogo
                        symbol={token.symbol}
                        size="md"
                        className="rounded-none"
                        variant="default"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium text-sm md:text-md">
                        {displayAmount} {token.symbol}
                      </div>
                      {/* Supply percentage - small text underneath token */}
                      <div className="text-gray-400 text-[10px]">
                        {(() => {
                          const supply = getTokenSupply(token.symbol)
                          if (!supply || token.balanceFormatted === 0) return ''
                          const percentage = (token.balanceFormatted / supply) * 100
                          return formatPercentage(percentage)
                        })()}
                      </div>
                    </div>
                  </div>
                  {/* USD value only */}
                  <div className="flex items-center">
                    <div className="text-white font-medium text-sm md:text-lg">
                      {tokenPrice > 0 ? `$${formatBalance(usdValue)}` : '--'}
                    </div>
                  </div>
                </div>
              )})}
          </div>
        </motion.div>
      )}

      {/* CST Section */}
      {isClient && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: -38 }}
          transition={{ 
            duration: 0.5,
            delay: 0.25,
            ease: [0.23, 1, 0.32, 1]
          }}
          className="bg-black border-2 border-white/10 rounded-2xl p-6 max-w-[460px] w-full"
        >
          <div className="text-center mb-4">
            <h3 className="text-lg font-bold text-gray-400/30">0xCoast</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-0">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <CoinLogo
                    symbol="CST"
                    size="md"
                    className="rounded-none"
                    variant="default"
                  />
                </div>
                <div className="flex flex-col">
                  <div className="text-white font-medium text-sm md:text-md">
                    {cstSupplyPulseChain ? formatSupply(cstSupplyPulseChain) : 'Loading...'} CST
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white font-medium text-sm md:text-lg">
                  ${cstSupplyPulseChain ? (cstSupplyPulseChain * 1).toLocaleString('en-US', { maximumFractionDigits: 0 }) : '0'}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

    
      {/* BSC Tokens Table - Binance Bridge Stuff */}
      {(bscTokensWithBalances.length > 0 || bscBalance) && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: -38 }}
          transition={{ 
            duration: 0.5,
            delay: 0.3,
            ease: [0.23, 1, 0.32, 1]
          }}
          className="bg-black border-2 border-white/10 rounded-2xl p-6 max-w-[460px] w-full"
        >
          <div className="text-center mb-4">
            <h3 className="text-lg font-bold text-gray-400/30">Tokens Express (Binance Bridge)</h3>
            {bscBalance && bscTokensWithBalances.length === 0 && (
              <div className="text-sm text-gray-400 mt-2">
                No BSC tokens found for this address
                {bscBalance.error && <div className="text-red-400">Error: {bscBalance.error}</div>}
              </div>
            )}
          </div>
          <div className="space-y-1">
            {bscTokensWithBalances
              .sort((a, b) => {
                let aPrice = 0
                let bPrice = 0
                
                // Use $1 for stablecoins
                if (a.symbol === 'DAI' || a.symbol === 'USDC' || a.symbol === 'USDT' || a.symbol === 'BSC-USD') {
                  aPrice = 1
                } else {
                  aPrice = prices[a.symbol]?.price || 0
                }
                
                if (b.symbol === 'DAI' || b.symbol === 'USDC' || b.symbol === 'USDT' || b.symbol === 'BSC-USD') {
                  bPrice = 1
                } else {
                  bPrice = prices[b.symbol]?.price || 0
                }
                
                const aValue = a.balanceFormatted * aPrice
                const bValue = b.balanceFormatted * bPrice
                
                // Primary sort by USD value descending
                const valueDiff = bValue - aValue
                if (Math.abs(valueDiff) > 0.01) { // If USD values differ by more than 1 cent
                  return valueDiff
                }
                
                // Secondary sort by token amount descending
                return b.balanceFormatted - a.balanceFormatted
              })
              .map((token, tokenIndex) => {
                let tokenPrice = 0
                
                // Use $1 for stablecoins
                if (token.symbol === 'DAI' || token.symbol === 'USDC' || token.symbol === 'USDT' || token.symbol === 'BSC-USD') {
                  tokenPrice = 1
                } else {
                  tokenPrice = prices[token.symbol]?.price || 0
                }
                
                const usdValue = token.balanceFormatted * tokenPrice
                const displayAmount = formatBalance(token.balanceFormatted)
                
                return (
                <div key={`${token.chain}-${token.symbol}-${tokenIndex}`} className="flex items-center justify-between py-1">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <CoinLogo
                        symbol={token.symbol}
                        size="md"
                        className="rounded-none"
                        variant="default"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white font-medium text-sm md:text-md">
                        {displayAmount} {token.symbol}
                      </div>
                      {/* Supply percentage - small text underneath token */}
                      <div className="text-gray-400 text-[10px]">
                        {(() => {
                          const supply = getTokenSupply(token.symbol)
                          if (!supply || token.balanceFormatted === 0) return ''
                          const percentage = (token.balanceFormatted / supply) * 100
                          return formatPercentage(percentage)
                        })()}
                      </div>
                    </div>
                  </div>
                  {/* USD value only */}
                  <div className="flex items-center">
                    <div className="text-white font-medium text-sm md:text-lg">
                      ${formatBalance(usdValue)}
                    </div>
                  </div>
                </div>
              )})}
          </div>
        </motion.div>
      )}

      {/* hUSDC Supply Section */}
      {isClient && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: -38 }}
          transition={{ 
            duration: 0.5,
            delay: 0.35,
            ease: [0.23, 1, 0.32, 1]
          }}
          className="bg-black border-2 border-white/10 rounded-2xl p-6 max-w-[460px] w-full"
        >
          <div className="text-center mb-4">
            <h3 className="text-lg font-bold text-gray-400/30">Hyperlane</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-0">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  <CoinLogo
                    symbol="USDC"
                    size="md"
                  />
                </div>
                <div className="flex flex-col">
                  <div className="text-white font-medium text-sm md:text-md">
                    {husdcSupplyPulseChain ? formatSupply(husdcSupplyPulseChain) : 'Loading...'} hUSDC
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-white font-medium text-sm md:text-lg">
                  ${husdcSupplyPulseChain ? (husdcSupplyPulseChain * 1).toLocaleString('en-US', { maximumFractionDigits: 0 }) : '0'}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}


    </motion.div>
  )
} 
