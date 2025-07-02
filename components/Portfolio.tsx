'use client'

import { useState, useMemo, useEffect, memo, useCallback, useRef } from 'react'
import { CoinLogo } from '@/components/ui/CoinLogo'
import { useTokenPrices } from '@/hooks/crypto/useTokenPrices'
import { useTokenSupply } from '@/hooks/crypto/useTokenSupply'
import { usePortfolioBalance } from '@/hooks/crypto/usePortfolioBalance'
import { useMaxiTokenData } from '@/hooks/crypto/useMaxiTokenData'
import { useHexStakes } from '@/hooks/crypto/useHexStakes'
import { useBackgroundPreloader } from '@/hooks/crypto/useBackgroundPreloader'
import { useHexDailyDataCache } from '@/hooks/crypto/useHexDailyData'
import { motion, AnimatePresence } from 'framer-motion'
import { TOKEN_CONSTANTS } from '@/constants/crypto'
import { Icons } from '@/components/ui/icons'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Toggle } from '@/components/ui/toggle'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import LeagueTable from '@/components/LeagueTable'
import TSharesLeagueTable from '@/components/ui/TSharesLeagueTable'
import { getDisplayTicker } from '@/utils/ticker-display'
import Image from 'next/image'
import { ChevronDown } from 'lucide-react'

interface StoredAddress {
  address: string
  label?: string
  id: string
}

interface PortfolioProps {
  detectiveMode?: boolean
  detectiveAddress?: string
}

export default function Portfolio({ detectiveMode = false, detectiveAddress }: PortfolioProps) {
  // Temporarily hide portfolio analysis section
  const showPortfolioAnalysis = false
  // Debug toggle - set to true to show network debug panel
  const SHOW_DEBUG_PANEL = false
  
  // Track component renders for debugging
  const renderCountRef = useRef(0)
  renderCountRef.current += 1
  
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
  const [addressLabelInput, setAddressLabelInput] = useState('')
  const [multipleAddresses, setMultipleAddresses] = useState<Array<{address: string, label: string, id: string, isEditing?: boolean, originalLabel?: string}>>([])
  const [showMultipleAddressList, setShowMultipleAddressList] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  // Add state for pending addresses (added but not yet fetched)
  const [pendingAddresses, setPendingAddresses] = useState<StoredAddress[]>([])
  // Add state for removed address IDs (to filter from display)
  const [removedAddressIds, setRemovedAddressIds] = useState<Set<string>>(new Set())
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
  // Add state for HEX stakes display pagination
  const [displayedStakesCount, setDisplayedStakesCount] = useState(20)
  // Add state for backing price toggle
  const [useBackingPrice, setUseBackingPrice] = useState<boolean>(() => {
    if (detectiveMode) {
      // Detective mode uses market price by default, no localStorage
      return false
    }
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolioUseBackingPrice')
      return saved === 'true'
    }
    return false
  })
  // Add to Portfolio component state
  const [chainFilter, setChainFilter] = useState<'pulsechain' | 'ethereum' | 'both'>(() => {
    // Detective mode always uses PulseChain only
    if (detectiveMode) {
      return 'pulsechain'
    }
    // Initialize from localStorage if available
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolioChainFilter')
      if (saved && ['pulsechain', 'ethereum', 'both'].includes(saved)) {
        return saved as 'pulsechain' | 'ethereum' | 'both'
      }
    }
    return 'both'
  })
  // Add state for including pooled stakes
  const [includePooledStakes, setIncludePooledStakes] = useState<boolean>(() => {
    if (detectiveMode) {
      // Detective mode includes pooled stakes by default
      return true
    }
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolioIncludePooledStakes')
      return saved === 'true'
    }
    return false
  })
  
  // Advanced filters state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolioShowAdvancedFilters')
      return saved !== null ? saved === 'true' : false // Default to false
    }
    return false
  })

  // League dialog states
  const [leagueDialogOpen, setLeagueDialogOpen] = useState(false)
  const [soloLeagueDialogOpen, setSoloLeagueDialogOpen] = useState(false)

  // HEX stakes sorting state
  const [hexStakesSortField, setHexStakesSortField] = useState<'amount' | 'startDate' | 'endDate' | 'progress'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolioHexStakesSortField')
      if (saved && ['amount', 'startDate', 'endDate', 'progress'].includes(saved)) {
        return saved as 'amount' | 'startDate' | 'endDate' | 'progress'
      }
    }
    return 'endDate'
  })
  const [hexStakesSortDirection, setHexStakesSortDirection] = useState<'asc' | 'desc'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolioHexStakesSortDirection')
      if (saved && ['asc', 'desc'].includes(saved)) {
        return saved as 'asc' | 'desc'
      }
    }
    return 'asc'
  })
  
  // Token balances sorting state
  const [tokenSortField, setTokenSortField] = useState<'amount' | 'change' | 'league'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolioTokenSortField')
      if (saved && ['amount', 'change', 'league'].includes(saved)) {
        return saved as 'amount' | 'change' | 'league'
      }
    }
    return 'amount'
  })
  const [tokenSortDirection, setTokenSortDirection] = useState<'asc' | 'desc'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolioTokenSortDirection')
      if (saved && ['asc', 'desc'].includes(saved)) {
        return saved as 'asc' | 'desc'
      }
    }
    return 'desc'
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
      return saved !== null ? saved === 'true' : true // Default to true
    }
    return true
  })
  const [showValidators, setShowValidators] = useState<boolean>(() => {
    // Detective mode never shows validators
    if (detectiveMode) {
      return false
    }
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolioShowValidators')
      return saved !== null ? saved === 'true' : true // Default to true
    }
    return true
  })
  
  // Dust filter state
  const [dustFilter, setDustFilter] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolioDustFilter')
      return saved ? parseFloat(saved) || 0 : 0
    }
    return 0
  })

  // Dust filter input display state (separate from the actual filter value)
  const [dustFilterInput, setDustFilterInput] = useState<string>('')

  // Hide tokens with no price data state
  const [hideTokensWithoutPrice, setHideTokensWithoutPrice] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolioHideTokensWithoutPrice')
      return saved !== null ? saved === 'true' : true // Default to true (show tokens with no price)
    }
    return true
  })

  // HEX stakes status filter state
  const [stakeStatusFilter, setStakeStatusFilter] = useState<'active' | 'inactive'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolioStakeStatusFilter')
      if (saved && (saved === 'active' || saved === 'inactive')) {
        return saved as 'active' | 'inactive'
      }
    }
    return 'active' // Default to showing active stakes
  })
  
  // Validator settings state
  const [validatorCount, setValidatorCount] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolioValidatorCount')
      return saved ? parseInt(saved, 10) || 0 : 0
    }
    return 0
  })

  // 24h change display toggle state (percentage vs dollar amount)
  const [showDollarChange, setShowDollarChange] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolioShowDollarChange')
      return saved === 'true'
    }
    return false // Default to showing percentage
  })

  // Dialog state for league tables (moved up to prevent closing on price refresh)
  const [openDialogToken, setOpenDialogToken] = useState<string | null>(null)

  // Detective mode: use the provided address instead of stored addresses
  const effectiveAddresses = detectiveMode && detectiveAddress 
    ? [{ address: detectiveAddress, label: 'Detective Target', id: 'detective-target' }]
    : addresses

  // Debug logging function that uses the DebugPanel's window.addDebugLog
  const addDebugLog = useCallback((type: 'start' | 'progress' | 'complete' | 'error', operation: string, details?: string) => {
    if (typeof window !== 'undefined' && (window as any).addDebugLog) {
      (window as any).addDebugLog(type, operation, details)
    } else if (SHOW_DEBUG_PANEL) {
      // Fallback: log to console if DebugPanel isn't ready yet
      console.log(`[Debug] ${type.toUpperCase()}: ${operation}`, details || '')
    }
  }, [SHOW_DEBUG_PANEL])

  // Initialize debug logging when component mounts
  useEffect(() => {
    if (SHOW_DEBUG_PANEL) {
      // Small delay to ensure DebugPanel is ready
      const timer = setTimeout(() => {
        addDebugLog('start', 'Portfolio Component', `Mounted with ${effectiveAddresses.length} address${effectiveAddresses.length !== 1 ? 'es' : ''}`)
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [SHOW_DEBUG_PANEL, addDebugLog, effectiveAddresses.length])



  // Portfolio-specific images are now preloaded by the background preloader

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

  // Handle modal close on outside click or escape key
  useEffect(() => {
    if (!showEditModal) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleModalClose()
      }
    }

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element
      if (target?.closest('[data-modal-content]')) return
      handleModalClose()
    }

    document.addEventListener('keydown', handleEscape)
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEditModal])



  // Load addresses and preferences from localStorage on mount (skip in detective mode)
  useEffect(() => {
    if (detectiveMode) return // Skip localStorage operations in detective mode
    
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
  }, [detectiveMode])

  // Save addresses to localStorage whenever addresses change (skip in detective mode)
  useEffect(() => {
    if (detectiveMode) return // Skip localStorage operations in detective mode
    if (addresses.length > 0) {
      localStorage.setItem('portfolioAddresses', JSON.stringify(addresses))
    }
  }, [addresses, detectiveMode])

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

  // Clean up stale selected address IDs whenever addresses change
  useEffect(() => {
    if (selectedAddressIds.length > 0) {
      const validAddressIds = new Set(effectiveAddresses.map(addr => addr.id))
      const staleIds = selectedAddressIds.filter(id => !validAddressIds.has(id))
      
      if (staleIds.length > 0) {
        console.log('[Portfolio] Cleaning up stale selected address IDs:', staleIds, 'Valid IDs:', Array.from(validAddressIds))
        const cleanedIds = selectedAddressIds.filter(id => validAddressIds.has(id))
        setSelectedAddressIds(cleanedIds)
      }
    }
    // Also clear if no addresses exist but filters are still selected
    else if (selectedAddressIds.length > 0 && effectiveAddresses.length === 0) {
      console.log('[Portfolio] No addresses exist, clearing all selected filters')
      setSelectedAddressIds([])
    }
  }, [selectedAddressIds, effectiveAddresses])

  // Save backing price setting to localStorage whenever it changes (skip in detective mode)
  useEffect(() => {
    if (!detectiveMode) {
    localStorage.setItem('portfolioUseBackingPrice', useBackingPrice.toString())
    }
  }, [useBackingPrice, detectiveMode])

  // Save pooled stakes setting to localStorage whenever it changes (skip in detective mode)
  useEffect(() => {
    if (!detectiveMode) {
    localStorage.setItem('portfolioIncludePooledStakes', includePooledStakes.toString())
    }
  }, [includePooledStakes, detectiveMode])

  // Save validator count to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('portfolioValidatorCount', validatorCount.toString())
  }, [validatorCount])

  // Save 24h change display toggle to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('portfolioShowDollarChange', showDollarChange.toString())
  }, [showDollarChange])

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

  // Advanced stats state
  const [showAdvancedStats, setShowAdvancedStats] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolioShowAdvancedStats')
      return saved !== null ? saved === 'true' : false // Default to false
    }
    return false
  })

  // Save advanced stats state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('portfolioShowAdvancedStats', showAdvancedStats.toString())
  }, [showAdvancedStats])

  // Save HEX stakes sorting preferences to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('portfolioHexStakesSortField', hexStakesSortField)
  }, [hexStakesSortField])

  useEffect(() => {
    localStorage.setItem('portfolioHexStakesSortDirection', hexStakesSortDirection)
  }, [hexStakesSortDirection])

  // Save dust filter to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('portfolioDustFilter', dustFilter.toString())
  }, [dustFilter])

  // Save hide tokens without price setting to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('portfolioHideTokensWithoutPrice', hideTokensWithoutPrice.toString())
  }, [hideTokensWithoutPrice])

  // Save token sorting preferences to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('portfolioTokenSortField', tokenSortField)
  }, [tokenSortField])

  useEffect(() => {
    localStorage.setItem('portfolioTokenSortDirection', tokenSortDirection)
  }, [tokenSortDirection])

  // Save stake status filter to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('portfolioStakeStatusFilter', stakeStatusFilter)
  }, [stakeStatusFilter])

  // Detective mode overrides - ensure liquid balances and HEX stakes are always shown
  useEffect(() => {
    if (detectiveMode) {
      setShowLiquidBalances(true)
      setShowHexStakes(true)
    }
  }, [detectiveMode])

  // Portfolio analysis state for detective mode
  const [portfolioAnalysis, setPortfolioAnalysis] = useState<string | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [rateLimitInfo, setRateLimitInfo] = useState<{ remaining: number; resetTime?: string } | null>(null)

  // Validate Ethereum address format
  const isValidAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  }

  // Check if address already exists (including pending addresses)
  const isDuplicateAddress = (address: string): boolean => {
    return addresses.some(addr => addr.address.toLowerCase() === address.toLowerCase()) ||
           pendingAddresses.some(addr => addr.address.toLowerCase() === address.toLowerCase())
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

  // Handle paste events for auto-detection
  const handleAddressPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text')
    const results = parseBulkAddresses(pastedText)
    
    if (results.valid.length === 1 && results.invalid.length === 0) {
      // Single valid address - auto-submit after a brief delay
      setTimeout(() => {
        if (isValidAddress(addressInput) || isValidAddress(pastedText)) {
          const addressToSubmit = addressInput || pastedText
          if (!isDuplicateAddress(addressToSubmit)) {
            const newAddress: StoredAddress = {
              address: addressToSubmit,
              label: '',
              id: Date.now().toString()
            }
            setAddresses(prev => [...prev, newAddress])
            setAddressInput('')
          }
        }
      }, 100)
    } else if (results.valid.length > 1) {
      // Multiple addresses - prevent default paste and show list interface
      e.preventDefault()
      const multipleAddressList = results.valid.map(address => ({
        address,
        label: '',
        id: Date.now().toString() + Math.random().toString(),
        isEditing: false,
        originalLabel: ''
      }))
      setMultipleAddresses(multipleAddressList)
      setShowMultipleAddressList(true)
      setAddressInput('')
    }
  }

  // Handle adding address from main input (simplified for single address)
  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isValidAddress(addressInput)) {
      // Single address handling
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

  // Handle adding all addresses from multiple address list
  const handleAddMultipleAddresses = () => {
    const validAddresses = multipleAddresses.filter(addr => 
      isValidAddress(addr.address) && !isDuplicateAddress(addr.address)
    )
    
    if (validAddresses.length > 0) {
      // Close modal first to show loading state
      setShowMultipleAddressList(false)
      setMultipleAddresses([])
      setAddressInput('')
      setAddressLabelInput('')
      
      // Add addresses after modal is closed (slight delay to ensure UI updates)
      setTimeout(() => {
        setAddresses(prev => [...prev, ...validAddresses])
      }, 50)
    }
  }

  // Update label for address in multiple addresses list
  const updateMultipleAddressLabel = (id: string, label: string, isEditing?: boolean, originalLabel?: string) => {
    setMultipleAddresses(prev => 
      prev.map(addr => addr.id === id ? { 
        ...addr, 
        label,
        isEditing: isEditing !== undefined ? isEditing : addr.isEditing,
        originalLabel: originalLabel !== undefined ? originalLabel : (addr.originalLabel || addr.label)
      } : addr)
    )
  }

  // Remove address from multiple addresses list
  const removeFromMultipleAddresses = (id: string) => {
    setMultipleAddresses(prev => prev.filter(addr => addr.id !== id))
    if (multipleAddresses.length <= 1) {
      setShowMultipleAddressList(false)
      setMultipleAddresses([])
    }
  }

  // Handle paste events for inline address input with bulk detection
  const handleInlineAddressPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pastedText = e.clipboardData.getData('text')
    const results = parseBulkAddresses(pastedText)
    
    // If multiple addresses detected, handle as bulk
    if (results.valid.length > 1 || results.invalid.length > 0 || results.duplicates.length > 0) {
      e.preventDefault() // Prevent default paste
      
      // Set bulk parse results for display
      setBulkParseResults(results)
      
      // Add all valid addresses to the multiple addresses list
      if (results.valid.length > 0) {
        const newAddresses = results.valid.map(address => ({
          address,
          label: addressLabelInput || '', // Use the label for all addresses if provided
          id: Date.now().toString() + Math.random().toString(),
          isEditing: false,
          originalLabel: addressLabelInput || ''
        }))
        
        // Filter out any that are already in the list or existing addresses
        const filteredAddresses = newAddresses.filter(newAddr => {
          const isDuplicateInExisting = isDuplicateAddress(newAddr.address)
          const isDuplicateInList = multipleAddresses.some(addr => 
            addr.address.toLowerCase() === newAddr.address.toLowerCase()
          )
          return !isDuplicateInExisting && !isDuplicateInList
        })
        
        setMultipleAddresses(prev => [...prev, ...filteredAddresses])
          setAddressInput('')
        setAddressLabelInput('')
      }
      
      // Clear results after 10 seconds
      setTimeout(() => setBulkParseResults(null), 10000)
    }
    // For single address, let the default paste behavior happen
  }

  // Add new address to multiple addresses list
  const addToMultipleAddresses = () => {
    if (!addressInput.trim()) {
      return
    }

    if (!isValidAddress(addressInput)) {
      setDuplicateError('Invalid address format')
      setTimeout(() => setDuplicateError(null), 3000)
      return
    }

    // Check for duplicates in existing addresses
      if (isDuplicateAddress(addressInput)) {
        setDuplicateError('You already added this address')
        setTimeout(() => setDuplicateError(null), 3000)
        return
      }
      
    // Check for duplicates in current multiple addresses list
    const isDuplicateInList = multipleAddresses.some(addr => 
      addr.address.toLowerCase() === addressInput.toLowerCase()
    )
    
    if (isDuplicateInList) {
      setDuplicateError('Address already in the list')
      setTimeout(() => setDuplicateError(null), 3000)
      return
    }

    // If we get here, the address is valid and not a duplicate
    const newAddress = {
        address: addressInput,
      label: addressLabelInput || '',
      id: Date.now().toString() + Math.random().toString(),
      isEditing: false,
      originalLabel: addressLabelInput || ''
      }
    setMultipleAddresses(prev => [...prev, newAddress])
      setAddressInput('')
    setAddressLabelInput('')
    setDuplicateError(null) // Clear any existing errors
  }

  // Optimized address filter handler
  const handleAddressFilter = useCallback((addressId: string) => {
    setSelectedAddressIds(prev => {
      const newSelection = prev.includes(addressId) 
        ? prev.filter(id => id !== addressId)
        : [...prev, addressId]
      
      // If all addresses would be selected, clear the selection instead
      if (newSelection.length === effectiveAddresses.length) {
        return []
      } else {
        return newSelection
      }
    })
  }, [effectiveAddresses.length])

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

  // Commit pending addresses and removals to main addresses state (triggers data fetch)
  const commitPendingAddresses = () => {
    // Apply removals and additions
    const addressesAfterRemovals = addresses.filter(addr => !removedAddressIds.has(addr.id))
    const finalAddresses = [...addressesAfterRemovals, ...pendingAddresses]
    
    // Only update if there are actual changes
    if (removedAddressIds.size > 0 || pendingAddresses.length > 0) {
      console.log('[Portfolio] Committing address changes:', {
        removals: removedAddressIds.size,
        additions: pendingAddresses.length,
        finalCount: finalAddresses.length,
        beforeCommit: { 
          addresses: addresses?.length || 0, 
          pending: pendingAddresses?.length || 0,
          pendingAddresses: pendingAddresses?.map(a => ({ id: a.id, label: a.label, address: a.address.slice(0, 10) + '...' })) || []
        },
        afterCommit: { 
          finalAddresses: finalAddresses?.map(a => ({ id: a.id, label: a.label, address: a.address.slice(0, 10) + '...' })) || []
        }
      })
      setAddresses(finalAddresses)
      localStorage.setItem('portfolioAddresses', JSON.stringify(finalAddresses))
      setPendingAddresses([])
      
      // Reset initial load state when adding new addresses to ensure proper loading flow
      if (pendingAddresses.length > 0) {
        console.log('[Portfolio] New addresses added, resetting to initial load state')
        setIsInitialLoad(true)
      }
    }
  }

  // Handle modal close - commit any pending addresses and removals
  const handleModalClose = () => {
    commitPendingAddresses()
    setShowEditModal(false)
    // Clear removed address IDs filter since we're done editing
    setRemovedAddressIds(new Set())
  }

  // Handle adding address from modal - add to pending state, don't fetch immediately
  const handleAddAddressInModal = () => {
    // Check if multiple addresses were pasted
    const results = parseBulkAddresses(newAddressInput)
    
    if (results.valid.length > 1 || results.invalid.length > 0 || results.duplicates.length > 0) {
      // Multiple addresses detected - handle as bulk
      setBulkParseResults(results)
      
      // Add all valid addresses to pending state
      if (results.valid.length > 0) {
        const newAddresses = results.valid.map(address => ({
          address,
          label: newLabelInput || '', // Use the label for all addresses if provided
          id: Date.now().toString() + Math.random().toString()
        }))
        
        // Add to pending addresses instead of immediate fetch
        setPendingAddresses(prev => [...prev, ...newAddresses])
        
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
      // Single address handling - add to pending state
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
      
      // Add to pending addresses instead of immediate fetch
      setPendingAddresses(prev => [...prev, newAddress])
      
      // Initialize editing state for new address
      initializeEditingState(newId, newLabelInput)
      
      setNewAddressInput('')
      setNewLabelInput('')
      setDuplicateError(null)
    }
  }

  // Remove address - just filter from display, don't refetch data
  const removeAddress = (id: string) => {
    // Add to removed list for immediate UI filtering
    setRemovedAddressIds(prev => new Set([...prev, id]))
    
    // Remove editing state for deleted address
    setEditingStates(prev => {
      const newStates = { ...prev }
      delete newStates[id]
      return newStates
    })
    
    // Also remove from pending addresses if it was pending
    setPendingAddresses(prev => prev.filter(addr => addr.id !== id))
    
    // Check if all addresses would be deleted after filtering
    const remainingAddresses = addresses.filter(addr => addr.id !== id)
    const remainingPendingAddresses = pendingAddresses.filter(addr => addr.id !== id)
    
    if (remainingAddresses.length === 0 && remainingPendingAddresses.length === 0) {
      // If this is the last address, immediately commit the removal and close modal
      setAddresses([])
      localStorage.removeItem('portfolioAddresses')
      setPendingAddresses([])
      setRemovedAddressIds(new Set())
      setShowEditModal(false)
    }
    
    // Note: We don't update addresses state here to avoid refetching data
    // The actual removal will happen in handleModalClose via commitPendingAddresses
  }

  // Update address label
  const updateAddressLabel = (id: string, label: string) => {
    const updatedAddresses = addresses.map(addr => 
      addr.id === id ? { ...addr, label: label || undefined } : addr
    )
    setAddresses(updatedAddresses)
    localStorage.setItem('portfolioAddresses', JSON.stringify(updatedAddresses))
  }

  // Get combined addresses list for display (includes pending, excludes removed)
  const displayAddresses = useMemo(() => {
    const activeAddresses = addresses.filter(addr => !removedAddressIds.has(addr.id))
    return [...activeAddresses, ...pendingAddresses]
  }, [addresses, pendingAddresses, removedAddressIds])

  // Get all addresses for balance checking - memoize to prevent unnecessary re-fetches
  const allAddressStrings = useMemo(() => {
    const strings = effectiveAddresses.map(addr => addr.address)
    console.log('Portfolio Debug - Creating new address strings array:', strings)
    return strings
  }, [effectiveAddresses])

  // Fetch real HEX stakes data for user's addresses
  const { stakes: hexStakes, isLoading: hexStakesLoading, error: hexStakesError, hasStakes } = useHexStakes(allAddressStrings)
  
  console.log('Portfolio Debug - Using address strings:', allAddressStrings)

  // Fetch balances for ALL addresses using the updated hook
  const { balances: rawBalances, isLoading: balancesLoading, error: balancesError } = usePortfolioBalance(allAddressStrings)
  console.log('Portfolio Debug - Balance hook result:', { balances: rawBalances, balancesLoading, balancesError })
  
  // Debug logging for balance loading - track state changes only
  const lastBalanceStateRef = useRef<{loading: boolean, hasBalances: boolean, hasError: boolean, addressCount: number}>({
    loading: false,
    hasBalances: false,
    hasError: false,
    addressCount: 0
  })
  
  useEffect(() => {
    if (SHOW_DEBUG_PANEL) {
      const currentState = {
        loading: balancesLoading,
        hasBalances: !!(rawBalances && rawBalances.length > 0),
        hasError: !!balancesError,
        addressCount: allAddressStrings.length
      }
      
      const lastState = lastBalanceStateRef.current
      
      // Only log when there's an actual state change
      if (currentState.loading !== lastState.loading ||
          currentState.hasBalances !== lastState.hasBalances ||
          currentState.hasError !== lastState.hasError ||
          currentState.addressCount !== lastState.addressCount) {
        
                 if (currentState.loading && currentState.addressCount > 0) {
           // Each address needs to be checked on 2 chains (PulseChain + Ethereum)
           const totalChecks = currentState.addressCount * 2
     
         } else if (!currentState.loading && currentState.hasBalances) {
           const tokenCount = rawBalances?.reduce((total, addr) => total + (addr.tokenBalances?.length || 0), 0) || 0
           const nativeCount = rawBalances?.length || 0
           const errorCount = rawBalances?.filter(addr => addr.error).length || 0
           const details = errorCount > 0 
             ? `Found ${tokenCount + nativeCount} total balances (${tokenCount} tokens + ${nativeCount} native) - ${errorCount} addresses failed`
             : `Found ${tokenCount + nativeCount} total balances (${tokenCount} tokens + ${nativeCount} native)`
           
         } else if (currentState.hasError) {
           
         }
        
        lastBalanceStateRef.current = currentState
      }
    }
  }, [balancesLoading, rawBalances, balancesError, allAddressStrings.length, SHOW_DEBUG_PANEL])
  
  // Stabilize balances reference to prevent unnecessary re-renders
  const balances = useMemo(() => rawBalances || [], [rawBalances])

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
    // Note: Added eHEX to fix missing prices for eHEX stakes
    const baseTokens = ['PLS', 'PLSX', 'HEX', 'eHEX', 'ETH', 'USDC', 'DAI', 'USDT']
    
    // Add tokens from HEX stakes to ensure we have prices for stake calculations
    const stakeTokens: string[] = []
    if (hexStakes && hexStakes.length > 0) {
      hexStakes.forEach(stake => {
        const stakeToken = stake.chain === 'ETH' ? 'eHEX' : 'HEX'
        if (!stakeTokens.includes(stakeToken)) {
          stakeTokens.push(stakeToken)
        }
      })
    }
    
    const allTickers = [...new Set([...tokens, ...baseTokens, ...stakeTokens])]
    
    // Return a stable array - only change if the actual content changes
    return allTickers.sort() // Sort for consistent ordering
  }, [
    // Only depend on the actual token symbols, not the balance objects
    balances && balances.map(b => [
      b.nativeBalance.symbol,
      ...(b.tokenBalances?.map(t => t.symbol) || [])
    ].join(',')).sort().join('|'),
    // Also depend on HEX stakes to include their tokens in price fetching
    hexStakes && hexStakes.map(s => s.chain).sort().join('|')
  ])

  // Minimal debug logging (only when needed)
  // console.log('[Portfolio] Component render - balances:', balances?.length, 'tickers:', allTokenTickers.length, 'chainFilter:', chainFilter, 'selectedIds:', selectedAddressIds.length)

  // Fetch prices for all tokens with balances
  const { prices: rawPrices, isLoading: pricesLoading } = useTokenPrices(allTokenTickers)

  // Fetch MAXI token backing data
  const { data: maxiData, isLoading: maxiLoading, error: maxiError, getBackingPerToken } = useMaxiTokenData()

  // Get HEX daily data for T-shares calculations
  const { data: hexDailyData } = useHexDailyDataCache()

  // Debug logging for prices
  useEffect(() => {
    if (SHOW_DEBUG_PANEL) {
      if (pricesLoading && allTokenTickers.length > 0) {
        // Token price logging is disabled by default - controlled by $ button in debug panel
      } else if (!pricesLoading && rawPrices && Object.keys(rawPrices).length > 0) {
        // Token price logging is disabled by default - controlled by $ button in debug panel
      }
    }
  }, [pricesLoading, rawPrices, allTokenTickers.length, addDebugLog, SHOW_DEBUG_PANEL])

  // Debug logging for MAXI data
  useEffect(() => {
    if (SHOW_DEBUG_PANEL) {
      if (maxiLoading) {
        addDebugLog('start', 'MAXI Data', 'Loading backing price data')
      } else if (!maxiLoading && maxiData && Object.keys(maxiData).length > 0) {
        addDebugLog('complete', 'MAXI Data', `Loaded ${Object.keys(maxiData).length} MAXI tokens`)
      } else if (maxiError) {
        addDebugLog('error', 'MAXI Data', typeof maxiError === 'string' ? maxiError : (maxiError as any)?.message || 'Failed to load')
      }
    }
  }, [maxiLoading, maxiData, maxiError, addDebugLog, SHOW_DEBUG_PANEL])

  // Debug logging for HEX stakes
  useEffect(() => {
    if (SHOW_DEBUG_PANEL) {
      if (hexStakesLoading && allAddressStrings.length > 0) {
        addDebugLog('start', 'HEX Stakes', `Loading stakes for ${allAddressStrings.length} addresses`)
      } else if (!hexStakesLoading && hexStakes && hexStakes.length > 0) {
        addDebugLog('complete', 'HEX Stakes', `Loaded ${hexStakes.length} HEX stakes`)
      } else if (hexStakesError) {
        addDebugLog('error', 'HEX Stakes', typeof hexStakesError === 'string' ? hexStakesError : (hexStakesError as any)?.message || 'Failed to load')
      }
    }
  }, [hexStakesLoading, hexStakes, hexStakesError, allAddressStrings.length, addDebugLog, SHOW_DEBUG_PANEL])

  // Start background preloading of token supplies and images
  const { supplies: preloadedSupplies, totalSupplies, lastUpdated } = useBackgroundPreloader()
  console.log(`[Portfolio] Background preloader - ${totalSupplies} supplies loaded, last updated:`, lastUpdated)

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
    
    // Filter balances by selected chain and address, excluding removed addresses
    const filtered = balances.filter(addressData => {
              // Filter out removed addresses
        const addressObj = effectiveAddresses.find(addr => addr.address === addressData.address)
        if (addressObj && removedAddressIds.has(addressObj.id)) {
          return false
        }
      
      // Filter by chain - only apply if not 'both'
      const chainMatch = chainFilter === 'both' || 
        (chainFilter === 'pulsechain' && addressData.chain === 369) ||
        (chainFilter === 'ethereum' && addressData.chain === 1)
      
              // Filter by selected addresses
        const addressMatch = selectedAddressIds.length > 0 
          ? selectedAddressIds.some(id => effectiveAddresses.find(addr => addr.id === id && addr.address === addressData.address))
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
  }, [balances, selectedAddressIds, addresses, chainFilter, removedAddressIds])

  // Helper function to check if a token is a stablecoin (including e-versions)
  const isStablecoin = useCallback((symbol: string): boolean => {
    const stablecoins = [
      // PulseChain wrapped stablecoins (we-prefixed)
      'weDAI', 'weUSDC', 'weUSDT', 'weUSDL',
      // Ethereum native/original stablecoins
      'USDC', 'USDT', 'DAI', 'BUSD', 'TUSD', 'USDP', 'LUSD', 'GUSD',
      // Other stablecoins
      'CST', 'USDL'
    ]
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

  // Helper function to get token supply from constants
  const getTokenSupply = (symbol: string): number | null => {
    const tokenConfig = TOKEN_CONSTANTS.find(token => token.ticker === symbol)
    return tokenConfig?.supply || null
  }

  // Define pooled stake tokens
  const POOLED_STAKE_TOKENS = ['MAXI', 'DECI', 'LUCKY', 'TRIO', 'BASE', 'eMAXI', 'eDECI', 'eLUCKY', 'eTRIO', 'eBASE', 'weMAXI', 'weDECI', 'ICSA', 'eICSA', 'weICSA']

  // Calculate pooled stakes T-shares from token balances
  const pooledStakesData = useMemo(() => {
    if (!includePooledStakes || !mainTokensWithBalances.length || !maxiData) {
      return { totalTShares: 0, totalValue: 0, tokens: [] }
    }

    // Get pooled tokens with balances
    const pooledTokens = mainTokensWithBalances.filter(token => 
      POOLED_STAKE_TOKENS.includes(token.symbol)
    )

    let totalTShares = 0
    let totalValue = 0
    let totalHex = 0
    let weightedStakeLength = 0
    let weightedAPY = 0
    const tokens: Array<{ symbol: string; balance: number; tShares: number; value: number }> = []

    pooledTokens.forEach(token => {
      // Get the token supply from constants or API
      const tokenSupply = getTokenSupply(token.symbol)
      
      // Map portfolio symbols to API symbols for getting stake data
      const symbolMap: Record<string, string> = {
        'MAXI': 'pMAXI',
        'eMAXI': 'eMAXI',
        'weMAXI': 'eMAXI',
        'DECI': 'pDECI', 
        'eDECI': 'eDECI',
        'weDECI': 'eDECI',
        'LUCKY': 'pLUCKY',
        'eLUCKY': 'eLUCKY',
        'TRIO': 'pTRIO',
        'eTRIO': 'eTRIO',
        'eBASE': 'eBASE3',
        'BASE': 'pBASE3',
        'BASE3': 'pBASE3',
        'eBASE3': 'eBASE3',
        'ICSA': 'pICSA',
        'eICSA': 'eICSA', 
        'weICSA': 'eICSA'
      }
      
      const apiSymbol = symbolMap[token.symbol]
      const poolData = apiSymbol && maxiData[apiSymbol]
      
      if (poolData && tokenSupply && tokenSupply > 0) {
        // Get T-shares and stake info from constants (more reliable than API)
        const tokenConfig = TOKEN_CONSTANTS.find(t => t.ticker === token.symbol)
        const poolTotalTShares = tokenConfig?.tshares || poolData.stake.tShares
        
        // Calculate user's share of the pool: (user tokens / total supply) * pool's total T-shares
        const userPoolShare = token.balanceFormatted / tokenSupply
        const userTShares = userPoolShare * poolTotalTShares
        
        const tokenPrice = getTokenPrice(token.symbol)
        const tokenValue = token.balanceFormatted * tokenPrice
        
        // Calculate HEX backing: user tokens * backing per token
        const backingPerToken = getBackingPerToken(token.symbol)
        const userHexBacking = backingPerToken ? token.balanceFormatted * backingPerToken : 0
        
        totalTShares += userTShares
        totalValue += tokenValue
        totalHex += userHexBacking
        
                  // Calculate weighted stake length and APY if stake info is available
          if (tokenConfig?.stakeStartDate && tokenConfig?.stakeEndDate && tokenConfig?.stakePrinciple) {
            const startDate = new Date(tokenConfig.stakeStartDate)
            const endDate = new Date(tokenConfig.stakeEndDate)
            const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
            
            // Weight by user's T-shares
            weightedStakeLength += totalDays * userTShares
            
            // Calculate APY based on backing value appreciation (each token started at 1 HEX backing)
            const now = new Date()
            const daysElapsed = Math.max(1, Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
            const launchDate = new Date((tokenConfig as any).launchDate || startDate)
            const daysSinceLaunch = Math.max(1, Math.floor((now.getTime() - launchDate.getTime()) / (1000 * 60 * 60 * 24)))
            
            // Each token started at 1 HEX backing, current backing is backingPerToken
            const currentBacking = backingPerToken || 1
            const yieldSinceLaunch = Math.max(0, currentBacking - 1) // Simply backing - 1 = yield
            
            // Calculate annualized APY: (yield / days since launch) * 365 * 100
            const apy = daysSinceLaunch > 0 ? (yieldSinceLaunch / daysSinceLaunch) * 365 * 100 : 0
            
            weightedAPY += apy * userTShares
            
            console.log(`[Pooled APY] ${token.symbol}: ${currentBacking.toFixed(4)} backing / 1 initial = ${((currentBacking / 1 - 1) * 100).toFixed(2)}% total return over ${daysSinceLaunch} days = ${apy.toFixed(2)}% APY`)
          }
        
        tokens.push({
          symbol: token.symbol,
          balance: token.balanceFormatted,
          tShares: userTShares,
          value: tokenValue
        })
        
        console.log(`[Pooled Stakes] ${token.symbol}: ${token.balanceFormatted} tokens / ${tokenSupply} supply * ${poolTotalTShares} pool T-shares = ${userTShares.toFixed(2)} user T-shares`)
      }
    })

    const avgStakeLength = totalTShares > 0 ? weightedStakeLength / totalTShares : 0
    const avgAPY = totalTShares > 0 ? weightedAPY / totalTShares : 0

    return { totalTShares, totalValue, totalHex, tokens, avgStakeLength, avgAPY }
  }, [includePooledStakes, mainTokensWithBalances, maxiData, getTokenSupply, getTokenPrice])

  // Filter and sort HEX stakes by selected addresses and chain
  const filteredHexStakes = useMemo(() => {
    // Debug: Log all unique status values found in the stakes data
    if (hexStakes && hexStakes.length > 0) {
      const uniqueStatuses = [...new Set(hexStakes.map(stake => stake.status))]
      console.log('[HEX Stakes Debug] Unique status values found:', uniqueStatuses)
      console.log('[HEX Stakes Debug] Current filter:', stakeStatusFilter)
      console.log('[HEX Stakes Debug] Total stakes before filtering:', hexStakes.length)
    }

    const filtered = hexStakes
      .filter(stake => {
        // Filter out removed addresses
        const addressObj = effectiveAddresses.find(addr => addr.address.toLowerCase() === stake.address.toLowerCase())
        if (addressObj && removedAddressIds.has(addressObj.id)) {
          return false
        }
        
        // Filter by selected addresses
        const addressMatch = selectedAddressIds.length > 0 
          ? selectedAddressIds.some(id => effectiveAddresses.find(addr => addr.id === id && addr.address.toLowerCase() === stake.address.toLowerCase()))
          : true
        
        // Filter by chain - detective mode only shows PulseChain stakes
        const chainMatch = detectiveMode 
          ? stake.chain === 'PLS' 
          : (chainFilter === 'both' || 
             (chainFilter === 'ethereum' && stake.chain === 'ETH') ||
             (chainFilter === 'pulsechain' && stake.chain === 'PLS'))
        
        // Filter by stake status
        const statusMatch = stakeStatusFilter === stake.status
        
        return addressMatch && chainMatch && statusMatch
      })

        // Helper function to calculate stake value
        const getStakeValue = (stake: any) => {
          const stakeHex = stake.principleHex + stake.yieldHex
          const hexPrice = stake.chain === 'ETH' ? getTokenPrice('eHEX') : getTokenPrice('HEX')
          return stakeHex * hexPrice
        }

    // Sort the filtered stakes
    return filtered.sort((a, b) => {
      let comparison = 0

      switch (hexStakesSortField) {
        case 'amount':
            const aValue = getStakeValue(a)
            const bValue = getStakeValue(b)
          comparison = bValue - aValue // Higher values first
          break
        case 'startDate':
          const aStartDate = new Date(a.startDate).getTime()
          const bStartDate = new Date(b.startDate).getTime()
          comparison = aStartDate - bStartDate
          break
        case 'endDate':
          const aEndDate = new Date(a.endDate).getTime()
          const bEndDate = new Date(b.endDate).getTime()
          comparison = aEndDate - bEndDate
          break
        case 'progress':
          comparison = b.progress - a.progress // Higher progress first
          break
      }
          
      // Secondary sort by amount if primary sort yields equal values
      if (comparison === 0 && hexStakesSortField !== 'amount') {
            const aValue = getStakeValue(a)
            const bValue = getStakeValue(b)
            comparison = bValue - aValue
        }

        return hexStakesSortDirection === 'asc' ? comparison : -comparison
      })
  }, [hexStakes, selectedAddressIds, addresses, chainFilter, getTokenPrice, hexStakesSortField, hexStakesSortDirection, removedAddressIds, stakeStatusFilter, detectiveMode])

  // Always show all possible status types regardless of data
  const availableStatuses = useMemo(() => {
    const allPossibleStatuses = ['active', 'inactive']
    console.log('[HEX Stakes Debug] Showing all possible statuses:', allPossibleStatuses)
    return allPossibleStatuses
  }, [])

  // Debug: Log section visibility conditions
  useEffect(() => {
    console.log('[HEX Stakes Debug] Section visibility check:', {
      hasAddresses: effectiveAddresses.length > 0,
      showHexStakes: showHexStakes,
      hasStakes: hasStakes,
      hexStakesLength: hexStakes?.length || 0,
      filteredStakesLength: filteredHexStakes.length
    })
  }, [effectiveAddresses.length, showHexStakes, hasStakes, hexStakes?.length, filteredHexStakes.length])

  // Reset displayed stakes count when filters change
  useEffect(() => {
    setDisplayedStakesCount(20)
  }, [chainFilter, selectedAddressIds, hexStakesSortField, hexStakesSortDirection])

  // Memoized sorted tokens to prevent re-sorting on every render
  const sortedTokens = useMemo(() => {
    console.log(`[SORT MEMO] Running sortedTokens memo - sortField: ${tokenSortField}, direction: ${tokenSortDirection}`)
    if (!mainTokensWithBalances.length || !prices) return []
    
    // First filter by dust threshold and price data availability, then sort
    const filteredTokens = mainTokensWithBalances.filter(token => {
      const tokenPrice = getTokenPrice(token.symbol)
      
      // Filter by price data availability
      if (!hideTokensWithoutPrice && tokenPrice === 0) {
        return false // Hide tokens with no price when toggle is OFF
      }
      
      // If token has no price but toggle is ON, always show it (override dust filter)
      if (hideTokensWithoutPrice && tokenPrice === 0) {
        return true
      }
      
      // Filter by dust threshold for tokens with price data
      if (dustFilter <= 0) return true
      
      const usdValue = token.balanceFormatted * tokenPrice
      
      return usdValue >= dustFilter
    })
    
    return [...filteredTokens].sort((a, b) => {
      const aPrice = getTokenPrice(a.symbol)
      const bPrice = getTokenPrice(b.symbol)
      const aValue = a.balanceFormatted * aPrice
      const bValue = b.balanceFormatted * bPrice
      
      let comparison = 0
      
      if (tokenSortField === 'amount') {
        // Sort by USD value
        comparison = bValue - aValue // Higher value first for desc
      } else if (tokenSortField === 'change') {
        if (showDollarChange) {
          // Sort by 24h dollar change when in dollar mode
          const aPriceData = prices[a.symbol]
          const bPriceData = prices[b.symbol]
          const aPercentChange = aPriceData?.priceChange?.h24 || 0
          const bPercentChange = bPriceData?.priceChange?.h24 || 0
          
          // Calculate dollar changes
          const aDollarChange = aPrice !== 0 && aPercentChange !== undefined 
            ? (a.balanceFormatted * aPrice * aPercentChange) / 100
            : 0
          const bDollarChange = bPrice !== 0 && bPercentChange !== undefined 
            ? (b.balanceFormatted * bPrice * bPercentChange) / 100  
            : 0
          
          comparison = bDollarChange - aDollarChange // Higher dollar change first for desc
        } else {
          // Sort by 24h percentage change when in percentage mode
          const aPriceData = prices[a.symbol]
          const bPriceData = prices[b.symbol]
          const aChange = aPriceData?.priceChange?.h24 || 0
          const bChange = bPriceData?.priceChange?.h24 || 0
          comparison = bChange - aChange // Higher change first for desc
        }
        
        // Secondary sort by USD value if changes are equal
        if (Math.abs(comparison) < 0.01) {
          comparison = bValue - aValue
        }
      }
      
      // Apply sort direction
      const result = tokenSortDirection === 'desc' ? comparison : -comparison
      
      // Tertiary sort by symbol for stability if values are very close
      if (Math.abs(result) < 0.01) {
      return a.symbol.localeCompare(b.symbol)
      }
      
      return result
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
    maxiData && Object.keys(maxiData).length,
    // Include dust filter
    dustFilter,
    // Include hide tokens without price setting
    hideTokensWithoutPrice,
    // Include token sorting
    tokenSortField,
    tokenSortDirection,
    // Include 24h change display mode to trigger re-sort when toggling
    showDollarChange
  ])

  // Format balance for display (token units - can use scientific notation)
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

  // Format dollar values for display (USD amounts - never use scientific notation)
  const formatDollarValue = (dollarAmount: number): string => {
    if (dollarAmount === 0) return '0.00'
    
    // For very small dust amounts, just show 0.00 instead of scientific notation
    if (dollarAmount > 0 && dollarAmount < 0.01) {
      return '0.00'
    }
    
    if (dollarAmount >= 1e15) return (dollarAmount / 1e15).toFixed(1) + 'Q' // Quadrillion
    if (dollarAmount >= 1e12) return (dollarAmount / 1e12).toFixed(1) + 'T' // Trillion
    if (dollarAmount >= 1e9) return (dollarAmount / 1e9).toFixed(1) + 'B'   // Billion
    if (dollarAmount >= 1e6) return (dollarAmount / 1e6).toFixed(1) + 'M'   // Million
    if (dollarAmount < 10) return dollarAmount.toFixed(2)
    return Math.floor(dollarAmount).toLocaleString('en-US')
  }

  // Format large numbers for mobile with K, M, B, T, Q suffixes, hide .0 decimals (token units)
  const formatBalanceMobile = (balance: number): string => {
    if (balance === 0) return '0.00'
    
    // For very small dust amounts, use scientific notation
    if (balance > 0 && balance < 0.01) {
      return balance.toExponential(2)
    }
    
    const formatWithSuffix = (value: number, suffix: string): string => {
      const fixed = value.toFixed(1)
      // Remove .0 if it's exactly .0, otherwise keep the decimal
      return (fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed) + suffix
    }
    
    if (balance >= 1e15) return formatWithSuffix(balance / 1e15, 'Q') // Quadrillion
    if (balance >= 1e12) return formatWithSuffix(balance / 1e12, 'T') // Trillion
    if (balance >= 1e9) return formatWithSuffix(balance / 1e9, 'B')   // Billion
    if (balance >= 1e6) return formatWithSuffix(balance / 1e6, 'M')   // Million
    if (balance >= 1e3) return formatWithSuffix(balance / 1e3, 'K')   // Thousand
    
    // For small amounts, show appropriate precision for 3 significant figures
    if (balance < 100) {
      if (balance >= 10) {
        // For values 10-99.99, show 1 decimal place (e.g., 81.4, not 81.44)
        return balance.toFixed(1)
      } else if (balance >= 1) {
        // For values 1-9.99, show 2 decimal places (e.g., 1.23, not 1.234)
        return balance.toFixed(2)
      } else {
        // For values under 1, use 3 significant figures
        return parseFloat(balance.toPrecision(3)).toString()
      }
    }
    return Math.floor(balance).toString()
  }

  // Format dollar values for mobile (USD amounts - never use scientific notation)
  const formatDollarValueMobile = (dollarAmount: number): string => {
    if (dollarAmount === 0) return '0.00'
    
    // For very small dust amounts, just show 0.00 instead of scientific notation
    if (dollarAmount > 0 && dollarAmount < 0.01) {
      return '0.00'
    }
    
    const formatWithSuffix = (value: number, suffix: string): string => {
      const fixed = value.toFixed(1)
      // Remove .0 if it's exactly .0, otherwise keep the decimal
      return (fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed) + suffix
    }
    
    if (dollarAmount >= 1e15) return formatWithSuffix(dollarAmount / 1e15, 'Q') // Quadrillion
    if (dollarAmount >= 1e12) return formatWithSuffix(dollarAmount / 1e12, 'T') // Trillion
    if (dollarAmount >= 1e9) return formatWithSuffix(dollarAmount / 1e9, 'B')   // Billion
    if (dollarAmount >= 1e6) return formatWithSuffix(dollarAmount / 1e6, 'M')   // Million
    if (dollarAmount >= 1e3) return formatWithSuffix(dollarAmount / 1e3, 'K')   // Thousand
    
    // For small amounts, show appropriate precision for 3 significant figures
    if (dollarAmount < 100) {
      if (dollarAmount >= 10) {
        // For values 10-99.99, show 1 decimal place (e.g., 81.4, not 81.44)
        return dollarAmount.toFixed(1)
      } else if (dollarAmount >= 1) {
        // For values 1-9.99, show 2 decimal places (e.g., 1.23, not 1.234)
        return dollarAmount.toFixed(2)
      } else {
        // For values under 1, show 2 decimal places instead of scientific notation
        return dollarAmount.toFixed(2)
      }
    }
    return Math.floor(dollarAmount).toString()
  }

  // Format address for display
  const formatAddress = (address: string): string => {
    return `0x...${address.slice(-4)}`
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
      popup.className = 'fixed bottom-4 left-4 bg-white text-black px-4 py-2 rounded-md text-sm z-[10000] pointer-events-none'
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

  // Toggle between percentage and dollar amount for 24h change
  const toggle24hChangeDisplay = useCallback(() => {
    const newShowDollarChange = !showDollarChange
    setShowDollarChange(newShowDollarChange)
    
    // Auto-sort by change when switching to dollar mode for better UX
    if (newShowDollarChange && tokenSortField !== 'change') {
      setTokenSortField('change')
      setTokenSortDirection('desc') // Show highest dollar changes first
    }
  }, [showDollarChange, tokenSortField])

  // Helper function to format 24h change (percentage or dollar)
  const format24hChange = useCallback((percentChange: number | undefined, dollarChange: number, showDollar: boolean = showDollarChange) => {
    if (showDollar) {
      if (dollarChange === 0) return '$0.00'
      const absChange = Math.abs(dollarChange)
      
      // For very small dust amounts, just show $0.00
      if (absChange > 0 && absChange < 0.01) {
        return '$0.00'
      }
      
      const decimals = absChange >= 10 ? 0 : absChange >= 1 ? 2 : 2
      return `${dollarChange >= 0 ? '+' : '-'}$${absChange.toFixed(decimals)}`
    } else {
      if (percentChange === undefined) return '0%'
      return `${percentChange >= 0 ? '+' : '-'}${Math.abs(percentChange).toFixed(1)}%`
    }
  }, [showDollarChange])



  // Memoized token symbols map to prevent re-renders
  const tokenSymbolsMap = useMemo(() => {
    const map = new Set<string>()
    mainTokensWithBalances.forEach(token => {
      map.add(token.symbol)
    })
    return map
  }, [mainTokensWithBalances.map(t => t.symbol).join('|')])

  // Memoized token row component to prevent unnecessary re-renders
  const TokenRow = memo(({ token, tokenPrice, tokenIndex, tokenSymbolsMap }: { 
    token: any; 
    tokenPrice: number; 
    tokenIndex: number; 
    tokenSymbolsMap: Set<string>;
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
    
    // Check if paired token exists using the symbols map
    const findPairedToken = (currentSymbol: string) => {
      const baseToken = getBaseTokenName(currentSymbol)
      
      if (currentSymbol.startsWith('e')) {
        // This is an 'e' token, look for 'we' version
        return tokenSymbolsMap.has(`we${baseToken}`)
      } else if (currentSymbol.startsWith('we')) {
        // This is a 'we' token, look for 'e' version
        return tokenSymbolsMap.has(`e${baseToken}`)
      }
      return false
    }
    
    const hasPairedToken = findPairedToken(token.symbol)
    const isEVersion = token.symbol.startsWith('e')
    const isWeVersion = token.symbol.startsWith('we')
    
    // Calculate combined balance for league calculation - combine we + e token balances
    const combinedBalance = useMemo(() => {
      let totalBalance = token.balanceFormatted
      
      // For e-tokens, find and add the paired we-token balance
      if (token.symbol.startsWith('e')) {
        const weSymbol = token.symbol.replace('e', 'we')
        const pairedWeToken = mainTokensWithBalances.find(t => t.symbol === weSymbol)
        if (pairedWeToken) {
          totalBalance += pairedWeToken.balanceFormatted
        }
      }
      
      // For we-tokens, find and add the paired e-token balance  
      if (token.symbol.startsWith('we')) {
        const eSymbol = token.symbol.replace('we', 'e')
        const pairedEToken = mainTokensWithBalances.find(t => t.symbol === eSymbol)
        if (pairedEToken) {
          totalBalance += pairedEToken.balanceFormatted
        }
      }
      
      return totalBalance
    }, [token.symbol, token.balanceFormatted, mainTokensWithBalances])
    
    // Only show league on 'e' version when there's a paired 'we' version
    // For all other tokens (not starting with e or we), always show league except for ETH
    const shouldShowLeague = !isEVersion && !isWeVersion 
      ? token.symbol !== 'ETH'  // Show for regular tokens (PLS, PLSX, HEX, etc.) but not ETH
      : !isWeVersion || !hasPairedToken
    
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

    // Get league supply - always use the original token supply for league calculations
    const leagueSupply = useMemo(() => {
      let symbolToSearch = token.symbol
      
      // For wrapped tokens (we versions), use the original "e" version supply for league calculations
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

    // Calculate league position based on percentage and T-shares for MAXI DAO tokens
    const leagueInfo = useMemo(() => {
      // Use leagueSupply for league calculations (hardcoded from constants) or fallback to finalSupply
      const supplyForLeague = leagueSupply || finalSupply
      if (!supplyForLeague || combinedBalance === 0) return { league: '', icon: '', userTShares: 0 }
      
      // Subtract OA supply if available for this token
      const oaSupply = OA_SUPPLIES[token.symbol] || 0
      const adjustedSupply = supplyForLeague - oaSupply
      
      // Use adjusted supply for percentage calculation with combined balance
      const percentage = (combinedBalance / adjustedSupply) * 100
      
      // Calculate T-shares for MAXI DAO tokens - use the original token's T-shares
      let userTShares = 0
      let symbolForTShares = token.symbol
      
      // For wrapped tokens, get T-shares from the original "e" version
      if (token.symbol.startsWith('we')) {
        symbolForTShares = token.symbol.replace('we', 'e')
      }
      
      const tokenConfig = TOKEN_CONSTANTS.find(t => t.ticker === symbolForTShares)
      if (tokenConfig?.tshares) {
        // User's T-shares = (User's balance / Total supply) * Total T-shares
        userTShares = (combinedBalance / adjustedSupply) * tokenConfig.tshares
      }
      
      // Use the exact same league system as LeagueTable.tsx
      if (percentage >= 10) return { league: 'Poseidon', icon: '/other-images/poseidon.png', userTShares }
      if (percentage >= 1) return { league: 'Whale', icon: '/other-images/whale.png', userTShares }
      if (percentage >= 0.1) return { league: 'Shark', icon: '/other-images/shark.png', userTShares }
      if (percentage >= 0.01) return { league: 'Dolphin', icon: '/other-images/dolphin.png', userTShares }
      if (percentage >= 0.001) return { league: 'Squid', icon: '/other-images/squid.png', userTShares }
      if (percentage >= 0.0001) return { league: 'Turtle', icon: '/other-images/turtle.png', userTShares }
      if (percentage >= 0.00001) return { league: 'Crab', icon: '/other-images/crab.png', userTShares }
      if (percentage >= 0.000001) return { league: 'Shrimp', icon: '/other-images/shrimp.png', userTShares }
      return { league: 'Shell', icon: '/other-images/shell.png', userTShares }
    }, [leagueSupply, finalSupply, combinedBalance, token.symbol])

    // Get 24h price change data from prices hook
    const priceData = prices[token.symbol]
    const priceChange24h = priceData?.priceChange?.h24

    // Calculate dollar amount change for 24h
    const dollarChange24h = useMemo(() => {
      if (tokenPrice === 0 || priceChange24h === undefined || token.balanceFormatted === 0) {
        return 0
      }
      
      const currentValue = token.balanceFormatted * tokenPrice
      const price24hAgo = tokenPrice / (1 + (priceChange24h / 100))
      const value24hAgo = token.balanceFormatted * price24hAgo
      
      return currentValue - value24hAgo
    }, [tokenPrice, priceChange24h, token.balanceFormatted])

    // In TokenRow component, add chain context to league calculations
    const leagueSupplyDeduction = useMemo(() => {
      // Use chain-specific OA supplies
      const chainKey = `${token.symbol}-${token.chain}`
      return OA_SUPPLIES[chainKey] || OA_SUPPLIES[token.symbol] || 0
    }, [token.symbol, token.chain])

    // Stabilize dialog props to prevent glitching
    const stableDialogProps = useMemo(() => ({
      tokenTicker: token.symbol,
      preloadedSupply: (leagueSupply || finalSupply) || undefined,
      supplyDeduction: leagueSupplyDeduction,
      userBalance: combinedBalance,
      userTShares: leagueInfo.userTShares > 0 ? leagueInfo.userTShares : undefined
    }), [token.symbol, leagueSupply, finalSupply, leagueSupplyDeduction, combinedBalance, leagueInfo.userTShares])

  return (
      <div className="grid grid-cols-[minmax(20px,auto)_2fr_1fr_2fr_minmax(20px,auto)] xs:grid-cols-[minmax(20px,auto)_1fr_1fr_1fr_minmax(20px,auto)] sm:grid-cols-[minmax(20px,auto)_2fr_1fr_1fr_minmax(60px,auto)_2fr_minmax(40px,auto)] items-center gap-2 sm:gap-4 border-b border-white/10 mx-2 sm:mx-4 py-4 last:border-b-0 overflow-hidden">
        {/* Chain Icon - Furthest Left Column */}
        <div className="flex space-x-2 items-center justify-center min-w-[18px]">
                      <CoinLogo
              symbol={Number(token.chain) === 1 ? "ETH-white" : "PLS-white"}
              size="sm"
              className="grayscale opacity-50"
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
            {tokenPrice === 0 ? '--' : formatPrice(tokenPrice)}
          </div>
        </div>

        {/* 24h Price Change Column */}
        <div className="text-center">
          <button 
            onClick={toggle24hChangeDisplay}
            className={`text-[10px] md:text-xs font-bold cursor-pointer hover:opacity-80 transition-opacity ${
              tokenPrice === 0
                ? 'text-gray-400'
                : showDollarChange
                ? dollarChange24h >= 0 
                  ? 'text-[#00ff55]' 
                  : 'text-red-500'
                : priceChange24h !== undefined
                ? priceChange24h >= 0 
                  ? 'text-[#00ff55]' 
                  : 'text-red-500'
                : 'text-gray-400'
            }`}
            title={showDollarChange ? "Click to show percentage" : "Click to show dollar amount"}
          >
            {tokenPrice === 0
              ? '--'
              : format24hChange(priceChange24h, dollarChange24h)
            }
          </button>
        </div>

        {/* League Column - Hidden on Mobile */}
        <div className="hidden sm:flex flex-col items-center justify-center min-w-[60px]">
          {shouldShowLeague ? (
            <>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <button className="w-8 h-8 flex items-center justify-center border-1 border-white/20 hover:bg-white/5 hover:shadow-lg transition-all duration-300 cursor-pointer mb-0 rounded-lg">
                {leagueInfo.icon && (
                  <Image
                    src={leagueInfo.icon}
                    alt={leagueInfo.league}
                    width={20}
                    height={20}
                    className="object-contain hover:brightness-150 hover:contrast-125 hover:saturate-150 transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]"
                  />
                )}
              </button>
            </DialogTrigger>
            <DialogContent className="w-full max-w-[360px] sm:max-w-[560px] bg-black border-2 border-white/10 rounded-lg">
              <div className="p-4">
                {isDialogOpen && (
                <LeagueTable 
                    tokenTicker={stableDialogProps.tokenTicker} 
                  containerStyle={false}
                  showLeagueNames={true}
                    preloadedSupply={stableDialogProps.preloadedSupply}
                  preloadedPrices={prices}
                    supplyDeduction={stableDialogProps.supplyDeduction}
                    userBalance={stableDialogProps.userBalance}
                    userTShares={stableDialogProps.userTShares}
                />
                )}
              </div>
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
            ${formatDollarValue(usdValue)}
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
                  <Icons.trending size={16} />
                </a>

                {/* Copy Icon - Copy Contract Address (only for non-native tokens, hidden on mobile) */}
                {!token.isNative && (
                <button
                    onClick={() => copyContractAddress(copyAddress, token.symbol)}
                    className="hidden sm:block p-1 -mt-0 transition-colors text-gray-400 hover:text-white"
                    title="Copy contract address"
                >
                    <Icons.copy size={16} />
                </button>
              )}
              </>
            ) : null
          })()}
            </div>
        </div>
    )
  })

  // Create sorted addresses for filter buttons (primary: label name, secondary: value)
  const sortedAddressesForFilters = useMemo(() => {
    // Use displayAddresses instead of effectiveAddresses to include pending addresses with labels
    const addressesToSort = detectiveMode ? effectiveAddresses : displayAddresses
    console.log('[Portfolio] sortedAddressesForFilters - Debug:', {
      detectiveMode,
      selectedAddressIds: selectedAddressIds,
      selectedCount: selectedAddressIds.length,
      addressesToSort: addressesToSort?.map(a => ({ id: a.id, label: a.label, address: a.address.slice(0, 10) + '...' })) || [],
      effectiveAddresses: effectiveAddresses?.map(a => ({ id: a.id, label: a.label, address: a.address.slice(0, 10) + '...' })) || [],
      displayAddresses: displayAddresses?.map(a => ({ id: a.id, label: a.label, address: a.address.slice(0, 10) + '...' })) || [],
      addresses: addresses?.length || 0,
      pendingAddresses: pendingAddresses?.length || 0
    })
    if (!addressesToSort.length) return []
    
    // Get address values for secondary sorting - use ALL balances, not filtered ones
    // This ensures stable sorting regardless of current filter state
    const addressValueMap = new Map<string, number>()
    if (balances && Array.isArray(balances)) {
      balances.forEach(addressData => {
        let addressValue = 0
        
        // Add native token value
        const nativePrice = getTokenPrice(addressData.nativeBalance.symbol)
        const nativeValue = addressData.nativeBalance.balanceFormatted * nativePrice
        addressValue += nativeValue
        console.log(`[Portfolio] ${addressData.address.slice(0, 8)}... native ${addressData.nativeBalance.symbol}: ${addressData.nativeBalance.balanceFormatted.toFixed(4)} @ $${nativePrice.toFixed(4)} = $${nativeValue.toFixed(2)}`)
        
        // Add token values
        addressData.tokenBalances?.forEach(token => {
          const tokenPrice = getTokenPrice(token.symbol)
          const tokenValue = token.balanceFormatted * tokenPrice
          addressValue += tokenValue
          if (tokenValue > 0.01) { // Only log significant values
            console.log(`[Portfolio] ${addressData.address.slice(0, 8)}... token ${token.symbol}: ${token.balanceFormatted.toFixed(4)} @ $${tokenPrice.toFixed(4)} = $${tokenValue.toFixed(2)}`)
          }
        })
        
        // Debug log address values for sorting
        console.log(`[Portfolio] Address ${addressData.address.slice(0, 8)}... value: $${addressValue.toFixed(2)}`)
        addressValueMap.set(addressData.address, addressValue)
      })
    }
    
    return [...addressesToSort].sort((a, b) => {
      const aHasCustomName = !!a.label
      const bHasCustomName = !!b.label
      
      // If both have custom names, sort alphabetically/numerically
      if (aHasCustomName && bHasCustomName) {
        const aLabel = a.label!
        const bLabel = b.label!
        
        // Helper function to extract numbers for proper numerical sorting
        const extractNumber = (label: string): number | null => {
          const match = label.match(/^(\d+)/)
          return match ? parseInt(match[1], 10) : null
        }
        
        const aNumber = extractNumber(aLabel)
        const bNumber = extractNumber(bLabel)
        
        // If both start with numbers, sort numerically
        if (aNumber !== null && bNumber !== null) {
          if (aNumber !== bNumber) {
            return aNumber - bNumber // Numerical order: 001, 002, 019
          }
          // If numbers are equal, fall through to string comparison
        }
        
        // If one has number and other doesn't, number comes first
        if (aNumber !== null && bNumber === null) return -1
        if (aNumber === null && bNumber !== null) return 1
        
        // Both are text or numbers are equal - sort alphabetically
        return aLabel.localeCompare(bLabel, undefined, { 
          numeric: true, 
          sensitivity: 'base' 
        })
      }
      
      // If both have no custom names, sort by portfolio value (highest first)
      if (!aHasCustomName && !bHasCustomName) {
        const aValue = addressValueMap.get(a.address) || 0
        const bValue = addressValueMap.get(b.address) || 0
        return bValue - aValue
      }
      
      // If one has custom name and other doesn't, custom names come first
      if (aHasCustomName && !bHasCustomName) return -1
      if (!aHasCustomName && bHasCustomName) return 1
      
      return 0 // Should never reach here
    }).map((addr, index) => {
      // Debug log the final sorted order
      const hasLabel = !!addr.label
      const value = addressValueMap.get(addr.address) || 0
      console.log(`[Portfolio] Sorted address ${index + 1}: ${addr.address.slice(0, 8)}... (${hasLabel ? `"${addr.label}"` : 'no label'}) - $${value.toFixed(2)}`)
      return addr
    })
  }, [detectiveMode, effectiveAddresses, displayAddresses, balances, getTokenPrice])

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
          label: effectiveAddresses.find(a => a.address === addressData.address)?.label || '',
          value: addressValue
        })
    })
    }

    // Add validator value if enabled (but not in detective mode)
    if (!detectiveMode && showValidators && validatorCount > 0 && chainFilter !== 'ethereum') {
      const validatorPLS = validatorCount * 32_000_000 // 32 million PLS per validator
      const plsPrice = getTokenPrice('PLS')
      const validatorValue = validatorPLS * plsPrice
      totalValue += validatorValue
    }

    // Add HEX stakes value if enabled (ONLY ACTIVE STAKES)
    if (showHexStakes && hexStakes) {
      // Filter active stakes by chain - detective mode only shows PulseChain stakes
      const activeStakes = hexStakes.filter(stake => 
        stake.status === 'active' && 
        (detectiveMode 
          ? stake.chain === 'PLS'
          : (chainFilter === 'both' || 
             (chainFilter === 'ethereum' && stake.chain === 'ETH') ||
             (chainFilter === 'pulsechain' && stake.chain !== 'ETH')))
      )
      const hexStakesValue = activeStakes.reduce((total, stake) => {
        const stakeHex = stake.principleHex + stake.yieldHex
        // Use eHEX price for Ethereum stakes, HEX price for PulseChain stakes
        const hexPrice = stake.chain === 'ETH' ? getTokenPrice('eHEX') : getTokenPrice('HEX')
        return total + (stakeHex * hexPrice)
      }, 0)
      totalValue += hexStakesValue
    }

    return { totalUsdValue: totalValue, addressValues: addressVals }
  }, [filteredBalances, prices, addresses, getTokenPrice, showValidators, validatorCount, showLiquidBalances, showHexStakes, hexStakes, detectiveMode])

  // Calculate 24h portfolio change percentage
  const portfolio24hChange = useMemo(() => {
    if (!prices) {
      return 0
    }

    let currentTotalValue = 0
    let previousTotalValue = 0

    // Calculate both current and 24h ago values for each token (only if liquid balances are included)
    if (showLiquidBalances && filteredBalances && Array.isArray(filteredBalances)) {
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

    // Add validator value if enabled (but not in detective mode)
    if (!detectiveMode && showValidators && validatorCount > 0 && chainFilter !== 'ethereum') {
      const validatorPLS = validatorCount * 32_000_000 // 32 million PLS per validator
      const plsPriceData = prices['PLS']
      const plsCurrentPrice = plsPriceData?.price || 0
      const pls24hChange = plsPriceData?.priceChange?.h24 || 0
      
      const plsPrevPrice = pls24hChange !== 0 
        ? plsCurrentPrice / (1 + (pls24hChange / 100))
        : plsCurrentPrice

      const validatorCurrentValue = validatorPLS * plsCurrentPrice
      const validatorPrevValue = validatorPLS * plsPrevPrice
      
      currentTotalValue += validatorCurrentValue
      previousTotalValue += validatorPrevValue
    }

    // Add HEX stakes value if enabled (ONLY ACTIVE STAKES)
    if (showHexStakes && hexStakes) {
      // Filter active stakes by chain - detective mode only shows PulseChain stakes
      const activeStakes = hexStakes.filter(stake => 
        stake.status === 'active' && 
        (detectiveMode 
          ? stake.chain === 'PLS'
          : (chainFilter === 'both' || 
             (chainFilter === 'ethereum' && stake.chain === 'ETH') ||
             (chainFilter === 'pulsechain' && stake.chain !== 'ETH')))
      )
      activeStakes.forEach(stake => {
        const stakeHex = stake.principleHex + stake.yieldHex
        // Use eHEX price for Ethereum stakes, HEX price for PulseChain stakes
        const hexSymbol = stake.chain === 'ETH' ? 'eHEX' : 'HEX'
        const hexPriceData = prices[hexSymbol]
        const hexCurrentPrice = hexPriceData?.price || 0
        const hex24hChange = hexPriceData?.priceChange?.h24 || 0
        
        const hexPrevPrice = hex24hChange !== 0 
          ? hexCurrentPrice / (1 + (hex24hChange / 100))
          : hexCurrentPrice

        const stakeCurrentValue = stakeHex * hexCurrentPrice
        const stakePrevValue = stakeHex * hexPrevPrice
        
        currentTotalValue += stakeCurrentValue
        previousTotalValue += stakePrevValue
      })
    }

    // Calculate percentage change
    if (previousTotalValue === 0) return 0
    return ((currentTotalValue - previousTotalValue) / previousTotalValue) * 100
  }, [filteredBalances, prices, getTokenPrice, useBackingPrice, shouldUseBackingPrice, isStablecoin, showLiquidBalances, showValidators, validatorCount, showHexStakes, hexStakes, detectiveMode])

  // Calculate portfolio dollar change for 24h
  const portfolio24hDollarChange = useMemo(() => {
    if (!prices || portfolio24hChange === 0) return 0
    
    // Calculate current total value
    let currentTotalValue = 0
    
    if (showLiquidBalances && filteredBalances && Array.isArray(filteredBalances)) {
      filteredBalances.forEach(addressData => {
        // Native token
        const nativeSymbol = addressData.nativeBalance.symbol
        const nativeBalance = addressData.nativeBalance.balanceFormatted
        const nativeCurrentPrice = getTokenPrice(nativeSymbol)
        currentTotalValue += nativeBalance * nativeCurrentPrice
        
        // Token balances
        addressData.tokenBalances?.forEach(token => {
          const tokenBalance = token.balanceFormatted
          const tokenCurrentPrice = getTokenPrice(token.symbol)
          currentTotalValue += tokenBalance * tokenCurrentPrice
        })
      })
    }

    // Add validator value if enabled (but not in detective mode)
    if (!detectiveMode && showValidators && validatorCount > 0 && chainFilter !== 'ethereum') {
      const validatorPLS = validatorCount * 32_000_000
      const plsCurrentPrice = getTokenPrice('PLS')
      currentTotalValue += validatorPLS * plsCurrentPrice
    }

    // Add HEX stakes value if enabled
    if (showHexStakes && hexStakes) {
      const activeStakes = hexStakes.filter(stake => 
        stake.status === 'active' && 
        (detectiveMode 
          ? stake.chain === 'PLS'
          : (chainFilter === 'both' || 
             (chainFilter === 'ethereum' && stake.chain === 'ETH') ||
             (chainFilter === 'pulsechain' && stake.chain !== 'ETH')))
      )
      activeStakes.forEach(stake => {
        const stakeHex = stake.principleHex + stake.yieldHex
        const hexSymbol = stake.chain === 'ETH' ? 'eHEX' : 'HEX'
        const hexCurrentPrice = getTokenPrice(hexSymbol)
        currentTotalValue += stakeHex * hexCurrentPrice
      })
    }

    // Calculate dollar change: (percentage / 100) * current value
    return (portfolio24hChange / 100) * currentTotalValue
  }, [portfolio24hChange, prices, getTokenPrice, showLiquidBalances, filteredBalances, showValidators, validatorCount, chainFilter, showHexStakes, hexStakes, detectiveMode])

  // Comprehensive loading state - wait for relevant data to be ready
  // Once ready, stay ready (don't hide UI during price updates)
  const isEverythingReady = useMemo(() => {
    const hasInitialData = effectiveAddresses.length > 0 && 
                          !balancesError &&
                          balances && 
                          balances.length > 0 &&
                          prices &&
                          Object.keys(prices).length > 0
    
    // Also ensure derived calculations are complete
    const hasCalculatedData = filteredBalances.length >= 0 && // Can be 0 if no balances match filters
                             typeof totalUsdValue === 'number' && // Ensure totalUsdValue has been calculated
                             typeof portfolio24hChange === 'number' // Ensure portfolio change has been calculated
    
    // Check if HEX stakes calculations are complete (if HEX stakes are enabled)
    // More robust check: ensure we're not loading AND have valid stake data structure
    const hexStakesCalculationsReady = !showHexStakes || (
      !hexStakesLoading && 
      Array.isArray(filteredHexStakes) && 
      // Either no stakes found (valid result) OR all stakes have required properties
      (filteredHexStakes.length === 0 || filteredHexStakes.every(stake => 
        stake && 
        typeof stake.progress === 'number' && 
        typeof stake.principleHex === 'number' && 
        typeof stake.yieldHex === 'number' &&
        typeof stake.tShares === 'number' &&
        typeof stake.address === 'string'
      ))
    )
    
    // Check if pooled stakes calculations are complete (if enabled)
    const pooledStakesCalculationsReady = !includePooledStakes || (
      typeof pooledStakesData.totalTShares === 'number' &&
      typeof pooledStakesData.totalValue === 'number' &&
      Array.isArray(pooledStakesData.tokens)
    )
    
    // Only consider loading states on initial load
    // Include MAXI loading for backing price functionality and all calculations
    if (isInitialLoad) {
      return hasInitialData && 
             hasCalculatedData && 
             hexStakesCalculationsReady && 
             pooledStakesCalculationsReady &&
             !balancesLoading && 
             !pricesLoading && 
             !maxiLoading
    }
    
    // After initial load, stay ready as long as we have data and calculations
    // For subsequent loads (like adding new addresses), ensure HEX stakes are also ready
    return hasInitialData && hasCalculatedData && hexStakesCalculationsReady
  }, [
    effectiveAddresses.length,
    balancesLoading,
    pricesLoading,
    maxiLoading,
    hexStakesLoading,
    balancesError,
    balances?.length,
    Object.keys(prices).length,
    filteredBalances.length,
    totalUsdValue,
    portfolio24hChange,
    isInitialLoad,
    showHexStakes,
    filteredHexStakes,
    filteredHexStakes?.length, // Add explicit dependency on stakes length
    includePooledStakes,
    pooledStakesData.totalTShares,
    pooledStakesData.totalValue,
    pooledStakesData.tokens
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
    hexStakesLoading,
    hasBalancesError: !!balancesError,
    hasMaxiError: !!maxiError,
    hasBalances: balances && balances.length > 0,
    hasPrices: prices && Object.keys(prices).length > 0,
    hasMaxiData: maxiData && Object.keys(maxiData).length > 0,
    hexStakesCount: filteredHexStakes?.length || 0,
    showHexStakes,
    hexStakesError,
    allAddressStrings,
    isEverythingReady
  })

  // Debug filteredBalances
  console.log('Portfolio Debug - filteredBalances:', {
    chainFilter,
    balancesRaw: balances,
    filteredBalances,
    mainTokensWithBalances
  })

  // Generate portfolio analysis for detective mode (manual trigger)
  const generatePortfolioAnalysis = useCallback(async () => {
    if (!detectiveMode || analysisLoading) return

    setAnalysisLoading(true)
    setAnalysisError(null)

    try {
      // Prepare portfolio data for analysis
      const significantTokens = sortedTokens.filter(token => {
        const tokenValue = token.balanceFormatted * getTokenPrice(token.symbol)
        return tokenValue >= 10 || sortedTokens.length <= 3 // Keep dust if it's all they have
      })

      const totalLiquidValue = significantTokens.reduce((sum, token) => 
        sum + (token.balanceFormatted * getTokenPrice(token.symbol)), 0)
      
      // Calculate HEX stakes value and stats
      const hexStakesValue = filteredHexStakes.reduce((sum, stake) => {
        const hexPrice = getTokenPrice('HEX')
        return sum + ((stake.principleHex + stake.yieldHex) * hexPrice)
      }, 0)
      const totalPortfolioValue = totalLiquidValue + hexStakesValue
      
      const activeStakes = filteredHexStakes.filter(stake => stake.status === 'active')
      const inactiveStakes = filteredHexStakes.filter(stake => stake.status === 'inactive')
      
              // Calculate correct values for prompt data only (UI has its own calculations)
      const promptActiveStakes = filteredHexStakes.filter(stake => stake.status === 'active')
      const promptTotalTShares = promptActiveStakes.reduce((total, stake) => total + stake.tShares, 0)
      
      const promptWeightedStakeLength = promptTotalTShares > 0 ? promptActiveStakes.reduce((sum, stake) => {
        const startDate = new Date(stake.startDate)
        const endDate = new Date(stake.endDate)
        const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        return sum + (totalDays * stake.tShares)
      }, 0) / promptTotalTShares : 0
      
      const promptWeightedAPY = promptTotalTShares > 0 ? promptActiveStakes.reduce((sum, stake) => {
        const startDate = new Date(stake.startDate)
        const now = new Date()
        const daysElapsed = Math.max(1, Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
        const apy = ((stake.yieldHex / stake.principleHex) / daysElapsed) * 365 * 100
        return sum + (apy * stake.tShares)
      }, 0) / promptTotalTShares : 0

      // Find earliest stake date to determine if OG
      const earliestStakeDate = filteredHexStakes.length > 0
        ? Math.min(...filteredHexStakes.map(stake => new Date(stake.startDate).getTime()))
        : null
      const isOGHexican = earliestStakeDate ? new Date(earliestStakeDate).getFullYear() === 2020 : false
      
      // Calculate recent staking activity (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const recentStakeStarts = filteredHexStakes.filter(stake => 
        new Date(stake.startDate) > thirtyDaysAgo).length
      const recentStakeEnds = inactiveStakes.filter(stake => 
        new Date(stake.endDate) > thirtyDaysAgo).length

      // Create complete holdings list including HEX stakes
      const allHoldings = [
        ...significantTokens.map(token => ({
          symbol: token.symbol,
          value: Math.round(token.balanceFormatted * getTokenPrice(token.symbol)),
          percentage: Math.round((token.balanceFormatted * getTokenPrice(token.symbol) / totalPortfolioValue) * 100),
          type: 'liquid'
        })),
        ...(hexStakesValue > 0 ? [{
          symbol: 'HEX (Staked)',
          value: Math.round(hexStakesValue),
          percentage: Math.round((hexStakesValue / totalPortfolioValue) * 100),
          type: 'staked'
        }] : [])
      ].sort((a, b) => b.value - a.value)

      const portfolioData = {
        totalValue: Math.round(totalUsdValue),
        liquidValue: Math.round(totalLiquidValue),
        hexStakesValue: Math.round(hexStakesValue),
        totalPortfolioValue: Math.round(totalPortfolioValue),
        tokenCount: sortedTokens.length,
        significantTokenCount: significantTokens.length,
        dustTokens: sortedTokens.length - significantTokens.length,
        topHoldings: allHoldings.slice(0, 3),
        hexStakes: filteredHexStakes.length,
        activeStakes: activeStakes.length,
        endedStakes: inactiveStakes.length,
        earlyEndStakes: (() => {
          // Count EES stakes - check both isEES flag and actual vs promised end dates
          return inactiveStakes.filter(stake => {
            if (stake.isEES === true) return true
            // Also check if actualEndDate is significantly before endDate (EES indicator)
            if (stake.actualEndDate && stake.endDate) {
              const actualEnd = new Date(stake.actualEndDate).getTime()
              const promisedEnd = new Date(stake.endDate).getTime()
              const daysDifference = (promisedEnd - actualEnd) / (24 * 60 * 60 * 1000)
              return daysDifference > 30 // More than 30 days early = EES
            }
            return false
          }).length
        })(),
        avgStakeDuration: Math.round((promptWeightedStakeLength / 365) * 10) / 10, // Use correct calculation for prompt
        avgAPY: Math.round(promptWeightedAPY * 10) / 10, // Use correct calculation for prompt
        isOGHexican,
        firstStakeYear: earliestStakeDate ? new Date(earliestStakeDate).getFullYear() : null,
        recentStakeStarts,
        recentStakeEnds,
        largestHolding: allHoldings.length > 0 ? allHoldings[0].symbol : null,
        portfolioSize: totalUsdValue > 1000000 ? 'whale' : totalUsdValue > 100000 ? 'large' : totalUsdValue > 10000 ? 'medium' : 'small'
      }

      const response = await fetch('/api/portfolio-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ portfolioData }),
      })

      // Handle rate limit headers
      const remaining = response.headers.get('X-RateLimit-Remaining')
      const resetTime = response.headers.get('X-RateLimit-Reset')
      
      if (remaining) {
        setRateLimitInfo({
          remaining: parseInt(remaining),
          resetTime: resetTime ? new Date(parseInt(resetTime)).toLocaleDateString() : undefined
        })
      }

      if (!response.ok) {
        const errorResult = await response.json()
        console.error('Portfolio Analysis API Error:', errorResult)
        
        if (response.status === 429) {
          setAnalysisError(`Rate limit exceeded: ${errorResult.message}`)
        } else {
          throw new Error(`API Error: ${errorResult.error}`)
        }
        return
      }

      const result = await response.json()
      console.log('Portfolio Analysis Result:', result)
      setPortfolioAnalysis(result.analysis)
    } catch (error) {
      console.error('Error generating portfolio analysis:', error)
      setAnalysisError(`Error: ${error.message || 'Unable to generate portfolio analysis at this time.'}`)
    } finally {
      setAnalysisLoading(false)
    }
  }, [detectiveMode, analysisLoading, totalUsdValue, sortedTokens, filteredHexStakes, getTokenPrice])

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

  // Update Chrome tab title with portfolio value
  useEffect(() => {
    // Only show value when everything is ready and we have a meaningful total
    if (isEverythingReady && effectiveAddresses.length > 0 && totalUsdValue > 0) {
      document.title = `$${formatDollarValueMobile(totalUsdValue)} | PlsCharts.com`
    } else {
      document.title = 'Portfolio | PlsCharts.com'
    }
    
    // Cleanup function to restore original title when component unmounts
    return () => {
      document.title = 'PlsCharts.com'
    }
  }, [totalUsdValue, effectiveAddresses.length, isEverythingReady, chainFilter, showLiquidBalances, showValidators, showHexStakes])

  // Auto-trigger analysis in detective mode when data is ready
  useEffect(() => {
    // Only generate prompt for the specific address after isEverythingReady is true
    const targetAddress = '0x77d9c03eb2a82c2bdd6a1a0800f1521e2dee0ebb'
    
    if (detectiveMode && 
        detectiveAddress?.toLowerCase() === targetAddress.toLowerCase() &&
        isEverythingReady && 
        effectiveAddresses.length > 0 && 
        !portfolioAnalysis && 
        !analysisLoading && 
        !analysisError) {
      console.log('🕵️ Detective Mode: Starting prompt generation for target address after isEverythingReady is true')
      generatePortfolioAnalysis()
    }
  }, [detectiveMode, detectiveAddress, isEverythingReady, effectiveAddresses.length, portfolioAnalysis, analysisLoading, analysisError, generatePortfolioAnalysis])

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

  // Show loading state when there are addresses but data isn't ready
  if (effectiveAddresses.length > 0 && !isEverythingReady) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-black border-2 border-white/10 rounded-2xl p-6 text-center max-w-[660px] w-full mx-auto">
            <div className="text-gray-400">{detectiveMode ? 'Loading address data...' : 'Loading Portfolio data...'}</div>
          </div>
        </div>

      </div>
    );
  }

    return (
    <div className="w-full pb--20 md:pb-0">
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
        className="space-y-6 flex flex-col items-center w-full max-w-[860px] mx-auto"
    >
      {/* Address Input Section - Hidden in detective mode */}
      {!detectiveMode && (
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
        className="bg-black border-2 border-white/10 rounded-xl my-4 p-6 max-w-[560px] w-full"
        style={{ display: addresses.length > 0 || showMultipleAddressList ? 'none' : 'block' }}
      >
        {/* Unified Address Input */}
        <form onSubmit={handleAddressSubmit} className="space-y-4">
          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-300 mb-4 text-center">
              Enter PulseChain or Ethereum address
            </label>
            <input
              id="address"
              type="text"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              onPaste={handleAddressPaste}
              placeholder="0xaf10cc6c50defff901b535691550d7af208939c5"
              className="w-full px-4 py-3 bg-black border border-white/10 rounded-lg text-white placeholder-gray-500/50 focus:border-white/40 focus:outline-none transition-colors"
            />
        </div>

          {/* Show duplicate error */}
          {duplicateError && (
            <div className="p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">
              ❌ {duplicateError}
            </div>
          )}
        </form>

      </Section>
      )}

      {/*Add Addresses Welcome inline */}
      {showMultipleAddressList && (
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
          className="bg-black border border-white/20 rounded-xl w-full max-w-[800px] mx-auto overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/20">
            <div className="flex items-center gap-4">
              <div className="flex bg-black rounded-full">
                <div className="px-6 py-2 bg-white text-black rounded-full text-sm font-medium">
                  {multipleAddresses.length} Addresses
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setShowMultipleAddressList(false)
                setMultipleAddresses([])
                setAddressInput('')
                setAddressLabelInput('')
              }}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>

          {/* Address List */}
          <div className="p-6 space-y-4 overflow-x-auto scrollbar-hide">
                                      {multipleAddresses.map((addr) => {
              // Track editing state for this address
              const isEditing = addr.isEditing || false
              const originalLabel = addr.originalLabel || ''
              const hasChanges = addr.label !== originalLabel
              
              const handleSave = () => {
                updateMultipleAddressLabel(addr.id, addr.label, false, addr.label)
              }
              
              return (
                <div key={addr.id} className="flex items-center gap-4 py-3 border-b border-white/10 min-w-fit">
                  <div className="flex-1 text-sm text-white font-mono whitespace-nowrap">
                    <span className="sm:hidden">{formatAddress(addr.address)}</span>
                    <span className="hidden sm:block">{addr.address}</span>
                  </div>
                  <input
                    type="text"
                    value={addr.label}
                    onChange={(e) => {
                      updateMultipleAddressLabel(addr.id, e.target.value, true, originalLabel)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && hasChanges) {
                        handleSave()
                      } else if (e.key === 'Escape') {
                        updateMultipleAddressLabel(addr.id, originalLabel, false, originalLabel)
                      }
                    }}
                    placeholder="Name (optional)"
                    className="w-40 md:w-72 px-3 py-2 bg-black border border-white/20 rounded text-white placeholder-gray-500/50 text-sm focus:border-white/40 focus:outline-none"
                  />
                  
                  {/* Save/Delete Button */}
                  <div className="flex-shrink-0">
                    {isEditing && hasChanges ? (
                      <button
                        onClick={handleSave}
                        className="p-2 hover:bg-white/20 rounded transition-colors text-white hover:text-gray-300"
                        title="Save changes"
                      >
                        <Icons.save size={16} />
                      </button>
                    ) : (
                      <button
                        onClick={() => removeFromMultipleAddresses(addr.id)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-600/20 rounded transition-colors"
                        title="Delete address"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14zM10 11v6M14 11v6"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}

            {/* Add New Address Section */}
            <div className="pt-6">
              <h3 className="text-white font-medium mb-4">Add New Address</h3>
              
              {/* Error Messages */}
              {duplicateError && (
                <div className="p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm flex items-center gap-2 mb-4">
                  <span>⚠️</span>
                  <span>{duplicateError}</span>
                </div>
              )}

          {bulkParseResults && (
                <div className="space-y-2 mb-4">
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
          
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                <input
                  type="text"
                  value={addressInput}
                  onChange={(e) => setAddressInput(e.target.value)}
                  onPaste={handleInlineAddressPaste}
                  placeholder="0x..."
                  className="flex-1 px-3 py-2 bg-black border border-white/20 rounded text-white placeholder-gray-500/50 text-sm focus:border-white/40 focus:outline-none"
                />
                <div className="flex gap-3">
                                      <input
                      type="text"
                      value={addressLabelInput}
                      onChange={(e) => setAddressLabelInput(e.target.value)}
                      placeholder="Name (optional)"
                      className="flex-1 w-20 xs:w-24 sm:w-32 md:w-40 lg:w-48 px-3 py-2 bg-black border border-white/20 rounded text-white placeholder-gray-500/50 text-sm focus:border-white/40 focus:outline-none"
                    />
          <button
                    onClick={addToMultipleAddresses}
                    disabled={!addressInput.trim() || !isValidAddress(addressInput)}
                    className="px-4 py-2 bg-white text-black rounded font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors whitespace-nowrap"
          >
                    +
          </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-white/20 flex gap-3">
            <button
              onClick={handleAddMultipleAddresses}
              disabled={multipleAddresses.length === 0}
              className="flex-1 px-4 py-2 bg-white text-black font-medium rounded disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
            >
              Add All Addresses ({multipleAddresses.length})
            </button>
            <button
              onClick={() => {
                setShowMultipleAddressList(false)
                setMultipleAddresses([])
                setAddressInput('')
                setAddressLabelInput('')
              }}
              className="px-6 py-2 bg-transparent border border-white/20 text-white rounded hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
          </div>
      </Section>
      )}
      {/* End of showMultipleAddressList conditional */}

      {/* Show loading state when fetching data (only on initial load) */}
      {effectiveAddresses.length > 0 && balancesLoading && isInitialLoad && (
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
          <div className="text-gray-400">{detectiveMode ? 'Loading address data...' : 'Loading portfolio...'}</div>
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
                    {/* Chain Toggle and Edit button in top right - Hidden in detective mode */}
          {addresses.length > 0 && !detectiveMode && (
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
                    <CoinLogo 
                      symbol="ETH-white" 
                      size="sm"
                      className="grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100"
                    />
                  )}
                  {chainFilter === 'pulsechain' && (
                    <CoinLogo 
                      symbol="PLS-white" 
                      size="sm"
                      className="grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100"
                    />
                  )}
                  {chainFilter === 'both' && (
                                          <>
                        <CoinLogo 
                          symbol="ETH-white" 
                          size="sm"
                          className="ml-1 grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100"
                        />
                        <span className="text-xs text-gray-400 group-hover:text-white">+</span>
                        <CoinLogo 
                          symbol="PLS-white" 
                          size="sm"
                          className="grayscale opacity-50 group-hover:grayscale-0 group-hover:opacity-100"
                        />
                      </>
                  )}
                </div>
              </button>
              
              {/* Edit button */}
              <button
                onClick={() => setShowEditModal(true)}
                className="p-2 mr-2 rounded-lg text-gray-400 hover:text-white"
              >
                <Icons.edit size={16} />
              </button>
            </div>
          )}
          
          <div className="flex items-center justify-left sm:justify-center gap-2 ml-6">
            <h2 className="text-xs sm:text-xs font-bold mb-2 text-gray-400">
            {selectedAddressIds.length > 0 ? `${selectedAddressIds.length}/${effectiveAddresses.length} Addresses` : detectiveMode ? 'Detective Mode' : 'Total Portfolio Value'}
            </h2>
          </div>
                    <div className="flex items-center justify-left sm:justify-center gap-2 ml-6">
            <div className="text-4xl sm:text-5xl font-bold text-white py-2">
                              <span className="sm:hidden">${formatDollarValueMobile(totalUsdValue)}</span>
                <span className="hidden sm:inline">${formatDollarValue(totalUsdValue)}</span>
            </div>
            <button 
              onClick={toggle24hChangeDisplay}
              className={`text-xs md:text-sm font-bold ml-1 cursor-pointer hover:opacity-80 transition-opacity ${
                portfolio24hChange <= -1
                  ? 'text-red-500'
                  : portfolio24hChange >= 1
                    ? 'text-[#00ff55]'
                    : 'text-gray-400'
              }`}
              title={showDollarChange ? "Click to show percentage" : "Click to show dollar amount"}
            >
              {format24hChange(portfolio24hChange, portfolio24hDollarChange)}
            </button>
          </div>
          {!detectiveMode && (
            <div className="text-sm text-gray-400 mt-4 flex flex-wrap gap-2 justify-center">
              {sortedAddressesForFilters.map((addr, index) => (
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
          )}
          
          {/* Advanced Filters Button - Hidden in detective mode */}
          {!detectiveMode && (
            <div className="mt-4 flex justify-center">
              <button 
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm"
              >
                <span>Advanced filters</span>
                <Icons.chevronDown
                  size={16} 
                  className={`transition-transform duration-200 ${showAdvancedFilters ? '' : 'rotate-180'}`}
                />
              </button>
            </div>
          )}
          
          {/* Advanced Filters Toggle Section - Hidden in detective mode */}
          {!detectiveMode && showAdvancedFilters && (
            <div className="mt-0 p-2 space-y-4">
              <div className="flex flex-wrap gap-6 justify-center">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="liquid-balances"
                    checked={showLiquidBalances}
                    onCheckedChange={(checked) => setShowLiquidBalances(checked === true)}
                  />
                  <label 
                    htmlFor="liquid-balances" 
                    className={`text-sm cursor-pointer ${showLiquidBalances ? 'text-white' : 'text-gray-400'}`}
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
                    className={`text-sm cursor-pointer ${showHexStakes ? 'text-white' : 'text-gray-400'}`}
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
                    className={`text-sm cursor-pointer ${showValidators ? 'text-white' : 'text-gray-400'}`}
                  >
                    Include validators
                  </label>
                </div>
              </div>
            </div>
          )}
        </Section>
      )}

      {/* Portfolio Analysis Section - Only in detective mode */}
      {showPortfolioAnalysis && detectiveMode && isEverythingReady && (
        <Section 
          {...(showMotion ? {
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 },
            transition: { 
              duration: 0.5,
              delay: 0.35,
              ease: [0.23, 1, 0.32, 1]
            }
          } : {})}
          className="max-w-[860px] w-full"
        >
          <div className="bg-black border-2 border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="text-lg font-semibold text-white">Portfolio Analysis</div>
              <div className="px-2 py-1 bg-blue-600/20 border border-blue-500/30 rounded text-xs text-blue-300">
                ✨ AI generated
              </div>
            </div>
            
            {/* Auto-generated analysis loading */}
            {analysisLoading && (
              <div className="flex items-center gap-3 text-gray-400 justify-center py-8">
                <div className="animate-spin w-5 h-5 border-2 border-gray-600 border-t-white rounded-full"></div>
                <span>Analyzing portfolio behavior...</span>
              </div>
            )}

            {/* No analysis yet - will auto-trigger */}
            {!portfolioAnalysis && !analysisLoading && !analysisError && (
              <div className="flex items-center gap-3 text-gray-400 justify-center py-8">
                <span>🤖</span>
                <span>AI analysis will load automatically...</span>
              </div>
            )}
            
            {analysisError && (
              <div className="bg-red-600/10 border border-red-500/30 rounded-lg p-4">
                <div className="text-red-400 text-sm font-medium mb-2">Analysis Failed</div>
                <div className="text-red-300 text-sm">{analysisError}</div>
                {!analysisError.includes('Rate limit') && (
                  <button
                    onClick={generatePortfolioAnalysis}
                    className="mt-3 px-3 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded text-xs transition-colors"
                  >
                    Try Again
                  </button>
                )}
              </div>
            )}
            
            {portfolioAnalysis && !analysisLoading && (
              <div className="text-gray-300 leading-relaxed bg-gray-900/50 rounded-lg p-4 border border-white/5">
                {portfolioAnalysis}
              </div>
            )}
          </div>
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
          className="max-w-[860px] w-full"
        >
          {/* Sort buttons */}
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <h3 className="text-xl font-semibold text-white">Token Balances</h3>
            
            <div className="flex gap-2 flex-wrap">
              {[
                { field: 'amount' as const, label: 'Amount' },
                { field: 'change' as const, label: '24h Change' }
              ].map(({ field, label }) => (
                <button
                  key={field}
                  onClick={() => {
                    if (tokenSortField === field) {
                      setTokenSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
                    } else {
                      setTokenSortField(field)
                      setTokenSortDirection('desc')
                    }
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                    tokenSortField === field 
                      ? 'bg-white text-black border-white' 
                      : 'bg-transparent text-gray-400 border-gray-400 hover:text-white hover:border-white'
                  }`}
                >
                  {label} {tokenSortField === field ? (tokenSortDirection === 'asc' ? '↑' : '↓') : ''}
                </button>
              ))}
            </div>
          </div>
          
          <div className="bg-black border-2 border-white/10 rounded-2xl p-1 sm:p-6">
          <div className="space-y-3">
            {sortedTokens.map((token, tokenIndex) => {
              const tokenPrice = getTokenPrice(token.symbol)
              // Use a stable key that includes the token address to prevent unnecessary remounting
              const stableKey = `${token.chain}-${token.symbol}-${token.address || 'native'}`
              return (
                <TokenRow key={stableKey} token={token} tokenPrice={tokenPrice} tokenIndex={tokenIndex} tokenSymbolsMap={tokenSymbolsMap} />
              )
            })}
            </div>
                </div>
        </Section>
      )}

      {/* No tokens found message */}
      {effectiveAddresses.length > 0 && isEverythingReady && sortedTokens.length === 0 && showLiquidBalances && (
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
      {effectiveAddresses.length > 0 && isEverythingReady && !detectiveMode && showValidators && validatorCount > 0 && (chainFilter === 'pulsechain' || chainFilter === 'both') && (
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
                    ${formatDollarValue((validatorCount * 32_000_000) * getTokenPrice('PLS'))}
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
      {effectiveAddresses.length > 0 && isEverythingReady && showHexStakes && hasStakes && (
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
          className="max-w-[860px] w-full my-6"
        >
          <div className="flex items-center mb-4 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <h3 className="text-xl font-semibold text-white">HEX Stakes</h3>
              {/* Status Filter Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={`px-3 py-1 rounded-full text-xs font-medium focus:outline-none min-w-[70px] flex items-center justify-center gap-1 ${
                    stakeStatusFilter === 'inactive' 
                      ? 'bg-white/10 border border-white/20 hover:border-white/40 text-zinc-400' 
                      : 'bg-green-400/10 border border-green-400 text-green-400'
                  }`}>
                    {stakeStatusFilter === 'inactive' ? 'Ended' : 'Active'}
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="min-w-[10px] p-2">
                  <DropdownMenuRadioGroup 
                    value={stakeStatusFilter} 
                    onValueChange={(value) => setStakeStatusFilter(value as 'active' | 'inactive')}
                  >
                    {availableStatuses.map((status) => (
                      <DropdownMenuRadioItem
                        key={status}
                        value={status}
                        className={`text-white hover:bg-white/10 focus:bg-white/10 [&_svg]:hidden p-1 m-0 ${
                          status === 'active' ? 'text-green-400' 
                          : status === 'inactive' ? 'text-zinc-400'
                          : 'text-blue-400'
                        }`}
                      >
                        <div className="w-full px-4 py-1">
                          {status === 'inactive' ? 'Ended' : status.charAt(0).toUpperCase() + status.slice(1)}
                        </div>
                      </DropdownMenuRadioItem>
                    ))}
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            {/* Sort buttons */}
            <div className="flex flex-wrap items-center gap-2 ml-auto sm:ml-auto">
              {[
                { field: 'amount' as const, label: 'Amount' },
                { field: 'progress' as const, label: 'Progress' },
                { field: 'startDate' as const, label: 'Start Date' },
                { field: 'endDate' as const, label: 'End Date' }
              ].map(({ field, label }) => (
                <button
                  key={field}
                  onClick={() => {
                    if (hexStakesSortField === field) {
                      setHexStakesSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
                    } else {
                      setHexStakesSortField(field)
                      setHexStakesSortDirection('asc')
                    }
                  }}
                  className={`px-2 sm:px-3 py-1 rounded-full text-xs font-medium transition-colors border whitespace-nowrap ${
                    hexStakesSortField === field 
                      ? 'bg-white text-black border-white' 
                      : 'bg-transparent text-gray-400 border-gray-400 hover:text-white hover:border-white'
                  }`}
                >
                  {label} {hexStakesSortField === field ? (hexStakesSortDirection === 'asc' ? '↑' : '↓') : ''}
                </button>
              ))}
              
              {/* Advanced stats button - Only show for active stakes */}
              {stakeStatusFilter === 'active' && (
                <button 
                  onClick={() => setShowAdvancedStats(!showAdvancedStats)}
                  className="flex items-center gap-1 px-3 py-1 text-gray-400 hover:text-white transition-colors text-xs rounded-full"
                >
                  <span>More stats</span>
                  <Icons.chevronDown
                    size={12} 
                    className={`transition-transform duration-200 ${showAdvancedStats ? '' : 'rotate-180'}`}
                  />
                </button>
              )}
            </div>
          </div>
          
          {/* Advanced Stats Section - Only show for active stakes */}
          {showAdvancedStats && stakeStatusFilter === 'active' && (
            <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-lg">
              {(() => {
                // Calculate total liquid HEX and eHEX
                const liquidHexStats = sortedTokens.reduce((acc, token) => {
                  if (token.symbol === 'HEX') {
                    acc.hexAmount += token.balanceFormatted
                    acc.hexValue += token.balanceFormatted * getTokenPrice('HEX')
                  } else if (token.symbol === 'eHEX') {
                    acc.eHexAmount += token.balanceFormatted
                    acc.eHexValue += token.balanceFormatted * getTokenPrice('eHEX')
                  }
                  return acc
                }, { hexAmount: 0, hexValue: 0, eHexAmount: 0, eHexValue: 0 })

                // Calculate total staked HEX (ONLY ACTIVE STAKES)
                const stakedHexStats = filteredHexStakes
                  .filter(stake => stake.status === 'active')
                  .reduce((acc, stake) => {
                  const stakeHex = stake.principleHex + stake.yieldHex
                  if (stake.chain === 'ETH') {
                    acc.eHexAmount += stakeHex
                    acc.eHexValue += stakeHex * getTokenPrice('eHEX')
                  } else {
                    acc.hexAmount += stakeHex
                    acc.hexValue += stakeHex * getTokenPrice('HEX')
                  }
                  return acc
                }, { hexAmount: 0, hexValue: 0, eHexAmount: 0, eHexValue: 0 })

                // Add pooled stakes to staked HEX if enabled
                if (includePooledStakes) {
                  stakedHexStats.hexAmount += pooledStakesData.totalHex || 0
                  stakedHexStats.hexValue += pooledStakesData.totalValue || 0
                }

                const totalLiquidValue = liquidHexStats.hexValue + liquidHexStats.eHexValue
                const totalStakedValue = stakedHexStats.hexValue + stakedHexStats.eHexValue
                const totalCombinedValue = totalLiquidValue + totalStakedValue
                const totalCombinedHexAmount = liquidHexStats.hexAmount + stakedHexStats.hexAmount
                const totalCombinedEHexAmount = liquidHexStats.eHexAmount + stakedHexStats.eHexAmount
                
                return (
                  <div className="space-y-4">
                    {/* Combined Total HEX Value Card */}
                    <div className="bg-black/20 border border-white/10 rounded-lg p-4 text-center">
                      <div className="text-sm text-gray-400 mb-2">Total HEX Value</div>
                      <div className="text-2xl font-bold text-white mb-1">
                        ${formatBalance(totalCombinedValue)}
                      </div>
                      <div className="text-xs text-gray-400">
                        {totalCombinedHexAmount > 0 && totalCombinedEHexAmount > 0 
                          ? `${formatBalance(totalCombinedHexAmount)} HEX + ${formatBalance(totalCombinedEHexAmount)} eHEX`
                          : totalCombinedHexAmount > 0 
                            ? `${formatBalance(totalCombinedHexAmount)} HEX`
                            : totalCombinedEHexAmount > 0 
                              ? `${formatBalance(totalCombinedEHexAmount)} eHEX`
                              : 'No HEX found'
                        }
                        {includePooledStakes && (pooledStakesData.totalHex || 0) > 0 && (
                          <span> (including {formatBalance(pooledStakesData.totalHex || 0)} HEX pooled)</span>
                        )}
                      </div>
                    </div>

                    {/* Individual Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
                    {/* Liquid HEX Stats */}
                    <div className="bg-black/20 border border-white/10 rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-2">
                        Total Liquid HEX {totalCombinedValue > 0 && (
                          <span className="text-xs">({formatPercentage((totalLiquidValue / totalCombinedValue) * 100)})</span>
                        )}
                      </div>
                      <div className="text-xl font-bold text-white mb-1">
                        ${formatBalance(totalLiquidValue)}
                      </div>
                      <div className="text-xs text-gray-400 space-y-1">
                        {liquidHexStats.hexAmount > 0 && (
                          <div>{formatBalance(liquidHexStats.hexAmount)} HEX (${formatBalance(liquidHexStats.hexValue)})</div>
                        )}
                        {liquidHexStats.eHexAmount > 0 && (
                          <div>{formatBalance(liquidHexStats.eHexAmount)} eHEX (${formatBalance(liquidHexStats.eHexValue)})</div>
                        )}
                        {totalLiquidValue === 0 && <div>No liquid HEX found</div>}
                      </div>
                    </div>

                    {/* Staked HEX Stats */}
                    <div className="bg-black/20 border border-white/10 rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-2">
                        Total Staked HEX {totalCombinedValue > 0 && (
                          <span className="text-xs">({formatPercentage((totalStakedValue / totalCombinedValue) * 100)})</span>
                        )}
                      </div>
                      <div className="text-xl font-bold text-white mb-1">
                        ${formatBalance(totalStakedValue)}
                      </div>
                      <div className="text-xs text-gray-400 space-y-1">
                        {(() => {
                          // Calculate solo stakes only for display breakdown (ONLY ACTIVE STAKES)
                          const activeStakesForStats = filteredHexStakes.filter(stake => stake.status === 'active')
                          const soloStakedStats = activeStakesForStats.reduce((acc, stake) => {
                            const stakeHex = stake.principleHex + stake.yieldHex
                            if (stake.chain === 'ETH') {
                              acc.eHexAmount += stakeHex
                              acc.eHexValue += stakeHex * getTokenPrice('eHEX')
                            } else {
                              acc.hexAmount += stakeHex
                              acc.hexValue += stakeHex * getTokenPrice('HEX')
                            }
                            return acc
                          }, { hexAmount: 0, hexValue: 0, eHexAmount: 0, eHexValue: 0 })

                          const soloTotalValue = soloStakedStats.hexValue + soloStakedStats.eHexValue
                          const pooledValue = pooledStakesData.totalValue || 0
                          const pooledHex = pooledStakesData.totalHex || 0

                          if (totalStakedValue === 0) {
                            return <div>No staked HEX found</div>
                          }

                          return (
                            <>
                              {soloStakedStats.hexAmount > 0 && (
                                <div>{formatBalance(soloStakedStats.hexAmount)} HEX (${formatBalance(soloStakedStats.hexValue)})</div>
                              )}
                              {soloStakedStats.eHexAmount > 0 && (
                                <div>{formatBalance(soloStakedStats.eHexAmount)} eHEX (${formatBalance(soloStakedStats.eHexValue)})</div>
                              )}
                              {includePooledStakes && pooledHex > 0 && (
                                <div>{formatBalance(pooledHex)} HEX pooled (${formatBalance(pooledValue)})</div>
                              )}
                            </>
                          )
                        })()}
                      </div>
                    </div>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
          
          {includePooledStakes ? (
            <>
              {/* Combined Total HEX Stakes + Pooled Stakes Value */}
              {stakeStatusFilter === 'active' && (
                <div className="bg-black border-2 border-white/10 rounded-2xl p-4 text-center mb-6">
                  {(() => {
                    // Solo stakes calculations (ONLY ACTIVE STAKES)
                    const activeStakes = filteredHexStakes.filter(stake => stake.status === 'active')
                    const soloHexValue = activeStakes.reduce((total, stake) => {
                      const stakeHex = stake.principleHex + stake.yieldHex
                      const hexPrice = stake.chain === 'ETH' ? getTokenPrice('eHEX') : getTokenPrice('HEX')
                      return total + (stakeHex * hexPrice)
                    }, 0)
                    
                    const soloTShares = activeStakes.reduce((total, stake) => total + stake.tShares, 0)
                    const soloHexAmount = activeStakes.reduce((total, stake) => total + stake.principleHex + stake.yieldHex, 0)
                    
                    // Combined totals - recalculate value based on filtered stakes for chain-specific pricing
                    const filteredSoloValue = filteredHexStakes.filter(stake => stake.status === 'active').reduce((total, stake) => {
                      const stakeHex = stake.principleHex + stake.yieldHex
                      const hexPrice = stake.chain === 'ETH' ? getTokenPrice('eHEX') : getTokenPrice('HEX')
                      return total + (stakeHex * hexPrice)
                    }, 0)
                    const combinedValue = filteredSoloValue + pooledStakesData.totalValue
                    const combinedTShares = soloTShares + pooledStakesData.totalTShares
                    const combinedHexAmount = soloHexAmount + (pooledStakesData.totalHex || 0)
                    
                    // Calculate weighted average length for combined stakes (ONLY ACTIVE STAKES)
                    const soloWeightedLength = soloTShares > 0 ? activeStakes.reduce((sum, stake) => {
                      const startDate = new Date(stake.startDate)
                      const endDate = new Date(stake.endDate)
                      const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
                      return sum + (totalDays * stake.tShares)
                    }, 0) : 0
                    
                    const pooledWeightedLength = (pooledStakesData.avgStakeLength || 0) * pooledStakesData.totalTShares
                    const combinedAvgLength = combinedTShares > 0 ? (soloWeightedLength + pooledWeightedLength) / combinedTShares : 0
                    
                    // Calculate weighted price change (ONLY ACTIVE STAKES)
                    const { totalValue, weightedPriceChange } = activeStakes.reduce((acc, stake) => {
                      const stakeHex = stake.principleHex + stake.yieldHex
                      const hexPrice = stake.chain === 'ETH' ? getTokenPrice('eHEX') : getTokenPrice('HEX')
                      const stakeValue = stakeHex * hexPrice
                      const priceData = stake.chain === 'ETH' ? prices['eHEX'] : prices['HEX']
                      const change = priceData?.priceChange?.h24 || 0
                      
                      return {
                        totalValue: acc.totalValue + stakeValue,
                        weightedPriceChange: acc.weightedPriceChange + (change * stakeValue)
                      }
                    }, { totalValue: 0, weightedPriceChange: 0 })
                    
                    const priceChange24h = totalValue > 0 ? weightedPriceChange / totalValue : 0
                    
                    // Calculate league for combined T-shares using actual chain data
                    const getHexStakesLeague = (tShares: number, hexDailyData: any) => {
                      const OA_TSHARES_PLS = 35482068
                      const OA_TSHARES_ETH = 35155727
                      
                      let totalHexTShares = 37_000_000 // fallback
                      
                      if (hexDailyData) {
                        if (chainFilter === 'ethereum') {
                          const ethLatestDay = hexDailyData.dailyPayouts?.ETH?.[hexDailyData.dailyPayouts.ETH.length - 1]
                          totalHexTShares = ethLatestDay ? (parseFloat(ethLatestDay.shares) / 1000000000000) - OA_TSHARES_ETH : 37_000_000
                        } else if (chainFilter === 'pulsechain') {
                          const plsLatestDay = hexDailyData.dailyPayouts?.PLS?.[hexDailyData.dailyPayouts.PLS.length - 1]
                          totalHexTShares = plsLatestDay ? (parseFloat(plsLatestDay.shares) / 1000000000000) - OA_TSHARES_PLS : 37_000_000
                        } else {
                          // For 'both', use combined total minus both OA amounts
                          const ethLatestDay = hexDailyData.dailyPayouts?.ETH?.[hexDailyData.dailyPayouts.ETH.length - 1]
                          const plsLatestDay = hexDailyData.dailyPayouts?.PLS?.[hexDailyData.dailyPayouts.PLS.length - 1]
                          const ethTShares = ethLatestDay ? (parseFloat(ethLatestDay.shares) / 1000000000000) - OA_TSHARES_ETH : 0
                          const plsTShares = plsLatestDay ? (parseFloat(plsLatestDay.shares) / 1000000000000) - OA_TSHARES_PLS : 0
                          totalHexTShares = ethTShares + plsTShares || 37_000_000
                        }
                      }
                      
                      const percentage = (tShares / totalHexTShares) * 100
                      
                      if (percentage >= 10) return { league: 'Poseidon', icon: '/other-images/poseidon.png' }
                      if (percentage >= 1) return { league: 'Whale', icon: '/other-images/whale.png' }
                      if (percentage >= 0.1) return { league: 'Shark', icon: '/other-images/shark.png' }
                      if (percentage >= 0.01) return { league: 'Dolphin', icon: '/other-images/dolphin.png' }
                      if (percentage >= 0.001) return { league: 'Squid', icon: '/other-images/squid.png' }
                      if (percentage >= 0.0001) return { league: 'Turtle', icon: '/other-images/turtle.png' }
                      if (percentage >= 0.00001) return { league: 'Crab', icon: '/other-images/crab.png' }
                      if (percentage >= 0.000001) return { league: 'Shrimp', icon: '/other-images/shrimp.png' }
                      return { league: 'Shell', icon: '/other-images/shell.png' }
                    }
                    
                    const hexLeague = getHexStakesLeague(combinedTShares, hexDailyData)
                    const totalHexTShares = (() => {
                      const OA_TSHARES_PLS = 35482068
                      const OA_TSHARES_ETH = 35155727
                      
                      if (hexDailyData) {
                        if (chainFilter === 'ethereum') {
                          const ethLatestDay = hexDailyData.dailyPayouts?.ETH?.[hexDailyData.dailyPayouts.ETH.length - 1]
                          return ethLatestDay ? (parseFloat(ethLatestDay.shares) / 1000000000000) - OA_TSHARES_ETH : 37_000_000
                        } else if (chainFilter === 'pulsechain') {
                          const plsLatestDay = hexDailyData.dailyPayouts?.PLS?.[hexDailyData.dailyPayouts.PLS.length - 1]
                          return plsLatestDay ? (parseFloat(plsLatestDay.shares) / 1000000000000) - OA_TSHARES_PLS : 37_000_000
                        }
                      }
                      return 37_000_000
                    })()
                    const tSharePercentage = (combinedTShares / totalHexTShares) * 100
                    
                    return (
                      <>
                        <div className="flex items-center justify-center gap-3 mb-2">
                          <div className="text-lg font-semibold text-white">Total</div>
                        </div>
                          <div className="flex items-center justify-center gap-2">
                            {/* Show league icon only when specific chain is selected */}
                            {chainFilter !== 'both' && combinedTShares > 0 && (
                              <>
                                <div 
                                  className="relative z-10 cursor-pointer hover:bg-white/5 hover:shadow-lg transition-all duration-300 mr-2 p-1 rounded-lg"
                                  onClick={() => setLeagueDialogOpen(true)}
                                >
                                  <Image
                                    src={hexLeague.icon}
                                    alt={hexLeague.league}
                                    width={22}
                                    height={22}
                                    className="object-contain hover:brightness-150 hover:contrast-125 hover:saturate-150 transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]"
                                  />
                                </div>
                                <Dialog open={leagueDialogOpen} onOpenChange={setLeagueDialogOpen}>
                                  <DialogContent className="w-full max-w-[360px] sm:max-w-lg max-h-[80vh] bg-black border-2 border-white/10 rounded-lg overflow-y-auto scrollbar-hide">
                                    <div className="p-2">
                                      <TSharesLeagueTable 
                                        userTShares={combinedTShares}
                                        totalTShares={(() => {
                                          const OA_TSHARES_PLS = 35482068
                                          const OA_TSHARES_ETH = 35155727
                                          
                                          if (hexDailyData) {
                                            if (chainFilter === 'ethereum') {
                                              const ethLatestDay = hexDailyData.dailyPayouts?.ETH?.[hexDailyData.dailyPayouts.ETH.length - 1]
                                              return ethLatestDay ? (parseFloat(ethLatestDay.shares) / 1000000000000) - OA_TSHARES_ETH : 37_000_000
                                            } else if (chainFilter === 'pulsechain') {
                                              const plsLatestDay = hexDailyData.dailyPayouts?.PLS?.[hexDailyData.dailyPayouts.PLS.length - 1]
                                              return plsLatestDay ? (parseFloat(plsLatestDay.shares) / 1000000000000) - OA_TSHARES_PLS : 37_000_000
                                            }
                                          }
                                          return 37_000_000
                                        })()}
                                        chainName={chainFilter === 'ethereum' ? 'Ethereum' : 'PulseChain'}
                                        hexPrice={chainFilter === 'ethereum' ? getTokenPrice('eHEX') : getTokenPrice('HEX')}
                                      />
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </>
                            )}
                            <div className="text-4xl font-bold text-white">
                              <span className="sm:hidden">${formatBalanceMobile(combinedValue)}</span>
                              <span className="hidden sm:inline">${formatBalance(combinedValue)}</span>
                            </div>
                            <button 
                              onClick={toggle24hChangeDisplay}
                              className={`text-sm font-bold cursor-pointer hover:opacity-80 transition-opacity ${priceChange24h >= 0 ? 'text-[#00ff55]' : 'text-red-500'}`}
                              title={showDollarChange ? "Click to show percentage" : "Click to show dollar amount"}
                            >
                              {(() => {
                                const dollarChange = (priceChange24h / 100) * combinedValue
                                return format24hChange(priceChange24h, dollarChange)
                              })()}
                            </button>
                          </div>
                                    <div className="text-sm text-gray-400 mt-1">
                          {combinedHexAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} HEX • {combinedTShares >= 100 
                            ? combinedTShares.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                            : combinedTShares.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          } T-Shares{combinedTShares > 0 && chainFilter !== 'both' && (
                            <> ({formatPercentage(tSharePercentage)})</>
                          )}{combinedTShares > 0 && combinedAvgLength > 0 && (
                            <>
                              {' • '}
                              {(combinedAvgLength / 365).toFixed(1)} year avg
                            </>
                          )}
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}

              {/* Split View: Solo and Pooled Stakes */}
              {stakeStatusFilter === 'active' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {/* Solo Stakes Card */}
                  <div className="bg-black border-2 border-white/10 rounded-2xl p-4 text-center">
                        {(() => {
              const activeSoloStakes = filteredHexStakes.filter(stake => stake.status === 'active')
              const totalHexValue = activeSoloStakes.reduce((total, stake) => {
                const stakeHex = stake.principleHex + stake.yieldHex
                const hexPrice = stake.chain === 'ETH' ? getTokenPrice('eHEX') : getTokenPrice('HEX')
                return total + (stakeHex * hexPrice)
              }, 0)
                
                      const totalTShares = activeSoloStakes.reduce((total, stake) => total + stake.tShares, 0)
                      
                      const weightedStakeLength = totalTShares > 0 ? activeSoloStakes.reduce((sum, stake) => {
                        const startDate = new Date(stake.startDate)
                        const endDate = new Date(stake.endDate)
                        const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
                        return sum + (totalDays * stake.tShares)
                      }, 0) / totalTShares : 0
                      
                      const weightedAPY = totalTShares > 0 ? activeSoloStakes.reduce((sum, stake) => {
                        const startDate = new Date(stake.startDate)
                        const now = new Date()
                        const daysElapsed = Math.max(1, Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
                        const apy = ((stake.yieldHex / stake.principleHex) / daysElapsed) * 365 * 100
                        return sum + (apy * stake.tShares)
                      }, 0) / totalTShares : 0
                      
                      return (
                        <>
                          <div className="text-lg font-semibold text-white mb-2">Solo Stakes</div>
                          <div className="text-2xl font-bold text-white mb-2">
                            <span className="sm:hidden">${formatBalanceMobile(totalHexValue)}</span>
                            <span className="hidden sm:inline">${formatBalance(totalHexValue)}</span>
                          </div>
                          <div className="text-sm text-gray-400">
                            {activeSoloStakes.reduce((total, stake) => total + stake.principleHex + stake.yieldHex, 0).toLocaleString()} HEX across {activeSoloStakes.length} stake{activeSoloStakes.length !== 1 ? 's' : ''}
                          </div>
                          <div className="text-sm text-gray-400 mt-1">
                            {totalTShares >= 100 
                              ? totalTShares.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                              : totalTShares.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            } T-Shares{totalTShares > 0 && (
                              <>
                                <br />
                                {(weightedStakeLength / 365).toFixed(1)} year avg • {weightedAPY.toFixed(1)}% APY
                              </>
                            )}
                          </div>
                        </>
                      )
                    })()}
                  </div>

                  {/* Pooled Stakes Card */}
                  <div className="bg-black border-2 border-white/10 rounded-2xl p-4 text-center">
                    <div className="text-lg font-semibold text-white mb-2">Pooled Stakes</div>
                    <div className="text-2xl font-bold text-white mb-2">
                      <span className="sm:hidden">${formatBalanceMobile(pooledStakesData.totalValue)}</span>
                      <span className="hidden sm:inline">${formatBalance(pooledStakesData.totalValue)}</span>
                    </div>
                    <div className="text-sm text-gray-400">
                      {pooledStakesData.totalHex ? pooledStakesData.totalHex.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : '0'} HEX across {pooledStakesData.tokens.length} token{pooledStakesData.tokens.length !== 1 ? 's' : ''}
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      {pooledStakesData.totalTShares >= 100 
                        ? pooledStakesData.totalTShares.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                        : pooledStakesData.totalTShares.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      } T-Shares{pooledStakesData.totalTShares > 0 && (pooledStakesData.avgStakeLength || 0) > 0 && (
                        <>
                          <br />
                          {((pooledStakesData.avgStakeLength || 0) / 365).toFixed(1)} year avg • {(pooledStakesData.avgAPY || 0).toFixed(1)}% APY
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Original Solo Stakes Only Card */
            stakeStatusFilter === 'active' && (
              <div className="bg-black border-2 border-white/10 rounded-2xl p-4 text-center mb-6">
                {(() => {
                  const activeStakesOnly = filteredHexStakes.filter(stake => stake.status === 'active')
                  const totalHexValue = activeStakesOnly.reduce((total, stake) => {
                    const stakeHex = stake.principleHex + stake.yieldHex
                    const hexPrice = stake.chain === 'ETH' ? getTokenPrice('eHEX') : getTokenPrice('HEX')
                    return total + (stakeHex * hexPrice)
                  }, 0)
                    
                const { totalValue, weightedPriceChange } = activeStakesOnly.reduce((acc, stake) => {
                  const stakeHex = stake.principleHex + stake.yieldHex
                  const hexPrice = stake.chain === 'ETH' ? getTokenPrice('eHEX') : getTokenPrice('HEX')
                  const stakeValue = stakeHex * hexPrice
                  const priceData = stake.chain === 'ETH' ? prices['eHEX'] : prices['HEX']
                  const change = priceData?.priceChange?.h24 || 0
                  
                  return {
                    totalValue: acc.totalValue + stakeValue,
                    weightedPriceChange: acc.weightedPriceChange + (change * stakeValue)
                  }
                }, { totalValue: 0, weightedPriceChange: 0 })
                
                const priceChange24h = totalValue > 0 ? weightedPriceChange / totalValue : 0
                
                const totalTShares = activeStakesOnly.reduce((total, stake) => total + stake.tShares, 0)
                
                  const weightedStakeLength = totalTShares > 0 ? activeStakesOnly.reduce((sum, stake) => {
                  const startDate = new Date(stake.startDate)
                  const endDate = new Date(stake.endDate)
                  const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
                  return sum + (totalDays * stake.tShares)
                  }, 0) / totalTShares : 0
                
                  const weightedAPY = totalTShares > 0 ? activeStakesOnly.reduce((sum, stake) => {
                  const startDate = new Date(stake.startDate)
                  const now = new Date()
                  const daysElapsed = Math.max(1, Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
                  const apy = ((stake.yieldHex / stake.principleHex) / daysElapsed) * 365 * 100
                  return sum + (apy * stake.tShares)
                  }, 0) / totalTShares : 0
                
                return (
                  <>
                    <div className="flex items-center justify-center gap-2">
                      {/* Show league icon only when specific chain is selected */}
                      {chainFilter !== 'both' && totalTShares > 0 && (
                        (() => {
                          const getHexStakesLeague = (tShares: number) => {
                            const OA_TSHARES_PLS = 35482068
                            const OA_TSHARES_ETH = 35155727
                            
                            let totalHexTShares = 37_000_000 // fallback
                            
                            if (hexDailyData) {
                              if (chainFilter === 'ethereum') {
                                const ethLatestDay = hexDailyData.dailyPayouts?.ETH?.[hexDailyData.dailyPayouts.ETH.length - 1]
                                totalHexTShares = ethLatestDay ? (parseFloat(ethLatestDay.shares) / 1000000000000) - OA_TSHARES_ETH : 37_000_000
                              } else if (chainFilter === 'pulsechain') {
                                const plsLatestDay = hexDailyData.dailyPayouts?.PLS?.[hexDailyData.dailyPayouts.PLS.length - 1]
                                totalHexTShares = plsLatestDay ? (parseFloat(plsLatestDay.shares) / 1000000000000) - OA_TSHARES_PLS : 37_000_000
                              }
                            }
                            
                            const percentage = (tShares / totalHexTShares) * 100
                            
                            if (percentage >= 10) return { league: 'Poseidon', icon: '/other-images/poseidon.png' }
                            if (percentage >= 1) return { league: 'Whale', icon: '/other-images/whale.png' }
                            if (percentage >= 0.1) return { league: 'Shark', icon: '/other-images/shark.png' }
                            if (percentage >= 0.01) return { league: 'Dolphin', icon: '/other-images/dolphin.png' }
                            if (percentage >= 0.001) return { league: 'Squid', icon: '/other-images/squid.png' }
                            if (percentage >= 0.0001) return { league: 'Turtle', icon: '/other-images/turtle.png' }
                            if (percentage >= 0.00001) return { league: 'Crab', icon: '/other-images/crab.png' }
                            if (percentage >= 0.000001) return { league: 'Shrimp', icon: '/other-images/shrimp.png' }
                            return { league: 'Shell', icon: '/other-images/shell.png' }
                          }
                          return (
                            <>
                              <div 
                                className="relative z-10 cursor-pointer hover:bg-white/5 hover:shadow-lg transition-all duration-300 mr-1 p-1 rounded-lg"
                                onClick={() => setSoloLeagueDialogOpen(true)}
                              >
                                <Image
                                  src={getHexStakesLeague(totalTShares).icon}
                                  alt="HEX League"
                                  width={22}
                                  height={22}
                                  className="object-contain hover:brightness-150 hover:contrast-125 hover:saturate-150 transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]"
                                />
                              </div>
                              <Dialog open={soloLeagueDialogOpen} onOpenChange={setSoloLeagueDialogOpen}>
                                <DialogContent className="w-full max-w-[360px] sm:max-w-lg max-h-[80vh] bg-black border-2 border-white/10 rounded-lg overflow-y-auto scrollbar-hide">
                                  <div className="p-2">
                                    <TSharesLeagueTable 
                                      userTShares={totalTShares}
                                      totalTShares={(() => {
                                        const OA_TSHARES_PLS = 35482068
                                        const OA_TSHARES_ETH = 35155727
                                        
                                        if (hexDailyData) {
                                          if (chainFilter === 'ethereum') {
                                            const ethLatestDay = hexDailyData.dailyPayouts?.ETH?.[hexDailyData.dailyPayouts.ETH.length - 1]
                                            return ethLatestDay ? (parseFloat(ethLatestDay.shares) / 1000000000000) - OA_TSHARES_ETH : 37_000_000
                                          } else if (chainFilter === 'pulsechain') {
                                            const plsLatestDay = hexDailyData.dailyPayouts?.PLS?.[hexDailyData.dailyPayouts.PLS.length - 1]
                                            return plsLatestDay ? (parseFloat(plsLatestDay.shares) / 1000000000000) - OA_TSHARES_PLS : 37_000_000
                                          }
                                        }
                                        return 37_000_000
                                      })()}
                                      chainName={chainFilter === 'ethereum' ? 'Ethereum' : 'PulseChain'}
                                      hexPrice={chainFilter === 'ethereum' ? getTokenPrice('eHEX') : getTokenPrice('HEX')}
                                    />
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </>
                          )
                        })()
                      )}
                      <div className="text-4xl font-bold text-white">
                        <span className="sm:hidden">${formatBalanceMobile(totalHexValue)}</span>
                        <span className="hidden sm:inline">${formatBalance(totalHexValue)}</span>
                      </div>
                      <button 
                        onClick={toggle24hChangeDisplay}
                        className={`text-sm font-bold cursor-pointer hover:opacity-80 transition-opacity ${priceChange24h >= 0 ? 'text-[#00ff55]' : 'text-red-500'}`}
                        title={showDollarChange ? "Click to show percentage" : "Click to show dollar amount"}
                      >
                        {(() => {
                          const dollarChange = (priceChange24h / 100) * totalHexValue
                          return format24hChange(priceChange24h, dollarChange)
                        })()}
                      </button>
                    </div>
                    <div className="text-sm text-gray-400 mt-2 space-y-1">
                      {(() => {
                        // Calculate chain-specific stats for active stakes
                        const chainStats = activeStakesOnly.reduce((acc, stake) => {
                          const stakeHex = stake.principleHex + stake.yieldHex
                          const hexPrice = stake.chain === 'ETH' ? getTokenPrice('eHEX') : getTokenPrice('HEX')
                          const stakeValue = stakeHex * hexPrice
                          
                          if (stake.chain === 'ETH') {
                            acc.eth.hexAmount += stakeHex
                            acc.eth.hexValue += stakeValue
                            acc.eth.tShares += stake.tShares
                            acc.eth.stakeCount += 1
                          } else {
                            acc.pls.hexAmount += stakeHex
                            acc.pls.hexValue += stakeValue
                            acc.pls.tShares += stake.tShares
                            acc.pls.stakeCount += 1
                          }
                          return acc
                        }, {
                          pls: { hexAmount: 0, hexValue: 0, tShares: 0, stakeCount: 0 },
                          eth: { hexAmount: 0, hexValue: 0, tShares: 0, stakeCount: 0 }
                        })

                        return (
                          <>
                            {chainStats.pls.hexAmount > 0 && (
                              <div>
                                {formatBalance(chainStats.pls.hexAmount)} HEX (${formatDollarValue(chainStats.pls.hexValue)}) across {chainStats.pls.stakeCount} stake{chainStats.pls.stakeCount !== 1 ? 's' : ''} • {chainStats.pls.tShares >= 100 
                                  ? chainStats.pls.tShares.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                                  : chainStats.pls.tShares.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                } T-Shares
                              </div>
                            )}
                            {chainStats.eth.hexAmount > 0 && (
                              <div>
                                {formatBalance(chainStats.eth.hexAmount)} eHEX (${formatDollarValue(chainStats.eth.hexValue)}) across {chainStats.eth.stakeCount} stake{chainStats.eth.stakeCount !== 1 ? 's' : ''} • {chainStats.eth.tShares >= 100 
                                  ? chainStats.eth.tShares.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                                  : chainStats.eth.tShares.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                } T-Shares
                              </div>
                            )}
                          </>
                        )
                      })()}
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      {(weightedStakeLength / 365).toFixed(1)} year avg length • {weightedAPY.toFixed(1)}% avg APY
                    </div>
                  </>
                )
              })()}
            </div>
            )
          )}
          
          <div className="space-y-4">
            {filteredHexStakes.length === 0 ? (
              <div className="bg-black border-2 border-white/10 rounded-2xl p-8 text-center">
                <div className="text-gray-400">
                  No stakes found with the selected filters.
                </div>
                <div className="text-sm text-gray-500 mt-2">
                  Try adjusting your status or chain filters above.
                </div>
              </div>
            ) : (
              filteredHexStakes.slice(0, displayedStakesCount).map((stake) => (
              <Card key={stake.id} className="bg-black/20 backdrop-blur-sm text-white p-4 rounded-xl border-2 border-white/10 relative">
                {/* Chain Icon - Absolutely positioned */}
                <div className="absolute top-6 right-6 z-10">
                  <CoinLogo
                    symbol={stake.chain === 'ETH' ? "ETH-white" : "PLS-white"}
                    size="sm"
                    className="grayscale opacity-50"
                  />
                </div>

                <div className="flex flex-col gap-3 mb-4 pr-8">
                  <div className="flex items-center gap-3 flex-wrap">
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(stake.stakeId);
                        const popup = document.createElement('div');
                        popup.textContent = '✓ Copied!';
                        popup.className = 'fixed bottom-4 left-4 bg-white text-black px-4 py-2 rounded-md text-sm z-[10000] pointer-events-none';
                        document.body.appendChild(popup);
                        setTimeout(() => popup.remove(), 2000);
                      }}
                      className="flex items-center gap-2 px-3 py-1 border border-cyan-400 rounded-full bg-cyan-400/10 hover:bg-cyan-400/20 transition-colors cursor-pointer"
                      title="Click to copy Stake ID"
                    >
                      <span className="text-xs font-medium text-cyan-400">Stake ID:</span>
                      <span className="text-xs font-bold text-cyan-400">{stake.stakeId}</span>
                    </button>
                    <div className={`px-3 py-1 rounded-full text-xs font-medium border ${
                      stake.status === 'active'
                        ? 'border-green-400 text-green-400 bg-green-400/10'
                        : 'border-zinc-400 text-zinc-400 bg-zinc-400/10'
                    }`}>
                      {stake.status === 'inactive' ? 'Ended' : stake.status.charAt(0).toUpperCase() + stake.status.slice(1)}
                    </div>
                    {stake.isEES && (
                      <div className="px-3 py-1 rounded-full text-xs font-medium border border-red-400 text-red-400 bg-red-400/10">
                        EES
                      </div>
                    )}
                    {stake.isOverdue && (
                      <div className="px-3 py-1 rounded-full text-xs font-medium border border-red-400 text-red-400 bg-red-400/10">
                        Late
                      </div>
                    )}
                    {/* BPD Stake Badge */}
                    {(() => {
                      const startDate = new Date(stake.startDate)
                      const endDate = new Date(stake.endDate)
                      const bpdDate = new Date('2020-11-19T00:00:00.000Z') // November 19, 2020 UTC
                      const now = new Date()
                      
                      // Check if stake was created before BPD and ended after BPD (or is still active)
                      const isBpdStake = startDate < bpdDate && (endDate > bpdDate || stake.status === 'active')
                      
                      if (isBpdStake) {
                        return (
                          <div className="px-3 py-1 rounded-full text-xs font-medium border border-yellow-400 text-yellow-400 bg-yellow-400/10">
                            BPD Stake
                          </div>
                        )
                      }
                      return null
                    })()}
                    {/* Wallet Label */}
                    <button 
                      onClick={(e) => {
                        // If shift key is held, copy the address
                        if (e.shiftKey) {
                          navigator.clipboard.writeText(stake.address);
                          const popup = document.createElement('div');
                          popup.textContent = '✓ Address Copied!';
                          popup.className = 'fixed bottom-4 left-4 bg-white text-black px-4 py-2 rounded-md text-sm z-[10000] pointer-events-none';
                          document.body.appendChild(popup);
                          setTimeout(() => popup.remove(), 2000);
                        } else {
                          // Otherwise, filter by address
                          const address = addresses.find(addr => addr.address.toLowerCase() === stake.address.toLowerCase())
                          if (address) {
                            handleAddressFilter(address.id)
                          }
                        }
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                        (() => {
                          const address = addresses.find(addr => addr.address.toLowerCase() === stake.address.toLowerCase())
                          return address && selectedAddressIds.includes(address.id)
                            ? 'bg-white text-black border-white'
                            : 'bg-white/5 border-white/20 text-white hover:bg-white/10'
                        })()
                      }`}
                      title="Click to filter, Shift+Click to copy address"
                    >
                      {(() => {
                        const address = addresses.find(addr => addr.address.toLowerCase() === stake.address.toLowerCase())
                        return address?.label || `0x...${stake.address.slice(-4)}`
                      })()}
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                      {/* Stake value display */}
                      {(() => {
                        const hexPrice = stake.chain === 'ETH' ? getTokenPrice('eHEX') : getTokenPrice('HEX')
                        const hexPriceData = stake.chain === 'ETH' ? prices['eHEX'] : prices['HEX']
                        const priceChange24h = hexPriceData?.priceChange?.h24 || 0
                        
                        if (stake.isEES) {
                          // For EES stakes, show principal value in dollars
                          const principalValue = stake.principleHex * hexPrice
                        return (
                            <div className="text-4xl font-bold text-white">
                              <span className="sm:hidden">${formatBalanceMobile(principalValue)}</span>
                              <span className="hidden sm:inline">${formatBalance(principalValue)}</span>
                            </div>
                          )
                        }
                        
                        // For normal stakes
                        const totalValue = (stake.principleHex + stake.yieldHex) * hexPrice
                        return (
                          <div className="flex items-center gap-2">
                            <div className="text-4xl font-bold text-white">
                              <span className="sm:hidden">${formatBalanceMobile(totalValue)}</span>
                              <span className="hidden sm:inline">${formatBalance(totalValue)}</span>
                            </div>
                            <button 
                              onClick={toggle24hChangeDisplay}
                              className={`text-sm font-bold cursor-pointer hover:opacity-80 transition-opacity ${priceChange24h >= 0 ? 'text-[#00ff55]' : 'text-red-500'}`}
                              title={showDollarChange ? "Click to show percentage" : "Click to show dollar amount"}
                            >
                              {(() => {
                                const dollarChange = (priceChange24h / 100) * totalValue
                                return format24hChange(priceChange24h, dollarChange)
                              })()}
                            </button>
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                                        <div className="text-sm text-gray-400 mt-2">
                        {stake.isEES ? (
                          <>
                            {stake.principleHex.toLocaleString()} HEX principal
                          </>
                        ) : (
                          <>
                            {(stake.principleHex + stake.yieldHex).toLocaleString()} total HEX = <span className="text-xs">({stake.principleHex.toLocaleString()} principal + {stake.yieldHex.toLocaleString()} yield)</span>
                          </>
                        )}
                  </div>
                  <div className="text-sm text-zinc-500 mt-1">
                    {stake.tShares.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} T-Shares
                  </div>
                  <div className="text-sm text-zinc-500 pb-2">
                    {(() => {
                      // Calculate APY: ((hex yield/hex principle)/days so far)*365
                      const startDate = new Date(stake.startDate)
                      const now = new Date()
                      const daysElapsed = Math.max(1, Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
                      
                      // Your formula: ((hex yield/hex principle)/days so far)*365
                      const apy = ((stake.yieldHex / stake.principleHex) / daysElapsed) * 365 * 100
                      
                      return `${apy.toFixed(1)}% APY`
                    })()}
                  </div>
                  
                  {/* Progress Bar with percentage above and days left below */}
                  {(!stake.isOverdue) && (
                    <div className="text-xs mb-4 ml-2 mt-6 mb-4 mr-4 relative">
                      <div 
                        className={`font-bold ${stake.isEES ? 'text-red-400' : 'text-[#70D668]'} absolute bottom-0 mb-2`}
                        style={{ 
                          left: `${stake.progress}%`,
                          transform: 'translateX(-50%)'
                        }}
                      >
                        {stake.progress}%
                      </div>
                    </div>
                  )}
                  <div className="relative h-[4px] mb-2">
                    <div className={`absolute inset-0 rounded-full ${stake.isOverdue ? 'bg-red-900/30' : stake.isEES ? 'bg-red-900/30' : 'bg-[#23411F]'}`} />
                    <div 
                      className={`absolute inset-y-0 left-0 rounded-full ${stake.isOverdue || stake.isEES ? 'bg-red-400' : 'bg-[#70D668]'}`}
                      style={{ width: `${stake.progress}%` }} 
                    />
                  </div>
                  <div className="text-xs text-zinc-500 text-right">
                    {(() => {
                      const startDate = new Date(stake.startDate)
                      const endDate = new Date(stake.endDate)
                      const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
                      const daysServed = Math.round((stake.progress / 100) * totalDays)
                      
                      // Special numbers that get gradient styling
                      const specialNumbers = [5555, 555, 369]
                      const isSpecialTotal = specialNumbers.includes(totalDays)
                      const isSpecialDaysLeft = specialNumbers.includes(stake.daysLeft)
                      
                      if (stake.isEES) {
                        const actualEndDate = new Date(stake.actualEndDate)
                        const daysEarly = totalDays - daysServed
                        return (
                          <span className="text-red-400">
                            Ended {daysEarly} days early
                          </span>
                        )
                      }
                      
                      if (stake.isOverdue && stake.daysLeft < 0) {
                        return (
                          <span className="text-red-400">
                            {Math.abs(stake.daysLeft)} days late
                          </span>
                        )
                      }

                      if (stake.status === 'inactive' && !stake.isEES) {
                        return (
                          <span className="text-[#70D668]">
                            {daysServed} of {totalDays} days
                          </span>
                        )
                      }
                      
                      if (isSpecialTotal || isSpecialDaysLeft) {
                        return (
                          <span>
                            <span className={isSpecialDaysLeft ? 'bg-gradient-to-r from-[#ffff00] via-[#ff6600] to-[#ff0099] bg-clip-text text-transparent font-bold' : ''}>
                              {stake.daysLeft}
                            </span>
                            {' days left of '}
                            <span className={isSpecialTotal ? 'bg-gradient-to-r from-[#ffff00] via-[#ff6600] to-[#ff0099]  bg-clip-text text-transparent font-bold' : ''}>
                              {totalDays}
                            </span>
                            {' days'}
                          </span>
                        )
                      }
                      
                      return `${stake.daysLeft} days left of ${totalDays} days`
                    })()}
                  </div>
                  
                  <div className="flex justify-between text-sm text-zinc-500 mt-4">
                    <div>Start: {(() => {
                      const date = new Date(stake.startDate)
                      const isDecember3 = date.getMonth() === 11 && date.getDate() === 3 // December is month 11 (0-indexed)
                      const formattedDate = date.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: '2-digit', 
                        year: 'numeric' 
                      })
                      
                      if (isDecember3) {
                        return (
                          <span className="bg-gradient-to-r from-[#ffff00] via-[#ff6600] to-[#ff0099] bg-clip-text text-transparent font-bold">
                            {formattedDate}
                          </span>
                        )
                      }
                      
                      return formattedDate
                    })()}</div>
                    <div className="text-right">End: {(() => {
                      // Calculate the original promised end date from the start date and total days
                      const startDate = new Date(stake.startDate)
                      const totalDays = Math.round((new Date(stake.endDate).getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
                      const promisedEndDate = new Date(startDate)
                      promisedEndDate.setDate(startDate.getDate() + totalDays)
                      
                      return promisedEndDate.toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: '2-digit', 
                        year: 'numeric' 
                      })
                    })()}</div>
                  </div>
                </div>
              </Card>
            ))
            )}
            
            {/* Load More Stakes Button */}
            {filteredHexStakes.length > displayedStakesCount && (
              <div className="text-center pt-4">
                <button
                  onClick={() => setDisplayedStakesCount(prev => Math.min(prev + 20, filteredHexStakes.length))}
                  className="px-6 py-3 bg-white/5 border border-white/20 text-white rounded-lg hover:bg-white/10 transition-colors"
                >
                  Load More Stakes ({filteredHexStakes.length - displayedStakesCount} remaining)
                </button>
              </div>
            )}
              </div>
        </Section>
      )}

      {/* Edit Addresses Popup modal*/}
      <AnimatePresence>
        {showEditModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-start sm:items-center justify-center p-4 pt-16 sm:pt-16"
            onClick={handleModalClose}
          >
            <motion.div 
              data-modal-content
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-black border-2 border-white/20 rounded-2xl w-full max-w-[85vw] sm:max-w-2xl max-h-[55vh] sm:max-h-[75vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Fixed Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-white/10">
                <div className="flex bg-white/5 border border-white/10 rounded-full p-1">
                  <button
                    onClick={() => setActiveTab('addresses')}
                    className={`px-6 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-all duration-200 relative z-10 ${
                      activeTab === 'addresses' 
                        ? 'bg-white text-black shadow-lg' 
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="sm:hidden">Addresses</span>
                    <span className="hidden sm:inline">{displayAddresses.length} Address{displayAddresses.length !== 1 ? 'es' : ''}</span>
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
                  onClick={handleModalClose}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                >
                  <Icons.close size={20} />
                </button>
                                </div>

              {/* Content */}
              <div className="flex-1 p-4 sm:p-6 overflow-y-auto scrollbar-hide">
                {activeTab === 'addresses' && (
                  <>
              {/* Address List */}
                    <div className="space-y-4">
                {displayAddresses.map((addr, index) => {
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
                  
                  const isPending = pendingAddresses.some(p => p.id === addr.id)
                  
                  return (
                    <div key={addr.id} className={`flex items-center gap-2 sm:gap-4 py-3 border-b border-white/10 last:border-b-0 ${isPending ? 'opacity-60' : ''}`}>
                      {/* Address */}
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(addr.address);
                          const popup = document.createElement('div');
                          popup.textContent = '✓ Address Copied!';
                          popup.className = 'fixed bottom-4 left-4 bg-white text-black px-4 py-2 rounded-md text-sm z-[10000] pointer-events-none';
                          document.body.appendChild(popup);
                          setTimeout(() => popup.remove(), 2000);
                        }}
                        className="flex-1 font-mono text-sm text-white hover:text-gray-300 transition-colors cursor-pointer text-left"
                        title="Click to copy address"
                      >
                        <span className="sm:hidden">0x...{addr.address.slice(-4)}</span>
                        <span className="hidden sm:block">{addr.address}</span>
                        {isPending && <span className="text-xs text-yellow-400 ml-2">(pending)</span>}
                      </button>
                      
                      {/* Name/Label Field */}
                      <div className="w-40 sm:w-72">
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
                          className="w-full px-3 py-2 bg-black border border-white/20 rounded text-white placeholder-gray-500/50 focus:border-white/40 focus:outline-none text-sm"
                        />
                              </div>
                      
                      {/* Save/Delete Button */}
                      <div className="flex-shrink-0">
                        {isEditing && tempLabel !== (addr.label || '') ? (
                          <button
                            onClick={handleSave}
                            className="p-2 hover:bg-white/20 rounded transition-colors text-white hover:text-gray-300"
                            title="Save changes"
                          >
                            <Icons.save size={16} />
                          </button>
                        ) : (
                          <button
                            onClick={() => removeAddress(addr.id)}
                            className="p-2 hover:bg-red-600/20 rounded transition-colors text-red-400 hover:text-red-300"
                            title="Delete address"
                          >
                            <Icons.trash size={16} />
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
                <div className="space-y-6">
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex-1">
                        <div className="font-medium text-white mb-1">MAXI Tokens</div>
                        <div className="text-sm text-gray-400">
                          Use the backing price instead of the current market price
                          {detectiveMode && <span className="block text-xs text-blue-400 mt-1">Detective mode defaults: OFF</span>}
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

                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex-1">
                        <div className="font-medium text-white mb-1">Include T-Shares from Pooled Stakes?</div>
                        <div className="text-sm text-gray-400">
                          This will include pooled T-Shares in certain stats.
                          {detectiveMode && <span className="block text-xs text-blue-400 mt-1">Detective mode defaults: ON</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => setIncludePooledStakes(!includePooledStakes)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                          includePooledStakes ? 'bg-white' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${
                            includePooledStakes ? 'translate-x-6' : 'translate-x-1'
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
                        className="w-full px-3 py-2 bg-black border border-white/20 rounded text-white placeholder-gray-500/50 focus:border-white/40 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>

                    <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex-1 mb-3">
                        <div className="font-medium text-white mb-1">Hide Dust</div>
                        <div className="text-sm text-gray-400">
                          Hide balances below this amount
                        </div>
                      </div>
                      <div className="relative mb-4">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
                        <input
                          type="text"
                          value={dustFilterInput}
                          onFocus={() => {
                            // When focusing, show the current value or empty if 0
                            setDustFilterInput(dustFilter === 0 ? '' : dustFilter.toString())
                          }}
                          onChange={(e) => {
                            const value = e.target.value
                            setDustFilterInput(value)
                            
                            // Allow empty, numbers, and decimal patterns like "0", "0.", "0.0", "0.00", etc.
                            if (value === '' || /^\d*\.?\d*$/.test(value)) {
                              const parsed = parseFloat(value)
                              if (value === '' || isNaN(parsed)) {
                                setDustFilter(0)
                              } else {
                                setDustFilter(parsed)
                              }
                            }
                          }}
                          onBlur={(e) => {
                            // Clean up the display when field loses focus
                            const value = e.target.value
                            const parsed = parseFloat(value)
                            if (isNaN(parsed) || parsed === 0) {
                              setDustFilter(0)
                              setDustFilterInput('')
                            } else {
                              setDustFilter(parsed)
                              setDustFilterInput(parsed.toString())
                            }
                          }}
                          placeholder="0"
                          className="w-full pl-8 pr-3 py-2 bg-black border border-white/20 rounded text-white placeholder-gray-500/50 focus:border-white/40 focus:outline-none"
                        />
                      </div>
                      
                                              <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="text-sm text-gray-400">
                              Display tokens that have no price available?<br />
                            </div>
                          </div>
                        <button
                          onClick={() => setHideTokensWithoutPrice(!hideTokensWithoutPrice)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                            hideTokensWithoutPrice ? 'bg-white' : 'bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${
                              hideTokensWithoutPrice ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
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
                        className="w-full sm:w-1/2 px-3 py-2 bg-black border border-white/20 rounded text-white placeholder-gray-500/50 focus:border-white/40 focus:outline-none text-sm"
                  />
                      <div className="flex gap-3 w-full sm:w-1/2">
                  <input
                    type="text"
                    placeholder="Name (optional)"
                    value={newLabelInput}
                    onChange={(e) => setNewLabelInput(e.target.value)}
                          className="flex-1 min-w-[200px] px-3 py-2 bg-black border border-white/20 rounded text-white placeholder-gray-500/50 focus:border-white/40 focus:outline-none text-sm"
                  />
                  <button
                    onClick={handleAddAddressInModal}
                    disabled={!newAddressInput.trim()}
                          className="px-6 py-2 bg-white text-black font-medium rounded disabled:white disabled:text-black hover:bg-gray-100 transition-colors whitespace-nowrap"
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