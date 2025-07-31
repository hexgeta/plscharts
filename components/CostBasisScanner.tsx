'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePortfolioBalance } from '@/hooks/crypto/usePortfolioBalance'
import { useTokenPrices } from '@/hooks/crypto/useTokenPrices'
import { useMaxiTokenData } from '@/hooks/crypto/useMaxiTokenData'
import { useEnrichedTransactions } from '@/hooks/crypto/useEnrichedTransactions'
import { usePulseXHistoricPrices } from '@/hooks/crypto/usePulseXHistoricPrices'
import { Button } from '@/components/ui/button'

import { CoinLogo } from '@/components/ui/CoinLogo'
import { TOKEN_CONSTANTS } from '@/constants/crypto'
import { getDisplayTicker } from '@/utils/ticker-display'

interface ScannedAddress {
  address: string
  label: string
  id: string
}

interface CostBasisData {
  symbol: string
  totalTokens: number
  totalCostUSD: number
  avgCostBasis: number | null  // null when no historic price data available
  currentPrice: number
  currentValue: number
  gainLoss: number
  gainLossPercent: number
}

export default function CostBasisScanner() {
  const router = useRouter()
  const [addressInput, setAddressInput] = useState('')
  const [addresses, setAddresses] = useState<ScannedAddress[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loadingDots, setLoadingDots] = useState(0)
  const [debugLogs, setDebugLogs] = useState<string[]>([])
  const [showDebugLogs, setShowDebugLogs] = useState(false)
  const [pauseDebugLogs, setPauseDebugLogs] = useState(false)

  // Get address strings for balance fetching
  const addressStrings = useMemo(() => {
    return addresses.map(addr => addr.address)
  }, [addresses])

  // Fetch balances
  const { balances, isLoading, error: balanceError } = usePortfolioBalance(addressStrings)

  // Fetch enriched transactions for cost basis calculation (first address only for now)
  const primaryAddress = addresses[0]?.address || ''
  const { transactions: enrichedTransactions, tokenSummary, isLoading: transactionsLoading, error: transactionsError, pricesProgress, debugLogs: hookDebugLogs } = useEnrichedTransactions(primaryAddress)

  // Sync debug logs from hook (only when not paused)
  useEffect(() => {
    if (hookDebugLogs && hookDebugLogs.length > 0 && !pauseDebugLogs) {
      setDebugLogs(hookDebugLogs)
    }
  }, [hookDebugLogs, pauseDebugLogs])

  // Historic price functionality
  const { fetchHistoricPrice, isLoading: historicPriceLoading, error: historicPriceError } = usePulseXHistoricPrices()
  const [priceTestResult, setPriceTestResult] = useState<string>('')

  // Test function for historic prices
  const testHistoricPrice = useCallback(async () => {
    try {
      setPriceTestResult('Testing...')
      // Test with PEPE token at a specific date (Sept 26, 2024)
      const testTokenAddress = '0x0000d6f2d6f7d2e6adc38f70d0a3e7143aba7be7'
      const testTimestamp = Math.floor(new Date('2024-09-26').getTime() / 1000)
      
      const price = await fetchHistoricPrice(testTokenAddress, testTimestamp)
      if (price) {
        setPriceTestResult(`✅ Historic price found: $${price.toExponential(4)} for PEPE on Sept 26, 2024`)
      } else {
        setPriceTestResult('❌ No historic price found')
      }
    } catch (error) {
      setPriceTestResult(`❌ Error: ${error}`)
    }
  }, [fetchHistoricPrice])

  // Get all unique token tickers from balances
  const allTokenTickers = useMemo(() => {
    if (!balances || !Array.isArray(balances)) return []
    
    const tokens = balances.flatMap(addressData => {
      const chainTokens = [addressData.nativeBalance.symbol]
      addressData.tokenBalances?.forEach(token => chainTokens.push(token.symbol))
      return chainTokens
    })
    
    // Always include base tokens
    const baseTokens = ['PLS', 'PLSX', 'HEX', 'eHEX', 'ETH', 'USDC', 'DAI', 'USDT']
    const allTickers = [...new Set([...tokens, ...baseTokens])]
    
    return allTickers.sort()
  }, [balances])

  // Fetch prices for all tokens
  const { prices: rawPrices, isLoading: pricesLoading } = useTokenPrices(allTokenTickers)

  // Fetch MAXI token backing data
  const { data: maxiData, isLoading: maxiLoading, error: maxiError, getBackingPerToken } = useMaxiTokenData()

  // Stabilize prices reference
  const prices = useMemo(() => {
    return rawPrices || {}
  }, [rawPrices])

  // Helper functions (copied from Portfolio)
  const isStablecoin = useCallback((symbol: string): boolean => {
    const stablecoins = [
      'weDAI', 'weUSDC', 'weUSDT', 'weUSDL',
      'USDC', 'USDT', 'DAI', 'BUSD', 'TUSD', 'USDP', 'LUSD', 'GUSD',
      'CST', 'USDL'
    ]
    return stablecoins.includes(symbol)
  }, [])

  const shouldUseBackingPrice = useCallback((symbol: string): boolean => {
    const backingTokens = ['MAXI', 'DECI', 'LUCKY', 'TRIO', 'BASE', 'eMAXI', 'eDECI', 'weMAXI', 'weDECI']
    return backingTokens.includes(symbol)
  }, [])

  // Helper function to get token price
  const getTokenPrice = useCallback((symbol: string): number => {
    // Stablecoins are always $1
    if (isStablecoin(symbol)) return 1
    
    // Check if this token should use backing price (always false for scanner)
    const useBackingPrice = false // Scanner doesn't use backing prices
    if (useBackingPrice && shouldUseBackingPrice(symbol)) {
      const backingPerToken = getBackingPerToken(symbol)
      
      if (backingPerToken !== null) {
        if (symbol.startsWith('e') || symbol.startsWith('we')) {
          const eHexPrice = prices['eHEX']?.price || 0
          return eHexPrice * backingPerToken
        } else {
          const hexPrice = prices['HEX']?.price || 0
          return hexPrice * backingPerToken
        }
      }
    }
    
    // Use market price
    return prices[symbol]?.price || 0
  }, [isStablecoin, shouldUseBackingPrice, prices, getBackingPerToken])

  // Format balance for display
  const formatBalance = (balance: number): string => {
    if (balance === 0) return '0'
    
    // For very small dust amounts, use scientific notation
    if (balance > 0 && balance < 0.01) {
      return balance.toExponential(2)
    }
    
    if (balance >= 1e15) return (balance / 1e15).toFixed(1) + 'Q' // Quadrillion
    if (balance >= 1e12) return (balance / 1e12).toFixed(1) + 'T' // Trillion
    if (balance >= 1e9) return (balance / 1e9).toFixed(1) + 'B'   // Billion
    if (balance >= 1e6) return (balance / 1e6).toFixed(1) + 'M'   // Million
    if (balance < 10) return balance.toFixed(2)
    return Math.floor(balance).toLocaleString('en-US')
  }

  // Format dollar values for display
  const formatDollarValue = (dollarAmount: number): string => {
    if (dollarAmount === 0) return '0.00'
    
    // For very small dust amounts, just show 0.00 instead of scientific notation
    if (dollarAmount > 0 && dollarAmount < 0.01) {
      return '0.00'
    }
    
    // Show full number with commas and no decimal places
    return Math.round(dollarAmount).toLocaleString('en-US')
  }

  // Helper function to format price to 3 significant figures
  const formatPrice = (price: number): string => {
    if (price === 0) return '$0.00'
    
    // Convert to string to count significant figures
    const str = price.toString()
    const exp = Math.floor(Math.log10(Math.abs(price)))
    const mantissa = price / Math.pow(10, exp)
    
    // Round to 3 significant figures
    const rounded = Math.round(mantissa * 100) / 100
    const result = rounded * Math.pow(10, exp)
    
    // Format based on the magnitude
    if (result >= 1) {
      return `$${result.toPrecision(3)}`
    } else {
      // For numbers less than 1, we need to handle decimal places carefully
      const decimals = Math.max(0, 2 - exp)
      return `$${result.toPrecision(3)}`
    }
  }

  // Historic price fetching is now handled by useEnrichedTransactions hook

  // Calculate cost basis from enriched transaction history
  const costBasisData = useMemo(() => {
    if (!enrichedTransactions || !balances || !tokenSummary) {
      console.log('[CostBasisScanner] Missing data for cost basis calculation:', {
        enrichedTransactions: !!enrichedTransactions,
        balances: !!balances,
        tokenSummary: !!tokenSummary
      })
      return []
    }

    console.log('[CostBasisScanner] Calculating cost basis from enriched transactions:', enrichedTransactions.length)
    console.log('[CostBasisScanner] Token summary from transactions:', tokenSummary.length)
    console.log('[CostBasisScanner] Token summary details:', tokenSummary.map(t => ({symbol: t.symbol, totalBought: t.totalBought, avgBuyPrice: t.avgBuyPrice})))
    
    // Group current balances by symbol
    const currentBalances = new Map<string, number>()
    
    balances.forEach(addressData => {
      if (addressData.chain === 369) { // PulseChain only
        // Native balance
        if (addressData.nativeBalance?.balanceFormatted > 0) {
          const symbol = addressData.nativeBalance.symbol
          currentBalances.set(symbol, (currentBalances.get(symbol) || 0) + addressData.nativeBalance.balanceFormatted)
        }
        
        // Token balances
        addressData.tokenBalances?.forEach(token => {
          if (token.balanceFormatted > 0) {
            currentBalances.set(token.symbol, (currentBalances.get(token.symbol) || 0) + token.balanceFormatted)
          }
        })
      }
    })

    // Create cost basis data using transaction history where available
    const costBasisMap = new Map<string, CostBasisData>()
    
    // First, add tokens from transaction history with actual cost basis
    tokenSummary.forEach(tokenTx => {
      const currentBalance = currentBalances.get(tokenTx.symbol) || 0
      const currentPrice = getTokenPrice(tokenTx.symbol)
      const currentValue = currentBalance * currentPrice
      
      // Use actual cost basis from transactions, or null if no historic price available
      const avgCostBasis = tokenTx.avgBuyPrice || null
      const totalCostUSD = avgCostBasis ? currentBalance * avgCostBasis : 0
      const gainLoss = avgCostBasis ? currentValue - totalCostUSD : 0
      const gainLossPercent = totalCostUSD > 0 ? (gainLoss / totalCostUSD) * 100 : 0
      
      costBasisMap.set(tokenTx.symbol, {
        symbol: tokenTx.symbol,
        totalTokens: currentBalance,
        totalCostUSD,
        avgCostBasis,
        currentPrice,
        currentValue,
        gainLoss,
        gainLossPercent
      })
    })
    
    // Then add remaining tokens from current balances (without transaction history)
    currentBalances.forEach((balance, symbol) => {
      if (!costBasisMap.has(symbol)) {
        const currentPrice = getTokenPrice(symbol)
        const currentValue = balance * currentPrice
        
        // No transaction history available - mark cost basis as unknown
        const avgCostBasis = null
        const totalCostUSD = 0
        const gainLoss = 0
        const gainLossPercent = 0
        
        costBasisMap.set(symbol, {
          symbol,
          totalTokens: balance,
          totalCostUSD,
          avgCostBasis,
          currentPrice,
          currentValue,
          gainLoss,
          gainLossPercent
        })
      }
    })

    return Array.from(costBasisMap.values()).sort((a, b) => b.currentValue - a.currentValue)
  }, [enrichedTransactions, balances, tokenSummary, getTokenPrice])

  // Calculate total portfolio metrics
  const portfolioMetrics = useMemo(() => {
    const totalCurrentValue = costBasisData.reduce((sum, item) => sum + item.currentValue, 0)
    const totalCostBasis = costBasisData.reduce((sum, item) => sum + item.totalCostUSD, 0)
    const totalGainLoss = totalCurrentValue - totalCostBasis
    const totalGainLossPercent = totalCostBasis > 0 ? (totalGainLoss / totalCostBasis) * 100 : 0

    return {
      totalCurrentValue,
      totalCostBasis,
      totalGainLoss,
      totalGainLossPercent
    }
  }, [costBasisData])

  // Validate Ethereum address format
  const isValidAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  }

  // Parse multiple addresses from various formats
  const parseAddresses = (text: string) => {
    const cleaned = text.trim()
    if (!cleaned) return { valid: [], invalid: [] }

    const potentialAddresses = cleaned
      .split(/[\n\r,;|\s\t]+/)
      .map(addr => addr.trim())
      .filter(addr => addr.length > 0)

    const valid: string[] = []
    const invalid: string[] = []

    potentialAddresses.forEach(addr => {
      const cleanAddr = addr.replace(/[^0-9a-fA-Fx]/g, '')
      
      if (isValidAddress(cleanAddr)) {
        if (!valid.includes(cleanAddr)) {
          valid.push(cleanAddr)
        }
      } else if (addr.length > 0) {
        invalid.push(addr)
      }
    })

    return { valid, invalid }
  }

  // Auto-process addresses when input changes
  useEffect(() => {
    const { valid, invalid } = parseAddresses(addressInput)
    
    if (valid.length === 0) {
      if (addressInput.trim() && invalid.length > 0) {
        setError('No valid addresses found')
      } else {
        setError(null)
      }
      setAddresses([])
      return
    }

    // Create address objects
    const newAddresses: ScannedAddress[] = valid.map((addr, index) => ({
      address: addr,
      label: `Address ${index + 1}`,
      id: `${Date.now()}-${index}`
    }))

    setAddresses(newAddresses)
    
    // Show warning about invalid addresses if any
    if (invalid.length > 0) {
      setError(`Processing ${valid.length} valid address${valid.length > 1 ? 'es' : ''}, skipped ${invalid.length} invalid`)
      setTimeout(() => setError(null), 4000)
    } else {
      setError(null)
    }
  }, [addressInput])

  // Handle check another address - scroll to top and reset
  const handleCheckAnotherAddress = () => {
    setAddresses([])
    setAddressInput('')
    setError(null)
    // Smooth scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Progress tracking for loading states
  const loadingProgress = useMemo(() => {
    if (addresses.length === 0) return { percentage: 0, currentStep: '', steps: [], historicPriceProgress: null }
    
    const steps = [
      { name: 'Loading portfolio balances', completed: !isLoading },
      { name: 'Fetching current token prices', completed: !pricesLoading },
      { name: 'Loading MAXI backing data', completed: !maxiLoading },
      { name: 'Analyzing transaction history', completed: !transactionsLoading && !pricesProgress },
    ]
    
    // Add historic price fetching step if in progress
    if (pricesProgress) {
      steps.push({ 
        name: `Fetching historic prices (${pricesProgress.fetched}/${pricesProgress.total})`, 
        completed: false 
      })
    }
    
    const completedSteps = steps.filter(step => step.completed).length
    const totalSteps = steps.length
    const percentage = Math.round((completedSteps / totalSteps) * 100)
    
    let currentStep = steps.find(step => !step.completed)?.name || 'Finalizing cost basis analysis'
    
    // If we're fetching historic prices, show more detail
    if (pricesProgress) {
      currentStep = `Fetching historic prices for transactions (${pricesProgress.percentage}% complete)`
    }
    
    return { 
      percentage, 
      currentStep, 
      steps, 
      completedSteps, 
      totalSteps,
      historicPriceProgress: pricesProgress
    }
  }, [addresses.length, isLoading, pricesLoading, maxiLoading, transactionsLoading, pricesProgress])

  // Comprehensive loading state - wait for all data to be ready
  const isFullyLoading = useMemo(() => {
    // If no addresses loaded yet, not loading
    if (addresses.length === 0) return false
    
    // Check if any data is still loading
    return isLoading || pricesLoading || maxiLoading || transactionsLoading
  }, [addresses.length, isLoading, pricesLoading, maxiLoading, transactionsLoading])

  // Data is ready when we have addresses, no loading states, and no errors
  const isDataReady = useMemo(() => {
    return addresses.length > 0 && !isFullyLoading && !balanceError && !transactionsError
  }, [addresses.length, isFullyLoading, balanceError, transactionsError])

  // Animate loading dots when loading
  useEffect(() => {
    if (!isFullyLoading) return

    const interval = setInterval(() => {
      setLoadingDots(prev => prev === 3 ? 0 : prev + 1)
    }, 300)

    return () => clearInterval(interval)
  }, [isFullyLoading])

  return (
    <div className="space-y-6">
      {/* Address Input Section - Hidden when addresses are loaded */}
      {addresses.length === 0 && (
        <div className="p-4">
        <div className="space-y-4">
          <div>
            <textarea
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              placeholder="0xaf10cc6c50defff901b535691550d7af208939c5"
              className="w-full h-12 px-4 py-3 bg-transparent border-2 border-white/20 rounded-full text-white placeholder-gray-500/70 focus:border-white/70 focus:outline-none focus:placeholder-gray-500/50 transition-colors resize-none"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">
              ❌ {error}
            </div>
          )}
        </div>
      </div>
      )}

      {/* Loading Section with Progress */}
      {isFullyLoading && (
        <div className="flex justify-center">
          <div className="bg-black border-2 border-white/10 rounded-2xl p-6 text-center max-w-[660px] w-full">
            {/* Progress Header */}
            <div className="text-white font-medium mb-4">
              Cost Basis Analysis Progress
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-800 rounded-full h-3 mb-4">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${loadingProgress.percentage}%` }}
              ></div>
            </div>
            
            {/* Progress Details */}
            <div className="text-white text-sm mb-2">
              {loadingProgress.percentage}% Complete ({loadingProgress.completedSteps}/{loadingProgress.totalSteps} steps)
            </div>
            
            {/* Current Step */}
            <div className="text-blue-300 text-sm mb-4">
              {loadingProgress.currentStep}<span className="inline-block w-[24px] text-left">{'.'.repeat(loadingDots)}</span>
            </div>
            
            {/* Step Details */}
            <div className="space-y-2 text-xs">
              {loadingProgress.steps.map((step, index) => (
                <div key={index} className={`flex items-center justify-between p-2 rounded ${step.completed ? 'bg-green-900/30 text-green-300' : 'bg-gray-800/50 text-gray-400'}`}>
                  <span className="flex items-center">
                    <span className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center ${step.completed ? 'bg-green-500' : 'bg-gray-600'}`}>
                      {step.completed ? '✓' : index + 1}
                    </span>
                    {step.name}
                  </span>
                  <span className={`text-xs ${step.completed ? 'text-green-400' : 'text-gray-500'}`}>
                    {step.completed ? 'Done' : 'Loading...'}
                  </span>
                </div>
              ))}
            </div>
            
            {/* Historic Price Progress Details */}
            {loadingProgress.historicPriceProgress && (
              <div className="mt-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded">
                <div className="text-blue-300 text-xs font-medium mb-2">Historic Price Fetching</div>
                <div className="w-full bg-blue-900/30 rounded-full h-2 mb-2">
                  <div 
                    className="bg-blue-400 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${loadingProgress.historicPriceProgress.percentage}%` }}
                  ></div>
                </div>
                <div className="text-blue-200 text-xs">
                  {loadingProgress.historicPriceProgress.fetched} of {loadingProgress.historicPriceProgress.total} transactions processed
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Section */}
      {addresses.length > 0 && (balanceError || transactionsError) && !isFullyLoading && (
        <div className="flex justify-center">
          <div className="bg-black border-2 border-white/10 rounded-2xl p-6 text-center max-w-[660px] w-full">
            <div className="text-red-400">
              Error loading data: {balanceError || transactionsError}
            </div>
          </div>
        </div>
      )}

      {/* Results Section - Only show when data is fully ready */}
      {isDataReady && (
        <div className="p-6">
          <div className="mb-6">
            <div className="text-center text-white/50">
              <h3 className="text-md font-semibold text-center">Cost Basis Analysis</h3>
            </div>
            
            {/* Portfolio Summary */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 mb-6">
              <div className="bg-black border border-white/10 rounded-lg p-4 text-center">
                <div className="text-gray-400 text-xs mb-1">Current Value</div>
                <div className="text-white font-semibold">
                  ${formatDollarValue(portfolioMetrics.totalCurrentValue)}
                </div>
              </div>
              <div className="bg-black border border-white/10 rounded-lg p-4 text-center">
                <div className="text-gray-400 text-xs mb-1">Cost Basis</div>
                <div className="text-white font-semibold">
                  ${formatDollarValue(portfolioMetrics.totalCostBasis)}
                </div>
              </div>
              <div className="bg-black border border-white/10 rounded-lg p-4 text-center">
                <div className="text-gray-400 text-xs mb-1">Total P&L</div>
                <div className={`font-semibold ${portfolioMetrics.totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ${formatDollarValue(Math.abs(portfolioMetrics.totalGainLoss))}
                </div>
              </div>
              <div className="bg-black border border-white/10 rounded-lg p-4 text-center">
                <div className="text-gray-400 text-xs mb-1">Total P&L %</div>
                <div className={`font-semibold ${portfolioMetrics.totalGainLossPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {portfolioMetrics.totalGainLossPercent >= 0 ? '+' : ''}{portfolioMetrics.totalGainLossPercent.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {costBasisData.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400">No tokens found for cost basis analysis</div>
            </div>
          ) : (
            <div className="bg-black border-2 border-white/10 rounded-2xl p-1 sm:p-6">
              <div className="space-y-3">
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_2fr] items-center gap-2 sm:gap-4 border-b border-white/20 mx-2 sm:mx-4 p-4 text-xs text-gray-400 font-medium">
                  <div>Token</div>
                  <div className="text-center">Avg Cost</div>
                  <div className="text-center">Current</div>
                  <div className="text-center">P&L %</div>
                  <div className="text-right">Value / P&L</div>
                </div>
                
                {costBasisData.map((token, index) => {
                  const stableKey = `cost-basis-${token.symbol}-${index}`
                  
                  return (
                    <div key={stableKey} className="grid grid-cols-[2fr_1fr_1fr_1fr_2fr] items-center gap-2 sm:gap-4 border-b border-white/10 mx-2 sm:mx-4 p-4 last:border-b-0 overflow-hidden">
                      
                      {/* Token Info */}
                      <div className="flex items-center space-x-2 sm:space-x-3 min-w-[70px] md:min-w-[140px] overflow-hidden">
                        <div className="flex-shrink-0">
                          <CoinLogo
                            symbol={token.symbol}
                            size="md"
                            className="rounded-none"
                            variant="default"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium text-sm md:text-md break-words">
                            {getDisplayTicker(token.symbol)}
                          </div>
                          <div className="text-gray-400 text-[10px] break-words leading-tight">
                            <span>{formatBalance(token.totalTokens)} tokens</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Avg Cost */}
                      <div className="text-center">
                        <div className="text-gray-400 text-xs font-medium">
                          {token.avgCostBasis === null ? 'NA' : token.avgCostBasis === 0 ? '--' : formatPrice(token.avgCostBasis)}
                        </div>
                      </div>

                      {/* Current Price */}
                      <div className="text-center">
                        <div className="text-gray-400 text-xs font-medium">
                          {token.currentPrice === 0 ? '--' : formatPrice(token.currentPrice)}
                        </div>
                      </div>

                      {/* P&L % */}
                      <div className="text-center">
                        <div className={`text-xs font-medium ${token.avgCostBasis === null ? 'text-gray-400' : token.gainLossPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {token.avgCostBasis === null ? 'NA' : `${token.gainLossPercent >= 0 ? '+' : ''}${token.gainLossPercent.toFixed(1)}%`}
                        </div>
                      </div>
                      
                      {/* Value / P&L */}
                      <div className="text-right overflow-hidden">
                        <div className="text-white font-medium text-sm md:text-lg transition-all duration-200">
                          ${formatDollarValue(token.currentValue)}
                        </div>
                        <div className={`text-[10px] mt-0.5 transition-all duration-200 ${token.avgCostBasis === null ? 'text-gray-400' : token.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {token.avgCostBasis === null ? 'NA' : `${token.gainLoss >= 0 ? '+' : ''}$${formatDollarValue(Math.abs(token.gainLoss))}`}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Historic Price Test */}
          <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div>
                <div className="text-sm font-medium text-blue-300 mb-1">Historic Price API Test</div>
                <div className="text-xs text-gray-400">Test the PulseX subgraph integration</div>
              </div>
              <Button 
                type="button"
                onClick={testHistoricPrice}
                disabled={historicPriceLoading}
                variant="outline"
                size="sm"
                className="border-blue-400/30 text-blue-300 hover:bg-blue-900/30 text-xs"
              >
                {historicPriceLoading ? 'Testing...' : 'Test Historic Price'}
              </Button>
            </div>
            {priceTestResult && (
              <div className="mt-3 p-3 bg-black/50 rounded text-xs font-mono">
                {priceTestResult}
              </div>
            )}
          </div>

          {/* Debug Info */}
          <div className="mt-6 p-4 bg-gray-900/50 rounded-lg text-xs text-gray-400">
            <div className="font-medium text-white mb-2">Debug Info:</div>
            <div>Enriched transactions: {enrichedTransactions?.length || 0}</div>
            <div>Token transactions found: {tokenSummary?.length || 0}</div>
            <div>Current balances: {costBasisData.length} tokens</div>
            <div>Note: Cost basis uses actual transaction history where available. Historic prices from PulseX subgraphs.</div>
            
            {/* Debug Logs */}
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              <Button 
                type="button"
                onClick={() => setShowDebugLogs(!showDebugLogs)}
                variant="outline"
                size="sm"
                className="border-purple-400/30 text-purple-300 hover:bg-purple-900/30 text-xs"
              >
                {showDebugLogs ? 'Hide' : 'Show'} Debug Logs ({debugLogs.length})
              </Button>
              
              {showDebugLogs && (
                <>
                  <Button 
                    type="button"
                    onClick={() => setPauseDebugLogs(!pauseDebugLogs)}
                    variant="outline"
                    size="sm"
                    className={`text-xs ${
                      pauseDebugLogs 
                        ? 'border-green-400/30 text-green-300 hover:bg-green-900/30' 
                        : 'border-yellow-400/30 text-yellow-300 hover:bg-yellow-900/30'
                    }`}
                  >
                    {pauseDebugLogs ? '▶️ Resume' : '⏸️ Pause'} Updates
                  </Button>
                  
                  <Button 
                    type="button"
                    onClick={() => {
                      setDebugLogs(hookDebugLogs) // Sync with latest
                      setPauseDebugLogs(false) // Unpause
                    }}
                    variant="outline"
                    size="sm"
                    className="border-blue-400/30 text-blue-300 hover:bg-blue-900/30 text-xs"
                  >
                    🔄 Refresh
                  </Button>
                  
                  {debugLogs.length > 0 && (
                    <Button 
                      type="button"
                      onClick={() => setDebugLogs([])}
                      variant="outline"
                      size="sm"
                      className="border-red-400/30 text-red-300 hover:bg-red-900/30 text-xs"
                    >
                      🗑️ Clear
                    </Button>
                  )}
                </>
              )}
            </div>
            
            {showDebugLogs && debugLogs.length > 0 && (
              <div className="mt-3 p-3 bg-black/50 rounded-lg max-h-80 overflow-y-auto">
                <div className="font-medium text-purple-300 mb-2 flex items-center justify-between">
                  <span>Debug Logs ({debugLogs.length} entries)</span>
                  {pauseDebugLogs && (
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-300 text-xs bg-yellow-900/20 px-2 py-1 rounded">
                        ⏸️ PAUSED
                      </span>
                      {hookDebugLogs.length > debugLogs.length && (
                        <span className="text-orange-300 text-xs bg-orange-900/20 px-2 py-1 rounded animate-pulse">
                          +{hookDebugLogs.length - debugLogs.length} new
                        </span>
                      )}
                    </div>
                  )}
                  {!pauseDebugLogs && hookDebugLogs.length !== debugLogs.length && (
                    <span className="text-blue-300 text-xs bg-blue-900/20 px-2 py-1 rounded animate-pulse">
                      🔄 UPDATING
                    </span>
                  )}
                </div>
                <div className="space-y-1 text-xs font-mono">
                  {debugLogs.map((log, i) => (
                    <div 
                      key={i} 
                      className={`p-1 rounded ${
                        log.includes('✅') ? 'text-green-300 bg-green-900/20' :
                        log.includes('❌') ? 'text-red-300 bg-red-900/20' :
                        log.includes('⚠️') ? 'text-yellow-300 bg-yellow-900/20' :
                        log.includes('🎁') ? 'text-blue-300 bg-blue-900/20' :
                        log.includes('📈') ? 'text-green-300 bg-green-900/20' :
                        log.includes('📉') ? 'text-red-300 bg-red-900/20' :
                        'text-gray-300'
                      }`}
                    >
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Show actual transactions being processed */}
            {enrichedTransactions && enrichedTransactions.length > 0 && (
              <details className="mt-3">
                <summary 
                  className="cursor-pointer text-blue-300 hover:text-blue-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  View Transaction Details ({enrichedTransactions.length} total)
                </summary>
                <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                  {enrichedTransactions.slice(0, 10).map((tx, i) => (
                    <div key={i} className="text-xs p-2 bg-black/30 rounded">
                      <div className="text-white">Tx {i+1}: {tx.hash.slice(0, 10)}...</div>
                      <div>Method: {tx.method || 'N/A'}</div>
                      <div>Is Token Transfer: {tx.isTokenTransfer ? 'Yes' : 'No'}</div>
                      <div>Direction: {tx.direction}</div>
                      {tx.tokenInfo && (
                        <div className="text-green-300">
                          Token: {tx.tokenInfo.symbol} | Amount: {tx.tokenInfo.amount} | 
                          Historic Price: ${tx.tokenInfo.historicPriceUSD || 'Not fetched'}
                        </div>
                      )}
                      <div>Value: {tx.valueFormatted} PLS</div>
                    </div>
                  ))}
                  {enrichedTransactions.length > 10 && (
                    <div className="text-gray-500">... and {enrichedTransactions.length - 10} more</div>
                  )}
                </div>
              </details>
            )}

            {/* Show token summary details */}
            {tokenSummary && tokenSummary.length > 0 && (
              <details className="mt-3">
                <summary 
                  className="cursor-pointer text-green-300 hover:text-green-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  View Token Summary ({tokenSummary.length} tokens)
                </summary>
                <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
                  {tokenSummary.map((token, i) => (
                    <div key={i} className="text-xs p-2 bg-black/30 rounded">
                      <div className="text-white">{token.symbol}</div>
                      <div>Total Bought: {token.totalBought}</div>
                      <div>Total Sold: {token.totalSold}</div>
                      <div>Avg Buy Price: ${token.avgBuyPrice || 'Not found'}</div>
                      <div>Current Holdings: {token.currentHoldings}</div>
                      <div>Total Cost Basis: ${token.totalCostBasis}</div>
                    </div>
                  ))}
                </div>
              </details>
            )}

            {/* Transaction Analysis by Token */}
            {balances && costBasisData.length > 0 && (
              <details className="mt-3">
                <summary 
                  className="cursor-pointer text-yellow-300 hover:text-yellow-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  Transaction Analysis by Token (Current Portfolio vs Detected Transactions)
                </summary>
                <div className="mt-2 max-h-64 overflow-y-auto space-y-2">
                  {costBasisData.map((token, i) => {
                    // Find transactions for this token
                    const tokenTransactions = enrichedTransactions?.filter(tx => 
                      tx.tokenInfo?.symbol === token.symbol
                    ) || []
                    
                    const hasTransactions = tokenTransactions.length > 0
                    const hasHistoricPrice = tokenTransactions.some(tx => tx.tokenInfo?.historicPriceUSD !== undefined)
                    
                    return (
                      <div key={i} className={`text-xs p-3 rounded ${hasTransactions ? 'bg-green-900/20 border border-green-500/30' : 'bg-red-900/20 border border-red-500/30'}`}>
                        <div className="text-white font-medium flex items-center justify-between">
                          <span>{token.symbol} ({formatBalance(token.totalTokens)} tokens)</span>
                          <span className={`text-xs ${hasTransactions ? 'text-green-400' : 'text-red-400'}`}>
                            {hasTransactions ? `${tokenTransactions.length} transactions found` : 'No transactions found'}
                          </span>
                        </div>
                        
                        {hasTransactions ? (
                          <div className="mt-2 space-y-1">
                            <div className="text-gray-300">
                              Transactions: {tokenTransactions.map((tx, idx) => 
                                `${idx+1}. ${tx.direction} ${tx.tokenInfo?.amount || 0} ${token.symbol} on ${new Date(tx.timestamp).toLocaleDateString()}`
                              ).join(' | ')}
                            </div>
                            <div className={`${hasHistoricPrice ? 'text-green-400' : 'text-yellow-400'}`}>
                              Historic Prices: {hasHistoricPrice ? 'Found' : 'Missing'}
                            </div>
                          </div>
                        ) : (
                          <div className="mt-2 text-red-300">
                            ❌ No transactions detected for this token, but it's in your current balance.
                            <br />This suggests missing transaction detection for:
                            <div className="ml-2 mt-1 text-gray-400">
                              • DEX swaps/trades involving {token.symbol}
                              <br />• Complex multi-token transactions  
                              <br />• Liquidity pool operations
                              <br />• Token transfers not recognized
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </details>
            )}

            {/* All Raw Transactions */}
            {enrichedTransactions && enrichedTransactions.length > 0 && (
              <details className="mt-3">
                <summary 
                  className="cursor-pointer text-purple-300 hover:text-purple-200"
                  onClick={(e) => e.stopPropagation()}
                >
                  All Raw Transactions ({enrichedTransactions.length} total)
                </summary>
                <div className="mt-2 max-h-64 overflow-y-auto space-y-1">
                  {enrichedTransactions.slice(0, 100).map((tx, i) => (
                    <div key={i} className="text-xs p-2 bg-black/20 rounded border-l-2 border-purple-400/30">
                      <div className="text-white">#{i+1}: {tx.hash.slice(0, 12)}... on {new Date(tx.timestamp).toLocaleDateString()}</div>
                      <div className="grid grid-cols-2 gap-2 mt-1">
                        <div>
                          <div>Method: {tx.method || 'None'}</div>
                          <div>Types: {tx.txTypes?.join(', ') || 'None'}</div>
                          <div>To: {tx.to?.slice(0, 8)}...</div>
                        </div>
                        <div>
                          <div>PLS Value: {tx.valueFormatted || 0}</div>
                          <div>Direction: {tx.direction}</div>
                          <div className={tx.isTokenTransfer ? 'text-green-400' : 'text-gray-400'}>
                            Token Transfer: {tx.isTokenTransfer ? 'Yes' : 'No'}
                          </div>
                        </div>
                      </div>
                      {tx.tokenInfo && (
                        <div className="mt-1 p-2 bg-green-900/20 rounded">
                          <div className="text-green-300">
                            Token: {tx.tokenInfo.symbol} | Amount: {tx.tokenInfo.amount} | 
                            Price: ${tx.tokenInfo.historicPriceUSD || 'Not found'}
                          </div>
                          {tx.tokenInfo.amount === 0 && tx.decodedInput?.parameters && (
                            <div className="mt-1 text-yellow-300 text-[10px]">
                              ⚠️ Zero amount detected. Raw params: {JSON.stringify(tx.decodedInput.parameters).slice(0, 200)}...
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {enrichedTransactions.length > 100 && (
                    <div className="text-gray-500 text-center py-2">... and {enrichedTransactions.length - 100} more transactions</div>
                  )}
                </div>
              </details>
            )}

            {(tokenSummary?.length || 0) === 0 && (enrichedTransactions?.length || 0) > 0 && (
              <div className="text-yellow-400 mt-2">
                ⚠️ No token transfers detected in transaction history. Current prices used as cost basis.
                <br />Check browser console for transaction parsing details.
              </div>
            )}
            {historicPriceError && <div className="text-red-400">Historic price error: {historicPriceError.toString()}</div>}
          </div>

          {/* Action buttons - only show when data is ready */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              type="button"
              onClick={handleCheckAnotherAddress}
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/10 text-xs rounded-full"
            >
              Check another address
            </Button>
          </div>
        </div>
      )}
    </div>
  )
} 