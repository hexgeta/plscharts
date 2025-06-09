'use client'

import { useState, useMemo, useEffect, memo, useCallback, useRef } from 'react'
import { CoinLogo } from '@/components/ui/CoinLogo'
import { useTokenPrices } from '@/hooks/crypto/useTokenPrices'
import { useTokenSupply } from '@/hooks/crypto/useTokenSupply'
import { usePortfolioBalance } from '@/hooks/crypto/usePortfolioBalance'
import { motion, AnimatePresence } from 'framer-motion'
import { TOKEN_CONSTANTS } from '@/constants/crypto'
import { X, Edit, Trash2, TrendingUp, Copy } from 'lucide-react'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import LeagueTable from '@/components/LeagueTable'
import { getDisplayTicker } from '@/utils/ticker-display'
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
  const [showEditModal, setShowEditModal] = useState(false)
  const [isInitialLoad, setIsInitialLoad] = useState(true)
  const [showMotion, setShowMotion] = useState(true)
  const animationCompleteRef = useRef(false)
  const [newAddressInput, setNewAddressInput] = useState('')
  const [newLabelInput, setNewLabelInput] = useState('')
  // Add state for managing editing states of addresses
  const [editingStates, setEditingStates] = useState<Record<string, { isEditing: boolean; tempLabel: string }>>({})
  // Add state for filtering by specific addresses (now supports multiple)
  const [selectedAddressIds, setSelectedAddressIds] = useState<string[]>(() => {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolioSelectedAddresses')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed)) {
            return parsed
          }
        } catch (e) {
          console.error('Error parsing saved selected addresses:', e)
        }
      }
    }
    return []
  })
  // Add state for duplicate address error
  const [duplicateError, setDuplicateError] = useState<string | null>(null)
  // Add state for bulk parsing results
  const [bulkParseResults, setBulkParseResults] = useState<{
    valid: string[]
    invalid: string[]
    duplicates: string[]
  } | null>(null)
  // Add to Portfolio component state
  const [chainFilter, setChainFilter] = useState<'pulsechain' | 'ethereum' | 'both'>(() => {
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolioChainFilter')
      if (saved && ['pulsechain', 'ethereum', 'both'].includes(saved)) {
        return saved as 'pulsechain' | 'ethereum' | 'both'
      }
    }
    return 'both'
  })

  // Prevent body scroll when edit modal is open
  useEffect(() => {
    if (showEditModal) {
      // Save current overflow value
      const originalOverflow = document.body.style.overflow
      // Disable scrolling
      document.body.style.overflow = 'hidden'
      
      // Cleanup function to restore scroll when modal closes
      return () => {
        document.body.style.overflow = originalOverflow
      }
    }
  }, [showEditModal])

  // Load addresses and preferences from localStorage on mount
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

    // Note: Chain filter and selected addresses are now initialized from localStorage in useState
  }, [])

  // Save addresses to localStorage whenever addresses change
  useEffect(() => {
    if (addresses.length > 0) {
      localStorage.setItem('portfolioAddresses', JSON.stringify(addresses))
    }
  }, [addresses])

  // Save chain filter to localStorage whenever it changes
  useEffect(() => {
    console.log('[Portfolio] Saving chain filter:', chainFilter)
    localStorage.setItem('portfolioChainFilter', chainFilter)
  }, [chainFilter])

  // Save selected address IDs to localStorage whenever they change
  useEffect(() => {
    console.log('[Portfolio] Saving selected addresses:', selectedAddressIds.length, 'addresses')
    localStorage.setItem('portfolioSelectedAddresses', JSON.stringify(selectedAddressIds))
  }, [selectedAddressIds])

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

  // Get all addresses for balance checking - memoize to prevent unnecessary re-fetches
  const allAddressStrings = useMemo(() => {
    const strings = addresses.map(addr => addr.address)
    console.log('Portfolio Debug - Creating new address strings array:', strings)
    return strings
  }, [addresses])
  
  console.log('Portfolio Debug - Using address strings:', allAddressStrings)

  // Fetch balances for ALL addresses using the updated hook
  const { balances: rawBalances, isLoading: balancesLoading, error: balancesError } = usePortfolioBalance(allAddressStrings)
  console.log('Portfolio Debug - Balance hook result:', { balances: rawBalances, balancesLoading, balancesError })
  
  // Stabilize balances reference to prevent unnecessary re-renders
  const balances = useMemo(() => rawBalances || [], [rawBalances])

  // Fetch CST supply using existing hook (CST is on PulseChain, chain 369)
  const { totalSupply: cstSupplyPulseChain, loading: cstSupplyLoading, error: cstSupplyError } = useTokenSupply('CST')

  // For now, use only the primary address balances
  const allBalances = balances || []
  const anyBalancesLoading = balancesLoading
  const anyBalancesError = balancesError

  // Get all unique token tickers from balances for both chains
  // This should be stable regardless of filtering to prevent unnecessary price refetches
  const allTokenTickers = useMemo(() => {
    if (!balances || !Array.isArray(balances)) return []
    
    const tokens = balances.flatMap(addressData => {
      const chainTokens = [addressData.nativeBalance.symbol]
      addressData.tokenBalances?.forEach(token => chainTokens.push(token.symbol))
      return chainTokens
    })
    
    // Always include the base tokens to ensure consistent ticker set
    const baseTokens = ['PLS', 'PLSX', 'HEX', 'ETH', 'USDC', 'DAI', 'USDT']
    
    const allTickers = [...new Set([...tokens, ...baseTokens])]
    
    // Return a stable array - only change if the actual content changes
    return allTickers.sort() // Sort for consistent ordering
  }, [
    // Only depend on the actual token symbols, not the balance objects
    balances && balances.map(b => [
      b.nativeBalance.symbol,
      ...(b.tokenBalances?.map(t => t.symbol) || [])
    ].join(',')).sort().join('|')
  ])

  // Minimal debug logging (only when needed)
  // console.log('[Portfolio] Component render - balances:', balances?.length, 'tickers:', allTokenTickers.length, 'chainFilter:', chainFilter, 'selectedIds:', selectedAddressIds.length)

  // Fetch prices for all tokens with balances plus CST
  const { prices: rawPrices, isLoading: pricesLoading } = useTokenPrices(allTokenTickers)

  // Stabilize prices reference to prevent unnecessary re-renders
  const prices = useMemo(() => {
    // Add some debugging to see if prices are updating
    if (rawPrices && !isInitialLoad) {
      console.log('[Portfolio] Prices updated:', Object.keys(rawPrices).length, 'tokens');
    }
    return rawPrices || {};
  }, [rawPrices, isInitialLoad])

  // Get all tokens with balances combined from all addresses (or filtered by selected address)
  const { filteredBalances, mainTokensWithBalances } = useMemo(() => {
    // console.log('[Portfolio] Filtering balances - chainFilter:', chainFilter, 'selectedAddressIds:', selectedAddressIds.length)
    
    if (!balances || !Array.isArray(balances)) {
      return { filteredBalances: [], mainTokensWithBalances: [] }
    }
    
    // Filter balances by selected chain and address
    const filtered = balances.filter(addressData => {
      // Filter by chain - only apply if not 'both'
      const chainMatch = chainFilter === 'both' || 
        (chainFilter === 'pulsechain' && addressData.chain === 369) ||
        (chainFilter === 'ethereum' && addressData.chain === 1)
      
      // Filter by selected addresses
      const addressMatch = selectedAddressIds.length > 0 
        ? selectedAddressIds.some(id => addresses.find(addr => addr.id === id && addr.address === addressData.address))
        : true
      
      return chainMatch && addressMatch
    })
    
    // Group tokens by symbol across chains when 'both' is selected, otherwise keep chain distinction
    const tokenGroups = new Map()
    
    filtered.forEach(addressData => {
      // Handle native balances
      if (addressData.nativeBalance.balanceFormatted > 0) {
        // Use different keys based on chain filter
        const key = chainFilter === 'both' 
          ? addressData.nativeBalance.symbol 
          : `${addressData.nativeBalance.symbol}-${addressData.chain}`
        
        const existing = tokenGroups.get(key)
        if (existing) {
          existing.balanceFormatted += addressData.nativeBalance.balanceFormatted
        } else {
          tokenGroups.set(key, {
            ...addressData.nativeBalance,
            chain: addressData.chain,
            displaySymbol: addressData.nativeBalance.symbol // For display purposes
          })
        }
      }
      
      // Handle token balances
      addressData.tokenBalances?.forEach(token => {
        // Use different keys based on chain filter
        const key = chainFilter === 'both' 
          ? token.symbol 
          : `${token.symbol}-${addressData.chain}`
        
        const existing = tokenGroups.get(key)
        if (existing) {
          existing.balanceFormatted += token.balanceFormatted
        } else {
          tokenGroups.set(key, {
            ...token,
            chain: addressData.chain,
            displaySymbol: token.symbol
          })
        }
      })
    })
    
    const tokensWithBalances = Array.from(tokenGroups.values())
    console.log(`[Portfolio] Found ${tokensWithBalances.length} tokens with balances across ${filtered.length} address/chain combinations`)
    console.log(`[Portfolio] Tokens found:`, tokensWithBalances.map(t => `${t.symbol} (${t.balanceFormatted}) on chain ${t.chain}`))
    
    return {
      filteredBalances: filtered,
      mainTokensWithBalances: tokensWithBalances
    }
  }, [balances, selectedAddressIds, addresses, chainFilter])

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

  // Copy contract address to clipboard
  const copyContractAddress = useCallback(async (address: string, symbol: string) => {
    try {
      await navigator.clipboard.writeText(address)
      const popup = document.createElement('div')
      popup.textContent = '✓ Copied!'
      popup.className = 'fixed bottom-4 left-4 bg-white text-black px-4 py-2 rounded-md text-sm z-[1000]'
      document.body.appendChild(popup)
      setTimeout(() => popup.remove(), 2000)
    } catch (err) {
      console.error('Failed to copy address:', err)
    }
  }, [])

  // Memoized token row component to prevent unnecessary re-renders
  const TokenRow = memo(({ token, tokenPrice, tokenIndex, allTokens }: { 
    token: any; 
    tokenPrice: number; 
    tokenIndex: number; 
    allTokens: any[];
  }) => {
    const usdValue = token.balanceFormatted * tokenPrice
    const displayAmount = formatBalance(token.balanceFormatted)
    
    // Helper function to get the base token name (remove 'e' or 'we' prefix)
    const getBaseTokenName = (symbol: string): string => {
      if (symbol.startsWith('we')) return symbol.substring(2)
      if (symbol.startsWith('e')) return symbol.substring(1)
      return symbol
    }
    
    // Find corresponding e/we version of this token
    const findPairedToken = (currentSymbol: string) => {
      const baseToken = getBaseTokenName(currentSymbol)
      
      if (currentSymbol.startsWith('e')) {
        // This is an 'e' token, look for 'we' version
        return allTokens.find(t => t.symbol === `we${baseToken}`)
      } else if (currentSymbol.startsWith('we')) {
        // This is a 'we' token, look for 'e' version
        return allTokens.find(t => t.symbol === `e${baseToken}`)
      }
      return null
    }
    
    const pairedToken = findPairedToken(token.symbol)
    const isEVersion = token.symbol.startsWith('e')
    const isWeVersion = token.symbol.startsWith('we')
    const hasPairedToken = pairedToken !== null
    
    // Calculate combined balance for league calculation (if there's a paired token)
    const combinedBalance = hasPairedToken && pairedToken?.balanceFormatted !== undefined
      ? token.balanceFormatted + pairedToken.balanceFormatted 
      : token.balanceFormatted
    
    // Only show league on 'e' version when there's a paired 'we' version
    // For all other tokens (not starting with e or we), always show league
    const shouldShowLeague = !isEVersion && !isWeVersion 
      ? true  // Always show for regular tokens (PLS, PLSX, HEX, etc.)
      : !isWeVersion || !(hasPairedToken && pairedToken?.balanceFormatted !== undefined)
    
    // Get supply from constants (existing logic)
    const supply = useMemo(() => {
      let symbolToSearch = token.symbol
      
      // For tokens starting with "we", use the "e" version supply (e.g., weDECI -> eDECI)
      if (token.symbol.startsWith('we')) {
        symbolToSearch = token.symbol.replace('we', 'e')
      }
      
      const tokenConfig = TOKEN_CONSTANTS.find(t => t.ticker === symbolToSearch)
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
      if (!finalSupply || combinedBalance === 0) return ''
      
      // Subtract OA supply if available for this token
      const oaSupply = OA_SUPPLIES[token.symbol] || 0
      const adjustedSupply = finalSupply - oaSupply
      
      const percentage = (combinedBalance / adjustedSupply) * 100
      return formatPercentage(percentage)
    }, [finalSupply, combinedBalance])

    // Calculate league position based on percentage
    const leagueInfo = useMemo(() => {
      if (!finalSupply || combinedBalance === 0) return { league: '', icon: '' }
      
      // Subtract OA supply if available for this token
      const oaSupply = OA_SUPPLIES[token.symbol] || 0
      const adjustedSupply = finalSupply - oaSupply
      
      // Use adjusted supply for percentage calculation with combined balance
      const percentage = (combinedBalance / adjustedSupply) * 100
      
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
    }, [finalSupply, combinedBalance])

    // Get 24h price change data from prices hook
    const priceData = prices[token.symbol]
    const priceChange24h = priceData?.priceChange?.h24

    // In TokenRow component, add chain context to league calculations
    const leagueSupplyDeduction = useMemo(() => {
      // Use chain-specific OA supplies
      const chainKey = `${token.symbol}-${token.chain}`
      return OA_SUPPLIES[chainKey] || OA_SUPPLIES[token.symbol] || 0
    }, [token.symbol, token.chain])

  return (
      <div className="grid grid-cols-[auto_2fr_1fr_2fr_auto] sm:grid-cols-[auto_2fr_1fr_1fr_1fr_2fr_auto] items-center gap-4 py-3 border-b border-white/10 mx-6 last:border-b-0">
        {/* Chain Icon - Furthest Left Column */}
        <div className="flex items-center justify-center">
          <Image
            src={Number(token.chain) === 1 ? "/coin-logos/ETH-white.svg" : "/coin-logos/PLS-white.svg"}
            alt={Number(token.chain) === 1 ? "Ethereum" : "PulseChain"}
            width={14}
            height={14}
            className="w-4 h-4 opacity-30"
          />
        </div>
        
        {/* Token Info - Left Column */}
        <div className="flex items-center space-x-3 min-w-[40px]">
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
              {getDisplayTicker(token.symbol)}
            </div>
            <div className="text-gray-400 text-[10px]">
              <span className="sm:hidden">{displayAmount} {getDisplayTicker(token.symbol)}</span>
              <span className="hidden sm:block">{(() => {
                const tokenConfig = TOKEN_CONSTANTS.find(t => t.ticker === token.symbol)
                return tokenConfig?.name || getDisplayTicker(token.symbol)
              })()}</span>
            </div>
          </div>
        </div>
        
        {/* Price Column - Hidden on Mobile */}
        <div className="hidden sm:block text-center">
          <div className="text-gray-400 text-xs font-medium">
            {tokenPrice > 0 ? `$${tokenPrice.toFixed(tokenPrice < 0.01 ? 6 : tokenPrice < 1 ? 4 : 2)}` : '$0.00'}
          </div>
        </div>

        {/* 24h Price Change Column */}
        <div className="text-center ml-4 sm:ml-0">
          <div className={`text-[12px] sm:text-xs font-bold ${
            priceChange24h !== undefined
              ? priceChange24h >= 0 
                ? 'text-[#00ff55]' 
                : 'text-red-500'
              : 'text-gray-400'
          }`}>
            {priceChange24h !== undefined
              ? `${priceChange24h >= 0 ? '+' : ''}${priceChange24h.toFixed(1)}%`
              : '0%'
            }
          </div>
        </div>

        {/* League Column - Hidden on Mobile */}
        <div className="hidden sm:flex flex-col items-center justify-center ml-14">
          {shouldShowLeague ? (
            <>
          <Dialog>
            <DialogTrigger asChild>
              <button className="w-8 h-8 flex items-center justify-center border-1 border-white/20 hover:bg-white/10 transition-transform cursor-pointer mb-0 rounded-lg">
                {leagueInfo.icon && (
                  <Image
                    src={leagueInfo.icon}
                    alt={leagueInfo.league}
                    width={20}
                    height={20}
                    className="object-contain"
                  />
                )}
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl w-full max-w-[360px] sm:max-w-[560px] max-h-[90vh] bg-black border-2 border-white/10 rounded-lg overflow-y-auto animate-none">
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
                  showLeagueNames={true}
                  preloadedSupply={finalSupply || undefined}
                  preloadedPrices={prices}
                  supplyDeduction={leagueSupplyDeduction}
                  userBalance={combinedBalance}
                />
              </motion.div>
            </DialogContent>
          </Dialog>
          <div className="text-gray-400 text-[9px] text-center leading-tight w-full mt-0.5">
            {supplyPercentage}
          </div>
            </>
          ) : (
            <div className="w-8 h-8 flex items-center justify-center mb-0">
              {/* Empty space for 'we' tokens when 'e' version exists */}
            </div>
          )}
              </div>
              
                {/* Value - Right Column */}
        <div className="text-right">
          <div className="text-white font-medium text-sm md:text-lg transition-all duration-200">
            ${formatBalance(usdValue)}
          </div>
          <div className="text-gray-400 text-[10px] mt-0.5 hidden sm:block transition-all duration-200">
            {displayAmount} {getDisplayTicker(token.symbol)}
          </div>
              </div>

        {/* Chart & Copy Icons - Far Right Column */}
        <div className="flex flex-col items-center ml-2">
          {(() => {
            // Get the appropriate address and chain for charts/copying
            let chartAddress = token.address
            let copyAddress = token.address
            let chartChain = 'pulsechain' // Default to pulsechain
            
            // For PLS (native token), use the dexs address from constants
            if (token.isNative && token.symbol === 'PLS') {
              const plsConstant = TOKEN_CONSTANTS.find(t => t.ticker === 'PLS')
              if (plsConstant?.dexs) {
                chartAddress = plsConstant.dexs
                copyAddress = plsConstant.dexs
              }
            }
            
            // For ETH (native token), use the dexs address from constants and ethereum chain
            if (token.isNative && token.symbol === 'ETH') {
              const ethConstant = TOKEN_CONSTANTS.find(t => t.ticker === 'ETH')
              if (ethConstant?.dexs) {
                chartAddress = ethConstant.dexs
                copyAddress = ethConstant.dexs
                chartChain = 'ethereum'
              }
            }
            
            const shouldShowIcons = chartAddress && chartAddress !== '0x0'
            
            return shouldShowIcons ? (
              <>
                {/* Chart Icon - Link to DexScreener */}
                <a
                  href={`https://dexscreener.com/${chartChain}/${chartAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 mt-0 text-gray-400 hover:text-white transition-colors"
                  title="View chart on DexScreener"
                >
                  <TrendingUp size={16} />
                </a>

                {/* Copy Icon - Copy Contract Address (only for non-native tokens, hidden on mobile) */}
                {!token.isNative && (
                <button
                    onClick={() => copyContractAddress(copyAddress, token.symbol)}
                    className="hidden sm:block p-1 -mt-0 transition-colors text-gray-400 hover:text-white"
                    title="Copy contract address"
                >
                    <Copy size={16} />
                </button>
              )}
              </>
            ) : null
          })()}
            </div>
        </div>
    )
  }, (prevProps, nextProps) => {
    // Custom comparison function to prevent unnecessary re-renders
    return (
      prevProps.token.symbol === nextProps.token.symbol &&
      prevProps.token.chain === nextProps.token.chain &&
      prevProps.token.balanceFormatted === nextProps.token.balanceFormatted &&
      prevProps.tokenPrice === nextProps.tokenPrice &&
      prevProps.tokenIndex === nextProps.tokenIndex &&
      prevProps.allTokens.length === nextProps.allTokens.length
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

  // Calculate 24h portfolio change percentage
  const portfolio24hChange = useMemo(() => {
    if (!filteredBalances || !Array.isArray(filteredBalances) || !prices) {
      return 0
    }

    let currentTotalValue = 0
    let previousTotalValue = 0

    // Calculate both current and 24h ago values for each token
    filteredBalances.forEach(addressData => {
      // Native token (PLS/ETH)
      const nativeSymbol = addressData.nativeBalance.symbol
      const nativeBalance = addressData.nativeBalance.balanceFormatted
      const nativePriceData = prices[nativeSymbol]
      const nativeCurrentPrice = nativePriceData?.price || 0
      const native24hChange = nativePriceData?.priceChange?.h24 || 0
      
      // Calculate 24h ago price: current price / (1 + (24h change / 100))
      const nativePrevPrice = native24hChange !== 0 
        ? nativeCurrentPrice / (1 + (native24hChange / 100))
        : nativeCurrentPrice

      currentTotalValue += nativeBalance * nativeCurrentPrice
      previousTotalValue += nativeBalance * nativePrevPrice

      // Token balances
      addressData.tokenBalances?.forEach(token => {
        const tokenBalance = token.balanceFormatted
        let tokenCurrentPrice = 0
        let tokenPrevPrice = 0

        // Use $1 for stablecoins (no change)
        if (token.symbol === 'DAI' || token.symbol === 'USDC' || token.symbol === 'USDT') {
          tokenCurrentPrice = 1
          tokenPrevPrice = 1
        } else {
          const tokenPriceData = prices[token.symbol]
          tokenCurrentPrice = tokenPriceData?.price || 0
          const token24hChange = tokenPriceData?.priceChange?.h24 || 0
          
          tokenPrevPrice = token24hChange !== 0 
            ? tokenCurrentPrice / (1 + (token24hChange / 100))
            : tokenCurrentPrice
        }

        currentTotalValue += tokenBalance * tokenCurrentPrice
        previousTotalValue += tokenBalance * tokenPrevPrice
      })
    })

    // Calculate percentage change
    if (previousTotalValue === 0) return 0
    return ((currentTotalValue - previousTotalValue) / previousTotalValue) * 100
  }, [filteredBalances, prices])

  // Comprehensive loading state - wait for relevant data to be ready
  // Once ready, stay ready (don't hide UI during price updates)
  const isEverythingReady = useMemo(() => {
    const hasInitialData = addresses.length > 0 && 
                          !balancesError &&
                          balances && 
                          balances.length > 0 &&
                          prices &&
                          Object.keys(prices).length > 0
    
    // Only consider loading states on initial load
    if (isInitialLoad) {
      return hasInitialData && !balancesLoading && !pricesLoading
    }
    
    // After initial load, stay ready as long as we have data
    return hasInitialData
  }, [
    addresses.length,
    balancesLoading,
    pricesLoading,
    balancesError,
    balances?.length,
    Object.keys(prices).length,
    isInitialLoad
  ])

  // Debug logging
  console.log('Portfolio Debug:', {
    addresses: addresses.length,
    balancesLoading,
    pricesLoading,
    balancesError,
    balances: balances ? balances.length : 'null',
    prices: prices ? Object.keys(prices).length : 'null',
    allTokenTickers,
    filteredBalances: filteredBalances.length,
    sortedTokens: sortedTokens.length
  })

  // Additional debugging for isEverythingReady condition
  console.log('Portfolio Debug - isEverythingReady check:', {
    addressesLength: addresses.length,
    hasAddresses: addresses.length > 0,
    balancesLoading,
    pricesLoading,
    hasBalancesError: !!balancesError,
    hasBalances: balances && balances.length > 0,
    hasPrices: prices && Object.keys(prices).length > 0,
    isEverythingReady
  })

  // Debug filteredBalances
  console.log('Portfolio Debug - filteredBalances:', {
    chainFilter,
    balancesRaw: balances,
    filteredBalances,
    mainTokensWithBalances
  })

  // Handle animation completion without state updates that cause re-renders
  const handleAnimationComplete = useCallback(() => {
    if (!animationCompleteRef.current) {
      animationCompleteRef.current = true;
      // Switch to regular divs after a delay to avoid any flashing
      setTimeout(() => setShowMotion(false), 50);
    }
  }, []);

  // Effect to handle initial load completion
  useEffect(() => {
    if (isEverythingReady && isInitialLoad) {
      setIsInitialLoad(false)
    }
  }, [isEverythingReady, isInitialLoad])

  // Add toggle UI component (3-way toggle) - memoized to prevent unnecessary re-renders
  const ChainToggle = useCallback(() => (
    <div className="flex bg-black border border-white/20 rounded-lg p-1">
      {['pulsechain', 'both', 'ethereum'].map((chain) => (
          <button
          key={chain}
          onClick={() => setChainFilter(chain as any)}
          className={`px-4 py-2 rounded-md text-xs font-medium transition-all duration-200 ${
            chainFilter === chain 
              ? 'bg-white text-black' 
              : 'text-gray-400 hover:text-white'
          }`}
        >
          {chain === 'pulsechain' ? 'PulseChain' : chain === 'ethereum' ? 'Ethereum' : 'Both'}
          </button>
      ))}
    </div>
  ), [chainFilter])

  // Container component - motion or regular div
  const Container = showMotion ? motion.div : 'div';
  const Section = showMotion ? motion.div : 'div';

  // Show loading state only on initial load
  if (isInitialLoad && !isEverythingReady) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-black border-2 border-white/10 rounded-2xl p-6 text-center max-w-[660px] w-full mx-auto">
            <div className="text-gray-400">Loading portfolio data...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Container 
      {...(showMotion ? {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { 
          duration: 0.6,
          ease: [0.23, 1, 0.32, 1]
        },
        onAnimationComplete: handleAnimationComplete
      } : {})}
      className="space-y-6 flex flex-col items-center"
    >
      {/* Address Input Section */}
      <Section 
        {...(showMotion ? {
          initial: { opacity: 0, scale: 0.95 },
          animate: { opacity: 1, scale: 1 },
          transition: { 
            duration: 0.5,
            delay: 0.1,
            ease: [0.23, 1, 0.32, 1]
          }
        } : {})}
        className="bg-black border-2 border-white/10 rounded-2xl p-6 max-w-[860px] w-full"
        style={{ display: addresses.length > 0 ? 'none' : 'block' }}
      >
        {/* Unified Address Input */}
        <form onSubmit={handleAddressSubmit} className="space-y-4">
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-300 mb-2 text-center">
              Enter PulseChain address(es)
            </label>
            <textarea
              id="address"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              placeholder="0x..)"
              rows={4}
              className="w-full px-4 py-3 bg-black border border-white/20 rounded-lg text-white placeholder-gray-500 focus:border-white/40 focus:outline-none transition-colors resize-vertical"
            />
        </div>

          {/* Parse Results */}
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
            disabled={!addressInput.trim()}
            className="w-full px-4 py-3 bg-white text-black font-medium rounded-lg disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
          >
            Add Address{(() => {
              const results = parseBulkAddresses(addressInput)
              return results.valid.length > 1 ? 'es' : ''
            })()}
          </button>
        </form>
      </Section>

      {/* Show loading state when fetching data (only on initial load) */}
      {addresses.length > 0 && balancesLoading && isInitialLoad && (
        <Section 
          {...(showMotion ? {
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 },
            transition: { 
              duration: 0.5,
              delay: 0.2,
              ease: [0.23, 1, 0.32, 1]
            }
          } : {})}
          className="bg-black border-2 border-white/10 rounded-2xl p-6 text-center max-w-[860px] w-full"
        >
          <div className="text-gray-400">Loading portfolio...</div>
        </Section>
      )}

      {/* Show error state if any critical errors occurred */}
      {addresses.length > 0 && balancesError && (
        <Section 
          {...(showMotion ? {
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 },
            transition: { 
              duration: 0.5,
              delay: 0.2,
              ease: [0.23, 1, 0.32, 1]
            }
          } : {})}
          className="bg-black border-2 border-white/10 rounded-2xl p-6 max-w-[860px] w-full"
        >
          <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
            Error: {balancesError?.message || balancesError || 'Failed to load portfolio data'}
                </div>
        </Section>
      )}

      {/* Total Value */}
      {isEverythingReady && (
        <Section 
          {...(showMotion ? {
            initial: { opacity: 0, scale: 0.95 },
            animate: { opacity: 1, scale: 1 },
            transition: { 
              duration: 0.5,
              delay: 0.3,
              ease: [0.23, 1, 0.32, 1]
            }
          } : {})}
          className="bg-black border-2 border-white/10 rounded-2xl py-8 text-center max-w-[860px] w-full relative"
        >
                    {/* Chain Toggle and Edit button in top right */}
          {addresses.length > 0 && (
            <div className="absolute top-4 right-2 flex items-center gap-2">
              {/* Chain Toggle - fixed width container for consistent positioning */}
              <button
                onClick={() => {
                  setChainFilter(prev => 
                    prev === 'both' ? 'ethereum' : 
                    prev === 'ethereum' ? 'pulsechain' : 
                    'both'
                  )
                }}
                className="group p-2 rounded-lg text-gray-400 hover:text-white flex items-center justify-center w-16 h-10"
                title={`Current: ${chainFilter === 'ethereum' ? 'Ethereum' : chainFilter === 'pulsechain' ? 'PulseChain' : 'Both Chains'}`}
              >
                <div className="flex items-center gap-1">
                                      {chainFilter === 'ethereum' && (
                      <Image 
                        src="/coin-logos/ETH-white.svg" 
                        alt="Ethereum" 
                        width={16} 
                        height={16}
                        className="w-4 h-4 opacity-60 group-hover:opacity-100"
                      />
                    )}
                                      {chainFilter === 'pulsechain' && (
                      <Image 
                        src="/coin-logos/PLS-white.svg" 
                        alt="PulseChain" 
                        width={16} 
                        height={16}
                        className="w-4 h-4 opacity-60 group-hover:opacity-100"
                      />
                    )}
                  {chainFilter === 'both' && (
                    <>
                                              <Image 
                          src="/coin-logos/ETH-white.svg" 
                          alt="Ethereum" 
                          width={16} 
                          height={16}
                          className="w-4 h-4 opacity-60 group-hover:opacity-100 ml-1"
                        />
                        <span className="text-xs text-gray-400 group-hover:text-white">+</span>
                        <Image 
                          src="/coin-logos/PLS-white.svg" 
                          alt="PulseChain" 
                          width={16} 
                          height={16}
                          className="w-4 h-4 opacity-60 group-hover:opacity-100"
                        />
                    </>
                  )}
                </div>
              </button>
              
              {/* Edit button */}
              <button
                onClick={() => setShowEditModal(true)}
                className="p-2 mr-8 rounded-lg text-gray-400 hover:text-white transition-colors"
              >
                <Edit size={16} />
              </button>
            </div>
          )}
          
          <div className="flex items-center justify-left sm:justify-center gap-2 ml-6">
            <h2 className="text-xs sm:text-xs font-bold mb-2 text-gray-400">
            {selectedAddressIds.length > 0 ? `${selectedAddressIds.length}/${addresses.length} Addresses` : 'Total Portfolio Value'}
            </h2>
          </div>
                    <div className="flex items-center justify-left sm:justify-center gap-2 ml-6">
            <div className="text-4xl sm:text-5xl font-bold text-white py-2">
              ${formatBalance(totalUsdValue)}
            </div>
            <div className={`text-xs md:text-sm font-bold ml-1 ${
              portfolio24hChange <= -1
                ? 'text-red-500'
                : portfolio24hChange >= 1
                  ? 'text-[#00ff55]'
                  : 'text-gray-400'
            }`}>
              {portfolio24hChange >= 0 ? '+' : ''}{portfolio24hChange.toFixed(2)}%
            </div>
          </div>
          <div className="text-sm text-gray-400 mt-4 flex flex-wrap gap-2 justify-center">
            {addresses.map((addr, index) => (
              <span 
                key={addr.id}
                onClick={() => handleAddressFilter(addr.id)}
                className={`px-3 py-1 border rounded-full text-xs transition-colors cursor-pointer ${
                  selectedAddressIds.includes(addr.id) 
                    ? 'border-white bg-white text-black' 
                    : 'border-white/20 hover:bg-white/20 text-white'
                }`}
              >
                {addr.label || formatAddress(addr.address)}
              </span>
            ))}
                  </div>
        </Section>
      )}



      {/* Tokens Table */}
      {isEverythingReady && sortedTokens.length > 0 && (
        <Section 
          {...(showMotion ? {
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 },
            transition: { 
              duration: 0.5,
              delay: 0.4,
              ease: [0.23, 1, 0.32, 1]
            }
          } : {})}
          className="bg-black border-2 border-white/10 rounded-2xl p-1 sm:p-6 max-w-[860px] w-full"
        >
          <div className="space-y-3">
            {sortedTokens.map((token, tokenIndex) => {
              const tokenPrice = (token.symbol === 'DAI' || token.symbol === 'USDC' || token.symbol === 'USDT') ? 1 : 
                               (prices[token.symbol]?.price || 0)
              // Use a stable key that includes the token address to prevent unnecessary remounting
              const stableKey = `${token.chain}-${token.symbol}-${token.address || 'native'}`
              return (
                <TokenRow key={stableKey} token={token} tokenPrice={tokenPrice} tokenIndex={tokenIndex} allTokens={sortedTokens} />
              )
            })}
                </div>
        </Section>
      )}

      {/* No tokens found message */}
      {addresses.length > 0 && isEverythingReady && sortedTokens.length === 0 && (
        <Section 
          {...(showMotion ? {
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 },
            transition: { 
              duration: 0.5,
              delay: 0.4,
              ease: [0.23, 1, 0.32, 1]
            }
          } : {})}
          className="bg-black border-2 border-white/10 rounded-2xl p-6 text-center max-w-[860px] w-full"
        >
          <div className="text-gray-400">
            No tokens found for tracked addresses
              </div>
        </Section>
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
                    placeholder="0x..."
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
                    +
                  </button>
      </div>
    </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Container>
  )
} 