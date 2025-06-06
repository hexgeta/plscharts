'use client'

import { useMemo, useEffect, useState } from 'react'
import { CoinLogo } from '@/components/ui/CoinLogo'
import { useTokenPrices } from '@/hooks/crypto/useTokenPrices'
import { useTokenSupply } from '@/hooks/crypto/useTokenSupply'
import { useBridgeBalanceCheck } from '@/hooks/crypto/useBridgeBalanceCheck'
import { motion, AnimatePresence } from 'framer-motion'
import { TOKEN_CONSTANTS } from '@/constants/crypto'

// Hardcoded address to check
const HARDCODED_ADDRESS = '0x1715a3e4a142d8b698131108995174f37aeba10d'

export default function Bridge() {
  // Priority tokens to display
  const MAIN_TOKENS = ['DAI', 'eHEX', 'WETH', 'USDC', 'CST', 'USDT', 'WBTC']
  const MAXIMUS_TOKENS = ['eMAXI', 'eDECI', 'eLUCKY', 'eTRIO', 'eBASE']
  const [isInitialLoad, setIsInitialLoad] = useState(true)

  useEffect(() => {
    console.log('[Bridge Component] Mounted/Re-rendered')
  }, [])

  // Fetch balances using custom hook
  const { balances, isLoading: balancesLoading, error: balancesError } = useBridgeBalanceCheck(HARDCODED_ADDRESS)

  // Fetch CST supply using existing hook (CST is on PulseChain, chain 369)
  const { totalSupply: cstSupplyPulseChain, loading: cstSupplyLoading, error: cstSupplyError } = useTokenSupply('CST')

  // Get all unique token tickers from balances for price fetching
  const allTokenTickers = useMemo(() => {
    if (!balances || !Array.isArray(balances)) return ['CST']
    
    const balanceTokens = balances.flatMap(addressData => 
      addressData.tokenBalances?.map(token => {
        // Add "w" prefix for Maximus tokens when fetching prices
        if (MAXIMUS_TOKENS.includes(token.symbol)) {
          return `w${token.symbol}`
        }
        return token.symbol
      }) || []
    ).filter((ticker, index, array) => array.indexOf(ticker) === index) // Remove duplicates

    // Add CST to price fetching if not already included
    return [...new Set([...balanceTokens, 'CST'])]
  }, [balances])

  // Fetch prices for all tokens with balances plus CST
  const { prices, isLoading: pricesLoading } = useTokenPrices(allTokenTickers)

  // Calculate total USD value from ALL tokens with balances (not just displayed ones) + CST supply value
  const { allTokensValue, cstValue, totalUsdValue } = useMemo(() => {
    if (!balances || !Array.isArray(balances)) {
      const cstVal = cstSupplyPulseChain ? cstSupplyPulseChain * 1 : 0
      return { allTokensValue: 0, cstValue: cstVal, totalUsdValue: cstVal }
    }

    const tokensValue = balances.flatMap(addressData => 
      addressData.tokenBalances?.map(token => {
        let tokenPrice = 0
        
        // Use $1 for stablecoins
        if (token.symbol === 'DAI' || token.symbol === 'USDC' || token.symbol === 'USDT') {
          tokenPrice = 1
        }
        // Use "w" prefix for Maximus tokens
        else if (MAXIMUS_TOKENS.includes(token.symbol)) {
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

    // Add CST value to total (CST supply × $1)
    const cstVal = cstSupplyPulseChain ? cstSupplyPulseChain * 1 : 0
    const totalVal = tokensValue + cstVal

    return { allTokensValue: tokensValue, cstValue: cstVal, totalUsdValue: totalVal }
  }, [balances, prices, cstSupplyPulseChain])

  // Comprehensive loading state - wait for ALL data to be ready
  const isEverythingReady = !balancesLoading && 
                           !cstSupplyLoading && 
                           !pricesLoading && 
                           !balancesError && 
                           !cstSupplyError &&
                           balances.length > 0 &&
                           cstSupplyPulseChain !== undefined &&
                           prices &&
                           Object.keys(prices).length > 0

  // Get main tokens with balances from Ethereum chain
  const mainTokensWithBalances = useMemo(() => {
    if (!balances || !Array.isArray(balances)) return []
    
    return balances.flatMap(addressData => 
      addressData.tokenBalances?.filter(token => 
        MAIN_TOKENS.includes(token.symbol)
      ).map(token => ({
        ...token,
        chain: addressData.chain
      })) || []
    )
  }, [balances])

  // Add CST entry even if no balance (for supply display)
  const mainTokensWithCST = useMemo(() => [
    ...mainTokensWithBalances,
    // Add CST entry if not already present
    ...(mainTokensWithBalances.find(token => token.symbol === 'CST') ? [] : [{
      address: '0x0', // Placeholder address
      symbol: 'CST',
      name: 'Cryptoshares',
      balance: '0',
      balanceFormatted: 0,
      decimals: 18,
      isNative: false,
      chain: 'ethereum' as const
    }])
  ], [mainTokensWithBalances])

  // Get Maximus tokens with balances from Ethereum chain
  const maximusTokensWithBalances = useMemo(() => {
    if (!balances || !Array.isArray(balances)) return []
    
    return balances.flatMap(addressData => 
      addressData.tokenBalances?.filter(token => 
        MAXIMUS_TOKENS.includes(token.symbol)
      ).map(token => ({
        ...token,
        chain: addressData.chain
      })) || []
    )
  }, [balances])

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

  // Effect to handle initial load completion
  useEffect(() => {
    if (isEverythingReady && isInitialLoad) {
      setIsInitialLoad(false)
    }
  }, [isEverythingReady, isInitialLoad])

  // Show loading state only on initial load
  if (!isEverythingReady && isInitialLoad) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          duration: 0.5,
          delay: 0.2,
          ease: [0.23, 1, 0.32, 1]
        }}
        className="bg-black border-2 border-white/10 rounded-2xl p-6 text-center max-w-[660px] w-full mx-auto"
      >
        <div className="text-gray-400">Loading bridge data...</div>
      </motion.div>
    )
  }

  // Show error state if any critical errors occurred
  if (balancesError || cstSupplyError) {
    return (
      <div className="space-y-6">
        <div className="bg-black border-2 border-white/10 rounded-2xl p-6">
          <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
            Error: {balancesError?.message || balancesError || cstSupplyError || 'Failed to load data'}
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
      </motion.div>

      {/* Main Tokens Table */}
      {mainTokensWithCST.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: 0.5,
            delay: 0.2,
            ease: [0.23, 1, 0.32, 1]
          }}
          className="bg-black border-2 border-white/10 rounded-2xl p-6 max-w-[460px] w-full"
        >
          <div className="space-y-3">
            {mainTokensWithCST
              .sort((a, b) => {
                const aPrice = (a.symbol === 'DAI' || a.symbol === 'USDC' || a.symbol === 'USDT') ? 1 : 
                             (a.symbol === 'CST') ? 1 : 
                             (prices[a.symbol]?.price || 0)
                const bPrice = (b.symbol === 'DAI' || b.symbol === 'USDC' || b.symbol === 'USDT') ? 1 : 
                             (b.symbol === 'CST') ? 1 : 
                             (prices[b.symbol]?.price || 0)
                const aValue = a.symbol === 'CST' ? 
                             (cstSupplyPulseChain ? cstSupplyPulseChain * 1 : 0) : 
                             (a.balanceFormatted * aPrice)
                const bValue = b.symbol === 'CST' ? 
                             (cstSupplyPulseChain ? cstSupplyPulseChain * 1 : 0) : 
                             (b.balanceFormatted * bPrice)
                
                // Primary sort by USD value descending
                const valueDiff = bValue - aValue
                if (Math.abs(valueDiff) > 0.01) { // If USD values differ by more than 1 cent
                  return valueDiff
                }
                
                // Secondary sort by token amount descending
                const aAmount = a.symbol === 'CST' ? 
                              (cstSupplyPulseChain || 0) : 
                              a.balanceFormatted
                const bAmount = b.symbol === 'CST' ? 
                              (cstSupplyPulseChain || 0) : 
                              b.balanceFormatted
                return bAmount - aAmount
              })
              .map((token, tokenIndex) => {
                const tokenPrice = (token.symbol === 'DAI' || token.symbol === 'USDC' || token.symbol === 'USDT') ? 1 : 
                                 (token.symbol === 'CST') ? 1 : 
                                 (prices[token.symbol]?.price || 0)
                const usdValue = token.symbol === 'CST' ? 
                               (cstSupplyPulseChain ? cstSupplyPulseChain * 1 : 0) : 
                               (token.balanceFormatted * tokenPrice)
                
                const displayAmount = token.symbol === 'CST' ? (
                  cstSupplyLoading ? 'Loading...' : 
                  cstSupplyError ? 'Error' : 
                  cstSupplyPulseChain ? formatSupply(cstSupplyPulseChain) : 'N/A'
                ) : (
                  formatBalance(token.balanceFormatted)
                )
                
                return (
                <div key={`${token.chain}-${token.symbol}-${tokenIndex}`} className="flex items-top justify-between py-0">
                  <div className="flex items-top space-x-3">
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
                  <div className="flex items-top">
                    <div className="text-white font-medium text-sm md:text-lg">
                      ${formatBalance(usdValue)}
                    </div>
                  </div>
                </div>
              )})}
          </div>
        </motion.div>
      )}

      {mainTokensWithCST.length === 0 && !balancesLoading && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: 0.5,
            delay: 0.3,
            ease: [0.23, 1, 0.32, 1]
          }}
          className="bg-black border-2 border-white/10 rounded-2xl p-6 text-center max-w-[460px] w-full"
        >
          <div className="text-gray-400">
            No main tokens found with balance &gt; 0
          </div>
        </motion.div>
      )}

      {/* Maximus Tokens Table */}
      {maximusTokensWithBalances.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: 0.5,
            delay: 0.4,
            ease: [0.23, 1, 0.32, 1]
          }}
          className="bg-black border-2 border-white/10 rounded-2xl p-6 max-w-[460px] w-full"
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
                <div key={`${token.chain}-${token.symbol}-${tokenIndex}`} className="flex items-top justify-between py-1">
                  <div className="flex items-top space-x-3">
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
                  <div className="flex items-top">
                    <div className="text-white font-medium text-sm md:text-lg">
                      ${formatBalance(usdValue)}
                    </div>
                  </div>
                </div>
              )})}
          </div>
        </motion.div>
      )}

      {maximusTokensWithBalances.length === 0 && !balancesLoading && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: 0.5,
            delay: 0.5,
            ease: [0.23, 1, 0.32, 1]
          }}
          className="bg-black border-2 border-white/10 rounded-2xl p-6 text-center max-w-[460px] w-full"
        >
          <div className="text-gray-400">
            No Maximus tokens found with balance &gt; 0
          </div>
        </motion.div>
      )}
    </motion.div>
  )
} 
