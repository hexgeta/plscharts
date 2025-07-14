'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePortfolioBalance } from '@/hooks/crypto/usePortfolioBalance'
import { useTokenPrices } from '@/hooks/crypto/useTokenPrices'
import { useMaxiTokenData } from '@/hooks/crypto/useMaxiTokenData'
import { Button } from '@/components/ui/button'

import { CoinLogo } from '@/components/ui/CoinLogo'
import { TOKEN_CONSTANTS } from '@/constants/crypto'
import { getDisplayTicker } from '@/utils/ticker-display'

interface ScannedAddress {
  address: string
  label: string
  id: string
}

export default function AddressScanner() {
  const router = useRouter()
  const [addressInput, setAddressInput] = useState('')
  const [addresses, setAddresses] = useState<ScannedAddress[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loadingDots, setLoadingDots] = useState(1)

  // Get address strings for balance fetching
  const addressStrings = useMemo(() => {
    return addresses.map(addr => addr.address)
  }, [addresses])

  // Fetch balances
  const { balances, isLoading, error: balanceError } = usePortfolioBalance(addressStrings)

  // Get all unique token tickers from balances (same as Portfolio)
  const allTokenTickers = useMemo(() => {
    if (!balances || !Array.isArray(balances)) return []
    
    const tokens = balances.flatMap(addressData => {
      const chainTokens = [addressData.nativeBalance.symbol]
      addressData.tokenBalances?.forEach(token => chainTokens.push(token.symbol))
      return chainTokens
    })
    
    // Always include base tokens (same as Portfolio)
    const baseTokens = ['PLS', 'PLSX', 'HEX', 'eHEX', 'ETH', 'USDC', 'DAI', 'USDT']
    const allTickers = [...new Set([...tokens, ...baseTokens])]
    
    return allTickers.sort()
  }, [balances])

  // Fetch prices for all tokens (same as Portfolio)
  const { prices: rawPrices, isLoading: pricesLoading } = useTokenPrices(allTokenTickers)

  // Fetch MAXI token backing data (same as Portfolio)
  const { data: maxiData, isLoading: maxiLoading, error: maxiError, getBackingPerToken } = useMaxiTokenData()

  // Stabilize prices reference (same as Portfolio)
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

  // Helper function to get token price (exact same logic as Portfolio)
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

  // Format balance for display (exact same as Portfolio)
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

  // Format dollar values for display (exact same as Portfolio)
  const formatDollarValue = (dollarAmount: number): string => {
    if (dollarAmount === 0) return '0.00'
    
    // For very small dust amounts, just show 0.00 instead of scientific notation
    if (dollarAmount > 0 && dollarAmount < 0.01) {
      return '0.00'
    }
    
    // Show full number with commas and no decimal places
    return Math.round(dollarAmount).toLocaleString('en-US')
  }

  // Helper function to format price to 3 significant figures (exact same as Portfolio)
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

  // Handle create portfolio - save addresses to localStorage and navigate
  const handleCreatePortfolio = () => {
    if (addresses.length === 0) return

    // Convert scanner addresses to portfolio format
    const portfolioAddresses = addresses.map(addr => ({
      address: addr.address,
      label: addr.label || `Address ${addresses.indexOf(addr) + 1}`,
      id: `portfolio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    }))

    // Save to localStorage (same key as Portfolio component uses)
    localStorage.setItem('portfolioAddresses', JSON.stringify(portfolioAddresses))
    
    // Navigate to portfolio page
    router.push('/portfolio')
  }

  // Filter and combine PulseChain liquid assets (exact same logic as Portfolio)
  const pulsechainAssets = useMemo(() => {
    if (!balances || !Array.isArray(balances)) {
      return []
    }

    // Filter for PulseChain only (chain 369) - using same logic as Portfolio
    const filtered = balances.filter(addressData => {
      // Filter by chain - PulseChain only
      const chainMatch = addressData.chain === 369
      return chainMatch
    })
    
    // Group tokens by symbol (exact same logic as Portfolio)
    const tokenGroups = new Map()
    
    filtered.forEach(addressData => {
      // Handle native balances (like Portfolio)
      if (addressData.nativeBalance && addressData.nativeBalance.balanceFormatted > 0) {
        const key = addressData.nativeBalance.symbol
        
        if (tokenGroups.has(key)) {
          const existing = tokenGroups.get(key)
          existing.balance += addressData.nativeBalance.balanceFormatted
        } else {
          tokenGroups.set(key, {
            symbol: addressData.nativeBalance.symbol,
            balance: addressData.nativeBalance.balanceFormatted,
            name: addressData.nativeBalance.symbol,
            address: 'native'
          })
        }
      }
      
      // Handle token balances (like Portfolio)
      addressData.tokenBalances?.forEach(token => {
        if (token.balanceFormatted > 0) {
          const key = token.symbol
          
          if (tokenGroups.has(key)) {
            const existing = tokenGroups.get(key)
            existing.balance += token.balanceFormatted
          } else {
            tokenGroups.set(key, {
              symbol: token.symbol,
              balance: token.balanceFormatted,
              name: token.name || token.symbol,
              address: token.address
            })
          }
        }
      })
    })

    // Convert to array and sort by value (same as Portfolio)
    const result = Array.from(tokenGroups.values()).sort((a, b) => {
      const aPrice = getTokenPrice(a.symbol)
      const bPrice = getTokenPrice(b.symbol)
      const aValue = a.balance * aPrice
      const bValue = b.balance * bPrice
      return bValue - aValue
    })
    
    return result
  }, [balances, getTokenPrice])

  // Calculate total value
  const totalValue = useMemo(() => {
    return pulsechainAssets.reduce((total, token) => {
      return total + (token.balance * getTokenPrice(token.symbol))
    }, 0)
  }, [pulsechainAssets, getTokenPrice])

  // Comprehensive loading state - wait for all data to be ready
  const isFullyLoading = useMemo(() => {
    // If no addresses loaded yet, not loading
    if (addresses.length === 0) return false
    
    // Check if any data is still loading
    return isLoading || pricesLoading || maxiLoading
  }, [addresses.length, isLoading, pricesLoading, maxiLoading])

  // Data is ready when we have addresses, no loading states, and assets exist
  const isDataReady = useMemo(() => {
    return addresses.length > 0 && !isFullyLoading && !balanceError
  }, [addresses.length, isFullyLoading, balanceError])

  return (
    <div className="space-y-6">
      {/* Address Input Section - Hidden when addresses are loaded */}
      {addresses.length === 0 && (
        <div className="p-4">
        <div className="space-y-4">
          <div>
            <label className="block text-lg font-medium text-center text-gray-300 mb-6">
              Enter your Ethereum address to check your airdrop!
            </label>
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

      {/* Loading Section */}
      {isFullyLoading && (
        <div className="flex justify-center">
          <div className="bg-black border-2 border-white/10 rounded-full p-6 text-center max-w-[660px] w-full">
            <div className="text-gray-400">Loading your PulseChain airdrop...</div>
          </div>
        </div>
      )}

      {/* Error Section */}
      {addresses.length > 0 && balanceError && !isFullyLoading && (
        <div className="flex justify-center">
          <div className="bg-black border-2 border-white/10 rounded-2xl p-6 text-center max-w-[660px] w-full">
            <div className="text-red-400">Error loading balances: {balanceError}</div>
          </div>
        </div>
      )}

      {/* Results Section - Only show when data is fully ready */}
      {isDataReady && (
        <div className="p-6">
          <div className="mb-6">
            <div className="text-center text-white/50">
              <h3 className="text-md font-semibold text-center">Your PulseChain Airdrop Value</h3>
            </div>
            {totalValue > 0 && (
              <div className="text-center">
                <div className="text-5xl font-bold text-green-400 py-2">
                  ${formatDollarValue(totalValue).replace('$', '')}
                </div>
              </div>
            )}
          </div>

          {pulsechainAssets.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400">No PulseChain assets found</div>
            </div>
          ) : (
            <div className="bg-black border-2 border-white/10 rounded-2xl p-1 sm:p-6">
              <div className="space-y-3">
                {pulsechainAssets.map((token, index) => {
                  const price = getTokenPrice(token.symbol)
                  const value = token.balance * price
                  const displayAmount = formatBalance(token.balance)
                  const stableKey = `369-${token.symbol}-${token.address || 'native'}`
                  
                  return (
                    <div key={stableKey} className="grid grid-cols-[2fr_1fr_2fr] items-center gap-2 sm:gap-4 border-b border-white/10 mx-2 sm:mx-4 p-8 sm:p-4 last:border-b-0 overflow-hidden">
                      
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
                            <span>{(() => {
                              const tokenConfig = TOKEN_CONSTANTS.find(t => t.ticker === token.symbol)
                              return tokenConfig?.name || getDisplayTicker(token.symbol)
                            })()}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Price Column */}
                      <div className="text-center">
                        <div className="text-gray-400 text-xs font-medium">
                          {price === 0 ? '--' : formatPrice(price)}
                        </div>
                      </div>


                      
                      {/* Value - Right Column */}
                      <div className="text-right overflow-hidden">
                        <div className="text-white font-medium text-sm md:text-lg transition-all duration-200">
                          ${formatDollarValue(value)}
                        </div>
                        <div className="text-gray-400 text-[10px] mt-0.5 hidden sm:block transition-all duration-200">
                          {displayAmount} {getDisplayTicker(token.symbol)}
                        </div>
                      </div>


                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Action buttons - only show when data is ready */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              onClick={handleCheckAnotherAddress}
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/10 text-xs rounded-full"
            >
              Check another address
            </Button>
            <Button 
              onClick={handleCreatePortfolio}
              variant="default"
              size="sm"
              className="bg-white text-black hover:bg-gray-200/90 text-xs rounded-full"
            >
              Create portfolio
            </Button>
          </div>
        </div>
      )}
    </div>
  )
} 