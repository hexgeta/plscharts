'use client'

import { useState, useMemo, useEffect, memo, useCallback } from 'react'
import { CoinLogo } from '@/components/ui/CoinLogo'
import { useTokenPrices } from '@/hooks/crypto/useTokenPrices'
import { useTokenSupply } from '@/hooks/crypto/useTokenSupply'
import { usePortfolioBalance } from '@/hooks/crypto/usePortfolioBalance'
import { motion, AnimatePresence } from 'framer-motion'
import { TOKEN_CONSTANTS } from '@/constants/crypto'
import { X, Edit, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import LeagueTable from '@/components/LeagueTable'
import Image from 'next/image'

interface StoredAddress {
  address: string
  label?: string
  id: string
}

export default function Portfolio() {
  // Priority tokens to display - PulseChain tokens
  const MAIN_TOKENS = ['PLS', 'PLSX', 'HEX', 'eHEX', 'INC', 'WPLS', 'CST', 'USDC', 'DAI', 'MAXI', 'DECI', 'LUCKY', 'TRIO', 'BASE']

  // OA (Origin Address) supplies to subtract when calculating league positions
  const OA_SUPPLIES: Record<string, number> = {
    'PLS': 120_000_000_000_000, // OA supply for PLS
    'PLSX': 122_000_000_000_000, // OA supply for PLSX  
    'HEX': 0, // OA HEX supply
    'eHEX': 0, // OA HEX supply (same as HEX)
    // Add other tokens as needed
  }

  // State for address management
  const [addresses, setAddresses] = useState<StoredAddress[]>([])
  const [addressInput, setAddressInput] = useState('')
  const [bulkAddressInput, setBulkAddressInput] = useState('')
  const [showBulkMode, setShowBulkMode] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [newAddressInput, setNewAddressInput] = useState('')
  const [newLabelInput, setNewLabelInput] = useState('')
  // Add state for managing editing states of addresses
  const [editingStates, setEditingStates] = useState<Record<string, { isEditing: boolean; tempLabel: string }>>({})
  // Add state for filtering by specific addresses (now supports multiple)
  const [selectedAddressIds, setSelectedAddressIds] = useState<string[]>([])
  // Add state for duplicate address error
  const [duplicateError, setDuplicateError] = useState<string | null>(null)
  // Add state for bulk parsing results
  const [bulkParseResults, setBulkParseResults] = useState<{
    valid: string[]
    invalid: string[]
    duplicates: string[]
  } | null>(null)

  // Load addresses from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('portfolioAddresses')
    if (saved) {
      try {
        const parsedAddresses = JSON.parse(saved)
        setAddresses(parsedAddresses)
        // Initialize editing states for all addresses
        const initialEditingStates: Record<string, { isEditing: boolean; tempLabel: string }> = {}
        parsedAddresses.forEach((addr: StoredAddress) => {
          initialEditingStates[addr.id] = {
            isEditing: false,
            tempLabel: addr.label || ''
          }
        })
        setEditingStates(initialEditingStates)
      } catch (e) {
        console.error('Error parsing saved addresses:', e)
      }
    }
  }, [])

  // Save addresses to localStorage whenever addresses change
  useEffect(() => {
    if (addresses.length > 0) {
      localStorage.setItem('portfolioAddresses', JSON.stringify(addresses))
    }
  }, [addresses])

  // Validate Ethereum address format
  const isValidAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  }

  // Check if address already exists
  const isDuplicateAddress = (address: string): boolean => {
    return addresses.some(addr => addr.address.toLowerCase() === address.toLowerCase())
  }

  // Parse bulk addresses from various formats
  const parseBulkAddresses = (text: string) => {
    // Remove extra whitespace and normalize
    const cleaned = text.trim()
    if (!cleaned) return { valid: [], invalid: [], duplicates: [] }

    // Split by various separators: newlines, commas, semicolons, spaces, tabs
    const potentialAddresses = cleaned
      .split(/[\n\r,;|\s\t]+/)
      .map(addr => addr.trim())
      .filter(addr => addr.length > 0)

    const valid: string[] = []
    const invalid: string[] = []
    const duplicates: string[] = []

    potentialAddresses.forEach(addr => {
      // Clean up any extra characters that might be around the address
      const cleanAddr = addr.replace(/[^0-9a-fA-Fx]/g, '')
      
      if (isValidAddress(cleanAddr)) {
        if (isDuplicateAddress(cleanAddr)) {
          duplicates.push(cleanAddr)
        } else {
          valid.push(cleanAddr)
        }
      } else if (addr.length > 0) {
        invalid.push(addr)
      }
    })

    return { valid, invalid, duplicates }
  }

  // Handle bulk address submission
  const handleBulkAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    const results = parseBulkAddresses(bulkAddressInput)
    setBulkParseResults(results)

    // Add all valid addresses
    if (results.valid.length > 0) {
      const newAddresses = results.valid.map(address => ({
        address,
        label: '',
        id: Date.now().toString() + Math.random().toString()
      }))
      
      setAddresses(prev => [...prev, ...newAddresses])
      
      // If all addresses were added successfully, clear the input
      if (results.invalid.length === 0 && results.duplicates.length === 0) {
        setBulkAddressInput('')
        setBulkParseResults(null)
      }
    }

    // Clear results after 10 seconds
    setTimeout(() => setBulkParseResults(null), 10000)
  }

  // Handle adding address from main input (now supports bulk pasting)
  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Check if multiple addresses were pasted
    const results = parseBulkAddresses(addressInput)
    
    if (results.valid.length > 1 || results.invalid.length > 0 || results.duplicates.length > 0) {
      // Multiple addresses detected - handle as bulk
      setBulkParseResults(results)
      
      // Add all valid addresses
      if (results.valid.length > 0) {
        const newAddresses = results.valid.map(address => ({
          address,
          label: '',
          id: Date.now().toString() + Math.random().toString()
        }))
        
        setAddresses(prev => [...prev, ...newAddresses])
        
        // Clear input if all were processed successfully
        if (results.invalid.length === 0 && results.duplicates.length === 0) {
          setAddressInput('')
          setBulkParseResults(null)
        }
      }
      
      // Clear results after 10 seconds
      setTimeout(() => setBulkParseResults(null), 10000)
    } else if (isValidAddress(addressInput)) {
      // Single address handling (original logic)
      if (isDuplicateAddress(addressInput)) {
        setDuplicateError('You already added this address')
        setTimeout(() => setDuplicateError(null), 3000)
        return
      }
      
      const newAddress: StoredAddress = {
        address: addressInput,
        label: '',
        id: Date.now().toString()
      }
      setAddresses(prev => [...prev, newAddress])
      setAddressInput('')
      setDuplicateError(null)
    }
  }

  // Optimized address filter handler
  const handleAddressFilter = useCallback((addressId: string) => {
    setSelectedAddressIds(prev => {
      const newSelection = prev.includes(addressId) 
        ? prev.filter(id => id !== addressId)
        : [...prev, addressId]
      
      // If all addresses would be selected, clear the selection instead
      if (newSelection.length === addresses.length) {
        return []
      } else {
        return newSelection
      }
    })
  }, [addresses.length])

  // Add helper functions for managing editing states
  const setAddressEditing = (addressId: string, isEditing: boolean) => {
    setEditingStates(prev => ({
      ...prev,
      [addressId]: {
        ...prev[addressId],
        isEditing
      }
    }))
  }

  const setAddressTempLabel = (addressId: string, tempLabel: string) => {
    setEditingStates(prev => ({
      ...prev,
      [addressId]: {
        ...prev[addressId],
        tempLabel
      }
    }))
  }

  // Initialize editing state for new addresses
  const initializeEditingState = (addressId: string, label: string = '') => {
    setEditingStates(prev => ({
      ...prev,
      [addressId]: {
        isEditing: false,
        tempLabel: label
      }
    }))
  }

  // Handle adding address from modal (now supports bulk pasting)
  const handleAddAddressInModal = () => {
    // Check if multiple addresses were pasted
    const results = parseBulkAddresses(newAddressInput)
    
    if (results.valid.length > 1 || results.invalid.length > 0 || results.duplicates.length > 0) {
      // Multiple addresses detected - handle as bulk
      setBulkParseResults(results)
      
      // Add all valid addresses
      if (results.valid.length > 0) {
        const newAddresses = results.valid.map(address => ({
          address,
          label: newLabelInput || '', // Use the label for all addresses if provided
          id: Date.now().toString() + Math.random().toString()
        }))
        
        const updatedAddresses = [...addresses, ...newAddresses]
        setAddresses(updatedAddresses)
        localStorage.setItem('portfolioAddresses', JSON.stringify(updatedAddresses))
        
        // Initialize editing states for new addresses
        newAddresses.forEach(addr => {
          initializeEditingState(addr.id, newLabelInput)
        })
        
        // Clear inputs if all were processed successfully
        if (results.invalid.length === 0 && results.duplicates.length === 0) {
          setNewAddressInput('')
          setNewLabelInput('')
          setBulkParseResults(null)
        }
      }
      
      // Clear results after 10 seconds
      setTimeout(() => setBulkParseResults(null), 10000)
    } else if (isValidAddress(newAddressInput)) {
      // Single address handling (original logic)
      if (isDuplicateAddress(newAddressInput)) {
        setDuplicateError('You already added this address')
        setTimeout(() => setDuplicateError(null), 3000)
        return
      }
      
      const newId = Date.now().toString()
      const newAddress: StoredAddress = {
        id: newId,
        address: newAddressInput,
        label: newLabelInput || undefined
      }
      
      const updatedAddresses = [...addresses, newAddress]
      setAddresses(updatedAddresses)
      localStorage.setItem('portfolioAddresses', JSON.stringify(updatedAddresses))
      
      // Initialize editing state for new address
      initializeEditingState(newId, newLabelInput)
      
      setNewAddressInput('')
      setNewLabelInput('')
      setDuplicateError(null)
    }
  }

  // Remove address
  const removeAddress = (id: string) => {
    const updatedAddresses = addresses.filter(addr => addr.id !== id)
    setAddresses(updatedAddresses)
    localStorage.setItem('portfolioAddresses', JSON.stringify(updatedAddresses))
    
    // Remove editing state for deleted address
    setEditingStates(prev => {
      const newStates = { ...prev }
      delete newStates[id]
      return newStates
    })
  }

  // Update address label
  const updateAddressLabel = (id: string, label: string) => {
    const updatedAddresses = addresses.map(addr => 
      addr.id === id ? { ...addr, label: label || undefined } : addr
    )
    setAddresses(updatedAddresses)
    localStorage.setItem('portfolioAddresses', JSON.stringify(updatedAddresses))
  }

  // Get all addresses for balance checking
  const allAddressStrings = addresses.map(addr => addr.address)

  // Fetch balances for ALL addresses using the updated hook
  const { balances, isLoading: balancesLoading, error: balancesError } = usePortfolioBalance(allAddressStrings)

  // Fetch CST supply using existing hook (CST is on PulseChain, chain 369)
  const { totalSupply: cstSupplyPulseChain, loading: cstSupplyLoading, error: cstSupplyError } = useTokenSupply('CST')

  // For now, use only the primary address balances
  const allBalances = balances || []
  const anyBalancesLoading = balancesLoading
  const anyBalancesError = balancesError

  // Get all unique token tickers from balances for price fetching
  const allTokenTickers = useMemo(() => {
    if (!balances || !Array.isArray(balances)) return ['CST']
    
    const balanceTokens = balances.flatMap(addressData => {
      // Include native PLS balance
      const tokens = [addressData.nativeBalance.symbol]
      
      // Add token balances
      addressData.tokenBalances?.forEach(token => {
        tokens.push(token.symbol)
      })
      
      return tokens
    }).filter((ticker, index, array) => array.indexOf(ticker) === index) // Remove duplicates

    // Add CST to price fetching if not already included
    return [...new Set([...balanceTokens, 'CST'])]
  }, [balances])

  // Fetch prices for all tokens with balances plus CST
  const { prices, isLoading: pricesLoading } = useTokenPrices(allTokenTickers)

  // Get all tokens with balances combined from all addresses (or filtered by selected address)
  const { filteredBalances, mainTokensWithBalances } = useMemo(() => {
    if (!balances || !Array.isArray(balances)) {
      return { filteredBalances: [], mainTokensWithBalances: [] }
    }
    
    // Filter balances by selected address if one is chosen
    const filtered = selectedAddressIds.length > 0 
      ? balances.filter(addressData => {
          const matchingStoredAddress = addresses.find(addr => addr.address === addressData.address)
          return matchingStoredAddress && selectedAddressIds.includes(matchingStoredAddress.id)
        })
      : balances
    
    // Group tokens by symbol and sum their balances - show ALL tokens, not just predefined ones
    const tokenGroups = new Map()
    
    filtered.forEach(addressData => {
      // Add native balance
      if (addressData.nativeBalance.balanceFormatted > 0) {
        const existing = tokenGroups.get(addressData.nativeBalance.symbol)
        if (existing) {
          existing.balanceFormatted += addressData.nativeBalance.balanceFormatted
        } else {
          tokenGroups.set(addressData.nativeBalance.symbol, {
            ...addressData.nativeBalance,
            chain: addressData.chain
          })
        }
      }
      
      // Add token balances
      addressData.tokenBalances?.forEach(token => {
        const existing = tokenGroups.get(token.symbol)
        if (existing) {
          existing.balanceFormatted += token.balanceFormatted
        } else {
          tokenGroups.set(token.symbol, {
            ...token,
            chain: addressData.chain
          })
        }
      })
    })
    
    return {
      filteredBalances: filtered,
      mainTokensWithBalances: Array.from(tokenGroups.values())
    }
  }, [balances, selectedAddressIds, addresses])

  // Memoized sorted tokens to prevent re-sorting on every render
  const sortedTokens = useMemo(() => {
    if (!mainTokensWithBalances.length || !prices) return []
    
    return [...mainTokensWithBalances].sort((a, b) => {
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
      const balanceDiff = b.balanceFormatted - a.balanceFormatted
      if (Math.abs(balanceDiff) > 0.001) {
        return balanceDiff
      }
      
      // Tertiary sort by symbol for stability
      return a.symbol.localeCompare(b.symbol)
    })
  }, [mainTokensWithBalances, prices])

  // Format balance for display
  const formatBalance = (balance: number): string => {
    if (balance === 0) return '0'
    if (balance < 10) return balance.toFixed(2)
    return Math.floor(balance).toLocaleString('en-US')
  }

  // Format address for display
  const formatAddress = (address: string): string => {
    return `0x...${address.slice(-4)}`
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

  // Memoized token row component to prevent unnecessary re-renders
  const TokenRow = memo(({ token, tokenPrice, tokenIndex }: { 
    token: any; 
    tokenPrice: number; 
    tokenIndex: number; 
  }) => {
    const usdValue = token.balanceFormatted * tokenPrice
    const displayAmount = formatBalance(token.balanceFormatted)
    
    // Get supply from constants (existing logic)
    const supply = useMemo(() => {
      const tokenConfig = TOKEN_CONSTANTS.find(t => t.ticker === token.symbol)
      return tokenConfig?.supply || null
    }, [token.symbol])
    
    // Check if this token should use hardcoded supply instead of API
    const shouldUseHardcodedSupply = ['eDECI', 'weDECI', 'eMAXI', 'weMAXI', 'TRIO', 'LUCKY', 'BASE', 'DECI', 'MAXI'].includes(token.symbol)
    
    // Get supply from API using the hook (skip for hardcoded tokens)
    const { totalSupply: apiSupply, loading: supplyLoading } = useTokenSupply(
      shouldUseHardcodedSupply ? null : token.symbol
    )
    
    // Use hardcoded supply for specific tokens, otherwise use API supply with constants fallback
    const finalSupply = shouldUseHardcodedSupply 
      ? supply 
      : (apiSupply > 0 ? apiSupply : supply)
    
    const supplyPercentage = useMemo(() => {
      if (!finalSupply || token.balanceFormatted === 0) return ''
      
      // Subtract OA supply if available for this token
      const oaSupply = OA_SUPPLIES[token.symbol] || 0
      const adjustedSupply = finalSupply - oaSupply
      
      const percentage = (token.balanceFormatted / adjustedSupply) * 100
      return formatPercentage(percentage)
    }, [finalSupply, token.balanceFormatted])

    // Calculate league position based on percentage
    const leagueInfo = useMemo(() => {
      if (!finalSupply || token.balanceFormatted === 0) return { league: '', icon: '' }
      
      // Subtract OA supply if available for this token
      const oaSupply = OA_SUPPLIES[token.symbol] || 0
      const adjustedSupply = finalSupply - oaSupply
      
      // Use adjusted supply for percentage calculation
      const percentage = (token.balanceFormatted / adjustedSupply) * 100
      
      // Use the exact same league system as LeagueTable.tsx
      if (percentage >= 10) return { league: 'Poseidon', icon: '/poseidon.png' }
      if (percentage >= 1) return { league: 'Whale', icon: '/whale.png' }
      if (percentage >= 0.1) return { league: 'Shark', icon: '/shark.png' }
      if (percentage >= 0.01) return { league: 'Dolphin', icon: '/dolphin.png' }
      if (percentage >= 0.001) return { league: 'Squid', icon: '/squid.png' }
      if (percentage >= 0.0001) return { league: 'Turtle', icon: '/turtle.png' }
      if (percentage >= 0.00001) return { league: 'Crab', icon: '/crab.png' }
      if (percentage >= 0.000001) return { league: 'Shrimp', icon: '/shrimp.png' }
      return { league: 'Shell', icon: '/shell.png' }
    }, [finalSupply, token.balanceFormatted])

    return (
      <div className="grid grid-cols-[2fr_1fr_2fr] items-center gap-3 py-2">
        {/* Token Info - Left Column */}
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
              {token.symbol}
            </div>
            <div className="text-gray-400 text-[10px]">
              {token.name || ''}
            </div>
          </div>
        </div>
        
        {/* League Column - Center */}
        <div className="flex flex-col items-center justify-center ml-14">
          <Dialog>
            <DialogTrigger asChild>
              <button className="w-8 h-8 flex items-center justify-center border-1 border-white/20 hover:bg-white/10 transition-transform cursor-pointer mb-1 rounded-lg">
                {leagueInfo.icon && (
                  <Image
                    src={leagueInfo.icon}
                    alt={leagueInfo.league}
                    width={16}
                    height={16}
                    className="object-contain"
                  />
                )}
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl w-full max-w-[360px] max-h-[90vh] bg-black border-2 border-white/10 rounded-lg overflow-y-auto animate-none">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ 
                  duration: 0.4,
                  ease: [0.23, 1, 0.32, 1]
                }}
                className="p-4"
              >
                <LeagueTable 
                  tokenTicker={token.symbol} 
                  containerStyle={false}
                  supplyDeduction={OA_SUPPLIES[token.symbol] || 0}
                  userBalance={token.balanceFormatted}
                />
              </motion.div>
            </DialogContent>
          </Dialog>
          <div className="text-gray-400 text-[9px] text-center leading-tight w-full">
            {supplyPercentage}
          </div>
        </div>
        
        {/* Value - Right Column */}
        <div className="text-right">
          <div className="text-white font-medium text-sm md:text-lg">
            ${formatBalance(usdValue)}
          </div>
          <div className="text-gray-400 text-[8px] mt-0.5">
            {displayAmount} {token.symbol}
          </div>
        </div>
      </div>
    )
  })

  // Calculate total USD value from ALL addresses combined (or filtered by selected address)
  const { totalUsdValue, addressValues } = useMemo(() => {
    if (!filteredBalances || !Array.isArray(filteredBalances)) {
      return { totalUsdValue: 0, addressValues: [] }
    }

    let totalValue = 0
    const addressVals: Array<{ address: string; label: string; value: number }> = []

    // Calculate value for each address
    filteredBalances.forEach(addressData => {
      let addressValue = 0
      
      // Add native PLS value
      const nativePrice = prices[addressData.nativeBalance.symbol]?.price || 0
      addressValue += addressData.nativeBalance.balanceFormatted * nativePrice
      
      // Add token values
      addressData.tokenBalances?.forEach(token => {
        let tokenPrice = 0
        
        // Use $1 for stablecoins
        if (token.symbol === 'DAI' || token.symbol === 'USDC' || token.symbol === 'USDT') {
          tokenPrice = 1
        } else {
          tokenPrice = prices[token.symbol]?.price || 0
        }
        
        addressValue += token.balanceFormatted * tokenPrice
      })

      totalValue += addressValue

      // Add to address values array
      addressVals.push({
        address: addressData.address,
        label: addresses.find(a => a.address === addressData.address)?.label || '',
        value: addressValue
      })
    })

    return { totalUsdValue: totalValue, addressValues: addressVals }
  }, [filteredBalances, prices, addresses])

  // Comprehensive loading state - wait for relevant data to be ready
  const isEverythingReady = addresses.length > 0 && 
                           !balancesLoading && 
                           !pricesLoading && 
                           !balancesError &&
                           balances && 
                           balances.length > 0 &&
                           prices &&
                           Object.keys(prices).length > 0

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
      {/* Address Input Section */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ 
          duration: 0.5,
          delay: 0.1,
          ease: [0.23, 1, 0.32, 1]
        }}
        className="bg-black border-2 border-white/10 rounded-2xl p-6 max-w-[460px] w-full"
        style={{ display: addresses.length > 0 ? 'none' : 'block' }}
      >
        {/* Mode Toggle */}
        <div className="flex items-center justify-center mb-4">
          <div className="flex bg-black border border-white/20 rounded-lg p-1">
            <button
              type="button"
              onClick={() => setShowBulkMode(false)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                !showBulkMode 
                  ? 'bg-white text-black' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Single Address
            </button>
            <button
              type="button"
              onClick={() => setShowBulkMode(true)}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                showBulkMode 
                  ? 'bg-white text-black' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Bulk Import
            </button>
          </div>
        </div>

        {!showBulkMode ? (
          /* Single Address Mode */
          <form onSubmit={handleAddressSubmit} className="space-y-4">
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-300 mb-2 text-center">
                Enter PulseChain address
              </label>
              <input
                type="text"
                id="address"
                value={addressInput}
                onChange={(e) => setAddressInput(e.target.value)}
                placeholder="0x..."
                className="w-full px-4 py-3 bg-black border border-white/20 rounded-lg text-white placeholder-gray-500 focus:border-white/40 focus:outline-none transition-colors"
              />
            </div>
            
            {/* Duplicate Error Message */}
            {duplicateError && (
              <div className="p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm flex items-center gap-2">
                <span>⚠️</span>
                <span>{duplicateError}</span>
              </div>
            )}
            
            {/* Bulk Parse Results for main input */}
            {bulkParseResults && !showBulkMode && (
              <div className="space-y-2">
                {bulkParseResults.valid.length > 0 && (
                  <div className="p-3 bg-green-900/50 border border-green-500 rounded-lg text-green-200 text-sm">
                    ✅ {bulkParseResults.valid.length} address{bulkParseResults.valid.length !== 1 ? 'es' : ''} added
                  </div>
                )}
                {bulkParseResults.invalid.length > 0 && (
                  <div className="p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">
                    ❌ {bulkParseResults.invalid.length} invalid address{bulkParseResults.invalid.length !== 1 ? 'es' : ''}: {bulkParseResults.invalid.slice(0, 2).join(', ')}{bulkParseResults.invalid.length > 2 ? '...' : ''}
                  </div>
                )}
                {bulkParseResults.duplicates.length > 0 && (
                  <div className="p-3 bg-yellow-900/50 border border-yellow-500 rounded-lg text-yellow-200 text-sm">
                    ⚠️ {bulkParseResults.duplicates.length} duplicate{bulkParseResults.duplicates.length !== 1 ? 's' : ''} skipped
                  </div>
                )}
              </div>
            )}
            
            <button
              type="submit"
              disabled={!addressInput.trim()}
              className="w-full px-4 py-3 bg-white text-black font-medium rounded-lg disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
            >
              Add Address{parseBulkAddresses(addressInput).valid.length > 1 ? 'es' : ''}
            </button>
          </form>
        ) : (
          /* Bulk Address Mode */
          <form onSubmit={handleBulkAddressSubmit} className="space-y-4">
            <div>
              <label htmlFor="bulkAddress" className="block text-sm font-medium text-gray-300 mb-2 text-center">
                Paste multiple addresses
              </label>
              <textarea
                id="bulkAddress"
                value={bulkAddressInput}
                onChange={(e) => setBulkAddressInput(e.target.value)}
                placeholder="Paste addresses here...&#10;Supports: comma-separated, line-separated, or Excel format&#10;&#10;0xfebbe88de358c3aE931fFde2118E4FF3e471E9C8&#10;0x67b5C9a01904cc143e990a1c9dE1719E6C295e6f&#10;0x08611A63583A0a1a156b3BE1B2637B3d224b401f"
                rows={6}
                className="w-full px-4 py-3 bg-black border border-white/20 rounded-lg text-white placeholder-gray-500 focus:border-white/40 focus:outline-none transition-colors resize-vertical"
              />
            </div>
            
            {/* Bulk Parse Results */}
            {bulkParseResults && (
              <div className="space-y-2">
                {bulkParseResults.valid.length > 0 && (
                  <div className="p-3 bg-green-900/50 border border-green-500 rounded-lg text-green-200 text-sm">
                    ✅ {bulkParseResults.valid.length} valid address{bulkParseResults.valid.length !== 1 ? 'es' : ''} added
                  </div>
                )}
                {bulkParseResults.invalid.length > 0 && (
                  <div className="p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">
                    ❌ {bulkParseResults.invalid.length} invalid address{bulkParseResults.invalid.length !== 1 ? 'es' : ''}: {bulkParseResults.invalid.slice(0, 3).join(', ')}{bulkParseResults.invalid.length > 3 ? '...' : ''}
                  </div>
                )}
                {bulkParseResults.duplicates.length > 0 && (
                  <div className="p-3 bg-yellow-900/50 border border-yellow-500 rounded-lg text-yellow-200 text-sm">
                    ⚠️ {bulkParseResults.duplicates.length} duplicate address{bulkParseResults.duplicates.length !== 1 ? 'es' : ''} skipped
                  </div>
                )}
              </div>
            )}
            
            <button
              type="submit"
              disabled={!bulkAddressInput.trim()}
              className="w-full px-4 py-3 bg-white text-black font-medium rounded-lg disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
            >
              Parse & Add Addresses
            </button>
          </form>
        )}
      </motion.div>

      {/* Show loading state when fetching data */}
      {addresses.length > 0 && balancesLoading && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: 0.5,
            delay: 0.2,
            ease: [0.23, 1, 0.32, 1]
          }}
          className="bg-black border-2 border-white/10 rounded-2xl p-6 text-center max-w-[460px] w-full"
        >
          <div className="text-gray-400">Loading portfolio...</div>
        </motion.div>
      )}

      {/* Show error state if any critical errors occurred */}
      {addresses.length > 0 && balancesError && (
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
          <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
            Error: {balancesError?.message || balancesError || 'Failed to load portfolio data'}
          </div>
        </motion.div>
      )}

      {/* Total Value */}
      {isEverythingReady && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ 
            duration: 0.5,
            delay: 0.3,
            ease: [0.23, 1, 0.32, 1]
          }}
          className="bg-black border-2 border-white/10 rounded-2xl p-6 text-center max-w-[460px] w-full relative"
        >
          {/* Edit button in top right */}
          {addresses.length > 0 && (
            <button
              onClick={() => setShowEditModal(true)}
              className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              <Edit size={16} />
            </button>
          )}
          
          <h2 className="text-xs font-bold mb-2">
            {selectedAddressIds.length > 0 ? `${selectedAddressIds.length}/${addresses.length} Addresses` : 'Total Portfolio Value'}
          </h2>
          <div className="text-5xl font-bold text-green-400">
            ${formatBalance(totalUsdValue)}
          </div>
          <div className="text-sm text-gray-400 mt-4 flex flex-wrap gap-2 justify-center">
            {addresses.map((addr, index) => (
              <span 
                key={addr.id}
                onClick={() => handleAddressFilter(addr.id)}
                className={`px-3 py-1 border rounded-full text-xs transition-colors cursor-pointer ${
                  selectedAddressIds.includes(addr.id) 
                    ? 'border-white bg-white text-black' 
                    : 'border-white hover:bg-white/20 text-white'
                }`}
              >
                {addr.label || formatAddress(addr.address)}
              </span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Tokens Table */}
      {isEverythingReady && sortedTokens.length > 0 && (
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
          <div className="space-y-3">
            {sortedTokens.map((token, tokenIndex) => {
              const tokenPrice = (token.symbol === 'DAI' || token.symbol === 'USDC' || token.symbol === 'USDT') ? 1 : 
                               (prices[token.symbol]?.price || 0)
              return (
                <TokenRow key={`${token.chain}-${token.symbol}-${tokenIndex}`} token={token} tokenPrice={tokenPrice} tokenIndex={tokenIndex} />
              )
            })}
          </div>
        </motion.div>
      )}

      {/* No tokens found message */}
      {addresses.length > 0 && isEverythingReady && sortedTokens.length === 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ 
            duration: 0.5,
            delay: 0.4,
            ease: [0.23, 1, 0.32, 1]
          }}
          className="bg-black border-2 border-white/10 rounded-2xl p-6 text-center max-w-[460px] w-full"
        >
          <div className="text-gray-400">
            No tokens found for tracked addresses
          </div>
        </motion.div>
      )}

      {/* Edit Addresses Modal */}
      <AnimatePresence>
        {showEditModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-black border-2 border-white/20 rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Edit Addresses</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Address List */}
              <div className="space-y-4 mb-6">
                {addresses.map((addr, index) => {
                  const editingState = editingStates[addr.id] || { isEditing: false, tempLabel: addr.label || '' }
                  const { isEditing, tempLabel } = editingState
                  
                  const handleSave = () => {
                    updateAddressLabel(addr.id, tempLabel)
                    setAddressEditing(addr.id, false)
                  }
                  
                  const handleCancel = () => {
                    setAddressTempLabel(addr.id, addr.label || '')
                    setAddressEditing(addr.id, false)
                  }
                  
                  return (
                    <div key={addr.id} className="flex items-center gap-4 py-3 border-b border-white/10 last:border-b-0">
                      {/* Address */}
                      <div className="flex-1 font-mono text-sm text-white">
                        {addr.address}
                      </div>
                      
                      {/* Name/Label Field */}
                      <div className="w-64">
                        <input
                          type="text"
                          placeholder="Name (optional)"
                          value={tempLabel}
                          onChange={(e) => {
                            setAddressTempLabel(addr.id, e.target.value)
                            if (!isEditing) setAddressEditing(addr.id, true)
                          }}
                          onBlur={() => {
                            if (tempLabel === (addr.label || '')) {
                              setAddressEditing(addr.id, false)
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSave()
                            } else if (e.key === 'Escape') {
                              handleCancel()
                            }
                          }}
                          className="w-full px-3 py-2 bg-black border border-white/20 rounded-lg text-sm text-white placeholder-gray-500 focus:border-white/40 focus:outline-none"
                        />
                      </div>
                      
                      {/* Save/Delete Button */}
                      <div className="flex-shrink-0">
                        {isEditing && tempLabel !== (addr.label || '') ? (
                          <button
                            onClick={handleSave}
                            className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white hover:text-white"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/>
                              <polyline points="17,21 17,13 7,13 7,21"/>
                              <polyline points="7,3 7,8 15,8"/>
                            </svg>
                          </button>
                        ) : (
                          <button
                            onClick={() => removeAddress(addr.id)}
                            className="p-2 hover:bg-red-600/20 rounded-lg transition-colors text-red-400 hover:text-red-300"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Add New Address */}
              <div className="space-y-3 pt-4 border-t border-white/10">
                <h3 className="text-lg font-semibold">Add New Address</h3>
                
                {/* Duplicate Error Message */}
                {duplicateError && (
                  <div className="p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm flex items-center gap-2">
                    <span>⚠️</span>
                    <span>{duplicateError}</span>
                  </div>
                )}
                
                {/* Bulk Parse Results for modal */}
                {bulkParseResults && (
                  <div className="space-y-2">
                    {bulkParseResults.valid.length > 0 && (
                      <div className="p-3 bg-green-900/50 border border-green-500 rounded-lg text-green-200 text-sm">
                        ✅ {bulkParseResults.valid.length} address{bulkParseResults.valid.length !== 1 ? 'es' : ''} added
                      </div>
                    )}
                    {bulkParseResults.invalid.length > 0 && (
                      <div className="p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">
                        ❌ {bulkParseResults.invalid.length} invalid address{bulkParseResults.invalid.length !== 1 ? 'es' : ''}: {bulkParseResults.invalid.slice(0, 2).join(', ')}{bulkParseResults.invalid.length > 2 ? '...' : ''}
                      </div>
                    )}
                    {bulkParseResults.duplicates.length > 0 && (
                      <div className="p-3 bg-yellow-900/50 border border-yellow-500 rounded-lg text-yellow-200 text-sm">
                        ⚠️ {bulkParseResults.duplicates.length} duplicate{bulkParseResults.duplicates.length !== 1 ? 's' : ''} skipped
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="0x... (paste multiple addresses supported)"
                    value={newAddressInput}
                    onChange={(e) => setNewAddressInput(e.target.value)}
                    className="flex-1 px-3 py-2 bg-black border border-white/20 rounded-lg text-white placeholder-gray-500 focus:border-white/40 focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Name (optional)"
                    value={newLabelInput}
                    onChange={(e) => setNewLabelInput(e.target.value)}
                    className="w-64 px-3 py-2 bg-black border border-white/20 rounded-lg text-white placeholder-gray-500 focus:border-white/40 focus:outline-none"
                  />
                  <button
                    onClick={handleAddAddressInModal}
                    disabled={!newAddressInput.trim()}
                    className="px-6 py-2 bg-white text-black font-medium rounded-lg disabled:bg-white disabled:text-black disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                  >
                    Add{parseBulkAddresses(newAddressInput).valid.length > 1 ? ' All' : ''}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
} 