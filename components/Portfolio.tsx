'use client'

import { useState, useMemo, useEffect, memo, useCallback, useRef } from 'react'
import { CoinLogo } from '@/components/ui/CoinLogo'
import { useTokenPrices } from '@/hooks/crypto/useTokenPrices'
import { useTokenSupply } from '@/hooks/crypto/useTokenSupply'
import { usePortfolioBalance } from '@/hooks/crypto/usePortfolioBalance'
import { useMaxiTokenData } from '@/hooks/crypto/useMaxiTokenData'
import { useHexStakes } from '@/hooks/crypto/useHexStakes'
import { motion, AnimatePresence } from 'framer-motion'
import { TOKEN_CONSTANTS } from '@/constants/crypto'
import { X, Edit, Trash2, TrendingUp, Copy, ChevronDown } from 'lucide-react'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Toggle } from '@/components/ui/toggle'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
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
  // Add state for modal tabs
  const [activeTab, setActiveTab] = useState<'addresses' | 'settings'>('addresses')
  // Add state for backing price toggle
  const [useBackingPrice, setUseBackingPrice] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolioUseBackingPrice')
      return saved === 'true'
    }
    return false
  })
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
  
  // Advanced filters state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolioShowAdvancedFilters')
      return saved !== null ? saved === 'true' : false // Default to false
    }
    return false
  })
  const [showLiquidBalances, setShowLiquidBalances] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolioShowLiquidBalances')
      return saved !== null ? saved === 'true' : true // Default to true
    }
    return true
  })
  const [showHexStakes, setShowHexStakes] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolioShowHexStakes')
      return saved !== null ? saved === 'true' : false // Default to false
    }
    return false
  })
  const [showValidators, setShowValidators] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolioShowValidators')
      return saved !== null ? saved === 'true' : true // Default to true
    }
    return true
  })
  
  // Validator settings state
  const [validatorCount, setValidatorCount] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolioValidatorCount')
      return saved ? parseInt(saved, 10) || 0 : 0
    }
    return 0
  })

  // Dialog state for league tables (moved up to prevent closing on price refresh)
  const [openDialogToken, setOpenDialogToken] = useState<string | null>(null)

  // Preload portfolio-specific images on component mount
  useEffect(() => {
    // Preload chain icons
    const chainIcons = ['/coin-logos/ETH-white.svg', '/coin-logos/PLS-white.svg']
    chainIcons.forEach(src => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.href = src
      link.as = 'image'
      link.type = 'image/svg+xml'
      document.head.appendChild(link)
    })

    // Preload league images
    const leagueImages = [
      '/poseidon.png', '/whale.png', '/shark.png', '/dolphin.png',
      '/squid.png', '/turtle.png', '/crab.png', '/shrimp.png', '/shell.png'
    ]
    leagueImages.forEach((src, index) => {
      const link = document.createElement('link')
      link.rel = 'preload'
      link.href = src
      link.as = 'image'
      link.type = 'image/png'
      if (index < 3) link.fetchPriority = 'high' // High priority for top 3 ranks
      document.head.appendChild(link)
    })
  }, [])

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

  // Save backing price setting to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('portfolioUseBackingPrice', useBackingPrice.toString())
  }, [useBackingPrice])

  // Save validator count to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('portfolioValidatorCount', validatorCount.toString())
  }, [validatorCount])

  // Save advanced filter states to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('portfolioShowLiquidBalances', showLiquidBalances.toString())
  }, [showLiquidBalances])

  useEffect(() => {
    localStorage.setItem('portfolioShowHexStakes', showHexStakes.toString())
  }, [showHexStakes])

  useEffect(() => {
    localStorage.setItem('portfolioShowValidators', showValidators.toString())
  }, [showValidators])

  useEffect(() => {
    localStorage.setItem('portfolioShowAdvancedFilters', showAdvancedFilters.toString())
  }, [showAdvancedFilters])

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

  // Fetch real HEX stakes data for user's addresses
  const { stakes: hexStakes, isLoading: hexStakesLoading, error: hexStakesError } = useHexStakes(allAddressStrings)

  // Filter HEX stakes by selected addresses and chain
  const filteredHexStakes = useMemo(() => {
    return hexStakes.filter(stake => {
      // Filter by selected addresses
      const addressMatch = selectedAddressIds.length > 0 
        ? selectedAddressIds.some(id => addresses.find(addr => addr.id === id && addr.address.toLowerCase() === stake.address.toLowerCase()))
        : true
      
      // Filter by chain
      const chainMatch = chainFilter === 'both' || 
        (chainFilter === 'ethereum' && stake.chain === 'ETH') ||
        (chainFilter === 'pulsechain' && stake.chain === 'PLS')
      
      return addressMatch && chainMatch && stake.status === 'active'
    })
  }, [hexStakes, selectedAddressIds, addresses, chainFilter])
  
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

  // Fetch MAXI token backing data
  const { data: maxiData, isLoading: maxiLoading, error: maxiError, getBackingPerToken } = useMaxiTokenData()

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

  // Helper function to check if a token is a stablecoin (including e-versions)
  const isStablecoin = useCallback((symbol: string): boolean => {
    const stablecoins = ['weDAI', 'weUSDC', 'weUSDT', 'CST', 'weUSDL']
    return stablecoins.includes(symbol)
  }, [])

  // Helper function to check if a token should use backing price
  const shouldUseBackingPrice = useCallback((symbol: string): boolean => {
    const backingTokens = ['MAXI', 'DECI', 'LUCKY', 'TRIO', 'BASE', 'eMAXI', 'eDECI', 'weMAXI', 'weDECI']
    return backingTokens.includes(symbol)
  }, [])

  // Helper function to get token price (market or backing)
  const getTokenPrice = useCallback((symbol: string): number => {
    // Stablecoins are always $1
    if (isStablecoin(symbol)) return 1
    
    // Check if this token should use backing price
    if (useBackingPrice && shouldUseBackingPrice(symbol)) {
      // Get the actual backing per token from the MAXI API
      const backingPerToken = getBackingPerToken(symbol)
      
      if (backingPerToken !== null) {
        // For e/we tokens, use eHEX price with backing multiplier
        if (symbol.startsWith('e') || symbol.startsWith('we')) {
          const eHexPrice = prices['eHEX']?.price || 0
          return eHexPrice * backingPerToken
        }
        // For regular MAXI tokens (p-versions), use HEX price with backing multiplier
        else {
          const hexPrice = prices['HEX']?.price || 0
          return hexPrice * backingPerToken
        }
      } else {
        // Fallback to old calculation if API data not available
        console.warn(`[Portfolio] No backing data found for ${symbol}, using fallback calculation`)
        if (symbol.startsWith('e') || symbol.startsWith('we')) {
          const eHexPrice = prices['eHEX']?.price || 0
          return eHexPrice * 2 // Fallback: 2.0 * eHEX price
        } else {
          const hexPrice = prices['HEX']?.price || 0
          return hexPrice * 2 // Fallback: 2.0 * HEX price
        }
      }
    }
    
    // Use market price
    return prices[symbol]?.price || 0
  }, [isStablecoin, shouldUseBackingPrice, useBackingPrice, prices, getBackingPerToken])

  // Memoized sorted tokens to prevent re-sorting on every render
  const sortedTokens = useMemo(() => {
    if (!mainTokensWithBalances.length || !prices) return []
    
    return [...mainTokensWithBalances].sort((a, b) => {
      const aPrice = getTokenPrice(a.symbol)
      const bPrice = getTokenPrice(b.symbol)
      const aValue = a.balanceFormatted * aPrice
      const bValue = b.balanceFormatted * bPrice
      
      // Primary sort by USD value descending with larger threshold to reduce flicker
      const valueDiff = bValue - aValue
      if (Math.abs(valueDiff) > 1) { // Increase threshold to $1 to reduce frequent reordering
        return valueDiff
      }
      
      // Secondary sort by token amount descending
      const balanceDiff = b.balanceFormatted - a.balanceFormatted
      if (Math.abs(balanceDiff) > 0.1) { // Increase threshold to reduce frequent reordering
        return balanceDiff
      }
      
      // Tertiary sort by symbol for stability
      return a.symbol.localeCompare(b.symbol)
    })
  }, [
    // Only depend on the actual balance values and symbol list, not the full objects
    mainTokensWithBalances.map(t => `${t.symbol}-${t.balanceFormatted.toFixed(6)}-${t.chain}`).join('|'),
    // Only recalculate when prices change significantly (rounded to avoid micro-changes)
    prices && Object.keys(prices).map(key => 
      `${key}-${prices[key]?.price ? Math.round(prices[key].price * 1000000) / 1000000 : 0}`
    ).join('|'),
    // Include backing price setting
    useBackingPrice,
    // Include maxiData but only when it changes substantially
    maxiData && Object.keys(maxiData).length
  ])

  // Format balance for display
  const formatBalance = (balance: number): string => {
    if (balance === 0) return '0'
    if (balance >= 1e15) return (balance / 1e15).toFixed(1) + 'Q' // Quadrillion
    if (balance >= 1e12) return (balance / 1e12).toFixed(1) + 'T' // Trillion
    if (balance >= 1e9) return (balance / 1e9).toFixed(1) + 'B'   // Billion
    if (balance >= 1e6) return (balance / 1e6).toFixed(1) + 'M'   // Million
    if (balance < 10) return balance.toFixed(2)
    return Math.floor(balance).toLocaleString('en-US')
  }

  // Format large numbers for mobile with K, M, B, T, Q suffixes and 1 decimal place
  const formatBalanceMobile = (balance: number): string => {
    if (balance === 0) return '0'
    if (balance >= 1e15) return (balance / 1e15).toFixed(1) + 'Q' // Quadrillion
    if (balance >= 1e12) return (balance / 1e12).toFixed(1) + 'T' // Trillion
    if (balance >= 1e9) return (balance / 1e9).toFixed(1) + 'B'   // Billion
    if (balance >= 1e6) return (balance / 1e6).toFixed(1) + 'M'   // Million
    if (balance >= 1e3) return (balance / 1e3).toFixed(1) + 'K'   // Thousand
    if (balance < 10) return balance.toFixed(2)
    return Math.floor(balance).toString()
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

  // Helper function to format percentage with at least 2 significant figures
  const formatPercentage = (percentage: number): string => {
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

  // Copy contract address to clipboard
  const copyContractAddress = useCallback(async (address: string, symbol: string) => {
    try {
      await navigator.clipboard.writeText(address)
      const popup = document.createElement('div')
      popup.textContent = '✓ Copied!'
      popup.className = 'fixed bottom-4 left-4 bg-white text-black px-4 py-2 rounded-md text-sm z-[1000] pointer-events-none'
      document.body.appendChild(popup)
      setTimeout(() => {
        if (popup.parentNode) {
          popup.remove()
        }
      }, 2000)
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
    // Use parent's dialog state to prevent closing on price refresh
    const stableKey = `${token.chain}-${token.symbol}-${token.address || 'native'}`
    const isDialogOpen = openDialogToken === stableKey
    const setIsDialogOpen = (open: boolean) => setOpenDialogToken(open ? stableKey : null)
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
      <div className="grid grid-cols-[minmax(20px,auto)_1fr_1fr_1fr_minmax(20px,auto)] sm:grid-cols-[minmax(20px,auto)_2fr_1fr_1fr_minmax(60px,auto)_2fr_minmax(40px,auto)] items-center gap-2 sm:gap-4 border-b border-white/10 mx-2 sm:mx-4 py-4 last:border-b-0 overflow-hidden">
        {/* Chain Icon - Furthest Left Column */}
        <div className="flex space-x-2 items-center justify-center min-w-[18px]">
          <Image
            src={Number(token.chain) === 1 ? "/coin-logos/ETH-white.svg" : "/coin-logos/PLS-white.svg"}
            alt={Number(token.chain) === 1 ? "Ethereum" : "PulseChain"}
            width={14}
            height={14}
            className="w-4 h-4 brightness-50 contrast-75"
          />
        </div>
        
        {/* Token Info - Left Column */}
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
              <span className="sm:hidden">{displayAmount}</span>
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
            {formatPrice(tokenPrice)}
          </div>
        </div>

        {/* 24h Price Change Column */}
        <div className="text-center">
          <div className={`text-[10px] md:text-xs font-bold ${
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
        <div className="hidden sm:flex flex-col items-center justify-center min-w-[60px]">
          {shouldShowLeague ? (
            <>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
            <DialogContent className="w-full max-w-[360px] sm:max-w-[560px] max-h-[90vh] bg-black border-2 border-white/10 rounded-lg overflow-y-scroll scrollbar-hide animate-none">
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
        <div className="text-right overflow-hidden">
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
  })

  // Calculate total USD value from ALL addresses combined (or filtered by selected address)
  const { totalUsdValue, addressValues } = useMemo(() => {
    if (!filteredBalances || !Array.isArray(filteredBalances)) {
      return { totalUsdValue: 0, addressValues: [] }
    }

    let totalValue = 0
    const addressVals: Array<{ address: string; label: string; value: number }> = []

    // Calculate value for each address (only if liquid balances are included)
    if (showLiquidBalances) {
      filteredBalances.forEach(addressData => {
        let addressValue = 0
        
        // Add native PLS value
        const nativePrice = getTokenPrice(addressData.nativeBalance.symbol)
        addressValue += addressData.nativeBalance.balanceFormatted * nativePrice
        
        // Add token values
        addressData.tokenBalances?.forEach(token => {
          const tokenPrice = getTokenPrice(token.symbol)
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
    }

    // Add validator value if enabled
    if (showValidators && validatorCount > 0) {
      const validatorPLS = validatorCount * 32_000_000 // 32 million PLS per validator
      const plsPrice = getTokenPrice('PLS')
      const validatorValue = validatorPLS * plsPrice
      totalValue += validatorValue
    }

    return { totalUsdValue: totalValue, addressValues: addressVals }
  }, [filteredBalances, prices, addresses, getTokenPrice, showValidators, validatorCount, showLiquidBalances])

  // Calculate 24h portfolio change percentage
  const portfolio24hChange = useMemo(() => {
    if (!filteredBalances || !Array.isArray(filteredBalances) || !prices) {
      return 0
    }

    let currentTotalValue = 0
    let previousTotalValue = 0

    // Calculate both current and 24h ago values for each token (only if liquid balances are included)
    if (showLiquidBalances) {
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

        // Get current and previous prices
        tokenCurrentPrice = getTokenPrice(token.symbol)
        
        // For backing price tokens, calculate 24h change based on HEX or eHEX with actual backing multiplier
        if (useBackingPrice && shouldUseBackingPrice(token.symbol)) {
          // Get the actual backing per token from the MAXI API
          const backingPerToken = getBackingPerToken(token.symbol)
          const backingMultiplier = backingPerToken !== null ? backingPerToken : 2 // fallback to 2
          
          // Use eHEX for e/we tokens, HEX for regular tokens
          const hexSymbol = (token.symbol.startsWith('e') || token.symbol.startsWith('we')) ? 'eHEX' : 'HEX'
          const hexPriceData = prices[hexSymbol]
          const hex24hChange = hexPriceData?.priceChange?.h24 || 0
          const hexPrevPrice = hex24hChange !== 0 
            ? (hexPriceData?.price || 0) / (1 + (hex24hChange / 100))
            : (hexPriceData?.price || 0)
          tokenPrevPrice = hexPrevPrice * backingMultiplier
        } else if (isStablecoin(token.symbol)) {
          // Stablecoins don't change
          tokenPrevPrice = 1
        } else {
          // Regular market price 24h change
          const tokenPriceData = prices[token.symbol]
          const token24hChange = tokenPriceData?.priceChange?.h24 || 0
          tokenPrevPrice = token24hChange !== 0 
            ? tokenCurrentPrice / (1 + (token24hChange / 100))
            : tokenCurrentPrice
        }

        currentTotalValue += tokenBalance * tokenCurrentPrice
        previousTotalValue += tokenBalance * tokenPrevPrice
      })
    })
    }

    // Calculate percentage change
    if (previousTotalValue === 0) return 0
    return ((currentTotalValue - previousTotalValue) / previousTotalValue) * 100
  }, [filteredBalances, prices, getTokenPrice, useBackingPrice, shouldUseBackingPrice, isStablecoin, showLiquidBalances])

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
    // Include MAXI loading for backing price functionality
    if (isInitialLoad) {
      return hasInitialData && !balancesLoading && !pricesLoading && !maxiLoading
    }
    
    // After initial load, stay ready as long as we have data
    return hasInitialData
  }, [
    addresses.length,
    balancesLoading,
    pricesLoading,
    maxiLoading,
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
    maxiLoading,
    balancesError,
    maxiError,
    balances: balances ? balances.length : 'null',
    prices: prices ? Object.keys(prices).length : 'null',
    maxiData: maxiData ? Object.keys(maxiData).length : 'null',
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
    maxiLoading,
    hasBalancesError: !!balancesError,
    hasMaxiError: !!maxiError,
    hasBalances: balances && balances.length > 0,
    hasPrices: prices && Object.keys(prices).length > 0,
    hasMaxiData: maxiData && Object.keys(maxiData).length > 0,
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

  // Show loading state only on initial load when there are addresses
  if (addresses.length > 0 && isInitialLoad && !isEverythingReady) {
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
    <div className="w-full overflow-x-hidden">
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
        className="space-y-6 flex flex-col items-center w-full"
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
                        className="w-4 h-4 brightness-75 contrast-75 group-hover:brightness-100 group-hover:contrast-100"
                      />
                    )}
                                      {chainFilter === 'pulsechain' && (
                      <Image 
                        src="/coin-logos/PLS-white.svg" 
                        alt="PulseChain" 
                        width={16} 
                        height={16}
                        className="w-4 h-4 brightness-75 contrast-75 group-hover:brightness-100 group-hover:contrast-100"
                      />
                    )}
                  {chainFilter === 'both' && (
                    <>
                                              <Image 
                          src="/coin-logos/ETH-white.svg" 
                          alt="Ethereum" 
                          width={16} 
                          height={16}
                          className="w-4 h-4 brightness-75 contrast-75 group-hover:brightness-100 group-hover:contrast-100 ml-1"
                        />
                        <span className="text-xs text-gray-400 group-hover:text-white">+</span>
                        <Image 
                          src="/coin-logos/PLS-white.svg" 
                          alt="PulseChain" 
                          width={16} 
                          height={16}
                          className="w-4 h-4 brightness-75 contrast-75 group-hover:brightness-100 group-hover:contrast-100"
                        />
                    </>
                  )}
                </div>
              </button>
              
              {/* Edit button */}
              <button
                onClick={() => setShowEditModal(true)}
                className="p-2 mr-2 rounded-lg text-gray-400 hover:text-white transition-colors"
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
              <span className="sm:hidden">${formatBalanceMobile(totalUsdValue)}</span>
              <span className="hidden sm:inline">${formatBalance(totalUsdValue)}</span>
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
              <button 
                key={addr.id}
                onClick={() => handleAddressFilter(addr.id)}
                className={`px-3 py-1 border rounded-full text-xs transition-colors cursor-pointer focus:outline-none ${
                  selectedAddressIds.includes(addr.id) 
                    ? 'border-white bg-white text-black' 
                    : 'border-white/20 hover:bg-white/20 text-white'
                }`}
              >
                {addr.label || formatAddress(addr.address)}
              </button>
            ))}
          </div>
          
          {/* Advanced Filters Button */}
          <div className="mt-4 flex justify-center">
            <button 
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm"
            >
              <span>Advanced filters</span>
              <ChevronDown
                size={16} 
                className={`transition-transform duration-200 ${showAdvancedFilters ? '' : 'rotate-180'}`}
              />
            </button>
          </div>
          
          {/* Advanced Filters Toggle Section */}
          {showAdvancedFilters && (
            <div className="mt-0 p-2">
              <div className="flex flex-wrap gap-6 justify-center">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="liquid-balances"
                    checked={showLiquidBalances}
                    onCheckedChange={(checked) => setShowLiquidBalances(checked === true)}
                  />
                  <label 
                    htmlFor="liquid-balances" 
                    className="text-sm text-white cursor-pointer"
                  >
                    Include liquid balances
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hex-stakes"
                    checked={showHexStakes}
                    onCheckedChange={(checked) => setShowHexStakes(checked === true)}
                  />
                  <label 
                    htmlFor="hex-stakes" 
                    className="text-sm text-white cursor-pointer"
                  >
                    Include HEX stakes
                  </label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="validators"
                    checked={showValidators}
                    onCheckedChange={(checked) => setShowValidators(checked === true)}
                  />
                  <label 
                    htmlFor="validators" 
                    className="text-sm text-white cursor-pointer"
                  >
                    Include Validators
                  </label>
                </div>
              </div>
            </div>
          )}
        </Section>
      )}



      {/* Tokens Table */}
      {isEverythingReady && sortedTokens.length > 0 && showLiquidBalances && (
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
          className="bg-black border-2 border-white/10 rounded-2xl p-1 sm:p-6 max-w-[860px] w-full overflow-hidden"
        >
                      <div className="space-y-3 overflow-hidden">
            {sortedTokens.map((token, tokenIndex) => {
              const tokenPrice = getTokenPrice(token.symbol)
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
      {addresses.length > 0 && isEverythingReady && sortedTokens.length === 0 && showLiquidBalances && (
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

      {/* Validators Section */}
      {addresses.length > 0 && isEverythingReady && showValidators && validatorCount > 0 && (
        <Section 
          {...(showMotion ? {
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 },
            transition: { 
              duration: 0.5,
              delay: 0.5,
              ease: [0.23, 1, 0.32, 1]
            }
          } : {})}
          className="max-w-[860px] w-full"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">Validators</h3>
          </div>
          
          <div className="space-y-4">
            <Card className="bg-black/20 backdrop-blur-sm text-white p-4 rounded-xl border-2 border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex items-center justify-center">
                    <CoinLogo symbol="PLS" size="md" className="rounded-none" variant="default" />
                  </div>
                  <div>
                    <div className="text-lg font-bold">PLS Validators</div>
                    <div className="text-sm text-zinc-500">
                      {validatorCount.toLocaleString()} validator{validatorCount !== 1 ? 's' : ''} × 32M PLS each
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-xl font-bold">
                    ${formatBalance((validatorCount * 32_000_000) * getTokenPrice('PLS'))}
                  </div>
                  <div className="text-sm text-zinc-500">
                    {formatBalance(validatorCount * 32_000_000)} PLS
                  </div>
                </div>
                             </div>
            </Card>
          </div>
        </Section>
      )}

      {/* HEX Stakes Section */}
      {addresses.length > 0 && isEverythingReady && showHexStakes && (
        <Section 
          {...(showMotion ? {
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 },
            transition: { 
              duration: 0.5,
              delay: 0.5,
              ease: [0.23, 1, 0.32, 1]
            }
          } : {})}
          className="max-w-[860px] w-full"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white">HEX Stakes</h3>
          </div>
          
                    {/* Total HEX Stakes Value */}
          <div className="bg-black border-2 border-white/10 rounded-2xl py-6 text-center mb-6">
                      {(() => {
            const totalHexValue = filteredHexStakes.reduce((total, stake) => {
              const stakeHex = stake.principleHex + stake.yieldHex
              const hexPrice = getTokenPrice('HEX')
              return total + (stakeHex * hexPrice)
            }, 0)
              
              const hexPriceData = prices['HEX']
              const priceChange24h = hexPriceData?.priceChange?.h24 || 0
              
              return (
                <>
                  <div className="flex items-center justify-center gap-2">
                    <div className="text-4xl font-bold text-white">
                      ${Math.round(totalHexValue).toLocaleString()}
                    </div>
                    <div className={`text-sm font-bold ${priceChange24h >= 0 ? 'text-[#00ff55]' : 'text-red-500'}`}>
                      {priceChange24h > 0 ? '+' : ''}{priceChange24h.toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-sm text-gray-400 mt-2">
                    {filteredHexStakes.reduce((total, stake) => total + stake.principleHex + stake.yieldHex, 0).toLocaleString()} HEX across {filteredHexStakes.length} stake{filteredHexStakes.length !== 1 ? 's' : ''}
                  </div>
                </>
              )
            })()}
          </div>
          
          <div className="space-y-4">
            {filteredHexStakes.map((stake) => (
              <Card key={stake.id} className="bg-black/20 backdrop-blur-sm text-white p-4 rounded-xl border-2 border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 px-3 py-1 border border-cyan-400 rounded-lg bg-cyan-400/10">
                      <span className="text-xs font-medium text-cyan-400">Stake ID:</span>
                      <span className="text-xs font-bold text-cyan-400">{stake.stakeId}</span>
                    </div>
                    <div className={`px-3 py-1 rounded-lg text-xs font-medium border bg-green-400/10 ${
                      stake.status === 'active' 
                        ? 'border-green-400 text-green-400' 
                        : 'border-gray-400 text-gray-400'
                    }`}>
                      {stake.status.charAt(0).toUpperCase() + stake.status.slice(1)}
                    </div>
                  </div>
                  
                  {/* Chain Icon */}
                  <div className="flex-shrink-0">
                    <Image
                      src={stake.chain === 'ETH' ? "/coin-logos/ETH-white.svg" : "/coin-logos/PLS-white.svg"}
                      alt={stake.chain === 'ETH' ? "Ethereum" : "PulseChain"}
                      width={16}
                      height={16}
                      className="w-4 h-4 brightness-50 contrast-75"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const totalHex = stake.principleHex + stake.yieldHex
                        const hexPrice = getTokenPrice('HEX')
                        const totalValue = totalHex * hexPrice
                        const hexPriceData = prices['HEX']
                        const priceChange24h = hexPriceData?.priceChange?.h24 || 0
                        
                        return (
                          <>
                            <div className="text-3xl font-bold">${Math.round(totalValue).toLocaleString()}</div>
                            <div className={`text-xs font-bold ${priceChange24h >= 0 ? 'text-[#00ff55]' : 'text-red-500'}`}>
                              {priceChange24h > 0 ? '+' : ''}{priceChange24h.toFixed(1)}%
                            </div>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                  <div className="text-sm text-zinc-500">
                    {(stake.principleHex + stake.yieldHex).toLocaleString()} HEX (Principle: {stake.principleHex.toLocaleString()} HEX, Yield: {stake.yieldHex.toLocaleString()} HEX)
                  </div>
                  <div className="text-sm text-zinc-500">
                    {stake.tShares.toLocaleString()} T-Shares
                  </div>
                  
                  {/* Progress Bar with percentage above and days left below */}
                  <div className="text-xs mb-2 mt-2 mr-8">
                    <div 
                      className="text-[#70D668] font-bold"
                      style={{ marginLeft: `${Math.min(stake.progress, 90)}%` }}
                    >
                      {stake.progress}%
                    </div>
                  </div>
                  <div className="relative h-[4px] mb-2">
                    <div className="absolute inset-0 bg-[#23411F] rounded-full" />
                    <div 
                      className="absolute inset-y-0 left-0 bg-[#70D668] rounded-full" 
                      style={{ width: `${stake.progress}%` }} 
                    />
                  </div>
                  <div className="text-xs text-zinc-500 text-right">
                    {stake.daysLeft} days left
                  </div>
                  
                  <div className="space-y-1 text-sm text-zinc-500">
                    <div>Start: {(() => {
                      const date = new Date(stake.startDate)
                      return date.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: '2-digit', 
                        year: 'numeric' 
                      })
                    })()}</div>
                    <div>End: {(() => {
                      const date = new Date(stake.endDate)
                      return date.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: '2-digit', 
                        year: 'numeric' 
                      })
                    })()}</div>
                  </div>
                </div>
              </Card>
            ))}
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
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start sm:items-center justify-center p-4 pt-16 sm:pt-16"
              onClick={() => setShowEditModal(false)}
            >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-black border-2 border-white/20 rounded-2xl w-full max-w-[85vw] sm:max-w-2xl max-h-[500px] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Fixed Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10">
                <div className="flex bg-white/5 border border-white/10 rounded-full p-1">
                  <button
                    onClick={() => setActiveTab('addresses')}
                    className={`px-6 py-1.5 text-sm font-medium rounded-full transition-all duration-200 relative z-10 ${
                      activeTab === 'addresses' 
                        ? 'bg-white text-black shadow-lg' 
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {addresses.length} Address{addresses.length !== 1 ? 'es' : ''}
                  </button>
                  <button
                    onClick={() => setActiveTab('settings')}
                    className={`px-6 py-1.5 text-sm font-medium rounded-full transition-all duration-200 relative z-10 ${
                      activeTab === 'settings' 
                        ? 'bg-white text-black shadow-lg' 
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    Settings
                  </button>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                >
                  <X size={20} />
                </button>
                                </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-6">
                {activeTab === 'addresses' && (
                  <>
              {/* Address List */}
                    <div className="space-y-4">
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
                    <div key={addr.id} className="flex items-center gap-2 sm:gap-4 py-3 border-b border-white/10 last:border-b-0">
                      {/* Address */}
                      <div className="flex-1 font-mono text-sm text-white select-text">
                        <span className="sm:hidden select-text">0x...{addr.address.slice(-4)}</span>
                        <span className="hidden sm:block select-text">{addr.address}</span>
                              </div>
                      
                      {/* Name/Label Field */}
                      <div className="w-32 sm:w-64">
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
                          className="w-full px-3 py-2 bg-black border border-white/20 rounded-lg text-sm text-white placeholder-gray-500 focus:border-white/40 focus:outline-none text-[11px] sm:text-sm"
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
                </>
              )}

              {/* Settings Tab */}
              {activeTab === 'settings' && (
                <div className="space-y-6 max-h-[50vh]">
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex-1">
                        <div className="font-medium text-white mb-1">MAXI Tokens</div>
                        <div className="text-sm text-gray-400">
                          Use the backing price instead of the current market price
                        </div>
                      </div>
                      <button
                        onClick={() => setUseBackingPrice(!useBackingPrice)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                          useBackingPrice ? 'bg-white' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${
                            useBackingPrice ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex-1 mb-3">
                        <div className="font-medium text-white mb-1">Validators</div>
                        <div className="text-sm text-gray-400">
                          Number of validators you own (32M PLS each)
                        </div>
                      </div>
                      <input
                        type="number"
                        min="0"
                        value={validatorCount === 0 ? '' : validatorCount}
                        onChange={(e) => setValidatorCount(Math.max(0, parseInt(e.target.value) || 0))}
                        placeholder="0"
                        className="w-full px-3 py-2 bg-black border border-white/20 rounded-lg text-white placeholder-gray-500 focus:border-white/40 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
  
                  </div>
                </div>
              )}
              </div>

              {/* Fixed Footer - Add New Address (only for addresses tab) */}
              {activeTab === 'addresses' && (
                <div className="border-t border-white/10 p-4 sm:p-6 bg-black">
                  <div className="space-y-3">
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

                    <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    placeholder="0x..."
                    value={newAddressInput}
                    onChange={(e) => setNewAddressInput(e.target.value)}
                        className="w-full sm:w-1/2 px-3 py-2 bg-black border border-white/20 rounded-lg text-white placeholder-gray-500 focus:border-white/40 focus:outline-none text-sm"
                  />
                      <div className="flex gap-3 w-full sm:w-1/2">
                  <input
                    type="text"
                    placeholder="Name (optional)"
                    value={newLabelInput}
                    onChange={(e) => setNewLabelInput(e.target.value)}
                          className="flex-1 px-3 py-2 bg-black border border-white/20 rounded-lg text-white placeholder-gray-500 focus:border-white/40 focus:outline-none text-sm"
                  />
                  <button
                    onClick={handleAddAddressInModal}
                    disabled={!newAddressInput.trim()}
                          className="px-6 py-2 bg-white text-black font-medium rounded-lg disabled:bg-white disabled:text-black disabled:cursor-not-allowed hover:bg-gray-100 transition-colors whitespace-nowrap"
                  >
                    +
                  </button>
      </div>
    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Container>
    </div>
  )
} 