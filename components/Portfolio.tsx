'use client'

// Feature flags - set to false to hide features from users
const ENABLE_MORE_TOKENS = true  // Hide "Include More Tokens" setting and Tokens tab
const ENABLE_TOKENS_TAB = true   // Hide Tokens tab specifically

import React, { useState, useMemo, useEffect, memo, useCallback, useRef, startTransition } from 'react'
import { CoinLogo } from '@/components/ui/CoinLogo'
import { useTokenPrices } from '@/hooks/crypto/useTokenPrices'
import { useTokenSupply } from '@/hooks/crypto/useTokenSupply'
import { usePortfolioBalance } from '@/hooks/crypto/usePortfolioBalance'
import { fetchTokenImageFromDexScreener } from '@/hooks/crypto/useCustomTokenData'
import { useLiquidityPositions, useEnhancedPortfolioHoldings, useLPTokenPrices } from '@/hooks/crypto/useLiquidityPositions'
import { useMaxiTokenData } from '@/hooks/crypto/useMaxiTokenData'
import { usePlsApiData } from '@/hooks/crypto/usePlsApiData'
import { useHexStakes } from '@/hooks/crypto/useHexStakes'
import { useHsiStakes } from '@/hooks/crypto/useHsiStakes'
import { useBackgroundPreloader } from '@/hooks/crypto/useBackgroundPreloader'
import { useHexDailyDataCache, calculateYieldForStake } from '@/hooks/crypto/useHexDailyData'
import { usePulseXLPDataSWR } from '@/hooks/crypto/usePulseXLPData'
import { useAllDefinedLPTokenPrices } from '@/hooks/crypto/useAllLPTokenPrices'
import { use9MmV3Positions } from '@/hooks/crypto/use9MmV3Positions'
import { useV3PositionTicks } from '@/hooks/crypto/useV3PositionTicks'
import { useAddressTransactions } from '@/hooks/crypto/useAddressTransactions'
import { useEnrichedTransactions } from '@/hooks/crypto/useEnrichedTransactions'
import { useFontContext, AVAILABLE_FONTS } from '@/contexts/FontContext'
import { motion, AnimatePresence } from 'framer-motion'
import { TOKEN_CONSTANTS } from '@/constants/crypto'
import { MORE_COINS } from '@/constants/more-coins'
import { cleanTickerForLogo } from '@/utils/ticker-display'
import { Icons } from '@/components/ui/icons'
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Toggle } from '@/components/ui/toggle'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-range-picker'

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
import { ChevronDown, ArrowLeftRight } from 'lucide-react'

interface StoredAddress {
  address: string
  label?: string
  id: string
}

interface CustomToken {
  id: string
  chain: number
  a: string
  dexs: string
  ticker: string
  decimals: number
  name: string
  createdAt: number
  logoUrl?: string // Cached logo URL from DexScreener
}

interface PortfolioProps {
  detectiveMode?: boolean
  detectiveAddress?: string
  eesMode?: boolean
}

export default function Portfolio({ detectiveMode = false, detectiveAddress, eesMode = false }: PortfolioProps) {
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
  const [loadingDots, setLoadingDots] = useState(0)
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
  // Add state for duplicate token ticker error
  const [duplicateTokenError, setDuplicateTokenError] = useState<string | null>(null)
  // Add state for bulk parsing results
  const [bulkParseResults, setBulkParseResults] = useState<{
    valid: string[]
    invalid: string[]
    duplicates: string[]
  } | null>(null)
  // Add state for modal tabs
  const [activeTab, setActiveTab] = useState<'addresses' | 'settings' | 'coins'>('addresses')
  // Add state for HEX stakes display pagination
  const [displayedStakesCount, setDisplayedStakesCount] = useState(20)
  // Add state for LP token expanded sections
  const [expandedLPTokens, setExpandedLPTokens] = useState<Set<string>>(new Set())
  const [expandedV3Groups, setExpandedV3Groups] = useState<Set<string>>(new Set())
  const [expandedV3Positions, setExpandedV3Positions] = useState<Set<string>>(new Set())
  const [v3PriceToggles, setV3PriceToggles] = useState<Set<string>>(new Set())
  
  // V3 position filter state (default to 'active' only)
  const [v3PositionFilter, setV3PositionFilter] = useState<'all' | 'active' | 'closed'>('active')
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
  // Add state for EES value toggle
  const [useEESValue, setUseEESValue] = useState<boolean>(() => {
    if (detectiveMode) {
      // Detective mode uses regular value by default, no localStorage
      return false
    }
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolioUseEESValue')
      return saved === 'true'
    }
    return false
  })

  // Add state for coin detection mode
  const [coinDetectionMode, setCoinDetectionMode] = useState<'auto-detect' | 'manual'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolioCoinDetectionMode')
      if (saved && ['auto-detect', 'manual'].includes(saved)) {
        return saved as 'auto-detect' | 'manual'
      }
    }
    // Default to auto-detect for new users
    return 'auto-detect'
  })

  // Custom tokens state
  const [customTokens, setCustomTokens] = useState<CustomToken[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolioCustomTokens')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (e) {
          console.error('Failed to parse custom tokens from localStorage:', e)
        }
      }
    }
    return []
  })

  // Pending custom tokens (like pending addresses) - only committed when user saves
  const [pendingCustomTokens, setPendingCustomTokens] = useState<CustomToken[]>([])
  const [pendingDeletedTokenIds, setPendingDeletedTokenIds] = useState<Set<string>>(new Set())

  // Combined tokens for display (existing + pending - deleted)
  const displayCustomTokens = useMemo(() => {
    const existingTokens = customTokens.filter(token => !pendingDeletedTokenIds.has(token.id))
    return [...existingTokens, ...pendingCustomTokens]
  }, [customTokens, pendingCustomTokens, pendingDeletedTokenIds])

  // Custom token form state
  const [newTokenForm, setNewTokenForm] = useState({
    contractAddress: '',
    name: '',
    ticker: '',
    chain: 369
  })

  // Custom token section toggle state
  const [isCustomTokenSectionOpen, setIsCustomTokenSectionOpen] = useState(false)
  
  // Edit mode state for custom tokens
  const [editingTokenId, setEditingTokenId] = useState<string | null>(null)
  
  // Auto-detect token data state
  const [isAutoDetecting, setIsAutoDetecting] = useState(false)

  // Font context
  const { useFontSelection, setUseFontSelection, selectedFont, setSelectedFont, applyFontOnModalClose } = useFontContext()

  // Custom background color state
  const [useCustomBackground, setUseCustomBackground] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolioUseCustomBackground')
      return saved === 'true'
    }
    return false
  })
  
  const [customBackgroundColor, setCustomBackgroundColor] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolioCustomBackgroundColor')
      return saved || '#ffffff'
    }
    return '#ffffff'
  })

  // Ref to access color picker value directly
  const colorPickerRef = useRef<HTMLInputElement>(null)
  
  // Current color being dragged (for preview and saving)
  const [currentPickerColor, setCurrentPickerColor] = useState<string>(customBackgroundColor)

  // Sync currentPickerColor with customBackgroundColor when it changes from outside
  useEffect(() => {
    setCurrentPickerColor(customBackgroundColor)
  }, [customBackgroundColor])

  // Add state for coin toggles (which coins to include in balance checks)
  const [enabledCoins, setEnabledCoins] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolioEnabledCoins')
      if (saved) {
        try {
          return new Set(JSON.parse(saved))
        } catch (e) {
          console.warn('Failed to parse saved enabled coins:', e)
        }
      }
    }
    // Default to empty set for new users (auto-detect will handle this)
    return new Set()
  })

  // Add pending state for coin toggles (to prevent immediate portfolio reload)
  const [pendingEnabledCoins, setPendingEnabledCoins] = useState<Set<string> | null>(null)
  
  // Pending mode changes - track mode changes before they're committed
  const [pendingCoinDetectionMode, setPendingCoinDetectionMode] = useState<'auto-detect' | 'manual' | null>(null)
  
  // Track if user has made manual changes to avoid overriding their choices
  const [hasUserMadeManualChanges, setHasUserMadeManualChanges] = useState<boolean>(false)

  // Add state for active chain in coins tab
  const [activeChainTab, setActiveChainTab] = useState<number>(369) // Default to PulseChain

  // MORE_COINS already has the correct structure, no normalization needed

  // Add search state for manual mode
  const [tokenSearchTerm, setTokenSearchTerm] = useState('')

  // Add state for custom token balances (overrides)
  const [customBalances, setCustomBalances] = useState<Map<string, string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolioCustomBalances')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          return new Map(Object.entries(parsed))
        } catch (e) {
          console.warn('Failed to parse saved custom balances:', e)
        }
      }
    }
    return new Map()
  })

  // Add state for custom V3 position USD value overrides
  const [customV3Values, setCustomV3Values] = useState<Map<string, string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolioCustomV3Values')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          return new Map(Object.entries(parsed))
        } catch (e) {
          console.warn('Failed to parse saved custom V3 values:', e)
        }
      }
    }
    return new Map()
  })

  // Add state for reset confirmation dialog
  const [showResetConfirmDialog, setShowResetConfirmDialog] = useState(false)

  // Track newly enabled tokens (show ? until portfolio reloads)
  const [newlyEnabledTokens, setNewlyEnabledTokens] = useState<Set<string>>(new Set())

  // Import functionality removed - manual mode no longer requires scanning
  const [hasSeenTokenPopup, setHasSeenTokenPopup] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolioHasSeenTokenPopup')
      return saved === 'true'
    }
    return false
  })

  // Format balance for input placeholder
  const formatBalanceForPlaceholder = (balance: number | null): string => {
    if (balance === null) return '?'
    if (balance === 0) return '0'
    // For very small balances, use scientific notation
    if (balance > 0 && balance < 0.01) {
      return balance.toExponential(2)
    }
    if (balance >= 100) {
      const wholeNumber = Math.floor(balance)
      return wholeNumber >= 10000 ? wholeNumber.toLocaleString() : wholeNumber.toString()
    }
    return balance.toFixed(2)
  }

  // Format input value with commas for large numbers
  const formatInputValue = (value: string): string => {
    // Remove existing commas and non-numeric characters except decimal point
    const numericValue = value.replace(/[^\d.]/g, '')
    
    // Split into integer and decimal parts
    const parts = numericValue.split('.')
    const integerPart = parts[0]
    const decimalPart = parts[1]
    
    // Add commas to integer part if >= 10000
    let formattedInteger = integerPart
    if (parseInt(integerPart, 10) >= 10000) {
      formattedInteger = parseInt(integerPart, 10).toLocaleString()
    }
    
    // Reconstruct with decimal part if it exists
    return decimalPart !== undefined ? `${formattedInteger}.${decimalPart}` : formattedInteger
  }

  // Parse input value removing commas for storage
  const parseInputValue = (value: string): string => {
    return value.replace(/,/g, '')
  }

  // Function to get current balance for a token (returns null if data not loaded yet)
  const getCurrentBalance = (tokenSymbol: string): number | null => {
    // First check if this token was just toggled on (should show "?" immediately)
    if (newlyEnabledTokens.has(tokenSymbol)) {
      return null
    }
    
    // Check if this is a farm token - farm tokens should not have regular ERC-20 balances
    const allTokens = [...TOKEN_CONSTANTS, ...MORE_COINS, ...customTokens]
    const tokenConfig = allTokens.find(t => t.ticker === tokenSymbol)
    if (tokenConfig?.type === 'farm') {
      return 0 // Farm tokens don't have regular token balances, they represent staked amounts
    }
    
    // If no balance data at all, show loading
    if (!rawBalances || rawBalances.length === 0) return null
    
    // Filter balances the same way as mainTokensWithBalances
    const filtered = rawBalances.filter(addressData => {
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
    
    let totalBalance = 0
    let foundToken = false
    let hasValidData = false
    let hasPlaceholder = false
    
    filtered.forEach(balanceData => {
      // Check native balance
      if (balanceData.nativeBalance && balanceData.nativeBalance.symbol === tokenSymbol) {
        foundToken = true
        if (balanceData.nativeBalance.balanceFormatted !== null) {
          totalBalance += balanceData.nativeBalance.balanceFormatted
          hasValidData = true
        }
      }
      
      // Check token balances
      balanceData.tokenBalances?.forEach(token => {
        if (token.symbol === tokenSymbol) {
          foundToken = true
          if (token.balanceFormatted !== null) {
            totalBalance += token.balanceFormatted
            hasValidData = true
          } else if (token.isPlaceholder) {
            // This is a placeholder token (just toggled on, no balance data yet)
            hasPlaceholder = true
          }
        }
      })
    })
    
    // If we found the token and have actual balance data, return it (even if 0)
    if (foundToken && hasValidData) {
      return totalBalance
    }
    
    // If we found a placeholder, it means confirmed zero balance after portfolio reload
    if (foundToken && hasPlaceholder) {
      return 0
    }
    
    // If we found the token but no data, show loading (shouldn't happen much)
    if (foundToken) {
      return null
    }
    
    // If token not found at all, return 0 (confirmed zero balance)
    return 0
  }








  // Add state for Time-Shift feature toggle
  const [useTimeShift, setUseTimeShift] = useState<boolean>(() => {
    if (detectiveMode) {
      // Detective mode defaults Time-Shift off, no localStorage
      return false
    }
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolioUseTimeShift')
      return saved === 'true'
    }
    return false
  })

  // Add state for Time-Shift date (defaults to today, persists in localStorage)
  const [timeShiftDate, setTimeShiftDate] = useState<Date>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolio-time-shift-date')
      if (saved) {
        // Validate the saved date is in correct format and not in the past
        const savedDate = new Date(saved)
        const today = new Date()
        today.setHours(0, 0, 0, 0) // Reset time to start of day for comparison
        
        if (!isNaN(savedDate.getTime()) && savedDate >= today) {
          return savedDate
        }
      }
    }
    // Default to today if no valid saved date
    return new Date()
  })

  // Save Time-Shift date to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && timeShiftDate) {
      localStorage.setItem('portfolio-time-shift-date', timeShiftDate.toISOString().split('T')[0])
    }
  }, [timeShiftDate])

  // Save token popup seen state to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('portfolioHasSeenTokenPopup', hasSeenTokenPopup.toString())
    }
  }, [hasSeenTokenPopup])

  // Save custom balances to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const balancesObject = Object.fromEntries(customBalances)
      localStorage.setItem('portfolioCustomBalances', JSON.stringify(balancesObject))
    }
  }, [customBalances])

  // Save custom V3 values to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const v3ValuesObject = Object.fromEntries(customV3Values)
      localStorage.setItem('portfolioCustomV3Values', JSON.stringify(v3ValuesObject))
    }
  }, [customV3Values])



  // Function to check balance for a single token
  const checkTokenBalance = async (tokenAddress: string, walletAddress: string, decimals: number): Promise<number> => {
    try {
      const rpcUrl = 'https://rpc-pulsechain.g4mm4.io'
      
      // ERC-20 balanceOf(address) function signature + padded wallet address
      const data = '0x70a08231' + walletAddress.slice(2).padStart(64, '0')
      
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [
            {
              to: tokenAddress,
              data: data
            },
            'latest'
          ],
          id: 1
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (result.error) {
        throw new Error(`RPC error: ${result.error.message}`)
      }

      const hexBalance = result.result
      const balance = hexBalance && hexBalance !== '0x' ? BigInt(hexBalance).toString() : '0'
      const balanceFormatted = balance !== '0' ? Number(balance) / Math.pow(10, decimals) : 0

      return balanceFormatted
    } catch (error) {
      console.error(`Error fetching balance for ${tokenAddress}:`, error)
      return 0
    }
  }

  // Import function removed - manual mode no longer requires scanning

  // Helper to convert timeShiftDate to string format for calculations
  const timeShiftDateString = useMemo(() => {
    return timeShiftDate ? timeShiftDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
  }, [timeShiftDate])

  // Time Machine price override states
  const [timeMachineHexPrice, setTimeMachineHexPrice] = useState<string>(() => {
    if (detectiveMode) return '' // Detective mode doesn't persist settings
    if (typeof window !== 'undefined') {
      return localStorage.getItem('portfolioTimeMachineHexPrice') || ''
    }
    return ''
  })
  const [timeMachineEHexPrice, setTimeMachineEHexPrice] = useState<string>(() => {
    if (detectiveMode) return '' // Detective mode doesn't persist settings
    if (typeof window !== 'undefined') {
      return localStorage.getItem('portfolioTimeMachineEHexPrice') || ''
    }
    return ''
  })
  const [timeMachineEthPayout, setTimeMachineEthPayout] = useState<string>(() => {
    if (detectiveMode) return '' // Detective mode doesn't persist settings
    if (typeof window !== 'undefined') {
      return localStorage.getItem('portfolioTimeMachineEthPayout') || ''
    }
    return ''
  })
  const [timeMachinePlsPayout, setTimeMachinePlsPayout] = useState<string>(() => {
    if (detectiveMode) return '' // Detective mode doesn't persist settings
    if (typeof window !== 'undefined') {
      return localStorage.getItem('portfolioTimeMachinePlsPayout') || ''
    }
    return ''
  })

  // State to track if component has mounted (to avoid hydration mismatch)
  const [hasMounted, setHasMounted] = useState(false)

  // Set mounted state after hydration
  useEffect(() => {
    setHasMounted(true)
  }, [])



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
  const [tokenSortField, setTokenSortField] = useState<'amount' | 'change' | 'dollarChange' | 'alphabetical' | 'league'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolioTokenSortField')
      if (saved && ['amount', 'change', 'dollarChange', 'alphabetical', 'league'].includes(saved)) {
        return saved as 'amount' | 'change' | 'dollarChange' | 'alphabetical' | 'league'
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

  // Show liquidity positions state (default to false/off)
  const [showLiquidityPositions, setShowLiquidityPositions] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolioShowLiquidityPositions')
      return saved !== null ? saved === 'true' : false // Default to false
    }
    return false
  })

  // Advanced filter for temporarily hiding liquidity positions (independent of main setting)
  const [includeLiquidityPositionsFilter, setIncludeLiquidityPositionsFilter] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolioIncludeLiquidityFilter')
      return saved !== null ? saved === 'true' : true // Default to true (include when available)
    }
    return true
  })

  // Include more tokens setting (scan MORE_COINS list in addition to TOKEN_CONSTANTS)
  const [includeMoreTokens, setIncludeMoreTokens] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolioIncludeMoreTokens')
      return saved === 'true' // Default to false for performance
    }
    return false
  })

  // Track initial state to detect changes when settings popup closes
  const [initialIncludeMoreTokens, setInitialIncludeMoreTokens] = useState<boolean>(includeMoreTokens)
  
  // Pending state for includeMoreTokens (like pendingCoinDetectionMode)
  const [pendingIncludeMoreTokens, setPendingIncludeMoreTokens] = useState<boolean | null>(null)
  
  // Pending state for showLiquidityPositions
  const [pendingShowLiquidityPositions, setPendingShowLiquidityPositions] = useState<boolean | null>(null)







  // Advanced filter for temporarily hiding validators (independent of main setting)
  const [includeValidatorsFilter, setIncludeValidatorsFilter] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolioIncludeValidatorsFilter')
      return saved !== null ? saved === 'true' : true // Default to true (include when available)
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

  // Dust filter input display state (should always reflect the actual filter value)
  const [dustFilterInput, setDustFilterInput] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolioDustFilter')
      const savedValue = saved ? parseFloat(saved) || 0 : 0
      return savedValue === 0 ? '' : savedValue.toString()
    }
    return ''
  })

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

  // Stakes tab state (NATIVE vs HSI)
  const [activeStakesTab, setActiveStakesTab] = useState<'native' | 'hsi'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolioActiveStakesTab')
      if (saved && (saved === 'native' || saved === 'hsi')) {
        return saved as 'native' | 'hsi'
      }
    }
    return 'native' // Default to native stakes
  })

  // Auto-switch to NATIVE tab when toggle is disabled
  useEffect(() => {
    if (!includePooledStakes && activeStakesTab === 'hsi') {
      setActiveStakesTab('native')
      if (typeof window !== 'undefined') {
        localStorage.setItem('portfolioActiveStakesTab', 'native')
      }
    }
  }, [includePooledStakes, activeStakesTab])
  
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
      // Save current values
      const originalBodyOverflow = document.body.style.overflow
      const originalBodyPosition = document.body.style.position
      const originalBodyTop = document.body.style.top
      const originalBodyWidth = document.body.style.width
      const originalBodyTouchAction = document.body.style.touchAction
      const originalHtmlOverflow = document.documentElement.style.overflow
      const originalHtmlTouchAction = document.documentElement.style.touchAction
      const scrollY = window.scrollY
      
      // Disable scrolling on mobile and desktop
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.top = `-${scrollY}px`
      document.body.style.width = '100%'
      document.body.style.touchAction = 'none'
      
      // Also disable on html element for better mobile support
      document.documentElement.style.overflow = 'hidden'
      document.documentElement.style.touchAction = 'none'
      
      // Cleanup function to restore scroll when modal closes
      return () => {
        document.body.style.overflow = originalBodyOverflow
        document.body.style.position = originalBodyPosition
        document.body.style.top = originalBodyTop
        document.body.style.width = originalBodyWidth
        document.body.style.touchAction = originalBodyTouchAction
        document.documentElement.style.overflow = originalHtmlOverflow
        document.documentElement.style.touchAction = originalHtmlTouchAction
        window.scrollTo(0, scrollY)
      }
    }
  }, [showEditModal])

  // Handle modal close on outside click or escape key
  useEffect(() => {
    if (!showEditModal) return

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // If reset dialog is open, close only the reset dialog
        if (showResetConfirmDialog) {
          setShowResetConfirmDialog(false)
        } else {
          // Otherwise close the entire modal
          handleModalClose()
        }
      }
    }

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element
      if (target?.closest('[data-modal-content]')) return
      // Also ignore clicks on Radix UI portals (dropdowns, selects, etc.)
      if (target?.closest('[data-radix-popper-content-wrapper]')) return
      if (target?.closest('[data-radix-select-content]')) return
      if (target?.closest('[data-radix-dropdown-menu-content]')) return
      handleModalClose()
    }

    document.addEventListener('keydown', handleEscape)
    document.addEventListener('mousedown', handleClickOutside)

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showEditModal, showResetConfirmDialog])



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
    if (typeof window !== 'undefined' && addresses.length > 0) {
      localStorage.setItem('portfolioAddresses', JSON.stringify(addresses))
    }
  }, [addresses, detectiveMode])

  // Save chain filter to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('portfolioChainFilter', chainFilter)
    }
  }, [chainFilter])

  // Save selected address IDs to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('portfolioSelectedAddresses', JSON.stringify(selectedAddressIds))
    }
  }, [selectedAddressIds])

  // Clean up stale selected address IDs whenever addresses change
  useEffect(() => {
    if (selectedAddressIds.length > 0) {
      const validAddressIds = new Set(effectiveAddresses.map(addr => addr.id))
      const staleIds = selectedAddressIds.filter(id => !validAddressIds.has(id))
      
      if (staleIds.length > 0) {
        const cleanedIds = selectedAddressIds.filter(id => validAddressIds.has(id))
        setSelectedAddressIds(cleanedIds)
      }
    }
    // Also clear if no addresses exist but filters are still selected
    else if (selectedAddressIds.length > 0 && effectiveAddresses.length === 0) {
      setSelectedAddressIds([])
    }
  }, [selectedAddressIds, effectiveAddresses])

  // Save backing price setting to localStorage whenever it changes (skip in detective mode)
  useEffect(() => {
    if (!detectiveMode && typeof window !== 'undefined') {
      localStorage.setItem('portfolioUseBackingPrice', useBackingPrice.toString())
    }
  }, [useBackingPrice, detectiveMode])

  // Save EES value setting to localStorage whenever it changes (skip in detective mode)
  useEffect(() => {
    if (!detectiveMode && typeof window !== 'undefined') {
      localStorage.setItem('portfolioUseEESValue', useEESValue.toString())
    }
  }, [useEESValue, detectiveMode])

  // Save Time-Shift toggle setting to localStorage whenever it changes (skip in detective mode)
  useEffect(() => {
    if (!detectiveMode && typeof window !== 'undefined') {
      localStorage.setItem('portfolioUseTimeShift', useTimeShift.toString())
    }
  }, [useTimeShift, detectiveMode])

  // Save Time Machine override values to localStorage whenever they change (skip in detective mode)
  useEffect(() => {
    if (!detectiveMode && typeof window !== 'undefined') {
      localStorage.setItem('portfolioTimeMachineHexPrice', timeMachineHexPrice)
    }
  }, [timeMachineHexPrice, detectiveMode])

  useEffect(() => {
    if (!detectiveMode && typeof window !== 'undefined') {
      localStorage.setItem('portfolioTimeMachineEHexPrice', timeMachineEHexPrice)
    }
  }, [timeMachineEHexPrice, detectiveMode])

  useEffect(() => {
    if (!detectiveMode && typeof window !== 'undefined') {
      localStorage.setItem('portfolioTimeMachineEthPayout', timeMachineEthPayout)
    }
  }, [timeMachineEthPayout, detectiveMode])

  useEffect(() => {
    if (!detectiveMode && typeof window !== 'undefined') {
      localStorage.setItem('portfolioTimeMachinePlsPayout', timeMachinePlsPayout)
    }
  }, [timeMachinePlsPayout, detectiveMode])

  // Save custom background settings to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('portfolioUseCustomBackground', useCustomBackground.toString())
    }
  }, [useCustomBackground])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('portfolioCustomBackgroundColor', customBackgroundColor)
    }
  }, [customBackgroundColor])

  // Save pooled stakes setting to localStorage whenever it changes (skip in detective mode)
  useEffect(() => {
    if (!detectiveMode && typeof window !== 'undefined') {
      localStorage.setItem('portfolioIncludePooledStakes', includePooledStakes.toString())
    }
  }, [includePooledStakes, detectiveMode])

  // Save enabled coins to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('portfolioEnabledCoins', JSON.stringify(Array.from(enabledCoins)))
    }
  }, [enabledCoins])

  // Save custom tokens to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('portfolioCustomTokens', JSON.stringify(customTokens))
    }
  }, [customTokens])

  // Function to automatically find the best DEX pair for a token
  const findBestDexPair = async (contractAddress: string, chain: number): Promise<string> => {
    try {
      const chainName = chain === 1 ? 'ethereum' : 'pulsechain'
      console.log(`[findBestDexPair] Looking for pairs for ${contractAddress} on ${chainName}`)
      
      // Use DexScreener API to find pairs for this token
      const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${contractAddress}`)
      const data = await response.json()
      
      if (!data.pairs || data.pairs.length === 0) {
        console.warn(`[findBestDexPair] No pairs found for ${contractAddress}`)
        return ''
      }
      
      // Filter pairs by chain and sort by liquidity + volume
      const chainPairs = data.pairs.filter((pair: any) => {
        if (chain === 1) {
          // Ethereum - look for Uniswap, Sushiswap, etc.
          return pair.chainId === 'ethereum'
        } else {
          // PulseChain
          return pair.chainId === 'pulsechain'
        }
      })
      
      if (chainPairs.length === 0) {
        console.warn(`[findBestDexPair] No pairs found for ${contractAddress} on ${chainName}`)
        return ''
      }
      
      // Sort by liquidity (USD) descending to get the most liquid pair
      const sortedPairs = chainPairs.sort((a: any, b: any) => {
        const liquidityA = parseFloat(a.liquidity?.usd || '0')
        const liquidityB = parseFloat(b.liquidity?.usd || '0')
        return liquidityB - liquidityA
      })
      
      const bestPair = sortedPairs[0]
      console.log(`[findBestDexPair] Found best pair: ${bestPair.pairAddress} with $${bestPair.liquidity?.usd || 0} liquidity`)
      
      return bestPair.pairAddress || ''
    } catch (error) {
      console.error(`[findBestDexPair] Error finding pair for ${contractAddress}:`, error)
      return ''
    }
  }

  // Function to check if ticker already exists
  const isTickerDuplicate = (ticker: string): boolean => {
    const upperTicker = ticker.toUpperCase()
    
    // Check in TOKEN_CONSTANTS
    const existsInConstants = TOKEN_CONSTANTS.some(token => 
      token.ticker.toUpperCase() === upperTicker
    )
    
    // Check in MORE_COINS
    const existsInMoreCoins = MORE_COINS.some(token => 
      token.ticker.toUpperCase() === upperTicker
    )
    
    // Check in existing custom tokens (including pending)
    const existsInCustom = displayCustomTokens.some(token => 
      token.ticker.toUpperCase() === upperTicker
    )
    
    return existsInConstants || existsInMoreCoins || existsInCustom
  }

  // Custom token management functions
  const addCustomToken = async () => {
    if (!newTokenForm.ticker) {
      return // Validation failed - only ticker is required
    }

    // Check for duplicate ticker (skip check if we're editing the same token)
    if (!editingTokenId && isTickerDuplicate(newTokenForm.ticker)) {
      setDuplicateTokenError(`Ticker "${newTokenForm.ticker.toUpperCase()}" already exists. Please choose a different ticker.`)
      return
    }

    // If editing, also check duplicates against other tokens (not the one being edited)
    if (editingTokenId) {
      const existingToken = customTokens.find(t => t.id === editingTokenId) || pendingCustomTokens.find(t => t.id === editingTokenId)
      if (existingToken && existingToken.ticker.toUpperCase() !== newTokenForm.ticker.toUpperCase() && isTickerDuplicate(newTokenForm.ticker)) {
        setDuplicateTokenError(`Ticker "${newTokenForm.ticker.toUpperCase()}" already exists. Please choose a different ticker.`)
        return
      }
    }

    // Clear any previous error
    setDuplicateTokenError(null)

    // Create or update the token
    const customToken: CustomToken = {
      id: editingTokenId || `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      chain: newTokenForm.chain,
      a: newTokenForm.contractAddress ? newTokenForm.contractAddress.toLowerCase() : '',
      dexs: '', // Will be populated in background (or preserved if editing)
      ticker: newTokenForm.ticker.toUpperCase(),
      decimals: 18, // Will be auto-detected from contract
      name: newTokenForm.name,
      createdAt: editingTokenId ? 
        (customTokens.find(t => t.id === editingTokenId)?.createdAt || pendingCustomTokens.find(t => t.id === editingTokenId)?.createdAt || Date.now()) 
        : Date.now()
    }

    // If editing, preserve existing DEX pair if no new contract address provided
    if (editingTokenId) {
      const existingToken = customTokens.find(t => t.id === editingTokenId) || pendingCustomTokens.find(t => t.id === editingTokenId)
      if (existingToken && !newTokenForm.contractAddress) {
        customToken.dexs = existingToken.dexs
      }
    }

    // Auto-detect DEX pair and logo in background if contract address is provided
    if (newTokenForm.contractAddress) {
      const chainName = newTokenForm.chain === 1 ? 'ethereum' : 'pulsechain'
      
      // Run both DEX pair detection and logo fetching in parallel
      Promise.allSettled([
        findBestDexPair(newTokenForm.contractAddress, newTokenForm.chain),
        fetchTokenImageFromDexScreener(newTokenForm.contractAddress, chainName)
      ]).then(([dexPairResult, logoResult]) => {
        let updates: Partial<CustomToken> = {}
        
        // Handle DEX pair result
        if (dexPairResult.status === 'fulfilled' && dexPairResult.value) {
          updates.dexs = dexPairResult.value
        }
        
        // Handle logo result
        if (logoResult.status === 'fulfilled' && logoResult.value) {
          updates.logoUrl = logoResult.value
          console.log('[Logo] Successfully fetched logo for token:', logoResult.value)
        }
        
        // Apply updates if we have any
        if (Object.keys(updates).length > 0) {
          // Update pending custom tokens
            setPendingCustomTokens(prevTokens => 
              prevTokens.map(token => 
                token.id === customToken.id 
                ? { ...token, ...updates }
                  : token
              )
            )
            
            // Also update committed custom tokens if they exist
            setCustomTokens(prevTokens => 
              prevTokens.map(token => 
                token.id === customToken.id 
                ? { ...token, ...updates }
                  : token
              )
            )
          }
            }).catch(error => {
        // Silently handle errors for now
        })
    }

    if (editingTokenId) {
      // Update existing token
      setPendingCustomTokens(prev => 
        prev.map(token => token.id === editingTokenId ? customToken : token)
      )
      setCustomTokens(prev => 
        prev.map(token => token.id === editingTokenId ? customToken : token)
      )
      
      console.log('[addCustomToken] Updated existing token:', customToken)
    } else {
      // Add new token
    // Mark as newly enabled for green styling and ? placeholder FIRST
    setNewlyEnabledTokens(prev => new Set([...prev, customToken.ticker]))
    
    // Auto-enable the new token using pending state (same pattern as regular token toggles)
    const currentEnabled = pendingEnabledCoins || enabledCoins
    const newEnabled = new Set([...currentEnabled, customToken.ticker])
    setPendingEnabledCoins(newEnabled)
    
    // Mark that user made manual changes
    setHasUserMadeManualChanges(true)
    
      // Add the token to pending custom tokens (don't immediately affect balance hook)
      setPendingCustomTokens(prev => [...prev, customToken])

      // Track successful custom token addition
      if (window.plausible) {
        window.plausible('Added New Custom Token')
      }
      
      console.log('[addCustomToken] Added new token:', customToken)
    }

    // Reset form and clear errors
    setNewTokenForm({
      contractAddress: '',
      name: '',
      ticker: '',
      chain: 369
    })
    setDuplicateTokenError(null)
    setEditingTokenId(null) // Clear edit mode
    
    // Close the custom token section (but keep the modal open)
    setIsCustomTokenSectionOpen(false)
  }

  const editCustomToken = (tokenId: string) => {
    const tokenToEdit = customTokens.find(t => t.id === tokenId) || pendingCustomTokens.find(t => t.id === tokenId)
    if (tokenToEdit) {
      // Pre-fill the form with existing token data
      setNewTokenForm({
        contractAddress: tokenToEdit.a || '',
        name: tokenToEdit.name,
        ticker: tokenToEdit.ticker,
        chain: tokenToEdit.chain
      })
      
      // Set edit mode
      setEditingTokenId(tokenId)
      
      // Open the custom token section
      setIsCustomTokenSectionOpen(true)
      
      console.log('[editCustomToken] Editing token:', tokenToEdit)
    }
  }

  const deleteCustomToken = (tokenId: string) => {
    const tokenToDelete = customTokens.find(t => t.id === tokenId) || pendingCustomTokens.find(t => t.id === tokenId)
    if (tokenToDelete) {
      // If it's a pending token, just remove it from pending
      if (pendingCustomTokens.find(t => t.id === tokenId)) {
        setPendingCustomTokens(prev => prev.filter(t => t.id !== tokenId))
      } else {
        // If it's an existing token, mark for deletion
        setPendingDeletedTokenIds(prev => new Set([...prev, tokenId]))
      }
      
      // Remove from pending enabled coins (like a toggle)
      const currentEnabled = pendingEnabledCoins || enabledCoins
      const newEnabled = new Set(currentEnabled)
      newEnabled.delete(tokenToDelete.ticker)
      setPendingEnabledCoins(newEnabled)
      setHasUserMadeManualChanges(true)
    }
  }

  // Save coin detection mode to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('portfolioCoinDetectionMode', coinDetectionMode)
    }
  }, [coinDetectionMode])

  // Save validator count to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('portfolioValidatorCount', validatorCount.toString())
    }
  }, [validatorCount])

  // Save 24h change display toggle to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('portfolioShowDollarChange', showDollarChange.toString())
    }
  }, [showDollarChange])

  // Save advanced filter states to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('portfolioShowLiquidBalances', showLiquidBalances.toString())
    }
  }, [showLiquidBalances])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('portfolioShowHexStakes', showHexStakes.toString())
    }
  }, [showHexStakes])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('portfolioShowValidators', showValidators.toString())
    }
  }, [showValidators])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('portfolioShowLiquidityPositions', showLiquidityPositions.toString())
    }
  }, [showLiquidityPositions])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('portfolioIncludeLiquidityFilter', includeLiquidityPositionsFilter.toString())
    }
  }, [includeLiquidityPositionsFilter])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('portfolioIncludeMoreTokens', includeMoreTokens.toString())
    }
  }, [includeMoreTokens])

  // Group tokens by chain for the coins tab (combine TOKEN_CONSTANTS + MORE_COINS based on mode and settings)
  const tokensByChain = useMemo(() => {
    const grouped: Record<number, typeof TOKEN_CONSTANTS> = {}
    
    // Determine which token list to use based on includeMoreTokens setting (same for both auto and manual modes)
    let tokensToUse = includeMoreTokens 
      ? [...TOKEN_CONSTANTS, ...MORE_COINS, ...displayCustomTokens]  // Extended list when includeMoreTokens is enabled
      : [...TOKEN_CONSTANTS, ...displayCustomTokens]  // Main list + custom tokens when includeMoreTokens is disabled
    
    // Filter out farm/LP tokens if liquidity positions are disabled
    if (!showLiquidityPositions) {
      tokensToUse = tokensToUse.filter(token => {
        const isLP = token.type === 'lp'
        const isFarm = token.platform === 'PHUX' || token.type === 'farm'
        return !isLP && !isFarm
      })
    }
    
    tokensToUse.forEach(token => {
      if (!grouped[token.chain]) {
        grouped[token.chain] = []
      }
      grouped[token.chain].push(token)
    })
    
    // Sort tokens within each chain by name A-Z
    Object.keys(grouped).forEach(chain => {
      grouped[parseInt(chain)].sort((a, b) => a.name.localeCompare(b.name))
    })
    return grouped
  }, [coinDetectionMode, includeMoreTokens, displayCustomTokens, showLiquidityPositions])

  // Filter and sort tokens based on search term and enabled status
  const filteredTokensByChain = useMemo(() => {
    const currentEnabled = pendingEnabledCoins || enabledCoins
    
    
    const sortTokens = (tokens: typeof TOKEN_CONSTANTS) => {
      return tokens.sort((a, b) => {
        const aEnabled = currentEnabled.has(a.ticker)
        const bEnabled = currentEnabled.has(b.ticker)
        const aNewlyEnabled = newlyEnabledTokens.has(a.ticker)
        const bNewlyEnabled = newlyEnabledTokens.has(b.ticker)
        const aIsCustom = (a as any).id?.startsWith('custom_') || false
        const bIsCustom = (b as any).id?.startsWith('custom_') || false
        
        /* TOKEN SORTING HIERARCHY:
         * 1. PRIMARY: Newly enabled tokens first (green ones with ?)
         * 2. SECONDARY: Custom tokens before standard tokens  
         * 3. TERTIARY: Enabled tokens before disabled tokens
         * 4. QUATERNARY: Alphabetical by ticker (A-Z)
         */
        
        // 1. PRIMARY: newly enabled tokens first (green ones)
        if (aNewlyEnabled !== bNewlyEnabled) {
          return bNewlyEnabled ? 1 : -1 // newly enabled come first
        }
        
        // 2. SECONDARY: custom tokens before standard tokens
        if (aIsCustom !== bIsCustom) {
          return bIsCustom ? 1 : -1 // custom tokens come first
        }
        
        // 3. TERTIARY: enabled tokens before disabled tokens
        if (aEnabled !== bEnabled) {
          return bEnabled ? 1 : -1 // enabled tokens come first
        }
        
        // 4. QUATERNARY: alphabetical by ticker (A-Z)
        return a.ticker.localeCompare(b.ticker)
      })
    }
    
    if (!tokenSearchTerm.trim()) {
      // No search term: just sort all tokens
      const sorted: Record<number, typeof TOKEN_CONSTANTS> = {}
      Object.entries(tokensByChain).forEach(([chain, tokens]) => {
        sorted[parseInt(chain)] = sortTokens([...tokens])
      })
      return sorted
    }
    
    // With search term: filter then sort
    const filtered: Record<number, typeof TOKEN_CONSTANTS> = {}
    
    Object.entries(tokensByChain).forEach(([chain, tokens]) => {
      const searchLower = tokenSearchTerm.toLowerCase()
      const filteredTokens = tokens.filter(token => {
        // Filter out LP tokens and farms if liquidity positions are disabled
        if (!showLiquidityPositions) {
          const isLP = token.type === 'lp'
          const isFarm = token.platform === 'PHUX' || token.type === 'farm'
          if (isLP || isFarm) {
            return false
          }
        }
        
        // Standard name and ticker matching
        const nameMatch = token.name.toLowerCase().includes(searchLower)
        const tickerMatch = token.ticker.toLowerCase().includes(searchLower)
        
        // Contract address matching (check both 'a' and 'contractAddress' fields)
        const contractAddress = token.a || token.contractAddress || ''
        const addressMatch = contractAddress.toLowerCase().includes(searchLower)
        
        // LP/liquidity pool matching
        const isLPToken = token.type === 'lp' || token.ticker.includes(' / ')
        const isLPSearch = searchLower === 'lp' || searchLower === 'liquidity'
        const lpMatch = isLPSearch && isLPToken
        
        return nameMatch || tickerMatch || addressMatch || lpMatch
      })
      
      if (filteredTokens.length > 0) {
        filtered[parseInt(chain)] = sortTokens(filteredTokens)
      }
    })
    
    return filtered
  }, [tokensByChain, tokenSearchTerm, enabledCoins, pendingEnabledCoins, showLiquidityPositions])

  // Get available chains for the coins tab
  const availableChains = useMemo(() => {
    return Object.keys(tokensByChain).map(Number).sort()
  }, [tokensByChain])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('portfolioIncludeValidatorsFilter', includeValidatorsFilter.toString())
    }
  }, [includeValidatorsFilter])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('portfolioShowAdvancedFilters', showAdvancedFilters.toString())
    }
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
    if (typeof window !== 'undefined') {
      localStorage.setItem('portfolioShowAdvancedStats', showAdvancedStats.toString())
    }
  }, [showAdvancedStats])

  // Save HEX stakes sorting preferences to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('portfolioHexStakesSortField', hexStakesSortField)
    }
  }, [hexStakesSortField])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('portfolioHexStakesSortDirection', hexStakesSortDirection)
    }
  }, [hexStakesSortDirection])

  // Save dust filter to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('portfolioDustFilter', dustFilter.toString())
    }
  }, [dustFilter])

  // Save hide tokens without price setting to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('portfolioHideTokensWithoutPrice', hideTokensWithoutPrice.toString())
    }
  }, [hideTokensWithoutPrice])

  // Save token sorting preferences to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('portfolioTokenSortField', tokenSortField)
    }
  }, [tokenSortField])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('portfolioTokenSortDirection', tokenSortDirection)
    }
  }, [tokenSortDirection])

  // Save stake status filter to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('portfolioStakeStatusFilter', stakeStatusFilter)
    }
  }, [stakeStatusFilter])

  // Save active stakes tab to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('portfolioActiveStakesTab', activeStakesTab)
    }
  }, [activeStakesTab])

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
  const [showPortfolioAnalysis, setShowPortfolioAnalysis] = useState(true)

  // Transactions state for detective mode
  const [showTransactions, setShowTransactions] = useState(false)

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
      setAddresses(finalAddresses)
      localStorage.setItem('portfolioAddresses', JSON.stringify(finalAddresses))
      setPendingAddresses([])
      
      // Reset initial load state when adding new addresses to ensure proper loading flow
      if (pendingAddresses.length > 0) {
        setIsInitialLoad(true)
      }
    }
  }

  // Commit pending custom token changes to main custom tokens state (triggers data fetch)
  const commitPendingCustomTokens = () => {
    // Apply deletions and additions
    const tokensAfterDeletions = customTokens.filter(token => !pendingDeletedTokenIds.has(token.id))
    const finalTokens = [...tokensAfterDeletions, ...pendingCustomTokens]
    
    // Only update if there are actual changes
    if (pendingDeletedTokenIds.size > 0 || pendingCustomTokens.length > 0) {
      setCustomTokens(finalTokens)
      setPendingCustomTokens([])
      setPendingDeletedTokenIds(new Set())
    }
  }

  // Handle reset to auto-detect confirmation
  const handleResetToAutoDetect = () => {
    
    // 1. Clear custom balance input overrides
    setCustomBalances(new Map())
    
    // 2. Close dialogs
    setShowResetConfirmDialog(false)
    setShowEditModal(false)
    
    // 3. Temporarily clear enabled coins to force a fresh scan
    setEnabledCoins(new Set())
    
    // 4. Switch to auto-detect mode after clearing
    setTimeout(() => {
      setCoinDetectionMode('auto-detect')
      
      // 5. Enable all tokens so auto-detect can find everything
      const allCuratedTokens = new Set<string>()
      TOKEN_CONSTANTS.forEach(token => allCuratedTokens.add(token.ticker))
      if (includeMoreTokens) {
        MORE_COINS.forEach(token => allCuratedTokens.add(token.ticker))
      }
      
      setEnabledCoins(allCuratedTokens)
      
      // 6. Force a reload after enabling all tokens
      mutateBalances()
    }, 100) // Small delay to ensure state updates are processed
    
    setHasUserMadeManualChanges(true)
  }

  // Handle mode switching with smart token preservation - use pending state to avoid immediate reload
  const handleModeSwitch = (newMode: 'auto-detect' | 'manual') => {
    
    const currentMode = pendingCoinDetectionMode || coinDetectionMode
    if (currentMode === newMode) {
      return // No change needed
    }

    // No longer show first-time popup for manual mode since we removed import functionality
    
    // Set pending mode (will be committed on modal close)
    setPendingCoinDetectionMode(newMode)
    
    if (newMode === 'manual' && currentMode === 'auto-detect') {
      // Switching from auto-detect to manual: preserve tokens with actual balances
      const tokensWithBalances = new Set<string>()
      
      if (rawBalances && rawBalances.length > 0) {
        rawBalances.forEach(balanceData => {
          // Add native tokens that have non-zero balance
          if (balanceData.nativeBalance && balanceData.nativeBalance.balanceFormatted > 0) {
            tokensWithBalances.add(balanceData.nativeBalance.symbol)
          }
          
          // Add ERC-20 tokens that have non-zero balance
          balanceData.tokenBalances.forEach(token => {
            if (token.balanceFormatted > 0) {
              tokensWithBalances.add(token.symbol)
            }
          })
        })
      }
      
      
      // Update pending enabled coins instead of immediate state
      const currentEnabledCoins = pendingEnabledCoins || enabledCoins
      setPendingEnabledCoins(new Set([...currentEnabledCoins, ...tokensWithBalances]))
      
      setHasUserMadeManualChanges(true) // Mark that user has made manual changes
    } else if (newMode === 'auto-detect' && currentMode === 'manual') {
      // Switching from manual to auto-detect: keep enabled coins but let auto-detect override
      
      // Don't clear pendingEnabledCoins - auto-detect mode ignores it anyway
      // Don't clear custom balances - users should keep their manual balance overrides
      setHasUserMadeManualChanges(false) // Reset manual changes flag
    }
  }

  // Handle modal close - commit any pending addresses and removals
  const handleModalClose = () => {
    commitPendingAddresses()
    commitPendingCustomTokens()
    
    // Track if any changes were made that require a reload
    let hasChanges = false
    
    // Commit pending mode changes
    if (pendingCoinDetectionMode !== null) {
      setCoinDetectionMode(pendingCoinDetectionMode)
      setPendingCoinDetectionMode(null)
      hasChanges = true
    }
    
    // Commit pending coin changes
    if (pendingEnabledCoins !== null) {
      
      setEnabledCoins(pendingEnabledCoins)
      setPendingEnabledCoins(null)
      hasChanges = true
    }
    
    // Commit pending Include More Tokens changes
    if (pendingIncludeMoreTokens !== null) {
      setIncludeMoreTokens(pendingIncludeMoreTokens)
      setPendingIncludeMoreTokens(null)
      hasChanges = true
    }
    
    // Commit pending Liquidity Positions changes
    if (pendingShowLiquidityPositions !== null) {
      setShowLiquidityPositions(pendingShowLiquidityPositions)
      setPendingShowLiquidityPositions(null)
      hasChanges = true
    }
    
    // Only reload if changes were made
    if (hasChanges) {
      mutateBalances()
    } else {
    }
    
    // Apply font changes when modal closes
    applyFontOnModalClose()
    
    // Ensure custom background color is saved when modal closes
    if (typeof window !== 'undefined') {
      // Use the current picker color that's been updated during drag
      const finalColor = currentPickerColor;
      
      if (finalColor !== customBackgroundColor) {
        setCustomBackgroundColor(finalColor);
      }
      
      localStorage.setItem('portfolioUseCustomBackground', useCustomBackground.toString())
      localStorage.setItem('portfolioCustomBackgroundColor', finalColor)
    }
    
    setShowEditModal(false)
    // Clear removed address IDs filter since we're done editing
    setRemovedAddressIds(new Set())
    
    // Clear green styling from newly enabled tokens after saving
    setNewlyEnabledTokens(new Set())
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
      
      // Disable EES Mode and Time Machine when no addresses are present
      if (!detectiveMode) {
        setUseEESValue(false)
        setUseTimeShift(false)
        localStorage.setItem('portfolioUseEESValue', 'false')
        localStorage.setItem('portfolioUseTimeShift', 'false')
      }
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
  
  // Fetch HSI stakes data for user's addresses
  const { stakes: hsiStakes, isLoading: hsiStakesLoading, error: hsiStakesError, hasStakes: hasHsiStakes } = useHsiStakes(allAddressStrings)
  
  console.log('Portfolio Debug - Using address strings:', allAddressStrings)

  // Determine effective mode based on coin detection mode and include more tokens setting
  // Auto-detect mode: includeMoreTokens ? 'auto-detect-extended' : 'auto-detect'
  // Manual mode: includeMoreTokens ? 'manual-extended' : 'manual'
  // Use committed value, not pending value, to avoid immediate reloads
  const effectiveMode = coinDetectionMode === 'auto-detect' 
    ? (includeMoreTokens ? 'auto-detect-extended' : 'auto-detect')
    : (includeMoreTokens ? 'manual-extended' : 'manual')
  // Always scan ALL tokens regardless of mode - filtering happens in Portfolio component
  const enabledCoinsForHook = undefined // Don't filter at hook level
  
  // Removed excessive debug logging
  
  const { balances: allRawBalances, isLoading: balancesLoading, error: balancesError, mutate: mutateBalances } = usePortfolioBalance(allAddressStrings, enabledCoinsForHook, customTokens, effectiveMode, showLiquidityPositions)
  
  // Primary address for V3 positions (will be used later after getTokenPrice is defined)
  const primaryAddress = allAddressStrings[0] || null
  
  // V3 positions debug logging will be added after the hook is defined

  // DEBUG: Log tokens found in balances
  useEffect(() => {
    if (allRawBalances && allRawBalances.length > 0) {
      const missingTokens = ['HEX', 'WPLS', 'pBAL', 'pAAVE', 'pBTT', 'eWBTC', 'eWETH']
      const foundTokens = new Set<string>()
      
      allRawBalances.forEach(addressData => {
        if (addressData.nativeBalance) {
          foundTokens.add(addressData.nativeBalance.symbol)
        }
        addressData.tokenBalances?.forEach(token => {
          foundTokens.add(token.symbol)
        })
      })
      
    }
  }, [allRawBalances])
  
  // Enhanced portfolio holdings with LP pricing (PHUX integration)
  const allHoldingsFlat = useMemo(() => {
    if (!allRawBalances) return []
    const holdings: Array<{ contract_address: string; balance: string; name?: string; symbol?: string; balanceFormatted?: number }> = []
    
    allRawBalances.forEach(balanceData => {
      // Add token balances
      balanceData.tokenBalances?.forEach(token => {
        if (token.balance && token.balance !== '0') {
          holdings.push({
            contract_address: token.address,
            balance: token.balance,
            name: token.name,
            symbol: token.symbol,
            balanceFormatted: token.balanceFormatted
          })
        }
      })
    })
    
    return holdings
  }, [allRawBalances])
  
  // Get PHUX LP token prices
  const { getLPTokenPrice: getPhuxLPTokenPrice, isLoading: phuxPricesLoading } = useLPTokenPrices()
  
  // Get LP positions using PHUX pool data
  const { positions: phuxLPPositions, totalLPValue: phuxTotalLPValue, isLoading: phuxLPLoading } = useLiquidityPositions(
    allHoldingsFlat, 
    showLiquidityPositions
  )
  
  // Filter the raw balances client-side based on enabled coins and apply custom balance overrides
  const rawBalances = useMemo(() => {
    if (!allRawBalances) return allRawBalances
    
    const applyCustomBalances = (balances: any[], selectedAddressIds: string[]) => {
      // First apply custom balances to existing tokens
      const updatedBalances = balances.map(addressData => ({
        ...addressData,
        // Apply custom balances to native balance
        nativeBalance: addressData.nativeBalance ? {
          ...addressData.nativeBalance,
          balanceFormatted: customBalances.has(addressData.nativeBalance.symbol) 
            ? parseFloat(customBalances.get(addressData.nativeBalance.symbol) || '0') 
            : addressData.nativeBalance.balanceFormatted
        } : null,
        // Apply custom balances to token balances
        tokenBalances: addressData.tokenBalances?.map((token: any) => ({
          ...token,
          balanceFormatted: customBalances.has(token.symbol)
            ? (() => {
                const customValue = parseFloat(customBalances.get(token.symbol) || '0')
                console.log(`[Custom Balance Applied] ${token.symbol}: stored="${customBalances.get(token.symbol)}" -> parsed=${customValue}`)
                return customValue
              })()
            : token.balanceFormatted
        })) || []
      }))
      
      // Add tokens that are enabled but don't exist in the original data
      if ((customBalances.size > 0 || enabledCoins.size > 0) && updatedBalances.length > 0) {
        // Check ALL addresses for existing tokens, not just the first one
        const existingTokenSymbols = new Set<string>()
        updatedBalances.forEach(addressData => {
          if (addressData.nativeBalance) {
            existingTokenSymbols.add(addressData.nativeBalance.symbol)
          }
          addressData.tokenBalances?.forEach((token: any) => {
            existingTokenSymbols.add(token.symbol)
          })
        })
        
        const tokensToAdd: any[] = []
        
        // Add tokens with custom balances (only if enabled)
        // Skip custom balance tokens if address filtering is active (they're not tied to specific addresses)
        const currentEnabled = pendingEnabledCoins || enabledCoins
        const isAddressFilterActive = selectedAddressIds && selectedAddressIds.length > 0
        
        if (!isAddressFilterActive) {
        customBalances.forEach((balance, symbol) => {
          if (!existingTokenSymbols.has(symbol) && parseFloat(balance) > 0 && currentEnabled.has(symbol)) {
            // Find token config to get proper details - include custom tokens
            const allTokens = [...TOKEN_CONSTANTS, ...MORE_COINS, ...customTokens]
            const tokenConfig = allTokens.find(t => t.ticker === symbol)
            
            if (tokenConfig) {
              tokensToAdd.push({
                symbol: symbol,
                name: tokenConfig.name,
                balanceFormatted: parseFloat(balance),
                balance: parseFloat(balance).toString(),
                contractAddress: tokenConfig.a,
                decimals: tokenConfig.decimals || 18
              })
            }
          }
        })
        } else {
        }
        
        // Add enabled tokens that don't have balance data yet (in manual mode)
        // Skip these if address filtering is active (they're not tied to specific addresses)
        if (coinDetectionMode === 'manual' && !isAddressFilterActive) {
          currentEnabledCoins.forEach(symbol => {
            if (!existingTokenSymbols.has(symbol) && !customBalances.has(symbol)) {
              // Find token config to get proper details - include custom tokens
              const allTokens = [...TOKEN_CONSTANTS, ...MORE_COINS, ...customTokens]
              const tokenConfig = allTokens.find(t => t.ticker === symbol)
              
              if (tokenConfig) {
                tokensToAdd.push({
                  symbol: symbol,
                  name: tokenConfig.name,
                  balanceFormatted: null, // Use null to indicate unknown balance
                  balance: null,
                  contractAddress: tokenConfig.a,
                  decimals: tokenConfig.decimals || 18,
                  isPlaceholder: true // Flag to indicate this is a placeholder
                })
              }
            }
          })
        } else if (coinDetectionMode === 'manual' && isAddressFilterActive) {
        }
        
        if (tokensToAdd.length > 0) {
          updatedBalances[0] = {
            ...updatedBalances[0],
            tokenBalances: [...(updatedBalances[0].tokenBalances || []), ...tokensToAdd]
          }
        }
      }
      
      return updatedBalances
    }
    
    // In auto-detect mode, show only tokens with actual balances (ignore manually enabled tokens)
    if (coinDetectionMode === 'auto-detect') {
      // Filter out tokens that were manually added but have no real balance
      const filteredForAutoDetect = allRawBalances.map(addressData => ({
        ...addressData,
        // Keep native balance only if it has actual balance > 0
        nativeBalance: (addressData.nativeBalance && addressData.nativeBalance.balanceFormatted > 0) 
          ? addressData.nativeBalance 
          : null,
        // Keep only tokens with actual balances > 0 (filter out placeholder tokens)
        tokenBalances: addressData.tokenBalances?.filter(token => 
          token.balanceFormatted > 0 && !token.isPlaceholder
        ) || []
      }))
      
      return applyCustomBalances(filteredForAutoDetect, selectedAddressIds)
    }
    
    // In manual mode, filter based on enabled coins and apply custom balances
    const currentEnabledCoins = pendingEnabledCoins || enabledCoins
    
    const filteredBalances = allRawBalances.map(addressData => ({
      ...addressData,
      // Keep native balance if it's enabled
      nativeBalance: (addressData.nativeBalance && currentEnabledCoins.has(addressData.nativeBalance.symbol)) 
        ? addressData.nativeBalance 
        : null,
      // Filter token balances to only enabled tokens
      tokenBalances: addressData.tokenBalances?.filter(token => {
        const isEnabled = currentEnabledCoins.has(token.symbol)
        return isEnabled
      }) || []
    }))
    
    return applyCustomBalances(filteredBalances, selectedAddressIds)
  }, [allRawBalances, coinDetectionMode, enabledCoins, pendingEnabledCoins, customBalances, selectedAddressIds])
  console.log('Portfolio Debug - Balance hook result:', { balances: rawBalances, balancesLoading, balancesError })

  // Clear newly enabled tokens when there's a significant data change (but not when just editing balances)
  useEffect(() => {
    if (rawBalances && rawBalances.length > 0 && !pendingEnabledCoins) {
      // Only clear tokens that have actual balances, keep zero-balance tokens marked as newly enabled for watchlist
      setNewlyEnabledTokens(prev => {
        const tokensWithBalance = new Set<string>()
        
        // Find all tokens that have actual balances
        rawBalances.forEach(balanceData => {
          balanceData.tokenBalances?.forEach(token => {
            if (token.balanceFormatted > 0) {
              tokensWithBalance.add(token.symbol)
            }
          })
        })
        
        // Keep only tokens that don't have balances (for watchlist display)
        const newSet = new Set<string>()
        prev.forEach(tokenSymbol => {
          if (!tokensWithBalance.has(tokenSymbol)) {
            newSet.add(tokenSymbol)
          }
        })
        
        return newSet
      })
    }
  }, [rawBalances, pendingEnabledCoins])

  // Auto-set enabled coins based on balances (only on initial load, don't override user choices)
  useEffect(() => {
    if (coinDetectionMode === 'manual' && rawBalances && rawBalances.length > 0 && !hasUserMadeManualChanges) {
      const tokensWithBalances = new Set<string>()
      
      rawBalances.forEach(balanceData => {
        // Add native token if it has balance
        if (balanceData.nativeBalance && balanceData.nativeBalance.balanceFormatted > 0) {
          tokensWithBalances.add(balanceData.nativeBalance.symbol)
        }
        
        // Add ERC-20 tokens if they have balance
        balanceData.tokenBalances.forEach(token => {
          if (token.balanceFormatted > 0) {
            tokensWithBalances.add(token.symbol)
          }
        })
      })
      
      // Only update if this is the initial auto-population and we have tokens with balances
      if (tokensWithBalances.size > 0 && enabledCoins.size === 0) {
        setEnabledCoins(tokensWithBalances)
      }
    }
  }, [coinDetectionMode, rawBalances, hasUserMadeManualChanges, enabledCoins.size])

  // Auto-detect coins based on existing balances
  const autoDetectedCoins = useMemo(() => {
    if (coinDetectionMode !== 'auto-detect' || !rawBalances || rawBalances.length === 0) {
      return new Set<string>()
    }

    const detectedCoins = new Set<string>()
    
    // Add native tokens that have non-zero balance
    rawBalances.forEach(balanceData => {
      if (balanceData.nativeBalance && balanceData.nativeBalance.balanceFormatted > 0) {
        detectedCoins.add(balanceData.nativeBalance.symbol)
      }
      
      // Add ERC-20 tokens that have non-zero balance
      balanceData.tokenBalances.forEach(token => {
        if (token.balanceFormatted > 0) {
          detectedCoins.add(token.symbol)
        }
      })
    })

    return detectedCoins
  }, [coinDetectionMode, rawBalances])

  // Apply auto-detected coins in auto-detect mode (with loop prevention)
  useEffect(() => {
    if (coinDetectionMode === 'auto-detect' && autoDetectedCoins.size > 0) {
      // Only update if the sets are actually different to prevent infinite loops
      const currentCoins = Array.from(enabledCoins).sort()
      const detectedCoins = Array.from(autoDetectedCoins).sort()
      
      if (JSON.stringify(currentCoins) !== JSON.stringify(detectedCoins)) {
        setEnabledCoins(autoDetectedCoins)
      }
    }
  }, [coinDetectionMode, autoDetectedCoins, enabledCoins])

  // Fetch transactions for detective mode (only first address)
  const { transactions: transactionData, isLoading: transactionsLoading, error: transactionsError } = useAddressTransactions(
    detectiveMode && detectiveAddress ? detectiveAddress : ''
  )

  // Enrich transactions with token transfer details
  const { transactions: enrichedTransactions, isLoading: enrichmentLoading, error: enrichmentError } = useEnrichedTransactions(
    detectiveMode && detectiveAddress ? detectiveAddress : ''
  )
  
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
      const chainTokens = addressData.nativeBalance?.symbol ? [addressData.nativeBalance.symbol] : []
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
    
    // Add custom tokens to ensure they get price data
    const customTokenTickers = customTokens.map(token => token.ticker)
    
    const allTickers = [...new Set([...tokens, ...baseTokens, ...stakeTokens, ...customTokenTickers])]
    
    // Return a stable array - only change if the actual content changes
    return allTickers.sort() // Sort for consistent ordering
  }, [
    // Only depend on the actual token symbols, not the balance objects
    balances && balances.map(b => [
      b.nativeBalance?.symbol || '',
      ...(b.tokenBalances?.map(t => t.symbol) || [])
    ].join(',')).sort().join('|'),
    // Also depend on HEX stakes to include their tokens in price fetching
    hexStakes && hexStakes.map(s => s.chain).sort().join('|'),
    // Include custom tokens in price fetching
    customTokens.map(t => t.ticker).sort().join('|')
  ])

  // Minimal debug logging (only when needed)
  // console.log('[Portfolio] Component render - balances:', balances?.length, 'tickers:', allTokenTickers.length, 'chainFilter:', chainFilter, 'selectedIds:', selectedAddressIds.length)

  // Fetch prices for all tokens with balances
  const { prices: rawPrices, isLoading: pricesLoading } = useTokenPrices(allTokenTickers, { customTokens })

  // We need to create a placeholder for LP underlying prices that will be populated later
  // This prevents the dependency cycle while still allowing the prices to be combined
  const [lpUnderlyingPricesState, setLpUnderlyingPricesState] = useState<any>({})

  // Fetch MAXI token backing data
  const { data: maxiData, isLoading: maxiLoading, error: maxiError, getBackingPerToken } = useMaxiTokenData()

  // Fetch PLS pool virtual price data
  const { virtualPrice: plsVirtualPrice, lastUpdated: plsLastUpdated, error: plsError } = usePlsApiData()

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

  // Stabilize prices reference to prevent unnecessary re-renders
  const prices = useMemo(() => {
    // Combine main prices with LP underlying token prices
    const combinedPrices = { ...(rawPrices || {}), ...(lpUnderlyingPricesState || {}) }
    
    // Add some debugging to see if prices are updating
    if (rawPrices && !isInitialLoad) {
    }
    if (lpUnderlyingPricesState && Object.keys(lpUnderlyingPricesState).length > 0) {
    }
    
    return combinedPrices;
  }, [rawPrices, lpUnderlyingPricesState, isInitialLoad])

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
      if (addressData.nativeBalance && addressData.nativeBalance.balanceFormatted > 0) {
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

  // Get LP token data for PulseX V2 tokens
  const lpTokens = TOKEN_CONSTANTS.filter(token => 
    token.platform === 'PLSX V2' || 
    (token.name && token.name.includes(' LP')) ||
    (token.name && token.name.includes(' / '))
  )
  
  // Fetch all LP token prices at once using the new batch hook (include both TOKEN_CONSTANTS and MORE_COINS for farm tokens)
  const allTokenConfigs = [...TOKEN_CONSTANTS, ...MORE_COINS]
  const { lpPrices, loading: allLPLoading, error: allLPError } = useAllDefinedLPTokenPrices(allTokenConfigs)
  
  // Convert to the format expected by existing code
  const lpTokenPrices: { [ticker: string]: number } = {}
  const lpTokenData: { [ticker: string]: any } = {}
  
  Object.entries(lpPrices).forEach(([ticker, lpPrice]) => {
    if (lpPrice.pricePerToken && lpPrice.pricePerToken > 0) {
      lpTokenPrices[ticker] = lpPrice.pricePerToken
    } else if (lpPrice.error) {
      console.error(`[Portfolio] Error fetching ${ticker} LP price:`, lpPrice.error)
    }
    
    // Store LP data for detailed display (underlying token breakdown)
    if (lpPrice.data) {
      lpTokenData[ticker] = lpPrice.data
    }
  })
  
  if (allLPError) {
  }

  // Farm token to LP token mapping for pricing
  const farmToLPMapping: Record<string, string> = {
    // PLSX V1 Farms - Map farm tokens to their corresponding V1 LP tokens
    "PLSX / WPLS": "PLSX \\/ WPLS (v1)",
    "WPLS \\/ weDAI": "WPLS \\/ weDAI (v1)",
    "WPLS \/ weDAI": "WPLS \\/ weDAI (v1)", // Fix: single backslash version
    "weUSDC \\/ WPLS": "weUSDC \\/ WPLS",
    "WETH / WPLS": "WETH \\/ WPLS (v1)",
    "weUSDT / WPLS": "weUSDT \\/ WPLS (v1)",
    "HEX / WPLS": "HEX \\/ WPLS (v1)",
    "INC / WPLS": "INC \\/ WPLS (v1)",
    "INC / PLSX": "INC \\/ PLSX (v1)",
    // PHUX Farms - Map farm tokens (f) to their corresponding LP tokens
    "Prime PHUX (f)": "Prime PHUX",
    "BridgedSP (f)": "BridgedSP", 
    "RH Maxi (f)": "RH Maxi",
    "Piteas Prime (f)": "Piteas Prime",
    "Great Time (f)": "Great Time",
    "Maximus Perps Maxi (f)": "Maximus Perps Maxi",
    "Alex Hedron Maxi (f)": "Alex Hedron Maxi",
    "Pareto Pool (f)": "Pareto Pool",
    "Piteas Maxi Pool (f)": "Piteas Maxi Pool",
    "PLSX Single Sided Staking (Almost) (f)": "PLSX Single Sided Staking (Almost)",
    "33puP-33WBTC-33uPX (f)": "33puP-33WBTC-33uPX",
    "RH PHLPV2 (f)": "RH PHLPV2",
    "PHORGY Pool (f)": "PHORGY Pool",
    "SOLaPLSooZa (f)": "SOLaPLSooZa",
    "Native PHLPV2 (f)": "Native PHLPV2",
    "BriBerry Farm🍓 (f)": "BriBerry Farm🍓",
    "Staked Pulse Multivault🏛 (f)": "Staked Pulse Multivault🏛",
    "NOPEpls (f)": "NOPEpls",
    "Quad Pool (f)": "Quad Pool",
    "50uPX-50DAI (f)": "50uPX-50DAI",
    "33puP-33uPX-33DAI (f)": "33puP-33uPX-33DAI",
    "CST Stable Pool (f)": "CST Stable Pool",
    "MAXIMUS TEAM Pool (f)": "MAXIMUS TEAM Pool",
    "Fire Whale🔥🐋 (f)": "Fire Whale🔥🐋",
    "Quattro Rico's Heart (f)": "Quattro Rico's Heart",
    "2Solid Pool (f)": "2Solid Pool",
    "PULSING for PHIAT (f)": "PULSING for PHIAT",
    "FUSION (f)": "FUSION",
    "REFINERY (f)": "REFINERY",
    "TETRA Gas Station (f)": "TETRA Gas Station",
    "Quattro Rico's Pool (f)": "Quattro Rico's Pool",
    "Jeet Pool (f)": "Jeet Pool",
    "Pulsechain Dark Web Pool 🧿 (f)": "Pulsechain Dark Web Pool 🧿",
    "Vouch Liquid Staked PLS Pool (f)": "Vouch Liquid Staked PLS Pool",
    "HEXFIRE 🔥 (f)": "HEXFIRE 🔥",
    "She'll be apples (f)": "She'll be apples",
    "USDL Stable Pool (f)": "USDL Stable Pool",
    "CODEAK Communis Maxi (f)": "CODEAK Communis Maxi",
    "RH Stable Stack 🏛 (f)": "RH Stable Stack 🏛",
     "HEX Time Complex (f)": "HEX Time Complex",
     "eMaximus Perps Maxi (f)": "eMaximus Perps Maxi",
     // 9INCH Farms - Map farm tokens (f) to their corresponding LP tokens
     "9INCH / WPLS (f)": "9INCH \\/ WPLS",
     "9INCH / weDAI (f)": "9INCH \\/ weDAI", 
     "9INCH / weUSDC (f)": "9INCH \\/ weUSDC",
     "9INCH / weUSDT (f)": "9INCH \\/ weUSDT",
     "9INCH / BBC (f)": "9INCH \\/ BBC",
     "9INCH / we9INCH (f)": "9INCH \\/ we9INCH",
     "9INCH / PLSX (f)": "9INCH \\/ PLSX"
  }

  // Helper function to route LP token pricing based on DEX platform
  const getLPTokenPrice = useCallback((symbol: string): number => {
    // Find the token config to determine which DEX it belongs to
    const allTokens = [...TOKEN_CONSTANTS, ...MORE_COINS, ...(customTokens || [])]
    const tokenConfig = allTokens.find(token => token.ticker === symbol)
    
    if (!tokenConfig || (tokenConfig.type !== 'lp' && tokenConfig.type !== 'farm')) {
      return 0
    }
    
    // Special handling for farm tokens - use address matching for PLSX V1, ticker mapping for others
    if (tokenConfig.type === 'farm') {
      console.log(`[Farm Pricing] Processing farm token: ${symbol}`)
      console.log(`[Farm Pricing] Token config:`, { name: tokenConfig.name, platform: tokenConfig.platform, address: tokenConfig.a })
      
      // For PLSX V1 farms, match by contract address since they share the same address as their LP token
      if (tokenConfig.name === 'PLSX V1 Farm' && tokenConfig.a) {
        console.log(`[Farm Pricing] PLSX V1 farm detected, matching by address: ${tokenConfig.a}`)
        
        // Find LP token with the same contract address
        const allTokens = [...TOKEN_CONSTANTS, ...MORE_COINS, ...(customTokens || [])]
        const lpTokenConfig = allTokens.find(token => 
          token.type === 'lp' && 
          token.a === tokenConfig.a && 
          (token.platform === 'PLSX V1' || token.platform === 'PLSX V2')
        )
        
        if (lpTokenConfig) {
          console.log(`[Farm Pricing] Found matching LP token by address: ${lpTokenConfig.ticker}`)
          const lpPrice = lpTokenPrices[lpTokenConfig.ticker]
          if (lpPrice && lpPrice > 0) {
            return lpPrice
          } else {
            console.warn(`[Farm Pricing] No PLSX LP price found for ${lpTokenConfig.ticker}. Price value:`, lpPrice)
          }
        } else {
          console.warn(`[Farm Pricing] No LP token found with matching address ${tokenConfig.a}`)
        }
        return 0
      }
      
      // For PHUX/9INCH farms, use the existing ticker-based mapping
      const correspondingLPTicker = farmToLPMapping[symbol]
      console.log(`[Farm Pricing] Farm token ${symbol}, mapped to LP ticker: ${correspondingLPTicker}`)
      console.log(`[Farm Pricing] Available farm mappings:`, Object.keys(farmToLPMapping).filter(k => k.includes('9INCH')))
      console.log(`[Farm Pricing] Exact farm token ticker:`, JSON.stringify(symbol))
      console.log(`[Farm Pricing] Mapping keys that contain BBC:`, Object.keys(farmToLPMapping).filter(k => k.includes('BBC')))
      
      if (correspondingLPTicker) {
        // Find the actual LP token config to get its address and platform
        const allTokens = [...TOKEN_CONSTANTS, ...MORE_COINS, ...(customTokens || [])]
        const lpTokenConfig = allTokens.find(token => token.ticker === correspondingLPTicker && token.type === 'lp')
        console.log(`[Farm Pricing] LP token config found:`, lpTokenConfig?.ticker, lpTokenConfig?.platform)
        console.log(`[Farm Pricing] Looking for LP ticker:`, JSON.stringify(correspondingLPTicker))
        console.log(`[Farm Pricing] Available 9INCH LP tickers:`, allTokens.filter(t => t.type === 'lp' && t.ticker.includes('9INCH')).map(t => t.ticker))
        
        if (lpTokenConfig) {
        // For PHUX LP tokens, use PHUX pricing
        if (lpTokenConfig.platform === 'PHUX') {
          const phuxPrice = getPhuxLPTokenPrice(lpTokenConfig.a)
          if (phuxPrice?.pricePerShare && phuxPrice.pricePerShare > 0) {
            return phuxPrice.pricePerShare
          }
        } else if (lpTokenConfig.platform === '9INCH') {
          // For 9INCH LP tokens, use 9INCH pricing (same getPhuxLPTokenPrice function now handles both)
          const nineInchPrice = getPhuxLPTokenPrice(lpTokenConfig.a)
          if (nineInchPrice?.pricePerShare && nineInchPrice.pricePerShare > 0) {
            return nineInchPrice.pricePerShare
          }
        } else if (lpTokenConfig.platform === '9MM') {
          // For 9MM LP tokens, use 9MM pricing (same getPhuxLPTokenPrice function handles 9MM too)
          const nineMmPrice = getPhuxLPTokenPrice(lpTokenConfig.a)
          if (nineMmPrice?.pricePerShare && nineMmPrice.pricePerShare > 0) {
            return nineMmPrice.pricePerShare
          }
        } else {
            // For PulseX LP tokens, use PulseX pricing
            console.log(`[Farm Pricing] Looking for PulseX LP price for farm ${symbol} -> LP ${correspondingLPTicker}`)
            const lpPrice = lpTokenPrices[correspondingLPTicker]
            if (lpPrice && lpPrice > 0) {
              console.log(`[Farm Pricing] ${symbol} using PulseX LP ${correspondingLPTicker} price = $${lpPrice}`)
              return lpPrice
            } else {
              console.warn(`[Farm Pricing] No PulseX LP price found for ${correspondingLPTicker}. Price value:`, lpPrice)
            }
          }
        }
      } else {
        console.warn(`[Farm Pricing] No corresponding LP token found for farm ${symbol}. Checked mapping:`, correspondingLPTicker)
      }
      
      console.warn(`[Farm Pricing] Returning 0 for farm ${symbol}`)
      return 0
    }
    
    // Route to appropriate pricing method based on platform
    switch (tokenConfig.platform) {
      case 'PHUX':
        // Use PHUX GraphQL TVL/shares pricing
        if (tokenConfig.a && getPhuxLPTokenPrice) {
          const phuxPrice = getPhuxLPTokenPrice(tokenConfig.a)
          if (phuxPrice?.pricePerShare && phuxPrice.pricePerShare > 0) {
            console.log(`[LP Pricing] PHUX: ${symbol} = $${phuxPrice.pricePerShare}`)
            return phuxPrice.pricePerShare
          }
        }
        console.warn(`[LP Pricing] PHUX price not found for ${symbol}`)
        return 0
        
      case '9INCH':
        // Use 9INCH GraphQL TVL/shares pricing
        console.log(`[LP Pricing] 9INCH lookup for ${symbol}, address: ${tokenConfig.a}, type: ${tokenConfig.type}`)
        
        if (tokenConfig.type === 'farm') {
          // For farm tokens, we need to map to the corresponding LP token address
          // Farm tokens use placeholder addresses, but we need the real LP address for pricing
          const farmToLPMapping = {
            '0xFARM9INCH000000000000000000000000000001': '0x1164dab36cd7036668ddcbb430f7e0b15416ef0b', // 9INCH-WPLS
            '0xFARM9INCH000000000000000000000000000002': '0x31acf819060ae711f63bd6b682640598e250c689', // 9INCH-weDAI
            '0xFARM9INCH000000000000000000000000000003': '0x6c5a0f22b459973a0305e2a565fc208a35a13850', // 9INCH-weUSDC
            '0xFARM9INCH000000000000000000000000000004': '0x5449a776797b55a4aac0b4a76b2ac878bff3d3e3', // 9INCH-weUSDT
            '0xFARM9INCH000000000000000000000000000005': '0xb543812ddebc017976f867da710ddb30cca22929', // 9INCH-BBC
            '0xFARM9INCH000000000000000000000000000006': '0x097d19b2061c5f31b68852349187c664920b4ba4', // 9INCH-we9INCH
            '0xFARM9INCH000000000000000000000000000007': '0x898bb93f4629c73f0c519415a85d6bd2977cb0b5', // 9INCH-PLSX
          }
          
          const lpAddress = farmToLPMapping[tokenConfig.a]
          console.log(`[LP Pricing] 9INCH farm ${symbol} -> LP address: ${lpAddress}`)
          
          if (lpAddress && getPhuxLPTokenPrice) {
            const nineInchPrice = getPhuxLPTokenPrice(lpAddress)
            if (nineInchPrice?.pricePerShare && nineInchPrice.pricePerShare > 0) {
              console.log(`[LP Pricing] 9INCH Farm: ${symbol} = $${nineInchPrice.pricePerShare}`)
              return nineInchPrice.pricePerShare
            } else {
              console.warn(`[LP Pricing] 9INCH Farm: No price data for LP ${lpAddress}`)
            }
          }
        } else if (tokenConfig.a && getPhuxLPTokenPrice) {
          // For LP tokens, use the address directly
          const nineInchPrice = getPhuxLPTokenPrice(tokenConfig.a)
          if (nineInchPrice?.pricePerShare && nineInchPrice.pricePerShare > 0) {
            console.log(`[LP Pricing] 9INCH LP: ${symbol} = $${nineInchPrice.pricePerShare}`)
            return nineInchPrice.pricePerShare
          }
        }
        console.warn(`[LP Pricing] 9INCH price not found for ${symbol}`)
        return 0
        
      case '9MM':
        // Use 9MM GraphQL TVL/shares pricing (same system as PHUX/9INCH)
        console.log(`[LP Pricing] 9MM lookup for ${symbol}, address: ${tokenConfig.a}, type: ${tokenConfig.type}`)
        
        if (tokenConfig.a && getPhuxLPTokenPrice) {
          // For 9MM LP tokens, use the address directly (no farms for 9MM)
          const nineMmPrice = getPhuxLPTokenPrice(tokenConfig.a)
          if (nineMmPrice?.pricePerShare && nineMmPrice.pricePerShare > 0) {
            console.log(`[LP Pricing] 9MM LP: ${symbol} = $${nineMmPrice.pricePerShare}`)
            return nineMmPrice.pricePerShare
          }
        }
        console.warn(`[LP Pricing] 9MM price not found for ${symbol}`)
        return 0
        
      case 'PLSX V1':
      case 'PLSX V2':
        // Use existing PulseX pricing system
        const pulsexPrice = lpTokenPrices[symbol]
        if (pulsexPrice && pulsexPrice > 0) {
          console.log(`[LP Pricing] PulseX: ${symbol} = $${pulsexPrice}`)
          return pulsexPrice
        }
        console.warn(`[LP Pricing] PulseX price not found for ${symbol}`)
        return 0
        
      case '9MM':
        // Future: 9MM DEX pricing integration
        console.log(`[LP Pricing] 9MM pricing not yet implemented for ${symbol}`)
        return 0
        
      default:
        // Fallback: try PulseX for backwards compatibility
        const fallbackPrice = lpTokenPrices[symbol]
        if (fallbackPrice && fallbackPrice > 0) {
          console.log(`[LP Pricing] Fallback PulseX: ${symbol} = $${fallbackPrice}`)
          return fallbackPrice
        }
        console.warn(`[LP Pricing] No pricing method found for ${symbol} (platform: ${tokenConfig.platform})`)
        return 0
    }
  }, [lpTokenPrices, getPhuxLPTokenPrice, customTokens])


  // Helper function to calculate user's share of underlying tokens in LP
  const calculateLPUnderlyingTokens = useCallback((lpSymbol: string, userLPBalance: number) => {
    const lpData = lpTokenData[lpSymbol]
    if (!lpData || !lpData.totalSupply || userLPBalance <= 0) return null

    const totalSupply = parseFloat(lpData.totalSupply)
    const userSharePercentage = userLPBalance / totalSupply

    const token0Amount = parseFloat(lpData.reserve0) * userSharePercentage
    const token1Amount = parseFloat(lpData.reserve1) * userSharePercentage

    // Extract the correct token symbols from the LP ticker instead of using API symbols
    // e.g. "pUSDC \/ WPLS" -> ["pUSDC", "WPLS"]
    const lpTokenConfig = TOKEN_CONSTANTS.find(t => t.ticker === lpSymbol)
    let token0Symbol = lpData.token0.symbol // fallback to API symbol
    let token1Symbol = lpData.token1.symbol // fallback to API symbol
    
    if (lpTokenConfig?.ticker) {
      // Parse the LP ticker to extract token symbols
      // Handle formats like "pUSDC \/ WPLS", "pUSDC / WPLS", "pUSDC/WPLS", "pUSDC-WPLS"
      const tickerMatch = lpTokenConfig.ticker.match(/([A-Za-z0-9]+)\s*\\?\s*[\/\-]\s*([A-Za-z0-9]+)/)
      if (tickerMatch) {
        token0Symbol = tickerMatch[1]
        token1Symbol = tickerMatch[2]
        console.log(`[LP Override] ${lpSymbol}: API tokens were ${lpData.token0.symbol}/${lpData.token1.symbol}, overriding with ${token0Symbol}/${token1Symbol}`)
      } else {
        console.warn(`[LP Override] ${lpSymbol}: Could not parse tokens from ticker "${lpTokenConfig.ticker}", using API symbols`)
      }
    }

    return {
      token0: {
        symbol: token0Symbol,
        amount: token0Amount,
        decimals: parseInt(lpData.token0.decimals)
      },
      token1: {
        symbol: token1Symbol,
        amount: token1Amount,
        decimals: parseInt(lpData.token1.decimals)
      }
    }
  }, [lpTokenData])

  // Get HEX daily data cache for EES calculations
  const { data: hexDailyDataCacheForEES } = useHexDailyDataCache();
  
  // Debug: Log current daily payout values and 30-day averages for both chains
  useEffect(() => {
    if (hexDailyDataCacheForEES?.dailyPayouts) {
      const ethPayouts = hexDailyDataCacheForEES.dailyPayouts.ETH;
      const plsPayouts = hexDailyDataCacheForEES.dailyPayouts.PLS;
      
      if (ethPayouts?.length > 0 && plsPayouts?.length > 0) {
        const latestEthPayout = ethPayouts[ethPayouts.length - 1];
        const latestPlsPayout = plsPayouts[plsPayouts.length - 1];
        
        // Calculate 30-day rolling averages
        const calculateRolling30DayAvg = (payouts: any[]) => {
          if (payouts.length < 30) return 'Insufficient data (< 30 days)';
          
          const last30Days = payouts.slice(-30);
          const sum = last30Days.reduce((total, payout) => {
            return total + parseFloat(payout.payoutPerTShare || '0');
          }, 0);
          
          return (sum / 30).toFixed(20); // Match precision of single day values
        };
        
        const ethRolling30Avg = calculateRolling30DayAvg(ethPayouts);
        const plsRolling30Avg = calculateRolling30DayAvg(plsPayouts);
        
        console.log('📊 DAILY PAYOUT VALUES FOR PROJECTED YIELD:');
        console.log('='.repeat(80));
        console.log('🔹 ETH CHAIN:');
        console.log(`   📈 Latest Daily: ${latestEthPayout.payoutPerTShare} (Day ${latestEthPayout.endDay})`);
        console.log(`   📊 Rolling 30-Day Avg: ${ethRolling30Avg}`);
        console.log('');
        console.log('🔸 PLS CHAIN:');
        console.log(`   📈 Latest Daily: ${latestPlsPayout.payoutPerTShare} (Day ${latestPlsPayout.endDay})`);
        console.log(`   📊 Rolling 30-Day Avg: ${plsRolling30Avg}`);
        console.log('');
        console.log('💡 Projected yield now uses the 30-DAY ROLLING AVERAGE for more stable projections');
        console.log('📈 Latest daily values shown for comparison with the average being used');
        console.log('='.repeat(80));
      }
    }
  }, [hexDailyDataCacheForEES]);

  // Helper function to determine if we should use compact formatting for HEX amounts
  // Use compact format if pooled stakes + HSI are both enabled (cramped UI) or on small screens
  const shouldUseCompactFormat = includePooledStakes && hasHsiStakes;

  // Helper function to format HEX amounts responsively based on space constraints
  const formatHexAmount = useCallback((amount: number, compactFormatter: (val: number) => string) => {
    if (shouldUseCompactFormat) {
      // Always use compact format when UI is cramped (pooled + HSI enabled)
      return compactFormatter(amount);
    } else {
      // Use responsive format - compact on mobile, full on desktop
      return (
        <>
          <span className="md:hidden">{compactFormatter(amount)}</span>
          <span className="hidden md:inline">{amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
        </>
      );
    }
  }, [shouldUseCompactFormat]);

  // Helper function to calculate 30-day rolling average payout per T-Share
  const calculate30DayAvgPayout = useCallback((dailyPayouts: any[], chainType?: 'ETH' | 'PLS'): number => {
    // Time Machine payout overrides (only when time machine is enabled)
    if (useTimeShift && chainType) {
      if (chainType === 'ETH' && timeMachineEthPayout && !isNaN(parseFloat(timeMachineEthPayout))) {
        return parseFloat(timeMachineEthPayout)
      }
      if (chainType === 'PLS' && timeMachinePlsPayout && !isNaN(parseFloat(timeMachinePlsPayout))) {
        return parseFloat(timeMachinePlsPayout)
      }
    }
    
    if (!dailyPayouts || dailyPayouts.length < 30) {
      // Fallback to latest value if insufficient data
      if (dailyPayouts && dailyPayouts.length > 0) {
        const latestPayout = dailyPayouts[dailyPayouts.length - 1];
        return Number(latestPayout.payoutPerTShare || latestPayout);
      }
      return 0;
    }
    
    const last30Days = dailyPayouts.slice(-30);
    const sum = last30Days.reduce((total, payout) => {
      return total + parseFloat(payout.payoutPerTShare || '0');
    }, 0);
    
    return sum / 30;
  }, [useTimeShift, timeMachineEthPayout, timeMachinePlsPayout]);

  // Helper function to calculate Emergency End Stake (EES) value and penalty using real HEX penalty calculation
  const calculateEESDetails = useCallback((stake: any, timeShiftDate?: string): { eesValue: number; penalty: number; payout: number } => {
    const { principleHex, yieldHex, tShares, startDate, endDate, progress } = stake;
    
    // Basic data validation
    if (!stake || typeof stake !== 'object') {
      return { eesValue: 0, penalty: 0, payout: 0 };
    }
    
    // Validate essential stake properties
    if (isNaN(Number(principleHex)) || isNaN(Number(tShares))) {
      return { eesValue: Number(principleHex) || 0, penalty: 0, payout: 0 };
    }
    

    
    // If stake is completed (100%), no penalty
    if (progress >= 100) {
      return { eesValue: principleHex + yieldHex, penalty: 0, payout: yieldHex };
    }
    
    // Calculate the actual HEX penalty using the contract logic
    const startDay = Math.floor((new Date(startDate).getTime() - new Date('2019-12-03').getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const endDay = Math.floor((new Date(endDate).getTime() - new Date('2019-12-03').getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    // Use timeShiftDate if provided, otherwise use current date
    const timeShiftTargetDate = timeShiftDate ? new Date(timeShiftDate) : new Date();
    const timeShiftDay = Math.floor((timeShiftTargetDate.getTime() - new Date('2019-12-03').getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const currentDay = Math.floor((Date.now() - new Date('2019-12-03').getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    const stakedDays = endDay - startDay;
    const servedDays = Math.max(0, timeShiftDay - startDay);
    
    // Check if we have daily payouts data for penalty calculation
    if (!hexDailyDataCacheForEES?.dailyPayouts) {
      // Fallback to simplified calculation if no daily data
      const yieldNum = Number(yieldHex) || 0;
      const principalNum = Number(principleHex) || 0;
      const stakedDaysNum = Number(stakedDays) || 1;
      const servedDaysNum = Number(servedDays) || 0;
      
      const fallbackPayout = yieldNum * Math.min(1, servedDaysNum / stakedDaysNum);
      const fallbackPenalty = Math.max(0, yieldNum - fallbackPayout);
      const fallbackEesValue = Math.max(0, principalNum + fallbackPayout);
      
      return { 
        eesValue: !isNaN(fallbackEesValue) ? fallbackEesValue : 0, 
        penalty: !isNaN(fallbackPenalty) ? fallbackPenalty : 0, 
        payout: !isNaN(fallbackPayout) ? fallbackPayout : 0 
      };
    }
    
    const dailyPayouts = stake.chain === 'ETH' 
      ? hexDailyDataCacheForEES.dailyPayouts.ETH 
      : hexDailyDataCacheForEES.dailyPayouts.PLS;
    
    // If timeShiftDate is after stake's natural end date, calculate projected yield to natural end (no penalty)
    if (timeShiftDay >= endDay) {
      // Calculate projected yield up to the stake's natural end date
      let fullPayout = 0;
      
      if (endDay <= currentDay) {
        // Stake has already ended naturally - use existing yield
        fullPayout = Number(yieldHex) || 0;
      } else {
        // Stake hasn't ended yet - calculate historical + projected to natural end
        const historicalDays = Math.max(0, currentDay - startDay);
        
        // Historical yield (from start to today)
        if (historicalDays > 0 && typeof calculateYieldForStake === 'function') {
          const historicalPayout = calculateYieldForStake(dailyPayouts, tShares, startDay, startDay + historicalDays);
          if (!isNaN(historicalPayout)) {
            fullPayout += historicalPayout;
          }
        }
        
        // Future projected yield (from today to natural end date)
        const futureDaysToEnd = endDay - currentDay;
        if (futureDaysToEnd > 0 && dailyPayouts && dailyPayouts.length > 0) {
          // Use 30-day rolling average for more stable projections
          const chainType = stake.chain === 'ETH' ? 'ETH' : 'PLS';
          const avgPayoutPerTShare = calculate30DayAvgPayout(dailyPayouts, chainType);
          const tSharesNum = Number(tShares);
          
          if (!isNaN(avgPayoutPerTShare) && !isNaN(tSharesNum) && avgPayoutPerTShare > 0 && tSharesNum > 0) {
            const projectedYield = avgPayoutPerTShare * tSharesNum * futureDaysToEnd;
            if (!isNaN(projectedYield)) {
              fullPayout += projectedYield;
            }
          }
        }
      }
      
      return { eesValue: principleHex + fullPayout, penalty: 0, payout: fullPayout };
    }
    
    // HEX contract penalty calculation
    // 50% of stakedDays (rounded up) with minimum of 1 day
    const EARLY_PENALTY_MIN_DAYS = 1;
    let penaltyDays = Math.max(EARLY_PENALTY_MIN_DAYS, Math.ceil(stakedDays / 2));
    
    if (servedDays === 0) {
      // No payout if no days served, just penalty
      return { eesValue: 0, penalty: 0, payout: 0 };
    }
    
    // Calculate actual payout using daily data + future projection if needed
    let payout = 0;
    
    if (timeShiftDay <= currentDay) {
      // timeShiftDate is today or in the past - use historical data only
      if (typeof calculateYieldForStake === 'function') {
        const historicalPayout = calculateYieldForStake(dailyPayouts, tShares, startDay, startDay + servedDays);
        payout = !isNaN(historicalPayout) ? historicalPayout : 0;
      }
    } else {
      // timeShiftDate is in the future - calculate historical + projected yield
      const historicalDays = Math.max(0, currentDay - startDay);
      
      // Historical yield (from start to today)
      if (historicalDays > 0 && typeof calculateYieldForStake === 'function') {
        const historicalPayout = calculateYieldForStake(dailyPayouts, tShares, startDay, startDay + historicalDays);
        if (!isNaN(historicalPayout)) {
          payout += historicalPayout;
        }
      }
      
      // Future projected yield (from today to timeShiftDate)
      const futureDays = timeShiftDay - currentDay;
      if (futureDays > 0 && dailyPayouts.length > 0) {
        // Use 30-day rolling average for more stable projections
        const chainType = stake.chain === 'ETH' ? 'ETH' : 'PLS';
        const avgPayoutPerTShare = calculate30DayAvgPayout(dailyPayouts, chainType);
        const tSharesNum = Number(tShares);
        
        // Validate all values before calculation
        if (!isNaN(avgPayoutPerTShare) && !isNaN(tSharesNum) && avgPayoutPerTShare > 0 && tSharesNum > 0) {
          const projectedYield = avgPayoutPerTShare * tSharesNum * futureDays;
          if (!isNaN(projectedYield)) {
            payout += projectedYield;
          }
        }
      }
    }
    
    let penalty = 0;
    
    if (penaltyDays < servedDays) {
      // Penalty is applied to first penaltyDays only
      if (typeof calculateYieldForStake === 'function') {
        const penaltyCalculation = calculateYieldForStake(dailyPayouts, tShares, startDay, startDay + penaltyDays);
        penalty = !isNaN(penaltyCalculation) ? penaltyCalculation : 0;
      }
    } else if (penaltyDays === servedDays) {
      // Penalty equals the entire payout
      penalty = !isNaN(payout) ? payout : 0;
    } else {
      // penaltyDays > servedDays - penalty is proportional
      if (!isNaN(payout) && !isNaN(penaltyDays) && !isNaN(servedDays) && servedDays > 0) {
        penalty = payout * penaltyDays / servedDays;
      }
    }
    
    // Ensure penalty is a valid number
    if (isNaN(penalty)) penalty = 0;
    
    // EES value = principal + payout - penalty
    const principalNum = Number(principleHex) || 0;
    const payoutNum = !isNaN(payout) ? payout : 0;
    const penaltyNum = !isNaN(penalty) ? penalty : 0;
    
    const eesValue = principalNum + payoutNum - penaltyNum;
    
    // Ensure we never return negative value or NaN
    return { 
      eesValue: Math.max(0, !isNaN(eesValue) ? eesValue : 0), 
      penalty: penaltyNum, 
      payout: payoutNum 
    };
  }, [hexDailyDataCacheForEES, timeShiftDateString, calculate30DayAvgPayout]);

  // Helper function to calculate Emergency End Stake (EES) value using real HEX penalty calculation
  const calculateEESValue = useCallback((stake: any, timeShiftDate?: string): number => {
    return calculateEESDetails(stake, timeShiftDate).eesValue;
  }, [calculateEESDetails]);

  // Helper functions that use the string date (only when Time-Shift is enabled)
  const calculateEESValueWithDate = useCallback((stake: any) => {
    const dateToUse = useTimeShift ? timeShiftDateString : undefined;
    return calculateEESValue(stake, dateToUse)
  }, [calculateEESValue, timeShiftDateString, useTimeShift])

  const calculateEESDetailsWithDate = useCallback((stake: any) => {
    const dateToUse = useTimeShift ? timeShiftDateString : undefined;
    return calculateEESDetails(stake, dateToUse)
  }, [calculateEESDetails, timeShiftDateString, useTimeShift])

  // Helper function to get token price (market or backing)
  const getTokenPrice = useCallback((symbol: string): number => {
    // Time Machine price overrides (only when time machine is enabled)
    if (useTimeShift) {
      if (symbol === 'HEX' && timeMachineHexPrice && !isNaN(parseFloat(timeMachineHexPrice))) {
        return parseFloat(timeMachineHexPrice)
      }
      if ((symbol === 'eHEX' || symbol === 'weHEX') && timeMachineEHexPrice && !isNaN(parseFloat(timeMachineEHexPrice))) {
        return parseFloat(timeMachineEHexPrice)
      }
    }
    
    // Stablecoins are always $1
    if (isStablecoin(symbol)) return 1
    
    // Check if this is an LP token
    const tokenConfig = TOKEN_CONSTANTS.find(token => token.ticker === symbol)
    if (tokenConfig?.type === 'lp') {
      // Special handling for USDT/USDC/DAI PLS stable pool
      if (symbol === 'USDT  \/ USDC \/ DAI' && tokenConfig.a === '0xE3acFA6C40d53C3faf2aa62D0a715C737071511c') {
        // Use real-time virtual price data from API
        if (plsVirtualPrice && plsVirtualPrice > 0) {
          return plsVirtualPrice
        }
        // If API data not available, return 0 (no fallback)
        console.warn('PLS virtual price API data not available for USDT/USDC/DAI pool')
        return 0
      }
      
      // Check for hardcoded price for other LP tokens
      if (tokenConfig.hardcodedPrice) {
        return tokenConfig.hardcodedPrice
      }
      
      // For PulseX V2 LP tokens, get price from LP data
      if (tokenConfig.platform === 'PLSX V2') {
      const lpPrice = getLPTokenPrice(symbol)
      if (lpPrice > 0) {
        return lpPrice
      }
      }
      
      // Fallback to 0 if LP price not available
      return 0
    }
    
    // Check if this token should use backing price
    if (useBackingPrice && shouldUseBackingPrice(symbol)) {
      // Get the actual backing per token from the MAXI API
      const backingPerToken = getBackingPerToken(symbol)
      
      if (backingPerToken !== null) {
        // For e/we tokens, use eHEX price with backing multiplier
        if (symbol.startsWith('e') || symbol.startsWith('we')) {
          // Use time machine override if available, otherwise market price
          const eHexPrice = (useTimeShift && timeMachineEHexPrice && !isNaN(parseFloat(timeMachineEHexPrice))) 
            ? parseFloat(timeMachineEHexPrice)
            : (prices['eHEX']?.price || 0)
          return eHexPrice * backingPerToken
        }
        // For regular MAXI tokens (p-versions), use HEX price with backing multiplier
        else {
          // Use time machine override if available, otherwise market price
          const hexPrice = (useTimeShift && timeMachineHexPrice && !isNaN(parseFloat(timeMachineHexPrice))) 
            ? parseFloat(timeMachineHexPrice)
            : (prices['HEX']?.price || 0)
          return hexPrice * backingPerToken
        }
      } else {
        // Fallback to old calculation if API data not available
        if (symbol.startsWith('e') || symbol.startsWith('we')) {
          // Use time machine override if available, otherwise market price
          const eHexPrice = (useTimeShift && timeMachineEHexPrice && !isNaN(parseFloat(timeMachineEHexPrice))) 
            ? parseFloat(timeMachineEHexPrice)
            : (prices['eHEX']?.price || 0)
          return eHexPrice * 2 // Fallback: 2.0 * eHEX price
        } else {
          // Use time machine override if available, otherwise market price
          const hexPrice = (useTimeShift && timeMachineHexPrice && !isNaN(parseFloat(timeMachineHexPrice))) 
            ? parseFloat(timeMachineHexPrice)
            : (prices['HEX']?.price || 0)
          return hexPrice * 2 // Fallback: 2.0 * HEX price
        }
      }
    }
    
    // Handle WPLS -> PLS price mapping (WPLS should have same price as PLS)
    if (symbol === 'WPLS') {
      const plsPrice = prices['PLS']?.price || 0
      console.log(`[Token Price] WPLS mapped to PLS: ${plsPrice}`)
      return plsPrice
    }
    
    // Handle DAI -> weDAI price mapping (9MM V3 API returns "DAI" but our constants use "weDAI")
    if (symbol === 'DAI') {
      const weDaiPrice = prices['weDAI']?.price || 0
      console.log(`[Token Price] DAI mapped to weDAI: ${weDaiPrice}`)
      return weDaiPrice
    }
    
    // Use market price
    const marketPrice = prices[symbol]?.price || 0
    if (marketPrice === 0) {
      console.warn(`[Token Price] No price found for symbol: ${symbol}. Available prices:`, Object.keys(prices))
    }
    return marketPrice
  }, [isStablecoin, shouldUseBackingPrice, useBackingPrice, prices, getBackingPerToken, getLPTokenPrice, useTimeShift, timeMachineHexPrice, timeMachineEHexPrice])

  // Get up to 5 addresses from portfolio (most common case)
  const address1 = effectiveAddresses[0]?.address || null
  const address2 = effectiveAddresses[1]?.address || null
  const address3 = effectiveAddresses[2]?.address || null
  const address4 = effectiveAddresses[3]?.address || null
  const address5 = effectiveAddresses[4]?.address || null
  
  // Fetch V3 positions for each address using the original hook
  const v3Result1 = use9MmV3Positions(address1, { getTokenPrice })
  const v3Result2 = use9MmV3Positions(address2, { getTokenPrice })
  const v3Result3 = use9MmV3Positions(address3, { getTokenPrice })
  const v3Result4 = use9MmV3Positions(address4, { getTokenPrice })
  const v3Result5 = use9MmV3Positions(address5, { getTokenPrice })
  
  // Hook for fetching actual tick data from position manager contract
  const { tickData, isLoading: tickIsLoading, errors: tickErrors, fetchPositionTicks } = useV3PositionTicks()
  
  // Combine all results
  const allV3Results = [v3Result1, v3Result2, v3Result3, v3Result4, v3Result5]
  const nineMmV3Positions = allV3Results.flatMap(result => result.positions || [])
  const nineMmV3RawPositions = allV3Results.flatMap(result => result.rawPositions || [])
  const total9MmV3Value = allV3Results.reduce((sum, result) => sum + (result.totalValue || 0), 0)
  const is9MmV3Loading = allV3Results.some(result => result.isLoading)
  const nineMmV3Error = allV3Results.find(result => result.error)?.error || null

  // Background effect to fetch tick data for V3 positions
  useEffect(() => {
    if (!is9MmV3Loading && nineMmV3Positions.length > 0) {
      // Fetch tick data for each position in the background
      nineMmV3Positions.forEach(position => {
        const tokenId = position.positionId || position.id
        const poolAddress = position.pool?.id
        if (tokenId) {
          fetchPositionTicks(tokenId, poolAddress)
        }
      })
    }
  }, [is9MmV3Loading, nineMmV3Positions, fetchPositionTicks])
  
  const validAddressCount = [address1, address2, address3, address4, address5].filter(Boolean).length
  
  // Helper function to calculate user's share of underlying tokens in PHUX LP using hardcoded composition
  const calculatePhuxLPUnderlyingTokens = useCallback((lpSymbol: string, userLPBalance: number, lpAddress: string) => {
    if (userLPBalance <= 0) {
      console.log(`[PHUX LP Debug] Early return: userLPBalance=${userLPBalance}`)
      return null
    }
    
    // DISABLED DEBUG BLOCK - COMMENTED OUT
    /*
          totalPositions: nineMmV3Positions.length,
          totalValue: total9MmV3Value,
          totalCurrentValue: nineMmV3Positions.reduce((sum, pos) => sum + pos.values.currentValue, 0),
          totalFeesValue: nineMmV3Positions.reduce((sum, pos) => sum + pos.values.feesValue, 0),
          primaryAddress: primaryAddress,
          isLoading: is9MmV3Loading
        },
        positions: nineMmV3Positions.map(position => ({
          // Basic Position Info
          id: position.id,
          owner: position.owner,
          displayName: position.displayName,
          feePercent: position.feePercent,
          poolAddress: position.poolAddress,
          
          // Pool Information
          pool: {
            id: position.pool.id,
            feeTier: position.pool.feeTier,
            tick: position.pool.tick,
            sqrtPrice: position.pool.sqrtPrice,
            token0Price: position.pool.token0Price,
            token1Price: position.pool.token1Price,
            totalValueLockedUSD: position.pool.totalValueLockedUSD,
            volumeUSD: position.pool.volumeUSD,
            liquidity: position.pool.liquidity,
            token0: {
              id: position.pool.token0.id,
              symbol: position.pool.token0.symbol,
              name: position.pool.token0.name,
              decimals: position.pool.token0.decimals
            },
            token1: {
              id: position.pool.token1.id,
              symbol: position.pool.token1.symbol,
              name: position.pool.token1.name,
              decimals: position.pool.token1.decimals
            }
          },
          
          // Position Range & Liquidity
          tickLower: position.tickLower,
          tickUpper: position.tickUpper,
          liquidity: position.liquidity,
          
          // Token Amounts (Raw from GraphQL)
          depositedToken0: position.depositedToken0,
          depositedToken1: position.depositedToken1,
          withdrawnToken0: position.withdrawnToken0,
          withdrawnToken1: position.withdrawnToken1,
          collectedFeesToken0: position.collectedFeesToken0,
          collectedFeesToken1: position.collectedFeesToken1,
          
          // Calculated Values
          values: {
            currentValue: position.values.currentValue,
            feesValue: position.values.feesValue,
            totalValue: position.values.totalValue,
            token0Amount: position.values.token0Amount,
            token1Amount: position.values.token1Amount
          },
          
          // Token Prices Used in Calculation
          tokenPrices: {
            token0Symbol: position.pool.token0.symbol,
            token1Symbol: position.pool.token1.symbol,
            token0USDPrice: getTokenPrice(position.pool.token0.symbol),
            token1USDPrice: getTokenPrice(position.pool.token1.symbol)
          },
          
          // Calculated Metrics for UI Display
          metrics: {
            currentValueFormatted: position.values.currentValue.toLocaleString('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }),
            feesValueFormatted: position.values.feesValue.toLocaleString('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 2,
              maximumFractionDigits: 6
            }),
            totalValueFormatted: position.values.totalValue.toLocaleString('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 2,
              maximumFractionDigits: 2
            }),
            feePercentFormatted: `${position.feePercent}%`,
            token0AmountFormatted: position.values.token0Amount.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 6
            }),
            token1AmountFormatted: position.values.token1Amount.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 6
            }),
            
            // Net calculations
            netToken0: parseFloat(position.depositedToken0) - parseFloat(position.withdrawnToken0),
            netToken1: parseFloat(position.depositedToken1) - parseFloat(position.withdrawnToken1),
            
            // Pool-relative calculations
            token0PriceInPool: parseFloat(position.pool.token0Price),
            token1PriceInPool: parseFloat(position.pool.token1Price),
            
            // Position health metrics
            isInRange: true, // You'd need to calculate this based on current tick vs tick range
            liquidityUtilization: parseFloat(position.liquidity) > 0 ? 'Active' : 'Inactive'
          }
        }))
      }, null, 2))
      console.log('=== END 9MM V3 POSITIONS DEBUG DATA ===')
    } else if (validAddressCount > 0 && !is9MmV3Loading) {
      console.log(`[9MM V3 Debug] No V3 positions found for any of the ${validAddressCount} addresses`)
    }
    */
    // END OF DISABLED DEBUG BLOCK
    
    // Find the token config with composition data
    const allTokens = [...TOKEN_CONSTANTS, ...MORE_COINS, ...(customTokens || [])]
    const tokenConfig = allTokens.find(token => token.ticker === lpSymbol)
    
    if (!tokenConfig || !tokenConfig.composition) {
      console.log(`[PHUX LP Debug] No composition data for ${lpSymbol}`)
      return null
    }

    // Get the LP token price to calculate total USD value
    const lpTokenPrice = getLPTokenPrice(lpSymbol)
    const totalUsdValue = userLPBalance * lpTokenPrice
    
    console.log(`[PHUX LP Debug] ${lpSymbol}: userLPBalance=${userLPBalance}, lpTokenPrice=${lpTokenPrice}, totalUsdValue=${totalUsdValue}`)

    // Calculate user's underlying tokens based on USD weights and token prices
    const underlyingTokens = tokenConfig.composition.map(comp => {
      const tokenPrice = getTokenPrice(comp.ticker)
      const weightPercent = comp.weight / 100
      const tokenUsdValue = totalUsdValue * weightPercent
      
      // Calculate token amount: USD value ÷ token price
      // If no price data, use a fallback estimate (e.g., $0.01 per token for display purposes)
      let userTokenAmount = 0
      if (tokenPrice > 0) {
        userTokenAmount = tokenUsdValue / tokenPrice
      } else {
        // Fallback: assume $0.01 per token to show meaningful amounts
        const fallbackPrice = 0.01
        userTokenAmount = tokenUsdValue / fallbackPrice
        console.log(`[PHUX LP Debug] ${comp.ticker}: Using fallback price $${fallbackPrice} for display`)
      }
      
      console.log(`[PHUX LP Debug] Token ${comp.ticker}: weight=${comp.weight}%, tokenPrice=${tokenPrice}, usdValue=${tokenUsdValue}, userAmount=${userTokenAmount}`)
      
      return {
        symbol: comp.ticker,
        amount: userTokenAmount,
        usdValue: tokenUsdValue // Include USD value for display
      }
    })

    console.log(`[PHUX LP Debug] Final tokens:`, underlyingTokens)
    return { tokens: underlyingTokens }
  }, [customTokens, getLPTokenPrice, getTokenPrice])

  // Helper function to calculate user's share of underlying tokens in 9INCH LP
  const calculate9InchLPUnderlyingTokens = useCallback((lpSymbol: string, userLPBalance: number, lpAddress: string) => {
    if (userLPBalance <= 0) {
      console.log(`[9INCH LP Debug] Early return: userLPBalance=${userLPBalance}`)
      return null
    }
    
    // Get 9INCH pool data from the GraphQL hook
    const nineInchPrice = getPhuxLPTokenPrice ? getPhuxLPTokenPrice(lpAddress) : null
    
    if (!nineInchPrice || !nineInchPrice.tokens || nineInchPrice.tokens.length !== 2) {
      console.log(`[9INCH LP Debug] No valid pool data for ${lpSymbol} at ${lpAddress}`)
      return null
    }
    
    console.log(`[9INCH LP Debug] Pool data tokens:`, nineInchPrice.tokens.map(t => ({ symbol: t.symbol, address: t.address })))
    
    // Use the actual token symbols from the pool data instead of parsing the ticker
    const token0Symbol = nineInchPrice.tokens[0].symbol
    const token1Symbol = nineInchPrice.tokens[1].symbol
    
    console.log(`[9INCH LP Debug] Using actual pool token symbols: ${token0Symbol}, ${token1Symbol}`)
    
    // For 9INCH pools, we'll estimate 50/50 split since we don't have exact reserve data
    const totalUsdValue = userLPBalance * (nineInchPrice.pricePerShare || 0)
    const token0UsdValue = totalUsdValue * 0.5
    const token1UsdValue = totalUsdValue * 0.5
    
    // Get token prices to convert USD values to token amounts
    const token0Price = getTokenPrice(token0Symbol)
    const token1Price = getTokenPrice(token1Symbol)
    
    console.log(`[9INCH LP Debug] Token prices: ${token0Symbol}=$${token0Price}, ${token1Symbol}=$${token1Price}`)
    console.log(`[9INCH LP Debug] USD values: ${token0Symbol}=$${token0UsdValue.toFixed(2)}, ${token1Symbol}=$${token1UsdValue.toFixed(2)}`)
    
    const token0Amount = token0Price > 0 ? token0UsdValue / token0Price : 0
    const token1Amount = token1Price > 0 ? token1UsdValue / token1Price : 0
    
    console.log(`[9INCH LP Debug] ${lpSymbol}: Total=$${totalUsdValue.toFixed(2)}, ${token0Symbol}=${token0Amount.toFixed(4)} ($${token0UsdValue.toFixed(2)}), ${token1Symbol}=${token1Amount.toFixed(4)} ($${token1UsdValue.toFixed(2)})`)
    
    return {
      token0: {
        symbol: token0Symbol,
        amount: token0Amount,
        decimals: 18 // Default to 18 decimals
      },
      token1: {
        symbol: token1Symbol, // This will be "e9INCH" for display consistency
        amount: token1Amount,
        decimals: 18 // Default to 18 decimals
      }
    }
  }, [getPhuxLPTokenPrice, getTokenPrice])

  // Helper function to get token supply from constants
  const getTokenSupply = (symbol: string): number | null => {
    const tokenConfig = TOKEN_CONSTANTS.find(token => token.ticker === symbol)
    return tokenConfig?.supply || null
  }

  // Helper function to calculate estimated time remaining for import
  const getEstimatedTimeRemaining = (): string => {
    if (!importStartTime || importProgress === 0 || importTotal === 0) {
      return 'Calculating...'
    }
    
    const elapsed = Date.now() - importStartTime
    const avgTimePerToken = elapsed / importProgress
    const remainingTokens = importTotal - importProgress
    const estimatedTimeRemaining = avgTimePerToken * remainingTokens
    
    const minutes = Math.floor(estimatedTimeRemaining / 60000)
    const seconds = Math.floor((estimatedTimeRemaining % 60000) / 1000)
    
    if (minutes > 0) {
      return `~${minutes}m ${seconds}s remaining`
    } else {
      return `~${seconds}s remaining`
    }
  }

  // Define pooled stake tokens
  const POOLED_STAKE_TOKENS = ['MAXI', 'DECI', 'LUCKY', 'TRIO', 'BASE', 'eMAXI', 'eDECI', 'eLUCKY', 'eTRIO', 'eBASE', 'weMAXI', 'weDECI', 'ICSA', 'eICSA', 'weICSA']

  // Calculate pooled stakes T-shares from token balances
  const pooledStakesData = useMemo(() => {
    if (!includePooledStakes || !mainTokensWithBalances.length || !maxiData) {
      return { totalTShares: 0, totalValue: 0, tokens: [], totalHex: 0, totalEHex: 0, totalHexValue: 0, totalEHexValue: 0 }
    }

    // Get pooled tokens with balances
    const pooledTokens = mainTokensWithBalances.filter(token => 
      POOLED_STAKE_TOKENS.includes(token.symbol)
    )

    let totalTShares = 0
    let totalValue = 0
    let totalHex = 0
    let totalEHex = 0
    let totalHexValue = 0
    let totalEHexValue = 0
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
        
        // Separate HEX backing by chain and calculate respective values
        const isEthToken = token.symbol.startsWith('e') || token.symbol.startsWith('we')
        if (isEthToken) {
          totalEHex += userHexBacking
          const eHexPrice = getTokenPrice('eHEX')
          totalEHexValue += userHexBacking * eHexPrice
        } else {
          totalHex += userHexBacking
          const hexPrice = getTokenPrice('HEX')
          totalHexValue += userHexBacking * hexPrice
        }
        
        totalTShares += userTShares
        totalValue += tokenValue
        
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

    return { totalTShares, totalValue, totalHex, totalEHex, totalHexValue, totalEHexValue, tokens, avgStakeLength, avgAPY }
  }, [includePooledStakes, mainTokensWithBalances, maxiData, getTokenSupply, getTokenPrice])

  // Filter and sort stakes by selected addresses and chain (native or HSI based on active tab)
  const filteredStakes = useMemo(() => {
    const currentStakes = activeStakesTab === 'native' ? hexStakes : hsiStakes
    const currentHasStakes = activeStakesTab === 'native' ? hasStakes : hasHsiStakes
    
    // Debug: Log all unique status values found in the stakes data
    if (currentStakes && currentStakes.length > 0) {
      const uniqueStatuses = [...new Set(currentStakes.map(stake => stake.status))]
      console.log(`[${activeStakesTab.toUpperCase()} Stakes Debug] Unique status values found:`, uniqueStatuses)
      console.log(`[${activeStakesTab.toUpperCase()} Stakes Debug] Current filter:`, stakeStatusFilter)
      console.log(`[${activeStakesTab.toUpperCase()} Stakes Debug] Total stakes before filtering:`, currentStakes.length)
    }

    const filtered = currentStakes
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
      case 'amount': {
          const aValue = getStakeValue(a)
          const bValue = getStakeValue(b)
          comparison = bValue - aValue // Higher values first
          break
      }
      case 'startDate': {
        const aStartDate = new Date(a.startDate).getTime()
        const bStartDate = new Date(b.startDate).getTime()
        comparison = aStartDate - bStartDate
        break
      }
      case 'endDate': {
        const aEndDate = new Date(a.endDate).getTime()
        const bEndDate = new Date(b.endDate).getTime()
        comparison = aEndDate - bEndDate
        break
      }
      case 'progress': {
        comparison = b.progress - a.progress // Higher progress first
        break
      }
    }
        
    // Secondary sort by amount if primary sort yields equal values
    if (comparison === 0 && hexStakesSortField !== 'amount') {
      const aValue = getStakeValue(a)
      const bValue = getStakeValue(b)
      comparison = bValue - aValue
    }

    return hexStakesSortDirection === 'asc' ? comparison : -comparison
  })
  }, [activeStakesTab, hexStakes, hsiStakes, hasStakes, hasHsiStakes, selectedAddressIds, addresses, chainFilter, getTokenPrice, hexStakesSortField, hexStakesSortDirection, removedAddressIds, stakeStatusFilter, detectiveMode])

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
      filteredStakesLength: filteredStakes.length
    })
  }, [effectiveAddresses.length, showHexStakes, hasStakes, hexStakes?.length, filteredStakes.length])

  // Reset displayed stakes count when filters change
  useEffect(() => {
    setDisplayedStakesCount(20)
  }, [chainFilter, selectedAddressIds, hexStakesSortField, hexStakesSortDirection])

  // Memoized sorted tokens to prevent re-sorting on every render
  const sortedTokens = useMemo(() => {
    console.log(`[SORT MEMO] Running sortedTokens memo - sortField: ${tokenSortField}, direction: ${tokenSortDirection}`)
    console.log(`[SORT MEMO] Settings: dustFilter=${dustFilter}, hideTokensWithoutPrice=${hideTokensWithoutPrice}`)
    if (!mainTokensWithBalances.length || !prices) return []
    
    // First filter by dust threshold and price data availability, then sort
    const filteredTokens = mainTokensWithBalances.filter(token => {
      const tokenPrice = getTokenPrice(token.symbol)
      
      // Always filter out LP tokens from main table (they appear in separate LP section when enabled)
      const tokenConfig = TOKEN_CONSTANTS.find(t => t.ticker === token.symbol)
      const isLPToken = tokenConfig?.type === 'lp' ||
                       token.symbol.includes('LP') || 
                       token.name?.includes(' LP') ||
                       token.name?.includes(' / ')
      
      // Also filter out V3 positions (they appear in LP section)
      const isV3Position = token.symbol.includes('#') && token.name?.includes('9MM V3 LP')
      
      if (isLPToken || isV3Position) {
        return false // Always hide LP tokens and V3 positions from main table (they show in LP section)
      }
      
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
        // Sort by 24h percentage change
        const aPriceData = prices[a.symbol]
        const bPriceData = prices[b.symbol]
        const aChange = aPriceData?.priceChange?.h24 || 0
        const bChange = bPriceData?.priceChange?.h24 || 0
        comparison = bChange - aChange // Higher change first for desc
      } else if (tokenSortField === 'dollarChange') {
        // Sort by 24h dollar change
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
        
        // Secondary sort by USD value if changes are equal
        if (Math.abs(comparison) < 0.01) {
          comparison = bValue - aValue
        }
      } else if (tokenSortField === 'alphabetical') {
        // Sort alphabetically by symbol
        comparison = a.symbol.localeCompare(b.symbol)
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
    mainTokensWithBalances.map(t => `${t.symbol}-${t.balanceFormatted ? t.balanceFormatted.toFixed(6) : '0'}-${t.chain}`).join('|'),
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
    showDollarChange,
    // Include liquidity positions setting
    showLiquidityPositions
  ])

  // Memoized LP tokens with balances
  const lpTokensWithBalances = useMemo(() => {
    // Return empty array if liquidity positions are disabled
    if (!showLiquidityPositions) return []
    
    // Get LP tokens from actual balances, but exclude V3 LP tokens (we handle those separately)
    const lpTokensFromBalances = mainTokensWithBalances.filter(token => {
      const tokenConfig = TOKEN_CONSTANTS.find(t => t.ticker === token.symbol)
      
      // Apply chain filter
      if (chainFilter !== 'both' && 
          ((chainFilter === 'pulsechain' && token.chain !== 369) ||
           (chainFilter === 'ethereum' && token.chain !== 1))) {
        return false
      }
      
      // Skip V3 LP tokens - we handle these through our dynamic V3 grouping
      // EXCEPT if they have manual overrides set
      if (tokenConfig?.name?.includes('9MM LP V3')) {
        const hasCustomValue = customV3Values.has(token.symbol) && parseFloat(customV3Values.get(token.symbol) || '0') > 0
        if (!hasCustomValue) {
          console.log(`[LP Filter] Skipping static V3 LP token (no override): ${token.symbol}`)
          return false
        } else {
          console.log(`[LP Filter] Keeping static V3 LP token (has override): ${token.symbol}`)
        }
      }
      
      return tokenConfig?.type === 'lp' ||
             token.symbol.includes('LP') || 
             token.name?.includes(' LP') ||
             token.name?.includes(' / ')
    })
    
    // Add manual override LP tokens (even if user doesn't own them)
    // But skip them if address filtering is active (since they're not associated with any specific address)
    const allTokens = [...TOKEN_CONSTANTS, ...MORE_COINS, ...(customTokens || [])]
    const manualLPTokens = selectedAddressIds.length > 0 ? [] : allTokens.filter(tokenConfig => {
      // Apply chain filter
      if (chainFilter !== 'both' && 
          ((chainFilter === 'pulsechain' && tokenConfig.chain !== 369) ||
           (chainFilter === 'ethereum' && tokenConfig.chain !== 1))) {
        return false
      }
      
      // Skip V3 LP tokens from manual tokens too - we handle these through dynamic V3 grouping
      // EXCEPT if they have manual overrides set AND are enabled
      if (tokenConfig.name?.includes('9MM LP V3')) {
        const hasCustomValue = customV3Values.has(tokenConfig.ticker) && parseFloat(customV3Values.get(tokenConfig.ticker) || '0') > 0
        const isEnabled = enabledCoins.has(tokenConfig.ticker)
        if (!hasCustomValue || !isEnabled) {
          console.log(`[Manual LP Filter] Skipping static V3 LP token: ${tokenConfig.ticker} (hasCustomValue: ${hasCustomValue}, isEnabled: ${isEnabled})`)
          return false
        } else {
          console.log(`[Manual LP Filter] Keeping static V3 LP token (has override and enabled): ${tokenConfig.ticker}`)
        }
      }
      
      return tokenConfig.type === 'lp' && 
             (coinDetectionMode === 'manual' ? enabledCoins.has(tokenConfig.ticker) : false) &&
             !lpTokensFromBalances.some(existing => existing.symbol === tokenConfig.ticker)
    }).map(tokenConfig => ({
      symbol: tokenConfig.ticker,
      name: tokenConfig.name || tokenConfig.ticker,
      balanceFormatted: 1000, // Default manual balance
      address: tokenConfig.a,
      chain: tokenConfig.chain,
      decimals: tokenConfig.decimals || 18
    }))
    
    // Convert 9MM V3 positions to LP token format for display
    
    // Include all positions (both active and closed)
    const allV3Positions = nineMmV3Positions
    
    // Filter V3 positions based on selected addresses
    let filteredV3Positions = allV3Positions
    if (selectedAddressIds.length > 0) {
      // Only show V3 positions for addresses that are currently selected
      const selectedAddresses = selectedAddressIds.map(id => {
        const foundAddr = effectiveAddresses.find(addr => addr.id === id)
        const address = foundAddr?.address?.toLowerCase()
        console.log(`[Address Debug] ID ${id} -> found address: ${address}`)
        return address
      }).filter(Boolean)
      console.log(`[Address Debug] effectiveAddresses:`, effectiveAddresses.map(a => ({id: a.id, address: a.address})))
      
      filteredV3Positions = nineMmV3Positions.filter(position => {
        const positionOwner = position.owner.toLowerCase()
        const isMatch = selectedAddresses.includes(positionOwner)
        return isMatch
      })
    }
    
    // Apply chain filter to V3 positions
    if (chainFilter !== 'both') {
      filteredV3Positions = filteredV3Positions.filter(position => {
        // V3 positions are typically on PulseChain (chain 369)
        const positionChain = position.pool?.chain || 369
        if (chainFilter === 'pulsechain') {
          return positionChain === 369
        } else if (chainFilter === 'ethereum') {
          return positionChain === 1
        }
        return true
      })
    }
    
    // Filter out detected V3 positions if there are manual V3 overrides active AND enabled
    // This prevents showing both manual overrides AND detected positions for the same pool type
    if (customV3Values.size > 0) {
      const manualV3PoolTypes = new Set<string>()
      
      // Extract pool types from manual V3 overrides that are both enabled and have values
      customV3Values.forEach((value, symbol) => {
        const isEnabled = enabledCoins.has(symbol)
        const hasValue = parseFloat(value) > 0
        
        if (isEnabled && hasValue) { // Only consider overrides that are enabled AND have actual values
          // Normalize pool type for comparison - handle different token symbol variations
          let poolType = symbol.replace(/\s*\/\s*/g, '/').replace(/\s*\d+(\.\d+)?%.*/, '') // "HEX / CST 1%" -> "HEX/CST"
          
          // Handle token symbol variations (e.g., "eDAI" vs "DAI", "weDAI" vs "DAI")
          poolType = poolType
            .replace(/\be(\w+)\b/g, '$1') // "HEX/eDAI" -> "HEX/DAI"  
            .replace(/\bwe(\w+)\b/g, '$1') // "HEX/weDAI" -> "HEX/DAI"
          
          console.log(`[V3 Override Debug] Manual override pool type: ${symbol} -> ${poolType}`)
          
          manualV3PoolTypes.add(poolType)
          console.log(`[V3 Override] Manual override active and enabled for pool type: ${poolType} (${symbol})`)
        } else if (!isEnabled) {
          console.log(`[V3 Override] Manual override exists but token is disabled: ${symbol}`)
        } else if (!hasValue) {
          console.log(`[V3 Override] Manual override exists but no value set: ${symbol}`)
        }
      })
      
      if (manualV3PoolTypes.size > 0) {
        const originalCount = filteredV3Positions.length
        filteredV3Positions = filteredV3Positions.filter(position => {
          let detectedPoolType = `${position.pool.token0.symbol}/${position.pool.token1.symbol}`
          
          // Normalize detected pool type to match manual override normalization
          // Handle token symbol variations more comprehensively
          detectedPoolType = detectedPoolType
            .replace(/\be(\w+)\b/g, '$1') // "eDAI" -> "DAI"  
            .replace(/\bwe(\w+)\b/g, '$1') // "weDAI" -> "DAI"
          
          console.log(`[V3 Override Debug] Original: ${position.pool.token0.symbol}/${position.pool.token1.symbol}, Normalized: ${detectedPoolType}`)
          
          const shouldHide = manualV3PoolTypes.has(detectedPoolType)
          
          if (shouldHide) {
            console.log(`[V3 Override] Hiding detected position ${position.displayName} #${position.id} because manual override exists for ${detectedPoolType}`)
          }
          
          return !shouldHide
        })
        console.log(`[V3 Override] Filtered detected V3 positions from ${originalCount} to ${filteredV3Positions.length} due to manual overrides`)
      }
    }
    
    const v3PositionsAsLPTokens = filteredV3Positions.map(position => {
      const positionSymbol = `${position.displayName} #${position.id}`
      
      // Find the corresponding raw position data
      const rawPosition = nineMmV3RawPositions.find(raw => raw.id === position.id) // e.g., "HEX / DAI 0.25% #12345" - unique per position
      
      // Check if there's a custom USD value override for this position
      const customValue = customV3Values.get(positionSymbol)
      const effectivePositionValue = customValue ? parseFloat(customValue) : position.values.totalValue
      
      console.log(`[V3 Position] ${positionSymbol}: original=$${position.values.totalValue}, custom=${customValue}, effective=$${effectivePositionValue}`)
      console.log(`[V3 Token Symbols] Position ${position.id}: token0="${position.pool.token0.symbol}", token1="${position.pool.token1.symbol}"`)
      console.log(`[V3 Tick Data] Position ${position.id}: poolTick="${position.pool.tick}" (tickLower/tickUpper from RPC)`)
      
      return {
        symbol: positionSymbol,
      name: `9MM V3 LP`,
      balanceFormatted: 1, // V3 positions don't have traditional "balance"
      address: position.pool.id,
      chain: 369, // PulseChain
      decimals: 18,
      // Custom fields for V3 positions
      isV3Position: true,
      positionId: position.id,
        positionValue: effectivePositionValue, // Use custom value if available
        originalPositionValue: position.values.totalValue, // Keep original for reference
      currentValue: position.values.currentValue,
      feesValue: position.values.feesValue,
      feePercent: position.feePercent,
      token0Symbol: position.pool.token0.symbol,
      token1Symbol: position.pool.token1.symbol,
      // Actual token amounts from V3 position calculation
      token0Amount: position.values.token0Amount,
      token1Amount: position.values.token1Amount,
      // Net amounts (deposits - withdrawals) for display - use values from hook
      netToken0Amount: position.values.netToken0Amount || 0,
      netToken1Amount: position.values.netToken1Amount || 0,
      // Claimed fees data from GraphQL API
      collectedFeesToken0: rawPosition ? rawPosition.collectedFeesToken0 : '0',
      collectedFeesToken1: rawPosition ? rawPosition.collectedFeesToken1 : '0',
      withdrawnToken0: rawPosition ? rawPosition.withdrawnToken0 : '0',
      withdrawnToken1: rawPosition ? rawPosition.withdrawnToken1 : '0',
      // Debug logging for net amounts
      debugNetAmounts: rawPosition ? {
        // Raw API data
        depositedToken0: rawPosition.depositedToken0,
        withdrawnToken0: rawPosition.withdrawnToken0,
        depositedToken1: rawPosition.depositedToken1,
        withdrawnToken1: rawPosition.withdrawnToken1,
        // Hook calculated values
        hookNetToken0: position.values.netToken0Amount,
        hookNetToken1: position.values.netToken1Amount,
        hookToken0Amount: position.values.token0Amount,
        hookToken1Amount: position.values.token1Amount,
        // Manual calculation for comparison
        manualNetToken0: parseFloat(rawPosition.depositedToken0) - parseFloat(rawPosition.withdrawnToken0),
        manualNetToken1: parseFloat(rawPosition.depositedToken1) - parseFloat(rawPosition.withdrawnToken1)
      } : null,
      // V3 position tick data for price ranges
      tickLower: position.tickLower,
      tickUpper: position.tickUpper,
      tick: position.pool.tick, // Current pool tick for price calculation
      // Liquidity from raw position data
      liquidity: rawPosition ? rawPosition.liquidity : "0",
      // Token decimal info for proper price calculation
      token0Decimals: position.pool.token0.decimals,
      token1Decimals: position.pool.token1.decimals,
      // Pool prices from subgraph (already calculated)
      token0Price: position.pool.token0Price,
      token1Price: position.pool.token1Price,
      // Pool data for ownership calculation and tick calculations
      pool: {
        totalValueLockedUSD: position.pool.totalValueLockedUSD,
        volumeUSD: position.pool.volumeUSD,
        liquidity: position.pool.liquidity,
        token0Price: position.pool.token0Price,
        token1Price: position.pool.token1Price,
        feeTier: position.pool.feeTier,
        tick: position.pool.tick
      },
        ownerAddress: position.owner
      }
    })
    
    // Group V3 positions by ticker (e.g., "PLSX / WPLS 1%")
    const groupedV3Positions = v3PositionsAsLPTokens.reduce((groups, position) => {
      // Extract base ticker without position ID (e.g., "PLSX / WPLS 1%" from "PLSX / WPLS 1% #134858")
      const baseTicker = position.symbol.replace(/ #\d+$/, '')
      
      if (!groups[baseTicker]) {
        groups[baseTicker] = {
          baseTicker,
          positions: [],
          totalValue: 0,
          // Use the first position's metadata for the group
          name: position.name,
          chain: position.chain,
          decimals: position.decimals,
          address: position.address,
          isV3Position: true,
          isGroupedV3: true // Flag to identify grouped V3 positions
        }
      }
      
      // Get real tick data from RPC call if available, otherwise use estimates
      const tokenId = position.positionId || position.id // Use positionId or fallback to id
      const realTickData = tickData[tokenId]
      const isTickLoading = tickIsLoading[tokenId]
      const tickError = tickErrors[tokenId]
      
      console.log(`[V3 PRICE DEBUG] Position ${tokenId}:`, {
        hasRealTickData: !!realTickData,
        isTickLoading,
        tickError: tickError?.message || tickError,
        realTickData
      })
      
      let lowerRange: number
      let upperRange: number
      let dataSource: string
      
      if (realTickData && !isTickLoading && !tickError) {
        // Use real tick data from position manager contract and apply decimal correction
        const token0Decimals = parseInt(position.token0Decimals || '18')
        const token1Decimals = parseInt(position.token1Decimals || '18')
        
        // Convert raw tick prices to properly scaled prices
        // For V3: price = (1.0001^tick) * (10^(token1Decimals - token0Decimals))
        // Try multiple approaches to get the right scaling
        const decimalAdjustment = Math.pow(10, token1Decimals - token0Decimals)
        const approach1 = realTickData.lowerPrice * decimalAdjustment
        const approach2 = realTickData.lowerPrice / decimalAdjustment  
        const approach3 = 1 / realTickData.lowerPrice * decimalAdjustment
        const approach4 = 1 / realTickData.lowerPrice / decimalAdjustment
        
        // Use the approach that gives reasonable numbers (200-300 range)
        let lowerTest = approach1
        let upperTest = realTickData.upperPrice * decimalAdjustment
        
        if (lowerTest > 1000000 || lowerTest < 0.00001) {
          lowerTest = approach2
          upperTest = realTickData.upperPrice / decimalAdjustment
        }
        if (lowerTest > 1000000 || lowerTest < 0.00001) {
          lowerTest = approach3
          upperTest = 1 / realTickData.upperPrice * decimalAdjustment
        }
        if (lowerTest > 1000000 || lowerTest < 0.00001) {
          lowerTest = approach4
          upperTest = 1 / realTickData.upperPrice / decimalAdjustment
        }
        
        lowerRange = lowerTest
        upperRange = upperTest
        dataSource = 'RPC_CONTRACT'
        
        console.log(`[V3 PRICE SUCCESS] Position ${tokenId} using RPC data:`, {
          rawLowerPrice: realTickData.lowerPrice,
          rawUpperPrice: realTickData.upperPrice,
          token0Decimals,
          token1Decimals,
          decimalAdjustment,
          approach1,
          approach2, 
          approach3,
          approach4,
          finalLowerRange: lowerRange,
          finalUpperRange: upperRange,
          tickLower: realTickData.tickLower,
          tickUpper: realTickData.tickUpper
        })
      } else {
        // No fallback - only show chart when we have real data
        lowerRange = 0
        upperRange = 0
        dataSource = isTickLoading ? 'LOADING' : (tickError ? 'ERROR' : 'PENDING')
        console.log(`[V3 PRICE PENDING] Position ${tokenId} waiting:`, { dataSource })
      }
      
      const positionWithPrices = {
        ...position,
        rawLowerPrice: lowerRange,
        rawUpperPrice: upperRange,
        // Store data source and real tick values
        tickDataSource: dataSource,
        realTickLower: realTickData?.tickLower || null,
        realTickUpper: realTickData?.tickUpper || null,
        // Also store the original tick values for debugging
        tickLowerOriginal: position.tickLower,
        tickUpperOriginal: position.tickUpper
      }
      
      groups[baseTicker].positions.push(positionWithPrices)
      groups[baseTicker].totalValue += position.positionValue || 0
      
      return groups
    }, {} as Record<string, any>)
    
    // Helper function to convert tick to price
    const tickToPrice = (tick: number): number => {
      return Math.pow(1.0001, tick)
    }
    
    // Helper function to convert tick to price with decimal adjustment for V3 positions
    const tickToPriceWithDecimals = (tick: number, token0Decimals: number, token1Decimals: number): number => {
      const rawPrice = Math.pow(1.0001, tick)
      // Adjust for token decimal differences (token1 per token0)
      const decimalAdjustment = Math.pow(10, token0Decimals - token1Decimals)
      return rawPrice * decimalAdjustment
    }
    
    // Sort positions within each group by price range (lowest to highest)
    Object.values(groupedV3Positions).forEach((group: any) => {
      group.positions.sort((a: any, b: any) => {
        const aLowerPrice = tickToPrice(parseInt(a.tickLower))
        const bLowerPrice = tickToPrice(parseInt(b.tickLower))
        return aLowerPrice - bLowerPrice
      })
    })
    
    // Convert grouped positions to LP tokens format
    const groupedV3TokensAsLPTokens = Object.values(groupedV3Positions).map((group: any) => ({
      symbol: group.baseTicker,
      name: group.name,
      balanceFormatted: group.positions.length, // Show number of positions instead of balance
      address: group.address,
      chain: group.chain,
      decimals: group.decimals,
      isV3Position: group.isV3Position,
      isGroupedV3: group.isGroupedV3,
      positionValue: group.totalValue,
      positions: group.positions, // Store individual positions for dropdown
      // For compatibility with existing code
      currentValue: group.totalValue,
      feesValue: 0,
      originalPositionValue: group.totalValue
    }))
    
    // Only use grouped V3 positions if both toggles are enabled
    const finalV3Tokens = (showLiquidityPositions && includeLiquidityPositionsFilter) ? groupedV3TokensAsLPTokens : []
    const allLpTokens = [...lpTokensFromBalances, ...manualLPTokens, ...finalV3Tokens]
    
    // Apply V3 position filter
    const filteredLpTokens = allLpTokens.map(token => {
      // Only filter V3 positions, let other LP tokens through (except for 'closed' filter)
      if (!token.isV3Position) {
        // For 'closed' filter, only show V3 positions, exclude all other LP tokens
        if (v3PositionFilter === 'closed') return null
        return token
      }
      
      // For V3 positions, filter the individual positions within each group
      if (token.positions && Array.isArray(token.positions)) {
        const filteredPositions = token.positions.filter((position: any) => {
          const positionValue = position.positionValue || 0
          const netToken0Amount = position.netToken0Amount || 0
          const netToken1Amount = position.netToken1Amount || 0
          const liquidity = position.liquidity || "0"
          const isLiquidityZero = liquidity === "0" || liquidity === 0 || parseFloat(liquidity) === 0
          const isClosed = positionValue < 1 || isLiquidityZero || (Math.abs(netToken0Amount) < 0.000001 && Math.abs(netToken1Amount) < 0.000001 && positionValue < 10)
          
          switch (v3PositionFilter) {
            case 'active':
              return !isClosed
            case 'closed':
              return isClosed
            case 'all':
            default:
              return true
          }
        })
        
        // If no positions remain after filtering, exclude this token entirely
        if (filteredPositions.length === 0) return null
        
        // Update the token with filtered positions and recalculate total value
        const newTotalValue = filteredPositions.reduce((sum: number, pos: any) => sum + (pos.positionValue || 0), 0)
        
        return {
          ...token,
          positions: filteredPositions,
          positionValue: newTotalValue,
          currentValue: newTotalValue,
          originalPositionValue: newTotalValue
        }
      }
      
      // Fallback for individual V3 positions (not grouped)
      const positionValue = token.positionValue || 0
      const netToken0Amount = token.netToken0Amount || 0
      const netToken1Amount = token.netToken1Amount || 0
      const liquidity = token.liquidity || "0"
      const isLiquidityZero = liquidity === "0" || liquidity === 0 || parseFloat(liquidity) === 0
      const isClosed = positionValue < 1 || isLiquidityZero || (Math.abs(netToken0Amount) < 0.000001 && Math.abs(netToken1Amount) < 0.000001 && positionValue < 10)
      
      switch (v3PositionFilter) {
        case 'active':
          return !isClosed ? token : null
        case 'closed':
          return isClosed ? token : null
        case 'all':
        default:
          return token
      }
    }).filter(Boolean) // Remove null entries
    
    // Sort by USD value (highest first)
    return [...filteredLpTokens].sort((a, b) => {
      // For V3 positions, use the positionValue directly
      const aValue = a.isV3Position ? a.positionValue : (a.balanceFormatted * (getLPTokenPrice(a.symbol) || 0))
      const bValue = b.isV3Position ? b.positionValue : (b.balanceFormatted * (getLPTokenPrice(b.symbol) || 0))
      
      
      return bValue - aValue // Higher value first
    })
  }, [
    mainTokensWithBalances.map(t => `${t.symbol}-${t.balanceFormatted?.toFixed(6) || '0'}`).join('|'),
    lpTokenPrices,
    showLiquidityPositions,
    nineMmV3Positions,
    primaryAddress,
    selectedAddressIds,
    effectiveAddresses,
    customV3Values,
    v3PositionFilter,
    chainFilter
  ])

  // Memoized Farm tokens with balances
  const farmTokensWithBalances = useMemo(() => {
    // Return empty array if liquidity positions are disabled
    if (!showLiquidityPositions) return []
    
    // Get farm tokens from actual balances
    const farmTokensFromBalances = mainTokensWithBalances.filter(token => {
      const tokenConfig = [...TOKEN_CONSTANTS, ...MORE_COINS].find(t => t.ticker === token.symbol)
      
      // Apply chain filter
      if (chainFilter !== 'both' && 
          ((chainFilter === 'pulsechain' && token.chain !== 369) ||
           (chainFilter === 'ethereum' && token.chain !== 1))) {
        return false
      }
      
      // In manual mode, only show farm tokens that are enabled
      if (coinDetectionMode === 'manual') {
        const currentEnabled = pendingEnabledCoins || enabledCoins
        if (!currentEnabled.has(token.symbol)) {
          return false
        }
      }
      
      return tokenConfig?.type === 'farm'
    })
    
    // Add manual override farm tokens (even if user doesn't own them)
    // But skip them if address filtering is active (since they're not associated with any specific address)
    const allTokens = [...TOKEN_CONSTANTS, ...MORE_COINS, ...(customTokens || [])]
    const manualFarmTokens = selectedAddressIds.length > 0 ? [] : allTokens.filter(tokenConfig => {
      // Apply chain filter
      if (chainFilter !== 'both' && 
          ((chainFilter === 'pulsechain' && tokenConfig.chain !== 369) ||
           (chainFilter === 'ethereum' && tokenConfig.chain !== 1))) {
        return false
      }
      
      return tokenConfig.type === 'farm' && 
             (coinDetectionMode === 'manual' ? (pendingEnabledCoins || enabledCoins).has(tokenConfig.ticker) : false) &&
             !farmTokensFromBalances.some(existing => existing.symbol === tokenConfig.ticker)
    }).map(tokenConfig => ({
      symbol: tokenConfig.ticker,
      name: tokenConfig.name || tokenConfig.ticker,
      balanceFormatted: 1000, // Default manual balance
      address: tokenConfig.a,
      chain: tokenConfig.chain,
      decimals: tokenConfig.decimals || 18
    }))
    
    console.log(`[Farm Debug] Manual farm tokens: ${selectedAddressIds.length > 0 ? 'filtered out due to address selection' : `${manualFarmTokens.length} tokens`}`)
    
    // Add farm tokens with custom balances that might not be in mainTokensWithBalances
    // But skip them if address filtering is active (since they're not associated with any specific address)
    const farmTokensWithCustomBalances = selectedAddressIds.length > 0 ? [] : allTokens
      .filter(tokenConfig => {
        // Apply chain filter
        if (chainFilter !== 'both' && 
            ((chainFilter === 'pulsechain' && tokenConfig.chain !== 369) ||
             (chainFilter === 'ethereum' && tokenConfig.chain !== 1))) {
          return false
        }
        
        return tokenConfig.type === 'farm' && customBalances.has(tokenConfig.ticker)
      })
      .map(tokenConfig => {
        const customBalance = parseFloat(customBalances.get(tokenConfig.ticker) || '0')
        if (customBalance <= 0) return null // Skip if custom balance is 0 or negative
        
        // Check if this farm token is already in the list from mainTokensWithBalances
        const existingToken = [...farmTokensFromBalances, ...manualFarmTokens].find(t => t.symbol === tokenConfig.ticker)
        if (existingToken) return null // Skip if already included
        
        // Create a farm token entry with custom balance
        return {
          symbol: tokenConfig.ticker,
          balanceFormatted: customBalance,
          chain: tokenConfig.chain || 369, // Default to PulseChain
          displaySymbol: tokenConfig.ticker,
          address: tokenConfig.a
        }
      })
      .filter(token => token !== null) // Remove null entries
    
    // Combine all lists
    const allFarmTokens = [...farmTokensFromBalances, ...manualFarmTokens, ...farmTokensWithCustomBalances]
    
    // Sort by USD value (highest first)
    return allFarmTokens.sort((a, b) => {
      const aPrice = getLPTokenPrice(a.symbol) || 0
      const bPrice = getLPTokenPrice(b.symbol) || 0
      const aValue = a.balanceFormatted * aPrice
      const bValue = b.balanceFormatted * bPrice
      
      return bValue - aValue // Higher value first
    })
  }, [
    mainTokensWithBalances.map(t => `${t.symbol}-${t.balanceFormatted?.toFixed(6) || '0'}`).join('|'),
    lpTokenPrices,
    Array.from(customBalances.entries()).map(([symbol, balance]) => `${symbol}:${balance}`).join('|'),
    showLiquidityPositions,
    chainFilter,
    coinDetectionMode,
    enabledCoins,
    pendingEnabledCoins
  ])

  // Extract underlying token tickers from LP pairs for price fetching
  const lpUnderlyingTickers = useMemo(() => {
    const underlyingTokens: string[] = []
    if (showLiquidityPositions && lpTokensWithBalances) {
      lpTokensWithBalances.forEach(lpToken => {
        const lpTokenConfig = TOKEN_CONSTANTS.find(t => t.ticker === lpToken.symbol)
        if (lpTokenConfig?.ticker) {
          // Parse LP ticker to extract underlying token symbols
          const tickerMatch = lpTokenConfig.ticker.match(/([A-Za-z0-9]+)\s*\\?\s*[\/\-]\s*([A-Za-z0-9]+)/)
          if (tickerMatch) {
            underlyingTokens.push(tickerMatch[1]) // token0 (e.g. pUSDC)
            underlyingTokens.push(tickerMatch[2]) // token1 (e.g. WPLS)
            console.log(`[Price Fetch] Adding LP underlying tokens from ${lpToken.symbol}: ${tickerMatch[1]}, ${tickerMatch[2]}`)
          }
        }
      })
    }
    return [...new Set(underlyingTokens)] // Remove duplicates
  }, [showLiquidityPositions, lpTokensWithBalances])

  // Fetch prices for LP underlying tokens
  const { prices: lpUnderlyingPrices, isLoading: lpUnderlyingPricesLoading } = useTokenPrices(lpUnderlyingTickers)
  
  // Update the state when LP underlying prices change
  useEffect(() => {
    if (lpUnderlyingPrices) {
      setLpUnderlyingPricesState(lpUnderlyingPrices)
    }
  }, [lpUnderlyingPrices])

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
    // Handle invalid numbers
    if (isNaN(dollarAmount) || dollarAmount === null || dollarAmount === undefined) {
      return '0.00'
    }
    
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

  // Format LP token prices (per share) - show more precision for small values
  const formatLPTokenPrice = (price: number): string => {
    if (isNaN(price) || price === null || price === undefined || price === 0) {
      return '0.00'
    }
    
    // For LP token prices, show more precision for small values
    if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })  // $1,234.56
    if (price >= 1) return price.toFixed(2)           // $1.23
    if (price >= 0.01) return price.toFixed(4)        // $0.1234
    if (price >= 0.0001) return price.toFixed(6)      // $0.001234
    if (price >= 0.00000001) return price.toFixed(8)  // $0.00001234 (down to e-8)
    return price.toExponential(2)                     // 1.23e-9 (only for e-9 and smaller)
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
    // Handle invalid numbers
    if (isNaN(dollarAmount) || dollarAmount === null || dollarAmount === undefined) {
      return '0.00'
    }
    
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

  // Helper function to format price appropriately
  const formatPrice = (price: number): string => {
    if (price === 0) return '$0.00'
    
    // For very small prices (smaller than 0.000001), use scientific notation
    if (price > 0 && price < 0.000001) {
      return `$${price.toExponential(2)}`
    }
    
    // For large prices (≥ 10,000), use comma formatting
    if (price >= 10000) {
      return `$${Math.round(price).toLocaleString()}`
    }
    
    // For moderate prices (1 to 9,999), use regular decimal formatting
    if (price >= 1) {
      return `$${price.toFixed(2)}`
    }
    
    // For small prices between 0.000001 and 1, show more decimals
    if (price < 0.01) {
      return `$${price.toFixed(6)}`
    } else {
      // For prices between 0.01 and 1, show 4 decimal places
      return `$${price.toFixed(4)}`
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

  // Copy transaction hash to clipboard
  const copyTransactionHash = useCallback(async (hash: string) => {
    try {
      await navigator.clipboard.writeText(hash)
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
      console.error('Failed to copy transaction hash:', err)
    }
  }, [])

  // Toggle between percentage and dollar amount for 24h change
  const toggle24hChangeDisplay = useCallback(() => {
    const newShowDollarChange = !showDollarChange
    setShowDollarChange(newShowDollarChange)
  }, [showDollarChange])



  // Helper function to format 24h change (percentage or dollar)
  const format24hChange = useCallback((percentChange: number | undefined, dollarChange: number, showDollar: boolean = showDollarChange) => {
    if (showDollar) {
      // Handle invalid dollar changes
      if (isNaN(dollarChange) || dollarChange === null || dollarChange === undefined) {
        return '+$0'
      }
      if (dollarChange === 0) return '+$0'
      const absChange = Math.abs(dollarChange)
      
      // For very small dust amounts, just show +$0
      if (absChange > 0 && absChange < 0.01) {
        return '+$0'
      }
      
      // Use big number formatting for dollar changes
      const formatDollarChange = (amount: number): string => {
        if (amount >= 1000000000) {
          return `${(amount / 1000000000).toFixed(1)}B`
        } else if (amount >= 1000000) {
          return `${(amount / 1000000).toFixed(1)}M`
        } else if (amount >= 100000) {
          return `${(amount / 1000).toFixed(0)}k`
        } else if (amount >= 10000) {
          return amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
        } else if (amount >= 10) {
          return amount.toFixed(0)
        } else {
          return amount.toFixed(2)
        }
      }
      
      return `${dollarChange >= 0 ? '+' : '-'}$${formatDollarChange(absChange)}`
    } else {
      // Handle invalid percentage changes
      if (percentChange === undefined || isNaN(percentChange) || percentChange === null) return '0%'
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
    const usdValue = token.balanceFormatted ? token.balanceFormatted * tokenPrice : 0
    const displayAmount = (() => {
      const currentBalance = getCurrentBalance(token.symbol)
      if (currentBalance === null) return '?'
      
      // Check if this is a custom balance - if so, show exact number with commas
      if (customBalances.has(token.symbol)) {
        const customValue = parseFloat(customBalances.get(token.symbol) || '0')
        console.log(`[Display Amount] ${token.symbol}: stored="${customBalances.get(token.symbol)}" -> display="${customValue.toLocaleString('en-US')}"`)
        return customValue.toLocaleString('en-US')
      }
      
      // Otherwise use normal formatting
      return formatBalance(currentBalance)
    })()
    
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
    }, [
      token.symbol, 
      token.balanceFormatted, 
      // Only depend on specific paired token balances, not entire array
      token.symbol.startsWith('e') ? mainTokensWithBalances.find(t => t.symbol === token.symbol.replace('e', 'we'))?.balanceFormatted : 0,
      token.symbol.startsWith('we') ? mainTokensWithBalances.find(t => t.symbol === token.symbol.replace('we', 'e'))?.balanceFormatted : 0
    ])
    
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
      userTShares: leagueInfo.userTShares > 0 ? leagueInfo.userTShares : undefined,
      preloadedPrices: prices?.[token.symbol] ? { [token.symbol]: prices[token.symbol] } : undefined
    }), [
      token.symbol, 
      leagueSupply, 
      finalSupply, 
      leagueSupplyDeduction, 
      combinedBalance, 
      leagueInfo.userTShares, 
      prices?.[token.symbol]?.price,
      prices?.[token.symbol]?.priceChange
    ])

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
              customImageUrl={customTokens.find(t => t.ticker === token.symbol)?.logoUrl}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white font-medium text-sm md:text-md break-words">
              {getDisplayTicker(token.symbol)}
            </div>
            <div className="text-gray-400 text-[10px] break-words leading-tight">
              <span className="sm:hidden">{displayAmount}</span>
              <span className="hidden sm:block">{(() => {
                // Look for token in all sources: TOKEN_CONSTANTS, MORE_COINS, and custom tokens
                const allTokens = [...TOKEN_CONSTANTS, ...MORE_COINS, ...customTokens]
                const tokenConfig = allTokens.find(t => t.ticker === token.symbol)
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
          {/* Price Multiple for uPLS/vPLS */}
          {(token.symbol === 'uPLS' || token.symbol === 'vPLS') && tokenPrice > 0 && (() => {
            const plsPrice = getTokenPrice('PLS')
            if (plsPrice > 0) {
              const multiple = tokenPrice / plsPrice
              return (
                <div className="text-gray-500 text-[10px] mt-0.5">
                  {multiple.toFixed(2)}X
                </div>
              )
            }
            return null
          })()}
        </div>

        {/* 24h Price Change Column */}
        <div className="text-center">
          <button 
            onClick={toggle24hChangeDisplay}
            className={`text-[10px] md:text-xs font-bold cursor-pointer hover:opacity-80 transition-opacity ${
              tokenPrice === 0
                ? 'text-gray-400'
                : showDollarChange
                ? (Math.abs(dollarChange24h) < 10 || dollarChange24h === 0)
                  ? 'text-gray-400'
                  : dollarChange24h >= 10
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
                <LeagueTable 
                    tokenTicker={stableDialogProps.tokenTicker} 
                  containerStyle={false}
                  showLeagueNames={true}
                    preloadedSupply={stableDialogProps.preloadedSupply}
                  preloadedPrices={stableDialogProps.preloadedPrices}
                    supplyDeduction={stableDialogProps.supplyDeduction}
                    userBalance={stableDialogProps.userBalance}
                    userTShares={stableDialogProps.userTShares}
                />
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
            let chartAddress = token.address || token.contractAddress
            let copyAddress = token.address || token.contractAddress
            let chartChain = 'pulsechain' // Default to pulsechain
            
            // Set chain based on token chain info
            if (token.chain === 1) {
              chartChain = 'ethereum'
            }
            
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
    if (!addressesToSort.length) return []
    
    // Get address values for secondary sorting - use ALL balances, not filtered ones
    // This ensures stable sorting regardless of current filter state
    const addressValueMap = new Map<string, number>()
    if (balances && Array.isArray(balances)) {
      balances.forEach(addressData => {
        let addressValue = 0
        
        // Add native token value
        if (addressData.nativeBalance) {
        const nativePrice = getTokenPrice(addressData.nativeBalance.symbol)
        const nativeValue = addressData.nativeBalance.balanceFormatted * nativePrice
        addressValue += nativeValue
        }
        
        // Add token values
        addressData.tokenBalances?.forEach(token => {
          const tokenPrice = getTokenPrice(token.symbol)
          const tokenValue = token.balanceFormatted * tokenPrice
          addressValue += tokenValue
        })
        
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
        if (addressData.nativeBalance) {
          // In manual mode, exclude native tokens that are not enabled
          if (coinDetectionMode === 'manual') {
            const currentEnabledCoins = pendingEnabledCoins || enabledCoins
            if (!currentEnabledCoins.has(addressData.nativeBalance.symbol)) {
            } else {
        const nativePrice = getTokenPrice(addressData.nativeBalance.symbol)
        addressValue += addressData.nativeBalance.balanceFormatted * nativePrice
            }
          } else {
            // In auto-detect mode, include native balance if it has actual balance
            const nativePrice = getTokenPrice(addressData.nativeBalance.symbol)
            addressValue += addressData.nativeBalance.balanceFormatted * nativePrice
          }
        }
        
        // Add token values, but exclude pooled tokens if they're included as stakes to avoid double counting
        addressData.tokenBalances?.forEach(token => {
          // In auto-detect mode, exclude manually toggled tokens that don't have real balances
          if (coinDetectionMode === 'auto-detect' && token.isPlaceholder) {
            return
          }
          
          // In manual mode, exclude tokens that are not enabled
          if (coinDetectionMode === 'manual') {
            const currentEnabledCoins = pendingEnabledCoins || enabledCoins
            if (!currentEnabledCoins.has(token.symbol)) {
              return
            }
          }
          
          const tokenPrice = getTokenPrice(token.symbol)
          const tokenValue = token.balanceFormatted * tokenPrice
          

          
          // If pooled stakes are enabled and this is a pooled token, don't count it as liquid
          if (includePooledStakes && POOLED_STAKE_TOKENS.includes(token.symbol)) {
            // Skip adding this token value as it will be counted as a stake instead
            return
          }
          
          // If liquidity positions are enabled, check if this token is an LP token to avoid double counting
          if (showLiquidityPositions && includeLiquidityPositionsFilter && getPhuxLPTokenPrice && token.contract_address && getPhuxLPTokenPrice(token.contract_address)) {
            // Skip adding this token value as it will be counted as an LP position instead
            return
          }
          
          addressValue += tokenValue
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

    // Add validator value if enabled AND filter is on (but not in detective mode)
    if (!detectiveMode && showValidators && includeValidatorsFilter && validatorCount > 0 && chainFilter !== 'ethereum') {
      const validatorPLS = validatorCount * 32_000_000 // 32 million PLS per validator
      const plsPrice = getTokenPrice('PLS')
      const validatorValue = validatorPLS * plsPrice
      totalValue += validatorValue
    }

    // Add HEX stakes value if enabled (ONLY ACTIVE STAKES)
    if (showHexStakes && hexStakes) {
      // Filter active native stakes by chain and selected addresses
      const activeNativeStakes = hexStakes.filter(stake => {
        // Filter by status
        if (stake.status !== 'active') return false
        
        // Filter by chain
        const chainMatch = detectiveMode 
          ? stake.chain === 'PLS'
          : (chainFilter === 'both' || 
             (chainFilter === 'ethereum' && stake.chain === 'ETH') ||
             (chainFilter === 'pulsechain' && stake.chain !== 'ETH'))
        if (!chainMatch) return false

        // Filter by selected addresses
        if (selectedAddressIds.length > 0) {
          const addressMatch = selectedAddressIds.some(id => 
            effectiveAddresses.find(addr => 
              addr.id === id && addr.address.toLowerCase() === stake.address.toLowerCase()
            )
          )
          if (!addressMatch) return false
        }

        // Filter out removed addresses
        const addressObj = effectiveAddresses.find(addr => addr.address.toLowerCase() === stake.address.toLowerCase())
        if (addressObj && removedAddressIds.has(addressObj.id)) return false

        return true
      })

      const nativeHexStakesValue = activeNativeStakes.reduce((total, stake) => {
        let stakeHex;
        if (useEESValue) {
          // Use EES calculation with Time-Shift date if enabled, otherwise today's date
          const dateToUse = useTimeShift ? timeShiftDateString : undefined;
          stakeHex = calculateEESValue(stake, dateToUse)
        } else if (useTimeShift) {
          // Use Time-Shift calculation for projected future yield
          const projectedDetails = calculateEESDetailsWithDate(stake);
          stakeHex = stake.principleHex + projectedDetails.payout;
        } else {
          // Use regular calculation (principle + yield)
          stakeHex = stake.principleHex + stake.yieldHex
        }
        // Use eHEX price for Ethereum stakes, HEX price for PulseChain stakes
        const hexPrice = stake.chain === 'ETH' ? getTokenPrice('eHEX') : getTokenPrice('HEX')
        return total + (stakeHex * hexPrice)
      }, 0)
      totalValue += nativeHexStakesValue

      // Add HSI stakes value only if toggle is enabled
      if (includePooledStakes && hsiStakes) {
        const activeHsiStakes = hsiStakes.filter(stake => {
          // Filter by status
          if (stake.status !== 'active') return false
          
          // Filter by chain
          const chainMatch = detectiveMode 
            ? stake.chain === 'PLS'
            : (chainFilter === 'both' || 
               (chainFilter === 'ethereum' && stake.chain === 'ETH') ||
               (chainFilter === 'pulsechain' && stake.chain !== 'ETH'))
          if (!chainMatch) return false

          // Filter by selected addresses
          if (selectedAddressIds.length > 0) {
            const addressMatch = selectedAddressIds.some(id => 
              effectiveAddresses.find(addr => 
                addr.id === id && addr.address.toLowerCase() === stake.address.toLowerCase()
              )
            )
            if (!addressMatch) return false
          }

          // Filter out removed addresses
          const addressObj = effectiveAddresses.find(addr => addr.address.toLowerCase() === stake.address.toLowerCase())
          if (addressObj && removedAddressIds.has(addressObj.id)) return false

          return true
        })

        const hsiStakesValue = activeHsiStakes.reduce((total, stake) => {
          let stakeHex;
          if (useEESValue) {
            // Use EES calculation for HSI stakes as well
            const totalHexValue = stake.totalHex !== undefined ? stake.totalHex : (stake.principleHex + stake.yieldHex)
            // For HSI stakes, we need to adapt the EES calculation
            const adaptedStake = {
              principleHex: stake.principleHex,
              yieldHex: stake.yieldHex,
              progress: stake.progress,
              tShares: stake.tShares,
              startDate: stake.startDate,
              endDate: stake.endDate,
              status: stake.status,
              chain: stake.chain
            }
            stakeHex = calculateEESValueWithDate(adaptedStake)
          } else if (useTimeShift) {
            // Use Time-Shift calculation for projected future yield
            const adaptedStake = {
              principleHex: stake.principleHex,
              yieldHex: stake.yieldHex,
              progress: stake.progress,
              tShares: stake.tShares,
              startDate: stake.startDate,
              endDate: stake.endDate,
              status: stake.status,
              chain: stake.chain
            }
            const projectedDetails = calculateEESDetailsWithDate(adaptedStake);
            stakeHex = stake.principleHex + projectedDetails.payout;
          } else {
            stakeHex = stake.totalHex !== undefined ? stake.totalHex : (stake.principleHex + stake.yieldHex)
          }
          const hexPrice = stake.chain === 'ETH' ? getTokenPrice('eHEX') : getTokenPrice('HEX')
          return total + (stakeHex * hexPrice)
        }, 0)
        totalValue += hsiStakesValue
      }

      // Add pooled stakes value if toggle is enabled
      if (includePooledStakes) {
        totalValue += pooledStakesData.totalValue
      }

      // Add to address values array for each address with HEX stakes
      const addressStakeValues = new Map<string, number>()
      activeNativeStakes.forEach(stake => {
        let stakeHex;
        if (useEESValue && stake.status === 'active') {
          stakeHex = calculateEESValueWithDate(stake)
        } else if (useTimeShift) {
          // Use Time-Shift calculation for projected future yield
          const projectedDetails = calculateEESDetailsWithDate(stake);
          stakeHex = stake.principleHex + projectedDetails.payout;
        } else {
          stakeHex = stake.principleHex + stake.yieldHex
        }
        const hexPrice = stake.chain === 'ETH' ? getTokenPrice('eHEX') : getTokenPrice('HEX')
        const stakeValue = stakeHex * hexPrice
        const currentValue = addressStakeValues.get(stake.address) || 0
        addressStakeValues.set(stake.address, currentValue + stakeValue)
      })

      // Update or add to addressVals
      addressStakeValues.forEach((stakeValue, address) => {
        const existingIndex = addressVals.findIndex(av => av.address === address)
        if (existingIndex >= 0) {
          addressVals[existingIndex].value += stakeValue
        } else {
          addressVals.push({
            address,
            label: effectiveAddresses.find(a => a.address === address)?.label || '',
            value: stakeValue
          })
        }
      })
    }

    // Add LP token values if liquidity positions are enabled AND filter is on
    if (showLiquidityPositions && includeLiquidityPositionsFilter && lpTokensWithBalances) {
      // Apply the same filtering logic as the UI, then sum the usdValue
      lpTokensWithBalances.forEach(lpToken => {
        // Apply the same V3 position filter logic as the UI
        if (lpToken.isV3Position) {
          // For V3 positions, apply the same filtering logic as the UI
          if (lpToken.positions && Array.isArray(lpToken.positions)) {
            // Filter positions based on v3PositionFilter
            const filteredPositions = lpToken.positions.filter((position: any) => {
              const positionValue = position.positionValue || 0
              const netToken0Amount = position.netToken0Amount || 0
              const netToken1Amount = position.netToken1Amount || 0
              const liquidity = position.liquidity || "0"
              const isLiquidityZero = liquidity === "0" || liquidity === 0 || parseFloat(liquidity) === 0
              const isClosed = positionValue < 1 || isLiquidityZero || (Math.abs(netToken0Amount) < 0.000001 && Math.abs(netToken1Amount) < 0.000001 && positionValue < 10)
              
              switch (v3PositionFilter) {
                case 'active':
                  return !isClosed
                case 'closed':
                  return isClosed
                case 'all':
                default:
                  return true
              }
            })
            
            // If no positions remain after filtering, skip this token entirely
            if (filteredPositions.length === 0) {
              return
            }
          } else {
            // For individual V3 positions (not grouped), apply the same filter logic
            const positionValue = lpToken.positionValue || 0
            const netToken0Amount = lpToken.netToken0Amount || 0
            const netToken1Amount = lpToken.netToken1Amount || 0
            const liquidity = lpToken.liquidity || "0"
            const isLiquidityZero = liquidity === "0" || liquidity === 0 || parseFloat(liquidity) === 0
            const isClosed = positionValue < 1 || isLiquidityZero || (Math.abs(netToken0Amount) < 0.000001 && Math.abs(netToken1Amount) < 0.000001 && positionValue < 10)
            
            switch (v3PositionFilter) {
              case 'active':
                if (isClosed) {
                  return
                }
                break
              case 'closed':
                if (!isClosed) {
                  return
                }
                break
              case 'all':
              default:
                // Include all positions
                break
            }
          }
        } else {
          // For non-V3 LP tokens, only include them if the filter is 'all'
          if (v3PositionFilter !== 'all') {
            return
          }
        }
        // Calculate the same usdValue that's displayed in the UI
        let usdValue = 0
        
        if (lpToken.isV3Position) {
          // For V3 positions, use positionValue (same as displayed in UI)
          usdValue = lpToken.positionValue || 0
          } else {
          // For regular LP tokens, use balanceFormatted * tokenPrice
          const tokenPrice = getLPTokenPrice(lpToken.symbol) || 0
          usdValue = lpToken.balanceFormatted ? lpToken.balanceFormatted * tokenPrice : 0
        }
        
        // If filter is 'closed', don't contribute to total value (force to 0)
        if (v3PositionFilter === 'closed') {
          usdValue = 0
        }
        
        totalValue += usdValue
        
        // Add to address values array
        const addressData = filteredBalances.find(balance => 
          balance.tokenBalances?.some(token => token.symbol === lpToken.symbol)
        )
        
        if (addressData) {
          const existingIndex = addressVals.findIndex(av => av.address === addressData.address)
          if (existingIndex >= 0) {
            addressVals[existingIndex].value += usdValue
          } else {
            addressVals.push({
              address: addressData.address,
              label: effectiveAddresses.find(a => a.address === addressData.address)?.label || '',
              value: usdValue
            })
          }
        }
      })
    }

    // Add PHUX LP positions value (farms are always included when LP filter is active)
    if (showLiquidityPositions && includeLiquidityPositionsFilter && phuxTotalLPValue > 0) {
      totalValue += phuxTotalLPValue
    }

    // Add farm tokens value (farms are always included when LP filter is active)
    if (showLiquidityPositions && includeLiquidityPositionsFilter) {
      let farmTokensValue = 0
      
      // Calculate farm tokens value from farmTokensWithBalances (the same data used in UI)
      farmTokensWithBalances.forEach(farmToken => {
        const tokenPrice = getLPTokenPrice(farmToken.symbol) || 0
        const valueUSD = farmToken.balanceFormatted ? farmToken.balanceFormatted * tokenPrice : 0
        farmTokensValue += valueUSD
      })
      
      // Also calculate farm tokens value using the farm token mapping from allHoldingsFlat
      allHoldingsFlat.forEach(holding => {
        if (holding.symbol && holding.symbol.includes('(f)')) {
          const correspondingLPTicker = farmToLPMapping[holding.symbol]
          if (correspondingLPTicker) {
            // Get the LP token price
            const allTokens = [...TOKEN_CONSTANTS, ...MORE_COINS, ...displayCustomTokens]
            const lpTokenConfig = allTokens.find(token => token.ticker === correspondingLPTicker)
            if (lpTokenConfig) {
              const lpPrice = getLPTokenPrice(lpTokenConfig.a)
              if (lpPrice && lpPrice > 0) {
                const shares = holding.balanceFormatted || parseFloat(holding.balance) || 0
                const valueUSD = shares * lpPrice
                farmTokensValue += valueUSD
              }
            }
          }
        }
      })
      
      if (farmTokensValue > 0) {
        totalValue += farmTokensValue
      }
    }
      
      // Add PHUX LP positions to address values
      // Note: PHUX positions are mapped by pool address, we need to find which user address holds them
      phuxLPPositions.forEach(position => {
        // Find which user address holds this LP token
        const addressData = filteredBalances.find(balance => 
          balance.tokenBalances?.some(token => 
            position.poolAddress && token.address && token.address.toLowerCase() === position.poolAddress.toLowerCase()
          )
        )
        
        if (addressData && position.valueUSD > 0) {
          // Check if this address already has a value entry
          const existingIndex = addressVals.findIndex(entry => entry.address === addressData.address)
          if (existingIndex !== -1) {
            addressVals[existingIndex].value += position.valueUSD
          } else {
            addressVals.push({
              address: addressData.address,
              label: effectiveAddresses.find(a => a.address === addressData.address)?.label || '',
              value: position.valueUSD
            })
          }
        }
      })

    return { totalUsdValue: totalValue, addressValues: addressVals }
  }, [filteredBalances, prices, addresses, getTokenPrice, showValidators, validatorCount, showLiquidBalances, showHexStakes, hexStakes, hsiStakes, includePooledStakes, pooledStakesData.totalValue, detectiveMode, chainFilter, selectedAddressIds, effectiveAddresses, removedAddressIds, timeShiftDate, useTimeShift, timeShiftDateString, useEESValue, calculateEESDetailsWithDate, calculateEESValueWithDate, showLiquidityPositions, lpTokensWithBalances, getLPTokenPrice, phuxLPPositions, phuxTotalLPValue, includeLiquidityPositionsFilter, v3PositionFilter, coinDetectionMode, enabledCoins, pendingEnabledCoins])

  // Calculate 24h portfolio change percentage using weighted average
  const portfolio24hChange = useMemo(() => {
    if (!prices) {
      return 0
    }

    let totalValue = 0
    let weightedPriceChange = 0

    // Calculate weighted average for each token (only if liquid balances are included)
    if (showLiquidBalances && filteredBalances && Array.isArray(filteredBalances)) {
    filteredBalances.forEach(addressData => {
      // Native token (PLS/ETH)
      if (addressData.nativeBalance) {
        // In manual mode, exclude native tokens that are not enabled
        if (coinDetectionMode === 'manual') {
          const currentEnabledCoins = pendingEnabledCoins || enabledCoins
          if (!currentEnabledCoins.has(addressData.nativeBalance.symbol)) {
            // Skip disabled native token
            return
          }
        }
        
      const nativeSymbol = addressData.nativeBalance.symbol
      const nativeBalance = addressData.nativeBalance.balanceFormatted
      const nativePriceData = prices[nativeSymbol]
      const nativeCurrentPrice = nativePriceData?.price || 0
      const native24hChange = nativePriceData?.priceChange?.h24 || 0
      
      const nativeValue = nativeBalance * nativeCurrentPrice
      totalValue += nativeValue
      weightedPriceChange += native24hChange * nativeValue
      }

      // Token balances - exclude pooled tokens if they're included as stakes
      addressData.tokenBalances?.forEach(token => {
        // In auto-detect mode, exclude manually toggled tokens that don't have real balances
        if (coinDetectionMode === 'auto-detect' && token.isPlaceholder) {
          return
        }
        
        // In manual mode, exclude tokens that are not enabled
        if (coinDetectionMode === 'manual') {
          const currentEnabledCoins = pendingEnabledCoins || enabledCoins
          if (!currentEnabledCoins.has(token.symbol)) {
            return
          }
        }
        
        const tokenBalance = token.balanceFormatted
        let tokenCurrentPrice = 0
        let tokenPrevPrice = 0

        // If pooled stakes are enabled and this is a pooled token, don't count it as liquid
        if (includePooledStakes && POOLED_STAKE_TOKENS.includes(token.symbol)) {
          // Skip this token as it will be counted as a stake instead
          return
        }

        // Get current and previous prices
        tokenCurrentPrice = getTokenPrice(token.symbol)
        
        let token24hChange = 0
        
        // For backing price tokens, use HEX/eHEX price change
        if (useBackingPrice && shouldUseBackingPrice(token.symbol)) {
          // Use eHEX for e/we tokens, HEX for regular tokens
          const hexSymbol = (token.symbol.startsWith('e') || token.symbol.startsWith('we')) ? 'eHEX' : 'HEX'
          const hexPriceData = prices[hexSymbol]
          token24hChange = hexPriceData?.priceChange?.h24 || 0
        } else if (isStablecoin(token.symbol)) {
          // Stablecoins don't change
          token24hChange = 0
        } else {
          // Regular market price 24h change
          const tokenPriceData = prices[token.symbol]
          token24hChange = tokenPriceData?.priceChange?.h24 || 0
        }

        const tokenValue = tokenBalance * tokenCurrentPrice
        totalValue += tokenValue
        weightedPriceChange += token24hChange * tokenValue
      })
    })
    }

    // Add validator value if enabled AND filter is on (but not in detective mode)
    if (!detectiveMode && showValidators && includeValidatorsFilter && validatorCount > 0 && chainFilter !== 'ethereum') {
      const validatorPLS = validatorCount * 32_000_000 // 32 million PLS per validator
      const plsPriceData = prices['PLS']
      const plsCurrentPrice = plsPriceData?.price || 0
      const pls24hChange = plsPriceData?.priceChange?.h24 || 0
      
      const validatorValue = validatorPLS * plsCurrentPrice
      totalValue += validatorValue
      weightedPriceChange += pls24hChange * validatorValue
    }

    // Add HEX stakes value if enabled (ONLY ACTIVE STAKES)
    if (showHexStakes && hexStakes) {
      // Filter active native stakes by chain and selected addresses
      const activeNativeStakes = hexStakes.filter(stake => {
        // Filter by status
        if (stake.status !== 'active') return false
        
        // Filter by chain
        const chainMatch = detectiveMode 
          ? stake.chain === 'PLS'
          : (chainFilter === 'both' || 
             (chainFilter === 'ethereum' && stake.chain === 'ETH') ||
             (chainFilter === 'pulsechain' && stake.chain !== 'ETH'))
        if (!chainMatch) return false

        // Filter by selected addresses
        if (selectedAddressIds.length > 0) {
          const addressMatch = selectedAddressIds.some(id => 
            effectiveAddresses.find(addr => 
              addr.id === id && addr.address.toLowerCase() === stake.address.toLowerCase()
            )
          )
          if (!addressMatch) return false
        }

        // Filter out removed addresses
        const addressObj = effectiveAddresses.find(addr => addr.address.toLowerCase() === stake.address.toLowerCase())
        if (addressObj && removedAddressIds.has(addressObj.id)) return false

        return true
      })
      activeNativeStakes.forEach(stake => {
        let stakeHex;
        if (useEESValue) {
          // Use EES calculation instead of principle + yield
          stakeHex = calculateEESValueWithDate(stake)
        } else if (useTimeShift) {
          // Use Time-Shift calculation for projected future yield
          const projectedDetails = calculateEESDetailsWithDate(stake);
          stakeHex = stake.principleHex + projectedDetails.payout;
        } else {
          // Use regular calculation (principle + yield)
          stakeHex = stake.principleHex + stake.yieldHex
        }
        // Use eHEX price for Ethereum stakes, HEX price for PulseChain stakes
        const hexSymbol = stake.chain === 'ETH' ? 'eHEX' : 'HEX'
        const hexPriceData = prices[hexSymbol]
        const hexCurrentPrice = hexPriceData?.price || 0
        const hex24hChange = hexPriceData?.priceChange?.h24 || 0
        
        const stakeValue = stakeHex * hexCurrentPrice
        totalValue += stakeValue
        weightedPriceChange += hex24hChange * stakeValue
      })

      // Add HSI stakes if toggle is enabled
      if (includePooledStakes && hsiStakes) {
        const activeHsiStakes = hsiStakes.filter(stake => {
          // Filter by status
          if (stake.status !== 'active') return false
          
          // Filter by chain
          const chainMatch = detectiveMode 
            ? stake.chain === 'PLS'
            : (chainFilter === 'both' || 
               (chainFilter === 'ethereum' && stake.chain === 'ETH') ||
               (chainFilter === 'pulsechain' && stake.chain !== 'ETH'))
          if (!chainMatch) return false

          // Filter by selected addresses
          if (selectedAddressIds.length > 0) {
            const addressMatch = selectedAddressIds.some(id => 
              effectiveAddresses.find(addr => 
                addr.id === id && addr.address.toLowerCase() === stake.address.toLowerCase()
              )
            )
            if (!addressMatch) return false
          }

          // Filter out removed addresses
          const addressObj = effectiveAddresses.find(addr => addr.address.toLowerCase() === stake.address.toLowerCase())
          if (addressObj && removedAddressIds.has(addressObj.id)) return false

          return true
        })
        activeHsiStakes.forEach(stake => {
          let stakeHex;
          if (useEESValue) {
            // Use EES calculation for HSI stakes as well
            const adaptedStake = {
              principleHex: stake.principleHex,
              yieldHex: stake.yieldHex,
              progress: stake.progress,
              tShares: stake.tShares,
              startDate: stake.startDate,
              endDate: stake.endDate,
              status: stake.status,
              chain: stake.chain
            }
            stakeHex = calculateEESValueWithDate(adaptedStake)
          } else if (useTimeShift) {
            // Use Time-Shift calculation for projected future yield
            const adaptedStake = {
              principleHex: stake.principleHex,
              yieldHex: stake.yieldHex,
              progress: stake.progress,
              tShares: stake.tShares,
              startDate: stake.startDate,
              endDate: stake.endDate,
              status: stake.status,
              chain: stake.chain
            }
            const projectedDetails = calculateEESDetailsWithDate(adaptedStake);
            stakeHex = stake.principleHex + projectedDetails.payout;
          } else {
            stakeHex = stake.principleHex + stake.yieldHex
          }
        const hexSymbol = stake.chain === 'ETH' ? 'eHEX' : 'HEX'
        const hexPriceData = prices[hexSymbol]
        const hexCurrentPrice = hexPriceData?.price || 0
        const hex24hChange = hexPriceData?.priceChange?.h24 || 0
        
        const stakeValue = stakeHex * hexCurrentPrice
        totalValue += stakeValue
        weightedPriceChange += hex24hChange * stakeValue
      })
      }

      // Add pooled stakes value if toggle is enabled
      if (includePooledStakes) {
        // For pooled stakes, calculate weighted average based on backing HEX/eHEX
        const pooledCurrentValue = pooledStakesData.totalValue
        
        if (pooledStakesData.totalHexValue > 0) {
          const hexPriceData = prices['HEX']
          const hex24hChange = hexPriceData?.priceChange?.h24 || 0
          const hexValue = pooledStakesData.totalHexValue
          totalValue += hexValue
          weightedPriceChange += hex24hChange * hexValue
        }
        if (pooledStakesData.totalEHexValue > 0) {
          const eHexPriceData = prices['eHEX']
          const eHex24hChange = eHexPriceData?.priceChange?.h24 || 0
          const eHexValue = pooledStakesData.totalEHexValue
          totalValue += eHexValue
          weightedPriceChange += eHex24hChange * eHexValue
        }
        
        // Add any non-HEX pooled value (should be minimal)
        const nonHexPooledValue = pooledCurrentValue - (pooledStakesData.totalHexValue || 0) - (pooledStakesData.totalEHexValue || 0)
        if (nonHexPooledValue > 0) {
          totalValue += nonHexPooledValue
          // No price change for non-HEX components
        }
      }
    }

    // Calculate weighted average percentage change
    return totalValue > 0 ? weightedPriceChange / totalValue : 0
  }, [filteredBalances, prices, addresses, getTokenPrice, useBackingPrice, shouldUseBackingPrice, isStablecoin, showLiquidBalances, showValidators, validatorCount, showHexStakes, hexStakes, hsiStakes, includePooledStakes, pooledStakesData.totalValue, pooledStakesData.totalHex, pooledStakesData.totalEHex, pooledStakesData.totalHexValue, pooledStakesData.totalEHexValue, detectiveMode, chainFilter, selectedAddressIds, effectiveAddresses, removedAddressIds, timeShiftDate, useTimeShift, timeShiftDateString, useEESValue, calculateEESDetailsWithDate, calculateEESValueWithDate, coinDetectionMode, enabledCoins, pendingEnabledCoins, showLiquidityPositions, lpTokensWithBalances, getLPTokenPrice, phuxLPPositions, phuxTotalLPValue, includeLiquidityPositionsFilter, v3PositionFilter, farmTokensWithBalances, allHoldingsFlat, farmToLPMapping, displayCustomTokens])

  // Calculate portfolio dollar change for 24h
  const portfolio24hDollarChange = useMemo(() => {
    if (!prices || portfolio24hChange === 0) return 0
    
    // Calculate current total value
    let currentTotalValue = 0
    
    if (showLiquidBalances && filteredBalances && Array.isArray(filteredBalances)) {
      filteredBalances.forEach(addressData => {
        // Native token
        if (addressData.nativeBalance) {
        const nativeSymbol = addressData.nativeBalance.symbol
        const nativeBalance = addressData.nativeBalance.balanceFormatted
        const nativeCurrentPrice = getTokenPrice(nativeSymbol)
        currentTotalValue += nativeBalance * nativeCurrentPrice
        }
        
        // Token balances - exclude pooled tokens if they're included as stakes
        addressData.tokenBalances?.forEach(token => {
          const tokenBalance = token.balanceFormatted
          const tokenCurrentPrice = getTokenPrice(token.symbol)
          
          // If pooled stakes are enabled and this is a pooled token, don't count it as liquid
          if (includePooledStakes && POOLED_STAKE_TOKENS.includes(token.symbol)) {
            // Skip this token as it will be counted as a stake instead
            return
          }
          
          currentTotalValue += tokenBalance * tokenCurrentPrice
        })
      })
    }

    // Add validator value if enabled AND filter is on (but not in detective mode)
    if (!detectiveMode && showValidators && includeValidatorsFilter && validatorCount > 0 && chainFilter !== 'ethereum') {
      const validatorPLS = validatorCount * 32_000_000
      const plsCurrentPrice = getTokenPrice('PLS')
      currentTotalValue += validatorPLS * plsCurrentPrice
    }

    // Add HEX stakes value if enabled
    if (showHexStakes && hexStakes) {
      // Add native HEX stakes
      const activeNativeStakes = hexStakes.filter(stake => 
        stake.status === 'active' && 
        (detectiveMode 
          ? stake.chain === 'PLS'
          : (chainFilter === 'both' || 
             (chainFilter === 'ethereum' && stake.chain === 'ETH') ||
             (chainFilter === 'pulsechain' && stake.chain !== 'ETH')))
      )
      activeNativeStakes.forEach(stake => {
        let stakeHex;
        if (useEESValue) {
          // Use EES calculation instead of principle + yield
          stakeHex = calculateEESValueWithDate(stake)
        } else {
          // Use regular calculation (principle + yield)
          stakeHex = stake.principleHex + stake.yieldHex
        }
        const hexSymbol = stake.chain === 'ETH' ? 'eHEX' : 'HEX'
        const hexCurrentPrice = getTokenPrice(hexSymbol)
        currentTotalValue += stakeHex * hexCurrentPrice
      })

      // Add HSI stakes if toggle is enabled
      if (includePooledStakes && hsiStakes) {
        const activeHsiStakes = hsiStakes.filter(stake => {
          // Filter by status
          if (stake.status !== 'active') return false
          
          // Filter by chain
          const chainMatch = detectiveMode 
            ? stake.chain === 'PLS'
            : (chainFilter === 'both' || 
               (chainFilter === 'ethereum' && stake.chain === 'ETH') ||
               (chainFilter === 'pulsechain' && stake.chain !== 'ETH'))
          if (!chainMatch) return false

          // Filter by selected addresses
          if (selectedAddressIds.length > 0) {
            const addressMatch = selectedAddressIds.some(id => 
              effectiveAddresses.find(addr => 
                addr.id === id && addr.address.toLowerCase() === stake.address.toLowerCase()
              )
            )
            if (!addressMatch) return false
          }

          // Filter out removed addresses
          const addressObj = effectiveAddresses.find(addr => addr.address.toLowerCase() === stake.address.toLowerCase())
          if (addressObj && removedAddressIds.has(addressObj.id)) return false

          return true
        })
        activeHsiStakes.forEach(stake => {
        let stakeHex;
        if (useEESValue) {
          // Use EES calculation for HSI stakes as well
          const adaptedStake = {
            principleHex: stake.principleHex,
            yieldHex: stake.yieldHex,
            progress: stake.progress
          }
          stakeHex = calculateEESValueWithDate(adaptedStake)
        } else {
          stakeHex = stake.principleHex + stake.yieldHex
        }
        const hexSymbol = stake.chain === 'ETH' ? 'eHEX' : 'HEX'
        const hexCurrentPrice = getTokenPrice(hexSymbol)
        currentTotalValue += stakeHex * hexCurrentPrice
      })
      }

      // Add pooled stakes value if toggle is enabled
      if (includePooledStakes) {
        currentTotalValue += pooledStakesData.totalValue
      }
    }

    // Calculate dollar change: (percentage / 100) * current value
    return (portfolio24hChange / 100) * currentTotalValue
  }, [portfolio24hChange, prices, addresses, getTokenPrice, showLiquidBalances, filteredBalances, showValidators, validatorCount, chainFilter, showHexStakes, hexStakes, hsiStakes, includePooledStakes, pooledStakesData.totalValue, detectiveMode, selectedAddressIds, effectiveAddresses, removedAddressIds, timeShiftDate])

  // Get HEX daily data cache
  const { data: hexDailyDataCache } = useHexDailyDataCache()
  const hexDailyCacheReady = !showHexStakes || (
    hexDailyDataCache && 
    hexDailyDataCache.dailyPayouts && 
    hexDailyDataCache.dailyPayouts.ETH && 
    hexDailyDataCache.dailyPayouts.PLS
  )

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
      Array.isArray(hexStakes) && 
      // Either no stakes found (valid result) OR all stakes have required properties
      (hexStakes.length === 0 || hexStakes.every(stake => 
        stake && 
        typeof stake.progress === 'number' && 
        typeof stake.principleHex === 'number' && 
        typeof stake.yieldHex === 'number' &&
        typeof stake.tShares === 'number' &&
        typeof stake.address === 'string'
      ))
    )

    // Check if HSI stakes calculations are complete (only if HEX stakes are enabled, toggle is on, and HSI tab is active)
    const hsiStakesCalculationsReady = !showHexStakes || !includePooledStakes || activeStakesTab !== 'hsi' || (
      !hsiStakesLoading && 
      Array.isArray(hsiStakes) && 
      // Either no stakes found (valid result) OR all stakes have required properties
      (hsiStakes.length === 0 || hsiStakes.every(stake => 
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
             hsiStakesCalculationsReady &&
             pooledStakesCalculationsReady &&
             hexDailyCacheReady &&
             !balancesLoading && 
             !pricesLoading && 
             !maxiLoading
    }
    
    // After initial load, stay ready as long as we have data and calculations
    // For subsequent loads (like adding new addresses), ensure HEX stakes are also ready
    return hasInitialData && hasCalculatedData && hexStakesCalculationsReady && hsiStakesCalculationsReady && hexDailyCacheReady
  }, [
    effectiveAddresses.length,
    balancesLoading,
    pricesLoading,
    maxiLoading,
    hexStakesLoading,
    hsiStakesLoading,
    balancesError,
    balances?.length,
    Object.keys(prices).length,
    filteredBalances.length,
    totalUsdValue,
    portfolio24hChange,
    isInitialLoad,
    showHexStakes,
    activeStakesTab,
    includePooledStakes, // Add explicit dependency on toggle state
    hexStakes,
    hexStakes?.length, // Add explicit dependency on stakes length
    hsiStakes,
    hsiStakes?.length, // Add explicit dependency on HSI stakes length
    pooledStakesData.totalTShares,
    pooledStakesData.totalValue,
    pooledStakesData.tokens,
    hexDailyCacheReady
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
    hexStakesCount: filteredStakes?.length || 0,
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

  // Generate portfolio analysis for detective mode
  const generatePortfolioAnalysis = useCallback(async () => {
    if (!detectiveMode || analysisLoading) return

    // Check if HEX daily data cache is ready
    if (!hexDailyCacheReady) {
      console.log('🕵️ Detective Mode: Waiting for HEX daily data cache to be ready')
      return
    }

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
      const hexStakesValue = filteredStakes.reduce((sum, stake) => {
        const hexPrice = getTokenPrice('HEX')
        const stakeHex = stake.totalHex !== undefined ? stake.totalHex : (stake.principleHex + stake.yieldHex)
        return sum + (stakeHex * hexPrice)
      }, 0)
      const totalPortfolioValue = totalLiquidValue + hexStakesValue
      
      const activeStakes = filteredStakes.filter(stake => stake.status === 'active')
      const inactiveStakes = filteredStakes.filter(stake => stake.status === 'inactive')
      
              // Calculate correct values for prompt data only (UI has its own calculations)
      const promptActiveStakes = filteredStakes.filter(stake => stake.status === 'active')
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
        
        // Use EES-adjusted yield for APY calculation when EES mode is active
        let apy
        if (useEESValue && stake.status === 'active') {
          const eesDetails = calculateEESDetailsWithDate(stake)
          const eesValue = eesDetails.eesValue
          
          if (eesValue <= 0) {
            // If stake is completely nuked, APY is -100% (losing entire principal)
            apy = -100
          } else {
            // Calculate APY based on EES value vs principal
            const netGainLoss = eesValue - stake.principleHex
            apy = ((netGainLoss / stake.principleHex) / daysElapsed) * 365 * 100
          }
        } else {
          // Normal APY calculation using yield
          apy = ((stake.yieldHex / stake.principleHex) / daysElapsed) * 365 * 100
        }
        return sum + (apy * stake.tShares)
      }, 0) / promptTotalTShares : 0

      // Find earliest stake date to determine if OG
      const earliestStakeDate = filteredStakes.length > 0
        ? Math.min(...filteredStakes.map(stake => new Date(stake.startDate).getTime()))
        : null
      const isOGHexican = earliestStakeDate ? new Date(earliestStakeDate).getFullYear() === 2020 : false
      
      // Calculate recent staking activity (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const recentStakeStarts = filteredStakes.filter(stake => 
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

      // Calculate stake history stats
      const lateEndStakes = inactiveStakes.filter(stake => {
        if (stake.actualEndDate && stake.endDate) {
          const actualEnd = new Date(stake.actualEndDate).getTime()
          const promisedEnd = new Date(stake.endDate).getTime()
          const daysDifference = (actualEnd - promisedEnd) / (24 * 60 * 60 * 1000)
          return daysDifference > 1 // More than 1 day late = late end
        }
        return false
      }).length

      // Count BPD stakes
      const bpdStakes = filteredStakes.filter(stake => stake.isBPD === true).length

      // Calculate max stake length
      const maxStakeLength = Math.max(...filteredStakes.map(stake => {
        const startDate = new Date(stake.startDate)
        const endDate = new Date(stake.endDate)
        return Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      }), 0)

      const portfolioData = {
        totalValue: Math.round(totalUsdValue),
        liquidValue: Math.round(totalLiquidValue),
        tokenCount: sortedTokens.length,
        significantTokenCount: significantTokens.length,
        dustTokens: sortedTokens.length - significantTokens.length,
        topHoldings: allHoldings.slice(0, 3),
        largestHolding: allHoldings.length > 0 ? allHoldings[0].symbol : null,
        portfolioSize: totalUsdValue > 1000000 ? 'whale' : totalUsdValue > 100000 ? 'large' : totalUsdValue > 10000 ? 'medium' : 'small',
        totalPortfolioValue: Math.round(totalPortfolioValue),
        
        // Include all HEX staking history
        hexStakesValue: Math.round(hexStakesValue),
        hexStakes: filteredStakes.length,
        activeStakes: activeStakes.length,
        endedStakes: inactiveStakes.length,
        earlyEndStakes: (() => {
          return inactiveStakes.filter(stake => {
            if (stake.isEES === true) return true
            if (stake.actualEndDate && stake.endDate) {
              const actualEnd = new Date(stake.actualEndDate).getTime()
              const promisedEnd = new Date(stake.endDate).getTime()
              const daysDifference = (promisedEnd - actualEnd) / (24 * 60 * 60 * 1000)
              return daysDifference > 30 // More than 30 days early = EES
            }
            return false
          }).length
        })(),
        lateEndStakes,
        bpdStakes,
        maxStakeLength,
        avgStakeDuration: promptWeightedStakeLength,
        avgAPY: Math.round(promptWeightedAPY * 10) / 10,
        isOGHexican,
        firstStakeYear: earliestStakeDate ? new Date(earliestStakeDate).getFullYear() : null,
        recentStakeStarts,
        recentStakeEnds
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
  }, [detectiveMode, analysisLoading, totalUsdValue, sortedTokens, filteredStakes, getTokenPrice, hexDailyCacheReady])

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

  // Auto-trigger analysis in detective mode when portfolio data is loaded
  useEffect(() => {
    if (detectiveMode &&
        isEverythingReady && 
        effectiveAddresses.length > 0 && 
        !portfolioAnalysis && 
        !analysisLoading && 
        !analysisError) {
      console.log('🕵️ Detective Mode: Starting portfolio analysis...')
      generatePortfolioAnalysis()
    }
  }, [detectiveMode, isEverythingReady, effectiveAddresses.length, portfolioAnalysis, analysisLoading, analysisError, generatePortfolioAnalysis])

  // Add toggle UI component (3-way toggle) - memoized to prevent unnecessary re-renders
  const ChainToggle = useCallback(() => {
    return (
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
    )
  }, [chainFilter])

  // Container component - motion or regular div
  const Container = showMotion ? motion.div : 'div';
  const Section = showMotion ? motion.div : 'div';

  // Animate loading dots when loading
  useEffect(() => {
    const isLoading = (effectiveAddresses.length > 0 && !isEverythingReady) || analysisLoading
    if (!isLoading) return

    const interval = setInterval(() => {
      setLoadingDots(prev => prev === 3 ? 0 : prev + 1)
    }, 300)

    return () => clearInterval(interval)
  }, [effectiveAddresses.length, isEverythingReady, analysisLoading])

  // Show loading state when there are addresses but data isn't ready
  if (effectiveAddresses.length > 0 && !isEverythingReady) {
    return (
      <div className="min-h-screen bg-black text-white p-8">
        <div className="max-w-6xl mx-auto">
          <div className="bg-black border-2 border-white/10 rounded-full p-6 text-center max-w-[660px] w-full mx-auto">
            <div className="text-gray-400">
              {detectiveMode ? 'Loading address data' : 'Loading Portfolio data'}<span className="inline-block w-[24px] text-left">{'.'.repeat(loadingDots)}</span>
            </div>
          </div>
        </div>

      </div>
    )
  }

  return (
    <>
      {/* EES Mode / Time Machine / Custom Background Hue Overlay */}
      {hasMounted && (eesMode || useEESValue || useTimeShift || useCustomBackground) && (
        <div 
          className="fixed inset-0 pointer-events-none z-[0]"
          style={{ 
            background: (() => {
              // EES mode and Time Machine always take priority over custom background
              if (eesMode || useEESValue) {
                return 'linear-gradient(to right, transparent, rgba(239, 68, 68, 0.17) 50%, transparent)'    // Red gradient for EES mode
              }
              if (useTimeShift) {
                return 'linear-gradient(to right, transparent, rgba(251, 146, 60, 0.17) 50%, transparent)'  // Orange gradient for Time Machine
              }
              if (useCustomBackground) {
                // Convert hex to rgba with 0.17 opacity
                const hex = customBackgroundColor.replace('#', '')
                const r = parseInt(hex.substr(0, 2), 16)
                const g = parseInt(hex.substr(2, 2), 16)
                const b = parseInt(hex.substr(4, 2), 16)
                return `linear-gradient(to right, transparent, rgba(${r}, ${g}, ${b}, 0.17) 50%, transparent)`
              }
              // Fallback (should not reach here based on the condition above)
              return 'transparent'
            })(),
            mixBlendMode: 'screen'
          }}
        />
      )}
      
      {/* EES Mode / Time Machine Toast - Bottom Right Corner */}
      {hasMounted && (useEESValue || useTimeShift) && (
        <div className="fixed bottom-4 right-4 z-[9996] pointer-events-none">
          <div className={`px-4 py-2 rounded-lg text-sm font-medium backdrop-blur-md shadow-lg border ${useEESValue && useTimeShift ? 'border-red-400 text-red-400 bg-red-400/10' : useEESValue ? 'border-red-400 text-red-400 bg-red-400/10' : 'border-orange-400 text-orange-400 bg-orange-400/10'}`}>
            {useEESValue && useTimeShift && (
              <>EES Mode & Time Machine <span className="underline">{timeShiftDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></>
            )}
            {useEESValue && !useTimeShift && 'EES Mode Active'}
            {!useEESValue && useTimeShift && (
              <>Time Machine <span className="underline">{timeShiftDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></>
            )}
          </div>
        </div>
      )}
      
      <div className="w-full pb--20 md:pb-0 relative z-[1]">
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
                  <div className="flex-1 text-sm text-white whitespace-nowrap">
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
          <div className="text-gray-400">
            {detectiveMode ? 'Loading address data' : 'Loading portfolio'}<span className="inline-block w-[24px] text-left">{'.'.repeat(loadingDots)}</span>
          </div>
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
          className="bg-black/60 backdrop-blur-xl border-2 border-white/10 rounded-2xl py-8 text-center max-w-[860px] w-full relative"
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
                className="plausible-event-name=Opens+Settings p-2 mr-2 rounded-lg text-gray-400 hover:text-white"
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
                showDollarChange 
                  ? (Math.abs(portfolio24hDollarChange) < 10 || portfolio24hDollarChange === 0)
                    ? 'text-gray-400'
                    : portfolio24hDollarChange >= 10
                      ? 'text-[#00ff55]'
                      : 'text-red-500'
                  : portfolio24hChange <= -1
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
                
                                {/* Only show validators filter if validator count > 0 */}
                {!detectiveMode && validatorCount > 0 && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="validators"
                      checked={includeValidatorsFilter}
                      onCheckedChange={(checked) => setIncludeValidatorsFilter(checked === true)}
                  />
                  <label 
                    htmlFor="validators" 
                      className={`text-sm cursor-pointer ${includeValidatorsFilter ? 'text-white' : 'text-gray-400'}`}
                  >
                    Include validators
                  </label>
                </div>
                )}
                
                {/* Only show liquidity positions filter if enabled in settings */}
                {showLiquidityPositions && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="liquidity-positions-filter"
                      checked={includeLiquidityPositionsFilter}
                      onCheckedChange={(checked) => setIncludeLiquidityPositionsFilter(checked === true)}
                    />
                    <label 
                      htmlFor="liquidity-positions-filter" 
                      className={`text-sm cursor-pointer ${includeLiquidityPositionsFilter ? 'text-white' : 'text-gray-400'}`}
                    >
                      Include lp tokens & farms
                    </label>
                  </div>
                )}
                
                

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
            
            {/* No analysis yet - will auto-trigger */}
            {!portfolioAnalysis && !analysisLoading && !analysisError && (
              <div className="flex items-center gap-3 text-gray-400 justify-center py-8">
                <div className="animate-spin w-5 h-5 border-2 border-gray-600 border-t-white rounded-full"></div>
                <span>Loading analysis<span className="inline-block w-[24px] text-left">{'.'.repeat(loadingDots)}</span></span>
              </div>
            )}
            
            {/* Auto-generated analysis loading */}
            {analysisLoading && (
              <div className="flex items-center gap-3 text-gray-400 justify-center py-8">
                <div className="animate-spin w-5 h-5 border-2 border-gray-600 border-t-white rounded-full"></div>
                <span>Analyzing portfolio behavior...</span>
              </div>
            )}
            
            {/* Analysis error state */}
            {analysisError && (
              <div className="bg-red-600/10 border border-red-500/30 rounded-lg p-4">
                <div className="text-red-400 text-sm font-medium mb-2">Analysis Failed</div>
                <div className="text-red-300 text-sm">{analysisError}</div>
                {!analysisError?.includes('Rate limit') && (
                  <button
                    onClick={generatePortfolioAnalysis}
                    className="mt-3 px-3 py-1 bg-red-600/20 hover:bg-red-600/30 text-red-300 rounded text-xs transition-colors"
                  >
                    Try Again
                  </button>
                )}
              </div>
            )}
            
            {/* Analysis results */}
            {portfolioAnalysis && !analysisLoading && (
              <div className="text-gray-300 leading-relaxed rounded-lg p-4">
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
                { field: 'alphabetical' as const, label: 'A-Z' },
                { field: 'change' as const, label: '24h % Change' },
                { field: 'dollarChange' as const, label: '24h $ Change' }
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
                      : 'bg-black/30 text-gray-400 border-gray-400 hover:text-white hover:border-white'
                  }`}
                >
                  {label} {tokenSortField === field ? (tokenSortDirection === 'asc' ? '↑' : '↓') : ''}
                </button>
              ))}
            </div>
          </div>
          
          <div className="bg-black/60 backdrop-blur-md border-2 border-white/10 rounded-2xl p-1 sm:p-6">
          <div className="space-y-3">
            {sortedTokens.map((token, tokenIndex) => {
              // Get price using conditional routing for LP vs regular tokens
              const allTokens = [...TOKEN_CONSTANTS, ...MORE_COINS, ...(customTokens || [])]
              const tokenConfig = allTokens.find(t => t.ticker === token.symbol)
              
              const tokenPrice = tokenConfig?.type === 'lp' 
                ? getLPTokenPrice(token.symbol)
                : getTokenPrice(token.symbol)
              
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
          className="bg-black/60 backdrop-blur-md border-2 border-white/10 rounded-2xl p-6 text-center max-w-[860px] w-full"
        >
          <div className="text-gray-400">
            No tokens found for tracked addresses
              </div>
        </Section>
      )}

      {/* Liquidity Pools Section */}
      {showLiquidityPositions && includeLiquidityPositionsFilter && isEverythingReady && (lpTokensWithBalances.length > 0 || phuxLPPositions.length > 0) && (
        <Section 
          {...(showMotion ? {
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 },
            transition: { 
              duration: 0.5,
              delay: 0.45,
              ease: [0.23, 1, 0.32, 1]
            }
          } : {})}
          className="max-w-[860px] w-full"
        >
          <div className="flex items-center mb-4 flex-wrap gap-4">
            <div className="flex items-center gap-3">
            <h3 className="text-xl font-semibold text-white">Liquidity Pools</h3>
              
              {/* V3 Position Status Filter - matching HEX Stakes style */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={`px-3 py-1 rounded-full text-xs font-medium focus:outline-none min-w-[70px] flex items-center justify-center gap-1 ${
                    v3PositionFilter === 'closed' 
                      ? 'bg-white/10 border border-white/20 hover:border-white/40 text-zinc-400' 
                      : v3PositionFilter === 'all'
                        ? 'bg-blue-400/10 border border-blue-400 text-blue-400'
                        : 'bg-green-400/10 border border-green-400 text-green-400'
                  }`}>
                    {v3PositionFilter === 'all' ? 'All' : v3PositionFilter === 'closed' ? 'Closed' : 'Active'}
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="min-w-[10px] p-2">
                  <DropdownMenuRadioGroup value={v3PositionFilter} onValueChange={(value) => setV3PositionFilter(value as 'all' | 'active' | 'closed')}>
                    <DropdownMenuRadioItem 
                      value="active"
                      className="text-white hover:bg-white/10 focus:bg-white/10 [&_svg]:hidden p-1 m-0 text-green-400"
                    >
                      <div className="w-full px-4 py-1">Active</div>
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem 
                      value="closed"
                      className="text-white hover:bg-white/10 focus:bg-white/10 [&_svg]:hidden p-1 m-0 text-zinc-400"
                    >
                      <div className="w-full px-4 py-1">Closed</div>
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem 
                      value="all"
                      className="text-white hover:bg-white/10 focus:bg-white/10 [&_svg]:hidden p-1 m-0 text-blue-400"
                    >
                      <div className="w-full px-4 py-1">All</div>
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          <div className="bg-black/60 backdrop-blur-md border-2 border-white/10 rounded-2xl p-1 sm:p-6">
            <div className="space-y-3">
              {lpTokensWithBalances.map((token, tokenIndex) => {
                // Handle V3 positions differently from regular LP tokens
                const isV3Position = token.isV3Position
                const isStablePool = token.symbol === 'USDT  \/ USDC \/ DAI'
                
                // For V3 positions, set tokenPrice to 0 (will show link in col 3); for LP tokens use price lookup
                const tokenPrice = isV3Position 
                  ? 0 // Don't show price in column 3 for V3 positions, will show pool info link instead
                  : isStablePool && plsVirtualPrice 
                    ? plsVirtualPrice 
                    : getLPTokenPrice(token.symbol) || 0
                  
                const stableKey = `${token.chain}-${token.symbol}-${token.address || 'lp'}`
                // Look for token in all sources: TOKEN_CONSTANTS, MORE_COINS, and custom tokens
                const allTokensForConfig = [...TOKEN_CONSTANTS, ...MORE_COINS, ...(customTokens || [])]
                const tokenConfig = allTokensForConfig.find(t => t.ticker === token.symbol)
                
                // Debug PHUX LP pricing and config lookup
                if (token.symbol.includes('PHUX') || token.symbol === 'Prime PHUX') {
                  console.log(`[LP Section] ${token.symbol}: tokenPrice = $${tokenPrice}, balance = ${token.balanceFormatted}`)
                  console.log(`[LP Config] ${token.symbol}: found config = ${!!tokenConfig}, name = "${tokenConfig?.name}", platform = "${tokenConfig?.platform}"`)
                  console.log(`[LP Config] Available tokens with 'PHUX':`, allTokensForConfig.filter(t => t.ticker.includes('PHUX')).map(t => ({ticker: t.ticker, name: t.name})))
                }
                
                // Check if this is any type of V3 position (dynamic from API or static from constants)
                const isAnyV3Position = isV3Position || (tokenConfig?.name?.includes('9MM LP V3'))
                const isGroupedV3 = token.isGroupedV3 // New flag for grouped V3 positions
                
                // For V3 positions, display empty string instead of balance; for LP tokens show balance
                const isManualV3Override = isAnyV3Position && !token.ownerAddress
                const displayAmount = isAnyV3Position 
                  ? ''
                  : token.balanceFormatted !== null ? formatBalance(token.balanceFormatted) : '?'
                
                // For V3 positions, calculate sum of all individual position values (including unclaimed fees)
                const usdValue = isAnyV3Position 
                  ? (customV3Values.get(token.symbol) ? parseFloat(customV3Values.get(token.symbol) || '0') : 
                     // Sum all position values including unclaimed fees
                     (token.positions || []).reduce((total, position) => {
                       const positionId = position.positionId
                       const rpcTickData = tickData[positionId]
                       let totalUnclaimedFeesUSD = 0
                       
                       if (rpcTickData && rpcTickData.tokensOwed0 !== undefined && rpcTickData.tokensOwed1 !== undefined) {
                         const token0Price = getTokenPrice(position.token0Symbol) || 0
                         const token1Price = getTokenPrice(position.token1Symbol) || 0
                         // tokensOwed0 and tokensOwed1 are now already decimal adjusted from the V3 hook
                         const unclaimedFeesToken0 = rpcTickData.tokensOwed0
                         const unclaimedFeesToken1 = rpcTickData.tokensOwed1
                         const unclaimedFeesToken0USD = unclaimedFeesToken0 * token0Price
                         const unclaimedFeesToken1USD = unclaimedFeesToken1 * token1Price
                         totalUnclaimedFeesUSD = unclaimedFeesToken0USD + unclaimedFeesToken1USD
                       }
                       
                       // Calculate position value using RPC data (tokens + unclaimed fees)
                       const rpcPositionValue = (rpcTickData?.token0Amount || 0) * (getTokenPrice(position.token0Symbol) || 0) + 
                                               (rpcTickData?.token1Amount || 0) * (getTokenPrice(position.token1Symbol) || 0) + 
                                               totalUnclaimedFeesUSD
                       
                       return total + rpcPositionValue
                     }, 0)
                    )
                  : token.balanceFormatted ? token.balanceFormatted * tokenPrice : 0
                
                // Calculate underlying tokens - handle V3 positions differently
                const underlyingTokens = isAnyV3Position 
                  ? {
                      token0: {
                        symbol: token.token0Symbol,
                        amount: token.currentValue / 2 / (getTokenPrice(token.token0Symbol) || 1), // Rough estimate
                        decimals: 18 // Default decimals
                      },
                      token1: {
                        symbol: token.token1Symbol,
                        amount: token.currentValue / 2 / (getTokenPrice(token.token1Symbol) || 1), // Rough estimate
                        decimals: 18 // Default decimals
                      }
                    }
                  : tokenConfig?.platform === 'PHUX' && tokenConfig.a
                    ? calculatePhuxLPUnderlyingTokens(token.symbol, token.balanceFormatted || 0, tokenConfig.a)
                    : tokenConfig?.platform === '9INCH' && tokenConfig.a
                    ? calculate9InchLPUnderlyingTokens(token.symbol, token.balanceFormatted || 0, tokenConfig.a)
                    : tokenConfig?.platform === '9MM' && tokenConfig.a
                    ? calculate9InchLPUnderlyingTokens(token.symbol, token.balanceFormatted || 0, tokenConfig.a) // 9MM uses same logic as 9INCH
                    : calculateLPUnderlyingTokens(token.symbol, token.balanceFormatted || 0)
                
                // Calculate pool ownership percentage
                const lpData = lpTokenData[token.symbol]
                
                // Get pool ownership percentage - check platform type
                let poolOwnershipPercentage = null
                
                // Check if V3 position is closed (for display purposes)
                const totalPositionValue = token.positionValue || 0
                const isV3PoolClosed = isAnyV3Position && totalPositionValue === 0
                
                if (isAnyV3Position) {
                  // For V3 positions, calculate ownership as position value / pool TVL
                  // But don't show percentage for closed positions (value = 0)
                  
                  if (!isV3PoolClosed) {
                  if (isGroupedV3 && token.positions && token.positions.length > 0) {
                    // For grouped V3 positions, use the pool TVL from the first position
                    const firstPosition = token.positions[0]
                    const poolTVL = parseFloat(firstPosition.pool?.totalValueLockedUSD || '0')
                    
                    if (poolTVL > 0 && totalPositionValue > 0) {
                      poolOwnershipPercentage = (totalPositionValue / poolTVL) * 100
                    }
                  } else if (token.pool?.totalValueLockedUSD && token.positionValue) {
                    // For single V3 positions
                    const poolTVL = parseFloat(token.pool.totalValueLockedUSD)
                    const positionValue = token.positionValue
                    
                    if (poolTVL > 0) {
                      poolOwnershipPercentage = (positionValue / poolTVL) * 100
                      }
                    }
                  }
                } else if ((tokenConfig?.platform === 'PHUX' || tokenConfig?.platform === '9INCH' || tokenConfig?.platform === '9MM') && tokenConfig.a && getPhuxLPTokenPrice) {
                  // For PHUX, 9INCH, and 9MM pools, get total shares from GraphQL pool data
                  const poolPrice = getPhuxLPTokenPrice(tokenConfig.a)
                  if (poolPrice?.totalShares && token.balanceFormatted) {
                    poolOwnershipPercentage = (token.balanceFormatted / poolPrice.totalShares) * 100
                    console.log(`[${tokenConfig.platform} LP Ownership] ${token.symbol}: ${token.balanceFormatted} / ${poolPrice.totalShares} = ${poolOwnershipPercentage.toFixed(4)}% of pool`)
                  }
                } else if (lpData && lpData.totalSupply && token.balanceFormatted) {
                  // For PulseX pools, use existing lpTokenData
                  poolOwnershipPercentage = (token.balanceFormatted / parseFloat(lpData.totalSupply)) * 100
                  console.log(`[PulseX LP Ownership] ${token.symbol}: ${token.balanceFormatted} / ${lpData.totalSupply} = ${poolOwnershipPercentage.toFixed(4)}% of pool`)
                }
                
                // This logging was moved above to the individual platform sections
                
                return (
                  <div key={stableKey}>
                    {/* Main LP Token Row */}
                    <div className="grid grid-cols-[minmax(20px,auto)_2fr_1fr_2fr_minmax(20px,auto)] xs:grid-cols-[minmax(20px,auto)_1fr_1fr_1fr_minmax(20px,auto)] sm:grid-cols-[minmax(20px,auto)_2fr_1fr_1fr_minmax(60px,auto)_2fr_minmax(40px,auto)] items-center gap-2 sm:gap-4 border-b border-white/10 mx-2 sm:mx-4 py-4 last:border-b-0 overflow-hidden">
                      
                      {/* Chain Icon - Furthest Left Column */}
                      <div className="flex space-x-2 items-center justify-center min-w-[18px]">
                        <CoinLogo
                          symbol="PLS-white"
                          size="sm"
                          className="grayscale opacity-50"
                        />
                      </div>
                      
                      {/* Token Info - Left Column */}
                      <div className="flex items-center space-x-2 sm:space-x-3 min-w-[70px] md:min-w-[140px] overflow-hidden">
                        <div className="flex-shrink-0">
                          {(() => {
                            // Check if this is a multi-token LP pair (contains " / ") or single token LP
                            const hasMultipleTokens = token.symbol.includes(' / ') || token.symbol.includes('\\/')
                            
                            if (!hasMultipleTokens) {
                              // Single token LP (like PHUX LPs) - use the cleaned ticker for logo
                              const cleanedSymbol = cleanTickerForLogo(token.symbol)
                              return (
                                <div className="w-8 h-8 flex items-center justify-center">
                                  <CoinLogo 
                                    symbol={cleanedSymbol} 
                                    size="lg" 
                                    className="w-8 h-8"
                                    customImageUrl={customTokens.find(t => t.ticker === cleanedSymbol)?.logoUrl}
                                  />
                                </div>
                              )
                            }
                            
                            // Extract token symbols from LP pair name
                            // Handle both "HEX / WPLS" and "USDT  \/ USDC \/ DAI" formats
                            const tokenSymbols = token.symbol.includes('\\/')
                              ? token.symbol.split(/\s*\\\/ \s*/) // Split on \/ with optional spaces
                              : token.symbol.split(' / ')
                            
                            // Clean up all token symbols for logo lookup using centralized logic
                            const cleanedSymbols = tokenSymbols.map(symbol => cleanTickerForLogo(symbol || 'PLS'))
                            
                            const token0Symbol = cleanedSymbols[0] || 'PLS'
                            const token1Symbol = cleanedSymbols[1] || 'HEX'
                            const token2Symbol = cleanedSymbols[2]
                            
                            // Handle 3-token pools with triangle layout (same as settings)
                            if (token2Symbol) {
                              return (
                                <div className="relative w-8 h-8">
                                  {/* First token (top center) */}
                                  <div className="absolute top-0 left-1.5 w-5 h-5">
                                    <CoinLogo
                                      symbol={token0Symbol}
                                      size="sm"
                                      className="w-5 h-5 rounded-full"
                                    />
                                  </div>
                                  {/* Second token (bottom left) */}
                                  <div className="absolute top-3 left-0 w-5 h-5">
                                    <CoinLogo
                                      symbol={token1Symbol}
                                      size="sm"
                                      className="w-5 h-5 rounded-full"
                                    />
                                  </div>
                                  {/* Third token (bottom right) */}
                                  <div className="absolute top-3 left-3 w-5 h-5">
                                    <CoinLogo
                                      symbol={token2Symbol}
                                      size="sm"
                                      className="w-5 h-5 rounded-full"
                                    />
                                  </div>
                                </div>
                              )
                            }
                            
                            // Regular 2-token LP layout
                            return (
                              <div className="relative w-8 h-8">
                                {/* First token (back) */}
                                <div className="absolute top-0 left-0 w-6 h-6">
                                  <CoinLogo
                                    symbol={token0Symbol}
                                    size="sm"
                                    className="w-6 h-6 border border-black/20 rounded-full"
                                  />
                                </div>
                                {/* Second token (front, overlapping) */}
                                <div className="absolute top-2 left-2.5 w-6 h-6">
                                  <CoinLogo
                                    symbol={token1Symbol}
                                    size="sm"
                                    className="w-6 h-6 border border-black/20 rounded-full"
                                  />
                                </div>
                              </div>
                            )
                          })()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium text-sm md:text-md break-words">
                            {getDisplayTicker(token.symbol)}
                          </div>
                          <div className="text-gray-400 text-[10px] break-words leading-tight">
                            <span className="sm:hidden">{displayAmount && (isGroupedV3 ? displayAmount : `${displayAmount} tokens`)}</span>
                            <span className="hidden sm:block">{isV3Position ? '9MM V3 LP' : (tokenConfig?.name || `${getDisplayTicker(token.symbol)} Liquidity Pool`)}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Price Column - Hidden on Mobile */}
                      <div className="hidden sm:block text-center">
                        {isAnyV3Position ? (
                          // For V3 positions, show link to 9MM pool info page
                          <a 
                            href={`https://base.9mm.pro/info/v3/pairs/${token.address}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-white hover:grey-100 text-xs font-medium hover:underline transition-colors flex items-center gap-1"
                          >
                            Pool Info
                            <svg className="w-3 h-3 text-gray-100 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        ) : (
                          // For regular LP tokens, show price
                        <div className="text-gray-400 text-xs font-medium">
                          {tokenPrice === 0 ? '--' : `$${formatLPTokenPrice(tokenPrice)}`}
                        </div>
                        )}
                      </div>

                      {/* 24h Price Change Column - Pool Ownership on Mobile */}
                      <div className="text-center">
                        {poolOwnershipPercentage !== null && !isV3PoolClosed ? (
                          <div className="text-purple-400 text-xs font-medium sm:hidden">
                            {poolOwnershipPercentage.toFixed(2)}%
                          </div>
                        ) : (
                          <div className="text-gray-400 text-xs sm:hidden">--</div>
                        )}
                      </div>

                      {/* League Column - Pool Ownership Percentage on Desktop */}
                      <div className="hidden sm:flex flex-col items-center justify-center min-w-[60px]">
                        {poolOwnershipPercentage !== null && !isV3PoolClosed ? (
                          <div className="text-purple-400 text-xs font-medium">
                            {poolOwnershipPercentage.toFixed(2)}%
                          </div>
                        ) : (
                          <div className="text-gray-400 text-xs">--</div>
                        )}
                      </div>
                      
                      {/* Value - Right Column */}
                      <div className="text-right overflow-hidden">
                        <div className="text-white font-medium text-sm md:text-lg transition-all duration-200">
                          ${formatDollarValue(usdValue)}
                        </div>
                        <div className="text-gray-400 text-[10px] mt-0.5 hidden sm:block transition-all duration-200">
                          {(() => {
                            if (isGroupedV3 && !isManualV3Override) {
                              // Show position count for actual detected V3 positions
                              return `${token.positions?.length || 0} ${(token.positions?.length || 0) === 1 ? 'position' : 'positions'}`
                            } else if (displayAmount && !isAnyV3Position) {
                              // Show token count for regular LP tokens
                              return `${displayAmount} tokens`
                            }
                            // Don't show anything for manual V3 overrides or single V3 positions
                            return ''
                          })()}
                        </div>
                      </div>

                      {/* Chart & Copy Icons - Far Right Column */}
                      <div className="flex flex-col items-center ml-2">
                        {/* Hide toggle arrow for USDT/USDC/DAI pool, single-asset PHUX pools, and manual V3 overrides */}
                        {(() => {
                          // Don't show dropdown for specific pools
                          if (token.symbol === 'BridgedSP' || token.symbol === 'CSTStable') return false
                          
                          // Don't show dropdown for manual V3 overrides (we don't have breakdown details)
                          if (isAnyV3Position && customV3Values.has(token.symbol)) {
                            const hasCustomValue = parseFloat(customV3Values.get(token.symbol) || '0') > 0
                            if (hasCustomValue) {
                              console.log(`[V3 Dropdown] Hiding dropdown for manual V3 override: ${token.symbol}`)
                              return false
                            }
                          }
                          
                          return true
                        })() && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            if (isGroupedV3) {
                              // Handle grouped V3 positions
                              const isExpanded = expandedV3Groups.has(token.symbol)
                              const newExpanded = new Set(expandedV3Groups)
                              if (isExpanded) {
                                newExpanded.delete(token.symbol)
                              } else {
                                newExpanded.add(token.symbol)
                              }
                              setExpandedV3Groups(newExpanded)
                            } else {
                              // Handle regular LP tokens
                            const isExpanded = expandedLPTokens.has(token.symbol)
                            const newExpanded = new Set(expandedLPTokens)
                            if (isExpanded) {
                              newExpanded.delete(token.symbol)
                            } else {
                              newExpanded.add(token.symbol)
                            }
                            setExpandedLPTokens(newExpanded)
                            }
                          }}
                          className="p-1 text-gray-400 hover:text-white transition-colors"
                          title={
                            isGroupedV3 
                              ? (expandedV3Groups.has(token.symbol) ? "Hide positions" : "Show positions")
                              : (expandedLPTokens.has(token.symbol) ? "Hide underlying tokens" : "Show underlying tokens")
                          }
                        >
                          <ChevronDown 
                            className={`w-4 h-4 transition-transform duration-200 ${
                              (isGroupedV3 ? expandedV3Groups.has(token.symbol) : expandedLPTokens.has(token.symbol)) ? '' : 'rotate-180'
                            }`}
                          />
                        </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Grouped V3 Positions Breakdown */}
                    <AnimatePresence>
                      {isGroupedV3 && expandedV3Groups.has(token.symbol) && token.positions && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeInOut" }}
                          className="px-4 pb-3 border-t border-white/5 overflow-hidden"
                        >
                          <div className="text-xs text-gray-400 mb-3 mt-2">Positions:</div>
                          <div className="space-y-2">
                            {(() => {
                              // Helper function to convert tick to price with decimal adjustment
                              const tickToPriceWithDecimals = (tick: number, token0Decimals: number, token1Decimals: number): number => {
                                const rawPrice = Math.pow(1.0001, tick)
                                // Adjust for token decimal differences (token1 per token0)
                                const decimalAdjustment = Math.pow(10, token0Decimals - token1Decimals)
                                return rawPrice * decimalAdjustment
                              }
                              
                              // Get current pool price from subgraph (already calculated)
                              const currentTick = parseInt(token.positions[0]?.tick || '0')
                              const token0Decimals = parseInt(token.positions[0]?.token0Decimals || '18')
                              const token1Decimals = parseInt(token.positions[0]?.token1Decimals || '18')
                              // Use the pool's calculated token1Price (token1 per token0) instead of tick calculation
                              const currentPrice = parseFloat(token.positions[0]?.token1Price || '0')
                              
                              
                              // Sort positions by status and dollar amount
                              const sortedPositions = [...token.positions].sort((a, b) => {
                                // Calculate status priority for each position
                                const getStatusPriority = (pos: any) => {
                                  const posValue = pos.positionValue || 0
                                  const netToken0Amount = pos.netToken0Amount || 0
                                  const netToken1Amount = pos.netToken1Amount || 0
                                  const liquidity = pos.liquidity || "0"
                                  const isLiquidityZero = liquidity === "0" || liquidity === 0 || parseFloat(liquidity) === 0
                                  const isClosed = posValue < 1 || isLiquidityZero || (Math.abs(netToken0Amount) < 1e-10 && Math.abs(netToken1Amount) < 1e-10 && posValue < 10)
                                  const rawLower = pos.rawLowerPrice || 0
                                  const rawUpper = pos.rawUpperPrice || 0
                                  const currentPoolPrice = parseFloat(token.positions[0]?.token1Price || '0')
                                  
                                  // Handle infinite ranges (0 to infinity or very large upper bounds)
                                  const isInfiniteUpper = rawUpper > 1e10 || rawUpper === Infinity
                                  const isInfiniteLower = rawLower <= 0
                                  
                                  const isInRange = (isInfiniteLower || currentPoolPrice >= rawLower) && 
                                                   (isInfiniteUpper || currentPoolPrice <= rawUpper)
                                  
                                  if (isClosed) return 3 // Closed (lowest priority)
                                  if (isInRange) return 1 // Active: In Range (highest priority)  
                                  return 2 // Active: Out of Range (middle priority)
                                }
                                
                                const aPriority = getStatusPriority(a)
                                const bPriority = getStatusPriority(b)
                                
                                // Primary sort: by status priority
                                if (aPriority !== bPriority) {
                                  return aPriority - bPriority
                                }
                                
                                // Secondary sort: by dollar amount (descending)
                                const aValue = a.positionValue || 0
                                const bValue = b.positionValue || 0
                                return bValue - aValue
                              })
                              
                              // Create array with positions and current price indicator
                              const items: any[] = []
                              
                              sortedPositions.forEach((position: any, posIndex: number) => {
                                // Get RPC tick data for this position to calculate price ranges
                                const positionId = position.positionId
                                const rpcTickData = tickData[positionId]
                                
                                // Use RPC data if available, otherwise fallback to position data
                                const rawLowerPrice = rpcTickData?.lowerPrice || position.rawLowerPrice || 0
                                const rawUpperPrice = rpcTickData?.upperPrice || position.rawUpperPrice || 0
                                const lowerPrice = rawLowerPrice
                                const upperPrice = rawUpperPrice
                                
                                // Determine if position is closed based on the displayed position value and net token amounts
                                const positionValue = position.positionValue || 0
                                const netToken0Amount = position.netToken0Amount || 0
                                const netToken1Amount = position.netToken1Amount || 0
                                const liquidity = position.liquidity || "0"
                                const isLiquidityZero = liquidity === "0" || liquidity === 0 || parseFloat(liquidity) === 0
                                
                                // Debug logging for closed position detection
                                console.log(`[V3 Closed Debug] Position ${position.positionId}:`, {
                                  positionValue,
                                  netToken0Amount,
                                  netToken1Amount,
                                  currentToken0Amount: position.token0Amount,
                                  currentToken1Amount: position.token1Amount,
                                  liquidity,
                                  isLiquidityZero,
                                  debugNetAmounts: position.debugNetAmounts,
                                  isClosed: positionValue < 1 || isLiquidityZero || (Math.abs(netToken0Amount) < 1e-10 && Math.abs(netToken1Amount) < 1e-10 && positionValue < 10),
                                  condition1: positionValue < 1,
                                  condition2: isLiquidityZero,
                                  condition3: Math.abs(netToken0Amount) < 1e-10 && Math.abs(netToken1Amount) < 1e-10 && positionValue < 10
                                })
                                
                                // Position is closed if:
                                // 1. Position value is very low (< $1), OR
                                // 2. Liquidity is 0 (no liquidity remaining), OR
                                // 3. Both net token amounts are dust amounts (very close to 0, including scientific notation)
                                //    AND the position value is also low (not just fees remaining)
                                const isClosed = positionValue < 1 || 
                                               isLiquidityZero ||
                                               (Math.abs(netToken0Amount) < 1e-10 && Math.abs(netToken1Amount) < 1e-10 && positionValue < 10)
                                
                                // Calculate if position is in range using price comparison instead of ticks
                                // Current price should be between rawLowerPrice and rawUpperPrice
                                const currentPoolPrice = parseFloat(token.positions[0]?.token1Price || '0') // Current price from pool
                                
                                // Handle infinite ranges (0 to infinity or very large upper bounds)
                                // Check if upper price is more than 100x higher than current price
                                const upperTick = rpcTickData?.tickUpper
                                const currentPrice = parseFloat(token.positions[0]?.token1Price || '0')
                                
                                // Use the actual RPC-derived upper price for comparison
                                const isInfiniteUpper = rawUpperPrice > currentPrice * 1000 // More than 1000x current price = infinite
                                const isInfiniteLower = rawLowerPrice <= 0
                                
                                const isInRange = (isInfiniteLower || currentPoolPrice >= rawLowerPrice) && 
                                                 (isInfiniteUpper || currentPoolPrice <= rawUpperPrice)
                                
                                console.log(`[V3 RANGE CHECK] Position ${position.positionId}:`, {
                                  currentPoolPrice,
                                  rawLowerPrice,
                                  rawUpperPrice,
                                  upperTick,
                                  isInfiniteUpper,
                                  isInfiniteLower,
                                  isInRange,
                                  comparison: `${currentPoolPrice} >= ${rawLowerPrice} && ${currentPoolPrice} <= ${rawUpperPrice}`,
                                  infiniteLogic: `(${isInfiniteLower} || ${currentPoolPrice} >= ${rawLowerPrice}) && (${isInfiniteUpper} || ${currentPoolPrice} <= ${rawUpperPrice})`,
                                  relativeCheck: `${rawUpperPrice} > ${currentPrice} * 1000 = ${rawUpperPrice > currentPrice * 1000}`
                                })
                                
                                // Add current price indicator before this position if it falls in this range
                                if (posIndex === 0 || (currentPrice >= lowerPrice && currentPrice <= upperPrice)) {
                                  // Check if we haven't already added the current price indicator
                                  const hasCurrentPriceAbove = items.some(item => item.type === 'currentPrice')
                                  if (!hasCurrentPriceAbove && (currentPrice <= lowerPrice || isInRange)) {
                                    items.push({
                                      type: 'currentPrice',
                                      price: currentPrice,
                                      key: `current-price-${posIndex}`
                                    })
                                  }
                                }
                                
                                items.push({
                                  type: 'position',
                                  position,
                                  lowerPrice,
                                  upperPrice,
                                  rawLowerPrice,
                                  rawUpperPrice,
                                  isInRange,
                                  isClosed,
                                  key: position.positionId
                                })
                                
                                // Add current price indicator after last position if it's higher than all ranges
                                if (posIndex === token.positions.length - 1 && currentPrice > upperPrice) {
                                  const hasCurrentPrice = items.some(item => item.type === 'currentPrice')
                                  if (!hasCurrentPrice) {
                                    items.push({
                                      type: 'currentPrice',
                                      price: currentPrice,
                                      key: `current-price-end`
                                    })
                                  }
                                }
                              })
                              
                              return items.map((item) => {
                                if (item.type === 'currentPrice') {
                                  // Skip the old grouped chart - individual positions now have their own charts
                                  return null
                                }
                                
                                // Calculate unclaimed fees for total position value
                                const positionId = item.position.positionId
                                const rpcTickData = tickData[positionId]
                                let totalUnclaimedFeesUSD = 0
                                
                                if (rpcTickData && rpcTickData.tokensOwed0 !== undefined && rpcTickData.tokensOwed1 !== undefined) {
                                  const token0Price = getTokenPrice(item.position.token0Symbol) || 0
                                  const token1Price = getTokenPrice(item.position.token1Symbol) || 0
                                  // tokensOwed0 and tokensOwed1 are now already decimal adjusted from the V3 hook
                                  const unclaimedFeesToken0 = rpcTickData.tokensOwed0
                                  const unclaimedFeesToken1 = rpcTickData.tokensOwed1
                                  const unclaimedFeesToken0USD = unclaimedFeesToken0 * token0Price
                                  const unclaimedFeesToken1USD = unclaimedFeesToken1 * token1Price
                                  totalUnclaimedFeesUSD = unclaimedFeesToken0USD + unclaimedFeesToken1USD
                                }
                                
                                return (
                                  <div key={item.key} className="bg-black/30 rounded-lg p-3">
                                    <div className="space-y-3">
                                      <div className="flex items-center space-x-3">
                                        <div className="text-white text-xl font-medium">
                                          ${formatDollarValue((rpcTickData?.token0Amount || 0) * (getTokenPrice(item.position.token0Symbol) || 0) + 
                                                             (rpcTickData?.token1Amount || 0) * (getTokenPrice(item.position.token1Symbol) || 0) + 
                                                             totalUnclaimedFeesUSD)}
                                        </div>
                                        <div className={`text-xs px-2 py-1 rounded-full ${
                                          item.isClosed
                                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                            : item.isInRange 
                                              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                                              : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                                        }`}>
                                          {item.isClosed ? 'Closed' : `Active: ${item.isInRange ? 'In Range' : 'Out of Range'}`}
                                        </div>
                                        <button 
                                          onClick={() => {
                                            window.open(`https://dex.9mm.pro/liquidity/${item.position.positionId}?chain=pulsechain`, '_blank');
                                          }}
                                          className="flex items-center gap-1 px-2 py-1 border border-cyan-400 rounded-full bg-cyan-400/10 hover:bg-cyan-400/20 transition-colors cursor-pointer text-xs"
                                          title="View position on 9mm.pro"
                                        >
                                          <span className="text-cyan-400">#{item.position.positionId}</span>
                                          <svg className="w-3 h-3 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                          </svg>
                                        </button>
                                        <div className="flex-1"></div>
                                      <button
                                          onClick={() => {
                                          const newExpanded = new Set(expandedV3Positions)
                                            const key = `${token.symbol}-${item.position.positionId}`
                                            if (newExpanded.has(key)) {
                                              newExpanded.delete(key)
                                          } else {
                                              newExpanded.add(key)
                                          }
                                          setExpandedV3Positions(newExpanded)
                                        }}
                                        className="p-1 text-gray-400 hover:text-white transition-colors"
                                        title="Show token breakdown"
                                      >
                                        <ChevronDown 
                                          className={`w-3 h-3 transition-transform duration-200 ${
                                            expandedV3Positions.has(`${token.symbol}-${item.position.positionId}`) ? '' : 'rotate-180'
                                          }`}
                                        />
                                      </button>
                                    </div>
                                    </div>
                                
                                    {/* Nested token breakdown for individual position */}
                                    <AnimatePresence>
                                      {expandedV3Positions.has(`${token.symbol}-${item.position.positionId}`) && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: "auto", opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.15, ease: "easeInOut" }}
                                      className="mt-2 overflow-hidden"
                                    >
                                      {/* Token Breakdown */}
                                      <div className="flex items-center gap-4 mb-4">
                                        {(() => {
                                          const positionKey = `${token.symbol}-${item.position.positionId}`
                                          const isPriceToggled = v3PriceToggles.has(positionKey)
                                          
                                          // Get token prices
                                          const token0Price = getTokenPrice(item.position.token0Symbol) || 0
                                          const token1Price = getTokenPrice(item.position.token1Symbol) || 0
                                          
                                          // Get RPC tick data for this position
                                          const positionId = item.position.positionId
                                          const rpcTickData = tickData[positionId]
                                          
                                          // Debug logging for position #134858
                                          if (positionId === '134858') {
                                            console.log('🔍 [DEBUG] Position #134858 rpcTickData:', rpcTickData)
                                            console.log('🔍 [DEBUG] Position #134858 tokensOwed0:', rpcTickData?.tokensOwed0)
                                            console.log('🔍 [DEBUG] Position #134858 tokensOwed1:', rpcTickData?.tokensOwed1)
                                            console.log('🔍 [DEBUG] Position #134858 netToken0Amount:', item.position.netToken0Amount)
                                            console.log('🔍 [DEBUG] Position #134858 netToken1Amount:', item.position.netToken1Amount)
                                            console.log('🔍 [DEBUG] Position #134858 isClosed:', item.isClosed)
                                          }
                                          
                                          // Use RPC token amounts if available, otherwise fallback to net amounts
                                          let token0Amount = 0
                                          let token1Amount = 0
                                          let unclaimedFeesToken0 = 0
                                          let unclaimedFeesToken1 = 0
                                          
                                          if (rpcTickData && rpcTickData.token0Amount !== undefined && rpcTickData.token1Amount !== undefined) {
                                            // Use the calculated token amounts from RPC
                                            token0Amount = rpcTickData.token0Amount
                                            token1Amount = rpcTickData.token1Amount
                                            
                                            // Get unclaimed fees from RPC data (tokensOwed0/1 are now already decimal adjusted)
                                              unclaimedFeesToken0 = rpcTickData.tokensOwed0
                                              unclaimedFeesToken1 = rpcTickData.tokensOwed1
                                              
                                            // Debug logging for position #134858
                                            if (positionId === '134858') {
                                              console.log('🔍 [DEBUG] Position #134858 using RPC data path')
                                            }
                                          } else {
                                            // Fallback to net amounts if RPC calculation fails
                                            const isPositionClosed = item.isClosed
                                            token0Amount = isPositionClosed ? 0 : (item.position.netToken0Amount || 0)
                                            token1Amount = isPositionClosed ? 0 : (item.position.netToken1Amount || 0)
                                            
                                            // No unclaimed fees if no RPC data (collectedFeesToken0/1 are already claimed fees)
                                              unclaimedFeesToken0 = 0
                                              unclaimedFeesToken1 = 0
                                              
                                            // Debug logging for position #134858
                                            if (positionId === '134858') {
                                              console.log('🔍 [DEBUG] Position #134858 using FALLBACK data path')
                                              console.log('🔍 [DEBUG] Position #134858 fallback token0Amount:', token0Amount)
                                              console.log('🔍 [DEBUG] Position #134858 fallback token1Amount:', token1Amount)
                                            }
                                          }
                                          
                                          // Calculate USD values for both current amounts and unclaimed fees
                                          const token0Value = `$${formatDollarValue(token0Amount * token0Price)}`
                                          const token1Value = `$${formatDollarValue(token1Amount * token1Price)}`
                                          const token0Display = `${formatBalance(token0Amount)} ${getDisplayTicker(item.position.token0Symbol)}`
                                          const token1Display = `${formatBalance(token1Amount)} ${getDisplayTicker(item.position.token1Symbol)}`
                                          
                                          // Calculate unclaimed fees USD values
                                          const unclaimedFeesToken0USD = unclaimedFeesToken0 * token0Price
                                          const unclaimedFeesToken1USD = unclaimedFeesToken1 * token1Price
                                          const totalUnclaimedFeesUSD = unclaimedFeesToken0USD + unclaimedFeesToken1USD
                                          
                                          // Create unclaimed fees displays
                                          const unclaimedFeesToken0Value = `$${formatDollarValue(unclaimedFeesToken0USD)}`
                                          const unclaimedFeesToken1Value = `$${formatDollarValue(unclaimedFeesToken1USD)}`
                                          const unclaimedFeesToken0Display = `${formatBalance(unclaimedFeesToken0)} ${getDisplayTicker(item.position.token0Symbol)}`
                                          const unclaimedFeesToken1Display = `${formatBalance(unclaimedFeesToken1)} ${getDisplayTicker(item.position.token1Symbol)}`
                                          
                                          
                                          // Calculate claimed fees for closed positions
                                          // Claimed fees = collectedFeesToken0/1 - withdrawnToken0/1
                                          // This gives us the actual fees that were claimed (not just the total collected)
                                          const totalWithdrawnToken0 = parseFloat(item.position.withdrawnToken0 || '0')
                                          const totalWithdrawnToken1 = parseFloat(item.position.withdrawnToken1 || '0')
                                          const totalCollectedFeesToken0 = parseFloat(item.position.collectedFeesToken0 || '0')
                                          const totalCollectedFeesToken1 = parseFloat(item.position.collectedFeesToken1 || '0')
                                          
                                          // Calculate actual claimed fees (collected fees minus withdrawn principal)
                                          const claimedFeesToken0 = totalCollectedFeesToken0 - totalWithdrawnToken0
                                          const claimedFeesToken1 = totalCollectedFeesToken1 - totalWithdrawnToken1
                                          
                                          // Enhanced debug logging for claimed fees
                                          console.log(`[CLAIMED FEES DEBUG] Position ${item.position.positionId}:`, {
                                            isClosed: item.isClosed,
                                            positionData: {
                                              withdrawnToken0: item.position.withdrawnToken0,
                                              withdrawnToken1: item.position.withdrawnToken1,
                                              collectedFeesToken0: item.position.collectedFeesToken0,
                                              collectedFeesToken1: item.position.collectedFeesToken1,
                                              depositedToken0: item.position.depositedToken0,
                                              depositedToken1: item.position.depositedToken1
                                            },
                                            calculatedValues: {
                                              totalWithdrawnToken0,
                                              totalWithdrawnToken1,
                                              claimedFeesToken0,
                                              claimedFeesToken1
                                            },
                                            tokenPrices: {
                                              token0Price,
                                              token1Price,
                                              token0Symbol: item.position.token0Symbol,
                                              token1Symbol: item.position.token1Symbol
                                            }
                                          })
                                          
                                          // Calculate claimed fees USD values
                                          const claimedFeesToken0USD = claimedFeesToken0 * token0Price
                                          const claimedFeesToken1USD = claimedFeesToken1 * token1Price
                                          const totalClaimedFeesUSD = claimedFeesToken0USD + claimedFeesToken1USD
                                          
                                          // Debug USD calculations
                                          console.log(`[CLAIMED FEES USD DEBUG] Position ${item.position.positionId}:`, {
                                            claimedFeesToken0,
                                            claimedFeesToken1,
                                            token0Price,
                                            token1Price,
                                            claimedFeesToken0USD,
                                            claimedFeesToken1USD,
                                            totalClaimedFeesUSD
                                          })
                                          
                                          // Create claimed fees displays
                                          const claimedFeesToken0Value = `$${formatDollarValue(claimedFeesToken0USD)}`
                                          const claimedFeesToken1Value = `$${formatDollarValue(claimedFeesToken1USD)}`
                                          const claimedFeesToken0Display = `${formatBalance(claimedFeesToken0)} ${getDisplayTicker(item.position.token0Symbol)}`
                                          const claimedFeesToken1Display = `${formatBalance(claimedFeesToken1)} ${getDisplayTicker(item.position.token1Symbol)}`
                                          
                                          // Debug logging for UI display
                                          console.log(`[V3 UI Debug] Position ${item.position.positionId} display:`, {
                                            calculationMethod: rpcTickData && rpcTickData.token0Amount !== undefined ? "RPC_TOKEN_AMOUNTS" : "NET_AMOUNTS",
                                            token0Amount,
                                            token1Amount,
                                            unclaimedFeesToken0,
                                            unclaimedFeesToken1,
                                            token0Symbol: item.position.token0Symbol,
                                            token1Symbol: item.position.token1Symbol,
                                            // Show comparison between different calculation methods
                                            hookToken0Amount: item.position.token0Amount,
                                            hookToken1Amount: item.position.token1Amount,
                                            netToken0Amount: item.position.netToken0Amount,
                                            netToken1Amount: item.position.netToken1Amount,
                                            // RPC data for comparison
                                            rpcLiquidity: rpcTickData?.liquidity,
                                            rpcToken0Amount: rpcTickData?.token0Amount,
                                            rpcToken1Amount: rpcTickData?.token1Amount,
                                            rpcTokensOwed0: rpcTickData?.tokensOwed0,
                                            rpcTokensOwed1: rpcTickData?.tokensOwed1,
                                            rpcToken0: rpcTickData?.token0,
                                            rpcToken1: rpcTickData?.token1,
                                            rpcFee: rpcTickData?.fee,
                                            rpcCurrentTick: rpcTickData?.currentTick,
                                            currentValue: item.position.currentValue,
                                            token0Price,
                                            token1Price,
                                            unclaimedFeesToken0USD,
                                            unclaimedFeesToken1USD,
                                            totalUnclaimedFeesUSD,
                                            // Claimed fees data
                                            isClosed: item.isClosed,
                                            totalWithdrawnToken0,
                                            totalWithdrawnToken1,
                                            claimedFeesToken0,
                                            claimedFeesToken1,
                                            claimedFeesToken0USD,
                                            claimedFeesToken1USD,
                                            totalClaimedFeesUSD,
                                            debugNetAmounts: item.position.debugNetAmounts
                                          })
                                          
                                          return (
                                            <>
                                              {/* Position Section */}
                                              <div className="py-4">
                                                <div className="text-xs text-gray-400 mb-2">Tokens in lp:</div>
                                                <div className="flex items-center justify-between space-x-2">
                                              <div className="flex items-center space-x-2">
                                                {(() => {
                                                  const originalSymbol = item.position.token0Symbol
                                                  const cleanedSymbol = cleanTickerForLogo(originalSymbol)
                                                  return (
                                                    <CoinLogo
                                                      symbol={cleanedSymbol}
                                                      size="sm"
                                                      className="rounded-none"
                                                    />
                                                  )
                                                })()}
                                                <div>
                                                  <div className="text-white text-xs font-medium">
                                                    {token0Value}
                                                  </div>
                                                  <div className="text-gray-400 text-xs">
                                                    {token0Display}
                                                  </div>
                                                </div>
                                              </div>
                                              
                                              {/* Swap Icon */}
                                              <button
                                                onClick={() => {
                                                  const newToggles = new Set(v3PriceToggles)
                                                  if (newToggles.has(positionKey)) {
                                                    newToggles.delete(positionKey)
                                                  } else {
                                                    newToggles.add(positionKey)
                                                  }
                                                  setV3PriceToggles(newToggles)
                                                }}
                                                className="p-1 rounded-full hover:bg-white/10 transition-colors"
                                                title={isPriceToggled ? `Show chart in ${getDisplayTicker(item.position.token0Symbol)} terms` : `Show chart in ${getDisplayTicker(item.position.token1Symbol)} terms`}
                                              >
                                                <ArrowLeftRight className="w-4 h-4 text-gray-400 hover:text-white transition-colors" />
                                              </button>
                                              
                                              <div className="flex items-center space-x-2">
                                                {(() => {
                                                  const originalSymbol = item.position.token1Symbol
                                                  const cleanedSymbol = cleanTickerForLogo(originalSymbol)
                                                  return (
                                                    <CoinLogo
                                                      symbol={cleanedSymbol}
                                                      size="sm"
                                                      className="rounded-none"
                                                    />
                                                  )
                                                })()}
                                                <div>
                                                  <div className="text-white text-xs font-medium">
                                                    {token1Value}
                                                  </div>
                                                  <div className="text-gray-400 text-xs">
                                                    {token1Display}
                                                      </div>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                              
                                              {/* Unclaimed Fees Section - Only show for active positions */}
                                              {!item.isClosed && (
                                                <div className="ml-14">
                                                  <div className="text-xs text-gray-400 mb-2">Unclaimed fees:</div>
                                                <div className="flex items-start justify-between">
                                                  <div className="flex items-center space-x-2 min-h-[2.5rem]">
                                                    {(() => {
                                                      const originalSymbol = item.position.token0Symbol
                                                      const cleanedSymbol = cleanTickerForLogo(originalSymbol)
                                                      return (
                                                        <CoinLogo
                                                          symbol={cleanedSymbol}
                                                          size="sm"
                                                          className="rounded-none"
                                                        />
                                                      )
                                                    })()}
                                                    <div className="flex flex-col justify-center">
                                                      <div className="text-white text-xs font-medium">
                                                        {unclaimedFeesToken0Value}
                                                      </div>
                                                      <div className="text-gray-400 text-xs">
                                                        {unclaimedFeesToken0Display}
                                                      </div>
                                                    </div>
                                                  </div>
                                                  
                                                  {/* Spacer for alignment */}
                                                  <div className="w-8"></div>
                                                  
                                                  <div className="flex items-center space-x-2 min-h-[2.5rem]">
                                                    {(() => {
                                                      const originalSymbol = item.position.token1Symbol
                                                      const cleanedSymbol = cleanTickerForLogo(originalSymbol)
                                                      return (
                                                        <CoinLogo
                                                          symbol={cleanedSymbol}
                                                          size="sm"
                                                          className="rounded-none"
                                                        />
                                                      )
                                                    })()}
                                                    <div className="flex flex-col justify-center">
                                                      <div className="text-white text-xs font-medium">
                                                        {unclaimedFeesToken1Value}
                                                      </div>
                                                      <div className="text-gray-400 text-xs">
                                                        {unclaimedFeesToken1Display}
                                                      </div>
                                                    </div>
                                                  </div>
                                                </div>
                                              </div>
                                              )}
                                              
                                              {/* Claimed Fees Section - Only show for closed positions */}
                                              {item.isClosed && (
                                                <div className="ml-14 mt-3">
                                                  <div className="text-xs text-gray-400 mb-2">Claimed fees:</div>
                                                  <div className="flex items-start justify-between">
                                                    <div className="flex items-center space-x-2 min-h-[2.5rem]">
                                                      {(() => {
                                                        const originalSymbol = item.position.token0Symbol
                                                        const cleanedSymbol = cleanTickerForLogo(originalSymbol)
                                                        return (
                                                          <CoinLogo
                                                            symbol={cleanedSymbol}
                                                            size="sm"
                                                            className="rounded-none"
                                                          />
                                                        )
                                                      })()}
                                                      <div className="flex flex-col justify-center">
                                                        <div className="text-white text-xs font-medium">
                                                          {claimedFeesToken0Value}
                                                        </div>
                                                        <div className="text-gray-400 text-xs">
                                                          {claimedFeesToken0Display}
                                                        </div>
                                                      </div>
                                                    </div>
                                                    
                                                    {/* Spacer for alignment */}
                                                    <div className="w-8"></div>
                                                    
                                                    <div className="flex items-center space-x-2 min-h-[2.5rem]">
                                                      {(() => {
                                                        const originalSymbol = item.position.token1Symbol
                                                        const cleanedSymbol = cleanTickerForLogo(originalSymbol)
                                                        return (
                                                          <CoinLogo
                                                            symbol={cleanedSymbol}
                                                            size="sm"
                                                            className="rounded-none"
                                                          />
                                                        )
                                                      })()}
                                                      <div className="flex flex-col justify-center">
                                                        <div className="text-white text-xs font-medium">
                                                          {claimedFeesToken1Value}
                                                        </div>
                                                        <div className="text-gray-400 text-xs">
                                                          {claimedFeesToken1Display}
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </div>
                                                </div>
                                              )}
                                            </>
                                          )
                                        })()}
                                      </div>
                                      
                                      {/* Individual Position Price Range Chart */}
                                      {(() => {
                                        
                                        // Get current price from pool data (always available)
                                        const currentPrice = parseFloat(token.positions[0]?.token1Price || '0')
                                        const priceUnit = token.positions[0]?.token1Symbol || 'TOKEN'
                                        
                                        // Show chart if we have valid price range data
                                        if (!(item.rawLowerPrice > 0 && item.rawUpperPrice > 0)) {
                                          const statusMessage = (() => {
                                            const source = item.position.tickDataSource
                                            switch (source) {
                                              case 'LOADING': return 'Loading price range data...'
                                              case 'ERROR': return 'Error loading price range'
                                              case 'PENDING': return 'Fetching price range...'
                                              default: return 'Price range data unavailable'
                                            }
                                          })()
                                          
                                          return (
                                            <div className="mt-2">
                                            <div className="text-xs text-gray-500 italic text-center py-2">
                                              {statusMessage}
                                              </div>
                                              {/* Show current price even when range data is missing */}
                                              <div className="text-center">
                                                <div className="text-green-400 text-xs font-medium">
                                                  Current Price: {currentPrice.toPrecision(4)} {priceUnit}
                                                </div>
                                              </div>
                                            </div>
                                          )
                                        }
                                        
                                        return (() => {
                                        // Check if this position has price toggle enabled
                                        const positionKey = `${token.symbol}-${item.position.positionId}`
                                        const isPriceToggled = v3PriceToggles.has(positionKey)
                                        
                                        // Get base prices (always in token1/token0 terms originally)
                                        const baseLowerPrice = item.rawLowerPrice
                                        const baseUpperPrice = item.rawUpperPrice
                                        const baseCurrentPrice = parseFloat(token.positions[0]?.token1Price || '0')
                                        
                                        
                                        // Convert prices based on toggle state
                                        let displayCurrentPrice, displayLowerPrice, displayUpperPrice, priceUnit
                                        
                                        if (isPriceToggled) {
                                          // Show in token0/token1 terms (inverted)
                                          displayCurrentPrice = baseCurrentPrice > 0 ? 1 / baseCurrentPrice : 0
                                          displayLowerPrice = baseUpperPrice > 0 ? 1 / baseUpperPrice : 0  // Note: inverted range
                                          displayUpperPrice = baseLowerPrice > 0 ? 1 / baseLowerPrice : 0  // Note: inverted range
                                          priceUnit = getDisplayTicker(item.position.token0Symbol)
                                        } else {
                                          // Show in token1/token0 terms (default)
                                          displayCurrentPrice = baseCurrentPrice
                                          displayLowerPrice = baseLowerPrice
                                          displayUpperPrice = baseUpperPrice
                                          priceUnit = getDisplayTicker(item.position.token1Symbol)
                                        }
                                        
                                        // Calculate chart bounds to center the range and current price
                                        const rangeSize = displayUpperPrice - displayLowerPrice
                                        const currentPrice = displayCurrentPrice
                                        
                                        // Find the center point of the range and current price
                                        const rangeCenter = (displayLowerPrice + displayUpperPrice) / 2
                                        const centerPoint = (rangeCenter + currentPrice) / 2
                                        
                                        // Calculate padding to ensure good visibility (30% of the range or current price, whichever is larger)
                                        const padding = Math.max(rangeSize * 0.3, Math.abs(currentPrice) * 0.2, rangeSize * 0.1)
                                        
                                        // Calculate min and max prices centered around the center point
                                        const minPrice = Math.max(0, centerPoint - padding)
                                        const rawMaxPrice = centerPoint + padding
                                        
                                        const maxPrice = (() => {
                                          // Use 1 significant figure for max price
                                          if (rawMaxPrice === 0) return 1
                                          
                                          // Find the order of magnitude
                                          const magnitude = Math.floor(Math.log10(Math.abs(rawMaxPrice)))
                                          const firstDigit = Math.ceil(rawMaxPrice / Math.pow(10, magnitude))
                                          
                                          // Return the rounded value with 1 significant figure
                                          const result = firstDigit * Math.pow(10, magnitude)
                                          
                                          // For very small values, use more precision (no 0.01 minimum)
                                          if (result < 1 && rawMaxPrice > 0) {
                                            return Math.ceil(rawMaxPrice * 1000) / 1000  // More precision for small values
                                          }
                                          
                                          // For values between 1-10, use more precision to avoid rounding down too much
                                          if (result >= 1 && result < 10 && rawMaxPrice > result) {
                                            return Math.ceil(rawMaxPrice * 100) / 100  // Round up to nearest 0.01
                                          }
                                          
                                          // For values around 1-2, be more conservative with rounding
                                          if (result >= 1 && result <= 2 && rawMaxPrice > result * 0.9) {
                                            return Math.ceil(rawMaxPrice * 100) / 100  // Round up to nearest 0.01
                                          }
                                          
                                          return result
                                        })()
                                        
                                        // Check if the range should be considered infinite
                                        // Check if this is an infinite range using relative price comparison
                                        const positionId = item.position.positionId
                                        const rpcTickData = tickData[positionId]
                                        const upperTick = rpcTickData?.tickUpper
                                        
                                        // Use the actual RPC-derived upper price for comparison
                                        const isInfiniteRange = displayUpperPrice > currentPrice * 1000 // More than 1000x current price = infinite
                                        const isInfiniteLower = displayLowerPrice <= 0
                                        
                                        
                                        
                                        // Debug: Log position data to understand what's missing
                                        console.log(`[V3 Chart Render Debug] Position ${item.position.positionId || item.position.id}:`, {
                                          rawLowerPrice: item.rawLowerPrice,
                                          rawUpperPrice: item.rawUpperPrice,
                                          displayLowerPrice,
                                          displayUpperPrice,
                                          upperTick,
                                          currentPrice,
                                          isInfiniteRange,
                                          hasValidRange: item.rawLowerPrice > 0 && item.rawUpperPrice > 0,
                                          tickDataSource: item.position.tickDataSource,
                                          realTickLower: item.position.realTickLower,
                                          realTickUpper: item.position.realTickUpper,
                                          relativeCheck: `${displayUpperPrice} > ${currentPrice} * 1000 = ${displayUpperPrice > currentPrice * 1000}`
                                        })
                                        
                                        const priceRange = maxPrice - minPrice
                                        
                                        // Calculate percentages - handle infinite ranges
                                        let lowerPercent, upperPercent, width
                                        
                                        if (isInfiniteRange && isInfiniteLower) {
                                          // 0 to infinity range - entire bar should be green
                                          lowerPercent = 0
                                          upperPercent = 100
                                          width = 100
                                        } else if (isInfiniteRange) {
                                          // Finite lower, infinite upper - extend to end of bar
                                          lowerPercent = priceRange > 0 ? ((displayLowerPrice - minPrice) / priceRange) * 100 : 0
                                          upperPercent = 100
                                          width = 100 - lowerPercent
                                        } else if (isInfiniteLower) {
                                          // 0 to finite upper - start from beginning
                                          lowerPercent = 0
                                          upperPercent = priceRange > 0 ? ((displayUpperPrice - minPrice) / priceRange) * 100 : 100
                                          width = upperPercent
                                        } else {
                                          // Normal finite range with padding
                                          // Ensure we use the actual range values, not 0
                                          const actualLowerPrice = Math.max(displayLowerPrice, minPrice + 0.001) // Ensure it's not 0
                                          const actualUpperPrice = Math.min(displayUpperPrice, maxPrice)
                                          
                                          lowerPercent = priceRange > 0 ? ((actualLowerPrice - minPrice) / priceRange) * 100 : 0
                                          upperPercent = priceRange > 0 ? ((actualUpperPrice - minPrice) / priceRange) * 100 : 100
                                          width = upperPercent - lowerPercent
                                        }
                                        
                                        
                                        
                                        // Position current price on the chart
                                        const currentPricePercent = isInfiniteRange ? 50 : (priceRange > 0 ? ((displayCurrentPrice - minPrice) / priceRange) * 100 : 50)
                                        
                                        console.log(`[V3 Chart Debug] Position ${item.position.positionId}:`, {
                                          rawLowerPrice: item.rawLowerPrice,
                                          rawUpperPrice: item.rawUpperPrice,
                                          currentPrice,
                                          maxPrice,
                                          rawMaxPrice,
                                          priceRange,
                                          isInfiniteRange,
                                          isInfiniteLower,
                                          lowerPercent,
                                          upperPercent,
                                          currentPricePercent,
                                          width,
                                          hasRealData: item.rawLowerPrice > 0 && item.rawUpperPrice > 0,
                                          rangeType: isInfiniteRange && isInfiniteLower ? '0-to-infinity' : isInfiniteRange ? 'finite-to-infinity' : 'finite'
                                        })
                                        
                                        // Format very large or very small numbers appropriately
                                        const formatTickPrice = (price: number) => {
                                          if (price === 0) return '0'
                                          if (price < 0.000001) return price.toExponential(2)
                                          if (price > 1000000) return price.toExponential(2)
                                          if (price < 0.01) return price.toFixed(6)
                                          if (price < 1) return price.toFixed(4)
                                          if (price < 1000) return price.toFixed(2)
                                          return price.toLocaleString(undefined, { maximumFractionDigits: 0 })
                                        }
                                        
                                        // Handle infinite ranges for display
                                        // Hide lower price if it's 100x smaller than current price (essentially zero)
                                        const isLowerPriceTooSmall = displayLowerPrice < currentPrice / 100
                                        const lowerDisplay = isInfiniteLower || isLowerPriceTooSmall ? "0" : formatTickPrice(displayLowerPrice)
                                        const upperDisplay = isInfiniteRange ? "∞" : formatTickPrice(displayUpperPrice)
                                        
                                        // Calculate if labels would overlap
                                        // Estimate character width (~6px) and add padding
                                        const lowerWidth = lowerDisplay.length * 6 + 10
                                        const upperWidth = upperDisplay.length * 6 + 10
                                        const chartWidth = 300 // Approximate chart width
                                        const lowerPos = (lowerPercent / 100) * chartWidth
                                        const upperPos = (upperPercent / 100) * chartWidth
                                        const wouldOverlap = (upperPos - lowerPos) < (lowerWidth/2 + upperWidth/2)
                                        
                                        return (
                                          <div className="mb-3">
                                            {wouldOverlap ? (
                                              // Show hover popup when labels would overlap
                                              <>
                                                <div className="mb-2 h-4"></div>
                                                <div className="relative w-full h-4 bg-white/10 rounded-full overflow-visible group cursor-pointer">
                                                  {/* Hover popup - centered over the range bar */}
                                                  <div 
                                                    className="absolute -top-8 transform -translate-x-1/2  border-2 border-white/10 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10"
                                                    style={{ left: `${lowerPercent + width/2}%` }}
                                                  >
                                                    {lowerDisplay} - {isInfiniteRange ? '' : upperDisplay}
                                                  </div>
                                              {/* Position range bar */}
                                              <div
                                                className={`absolute h-full rounded-full ${
                                                  item.isClosed
                                                    ? 'bg-red-500/40'
                                                    : item.isInRange
                                                      ? 'bg-green-500/40'
                                                      : 'bg-yellow-500/40'
                                                }`}
                                                style={{
                                                  left: `${lowerPercent}%`,
                                                  width: `${width}%`
                                                }}
                                              />
                                              {/* Current price indicator - green line */}
                                              <div
                                                className="absolute top-0 w-0.5 h-full bg-green-400"
                                                style={{ left: `${currentPricePercent}%` }}
                                              />
                                                </div>
                                              </>
                                            ) : (
                                              // Show labels directly on chart when they won't overlap
                                              <>
                                                <div className="relative text-xs text-gray-400 mb-2 h-4 flex items-center">
                                                  {/* Min Range - Positioned at Left Edge of Range Bar - Only show if not "0" */}
                                                  {lowerDisplay !== "0" && (
                                                    <div 
                                                      className="absolute text-[10px] text-gray-500"
                                                      style={{ 
                                                        left: `${Math.max(5, lowerPercent)}%`, // Ensure at least 5% from edge
                                                        transform: 'translateX(-50%)'
                                                      }}
                                                    >
                                                      {lowerDisplay}
                                                    </div>
                                                  )}
                                                  
                                                  {/* Max Range - Positioned at Right Edge of Range Bar or Center for Infinity - Only show if not "∞" */}
                                                  {upperDisplay !== "∞" && (
                                                    <div 
                                                      className="absolute text-[10px] text-gray-500"
                                                      style={{ 
                                                        left: isInfiniteRange ? '50%' : `${Math.min(95, upperPercent)}%`, // Center for infinity, otherwise right edge with padding
                                                        transform: 'translateX(-50%)'
                                                      }}
                                                    >
                                                      {upperDisplay}
                                                    </div>
                                                  )}
                                                </div>
                                                <div className="relative w-full h-4 bg-white/10 rounded-full overflow-hidden">
                                                  {/* Position range bar */}
                                                  <div
                                                    className={`absolute h-full rounded-full ${
                                                      item.isClosed
                                                        ? 'bg-red-500/40'
                                                        : item.isInRange
                                                          ? 'bg-green-500/40'
                                                          : 'bg-yellow-500/40'
                                                    }`}
                                                    style={{
                                                      left: `${lowerPercent}%`,
                                                      width: `${width}%`
                                                    }}
                                                  />
                                              {/* Current price indicator */}
                                              <div
                                                className="absolute top-0 w-0.5 h-full bg-green-400"
                                                style={{ left: `${currentPricePercent}%` }}
                                              />
                                            </div>
                                              </>
                                            )}
                                            
                                            {/* Price labels */}
                                            <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                                              <span>0</span>
                                              <span>{isInfiniteRange ? '∞' : (() => {
                                                // Format max price to 1 significant figure
                                                if (maxPrice < 0.01) return maxPrice.toExponential(0)
                                                if (maxPrice < 0.1) return maxPrice.toFixed(2)
                                                if (maxPrice < 1) return maxPrice.toFixed(1)
                                                if (maxPrice < 10) return maxPrice.toFixed(0)
                                                return maxPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })
                                              })()}</span>
                                            </div>
                                            
                                            {/* Current price label - positioned directly under green line */}
                                            <div className="relative -mt-1">
                                              <div
                                                className="absolute transform -translate-x-1/2 text-green-400 text-[10px] font-medium"
                                                style={{ left: `${currentPricePercent}%` }}
                                              >
                                                {displayCurrentPrice.toPrecision(4)} {priceUnit}
                                              </div>
                                            </div>
                                          </div>
                                        )
                                        })()
                                      })()}
                                      
                                      {/* Divider after chart */}
                                      <div className="mt-8 pt-2 border-t border-white/10"></div>
                                    </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                )
                              })
                            })()}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    
                    {/* Underlying Tokens Breakdown */}
                    <AnimatePresence>
                      {underlyingTokens && !isGroupedV3 && expandedLPTokens.has(token.symbol) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeInOut" }}
                          className="px-4 pb-3 border-t border-white/5 overflow-hidden"
                        >
                          <div className="text-xs text-gray-400 mb-2 mt-2">Your share of underlying tokens:</div>
                          {/* Handle PHUX pools (multi-token) vs PulseX pools (2-token) */}
                          {underlyingTokens.tokens ? (
                            /* PHUX pools - display tokens in a single row */
                            <div className="flex flex-wrap gap-4">
                              {underlyingTokens.tokens.map((tokenData, index) => (
                                <div key={index} className="flex items-center space-x-2">
                                  <CoinLogo
                                    symbol={cleanTickerForLogo(tokenData.symbol)}
                                    size="sm"
                                    className="rounded-none"
                                  />
                                  <div>
                                    {(() => {
                                      const tokenPrice = getTokenPrice(tokenData.symbol)
                                      // Use the calculated USD value from the composition data
                                      const tokenUsdValue = tokenData.usdValue || (tokenData.amount * tokenPrice)
                                      return tokenUsdValue > 0 ? (
                                        <div className="text-white text-xs font-medium">
                                          ${formatDollarValue(tokenUsdValue)}
                                        </div>
                                      ) : (
                                        <div className="text-red-400 text-xs">
                                          No price data for {tokenData.symbol}
                                        </div>
                                      )
                                    })()}
                                    <div className="text-gray-400 text-xs">
                                      {formatBalance(tokenData.amount)} {getDisplayTicker(tokenData.symbol)}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            /* PulseX pools - display tokens in a single row like PHUX pools */
                            <div className="flex flex-wrap gap-4">
                              <div className="flex items-center space-x-2">
                                <CoinLogo
                                  symbol={underlyingTokens.token0.symbol}
                                  size="sm"
                                  className="rounded-none"
                                />
                                <div>
                                  {(() => {
                                    const token0Price = getTokenPrice(underlyingTokens.token0.symbol)
                                    const token0UsdValue = underlyingTokens.token0.amount * token0Price
                                    console.log(`[LP Token0 Price] ${underlyingTokens.token0.symbol}: price=${token0Price}, amount=${underlyingTokens.token0.amount}, usdValue=${token0UsdValue}`)
                                    return token0Price > 0 ? (
                                      <div className="text-white text-xs font-medium">
                                        ${formatDollarValue(token0UsdValue)}
                                      </div>
                                    ) : (
                                      <div className="text-red-400 text-xs">
                                        No price data for {underlyingTokens.token0.symbol}
                                      </div>
                                    )
                                  })()}
                                  <div className="text-gray-400 text-xs">
                                    {formatBalance(underlyingTokens.token0.amount)} {getDisplayTicker(underlyingTokens.token0.symbol)}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <CoinLogo
                                  symbol={underlyingTokens.token1.symbol}
                                  size="sm"
                                  className="rounded-none"
                                />
                                <div>
                                  {(() => {
                                    const token1Price = getTokenPrice(underlyingTokens.token1.symbol)
                                    const token1UsdValue = underlyingTokens.token1.amount * token1Price
                                    console.log(`[LP Token1 Price] ${underlyingTokens.token1.symbol}: price=${token1Price}, amount=${underlyingTokens.token1.amount}, usdValue=${token1UsdValue}`)
                                    return token1Price > 0 ? (
                                      <div className="text-white text-xs font-medium">
                                        ${formatDollarValue(token1UsdValue)}
                                      </div>
                                    ) : (
                                      <div className="text-red-400 text-xs">
                                        No price data for {underlyingTokens.token1.symbol}
                                      </div>
                                    )
                                  })()}
                                  <div className="text-gray-400 text-xs">
                                    {formatBalance(underlyingTokens.token1.amount)} {getDisplayTicker(underlyingTokens.token1.symbol)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          </div>
        </Section>
      )}

      {/* Farms Section */}
      {showLiquidityPositions && includeLiquidityPositionsFilter && isEverythingReady && farmTokensWithBalances.length > 0 && (
        <Section 
          {...(showMotion ? {
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 },
            transition: { 
              duration: 0.5,
              delay: 0.47,
              ease: [0.23, 1, 0.32, 1]
            }
          } : {})}
          className="max-w-[860px] w-full"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white">Farms</h3>
          </div>
          
          <div className="bg-black/60 backdrop-blur-md border-2 border-white/10 rounded-2xl p-1 sm:p-6">
            <div className="space-y-3">
              {farmTokensWithBalances.map((token, tokenIndex) => {
                const tokenPrice = getLPTokenPrice(token.symbol) || 0
                  
                const farmKey = `${token.chain}-${token.symbol}-${token.address || 'farm'}`
                // Look for token in all sources: TOKEN_CONSTANTS, MORE_COINS, and custom tokens
                const allTokensForConfig = [...TOKEN_CONSTANTS, ...MORE_COINS, ...(customTokens || [])]
                const tokenConfig = allTokensForConfig.find(t => t.ticker === token.symbol)
                
                const displayAmount = token.balanceFormatted !== null ? formatBalance(token.balanceFormatted) : '?'
                const usdValue = token.balanceFormatted ? token.balanceFormatted * tokenPrice : 0
                
                // Calculate underlying tokens using LP method since farms use LP pricing
                const underlyingTokens = calculateLPUnderlyingTokens(token.symbol, token.balanceFormatted || 0)
                
                // Calculate pool ownership percentage using LP data
                const lpData = lpTokenData[token.symbol]
                let poolOwnershipPercentage = null
                
                if (lpData && lpData.totalSupply && token.balanceFormatted) {
                  poolOwnershipPercentage = (token.balanceFormatted / parseFloat(lpData.totalSupply)) * 100
                }
                
                return (
                  <div key={farmKey}>
                    {/* Main Farm Token Row */}
                    <div className="grid grid-cols-[minmax(20px,auto)_2fr_1fr_2fr_minmax(20px,auto)] xs:grid-cols-[minmax(20px,auto)_1fr_1fr_1fr_minmax(20px,auto)] sm:grid-cols-[minmax(20px,auto)_2fr_1fr_1fr_minmax(60px,auto)_2fr_minmax(40px,auto)] items-center gap-2 sm:gap-4 border-b border-white/10 mx-2 sm:mx-4 py-4 last:border-b-0 overflow-hidden">
                      
                      {/* Chain Icon - Furthest Left Column */}
                      <div className="flex space-x-2 items-center justify-center min-w-[18px]">
                        <CoinLogo
                          symbol="PLS-white"
                          size="sm"
                          className="grayscale opacity-50"
                        />
                      </div>
                      
                      {/* Token Info - Left Column */}
                      <div className="flex items-center space-x-2 sm:space-x-3 min-w-[70px] md:min-w-[140px] overflow-hidden">
                        <div className="flex-shrink-0">
                          {(() => {
                            // Check if this is a multi-token farm pair (contains " / ") or single token farm
                            const hasMultipleTokens = token.symbol.includes(' / ') || token.symbol.includes('\\/')
                            
                            if (!hasMultipleTokens) {
                              // Single token farm - use the cleaned ticker for logo
                              const cleanedSymbol = cleanTickerForLogo(token.symbol)
                              return (
                                <div className="w-8 h-8 flex items-center justify-center">
                                  <CoinLogo 
                                    symbol={cleanedSymbol} 
                                    size="lg" 
                                    className="w-8 h-8"
                                    customImageUrl={customTokens.find(t => t.ticker === cleanedSymbol)?.logoUrl}
                                  />
                                </div>
                              )
                            }
                            
                            // Extract token symbols from farm pair name
                            // Handle both "HEX / PLS" and "USDT  \/ USDC \/ DAI" formats
                            const tokenSymbols = token.symbol.includes('\\/')
                              ? token.symbol.split(/\s*\\\/ \s*/) // Split on \/ with optional spaces
                              : token.symbol.split(' / ')
                            
                            // Clean up all token symbols for logo lookup using centralized logic
                            const cleanedSymbols = tokenSymbols.map(symbol => cleanTickerForLogo(symbol || 'PLS'))
                            
                            const token0Symbol = cleanedSymbols[0] || 'PLS'
                            const token1Symbol = cleanedSymbols[1] || 'HEX'
                            const token2Symbol = cleanedSymbols[2]
                            
                            // Handle 3-token pools with triangle layout (same as LP section)
                            if (token2Symbol) {
                              return (
                                <div className="relative w-8 h-8">
                                  {/* First token (top center) */}
                                  <div className="absolute top-0 left-1.5 w-5 h-5">
                                    <CoinLogo
                                      symbol={token0Symbol}
                                      size="sm"
                                      className="w-5 h-5 rounded-full"
                                    />
                                  </div>
                                  {/* Second token (bottom left) */}
                                  <div className="absolute top-3 left-0 w-5 h-5">
                                    <CoinLogo
                                      symbol={token1Symbol}
                                      size="sm"
                                      className="w-5 h-5 rounded-full"
                                    />
                                  </div>
                                  {/* Third token (bottom right) */}
                                  <div className="absolute top-3 left-3 w-5 h-5">
                                    <CoinLogo
                                      symbol={token2Symbol}
                                      size="sm"
                                      className="w-5 h-5 rounded-full"
                                    />
                                  </div>
                                </div>
                              )
                            }
                            
                            // Regular 2-token farm layout (same as LP section)
                            return (
                              <div className="relative w-8 h-8">
                                {/* First token (back) */}
                                <div className="absolute top-0 left-0 w-6 h-6">
                                  <CoinLogo
                                    symbol={token0Symbol}
                                    size="sm"
                                    className="w-6 h-6 border border-black/20 rounded-full"
                                  />
                                </div>
                                {/* Second token (front, overlapping) */}
                                <div className="absolute top-2 left-2.5 w-6 h-6">
                                  <CoinLogo
                                    symbol={token1Symbol}
                                    size="sm"
                                    className="w-6 h-6 border border-black/20 rounded-full"
                                  />
                                </div>
                              </div>
                            )
                          })()}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="text-white font-medium text-sm md:text-md break-words">
                            {getDisplayTicker(token.symbol)}
                          </div>
                          <div className="text-gray-400 text-[10px] break-words leading-tight">
                            <span className="sm:hidden">{displayAmount} tokens</span>
                            <span className="hidden sm:block">{tokenConfig?.name || `${getDisplayTicker(token.symbol)} Farm`}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Price Column - Hidden on Mobile */}
                      <div className="hidden sm:block text-center">
                        <div className="text-gray-400 text-xs font-medium">
                          {tokenPrice === 0 ? '--' : `$${formatLPTokenPrice(tokenPrice)}`}
                        </div>
                      </div>

                      {/* 24h Price Change Column - Pool Ownership on Mobile */}
                      <div className="text-center">
                        <div className="text-gray-400 text-xs sm:hidden">--</div>
                      </div>

                      {/* League Column - Pool Ownership Percentage on Desktop */}
                      <div className="hidden sm:flex flex-col items-center justify-center min-w-[60px]">
                        <div className="text-gray-400 text-xs">--</div>
                      </div>
                      
                      {/* Value - Right Column */}
                      <div className="text-right overflow-hidden">
                        <div className="text-white font-medium text-sm md:text-lg transition-all duration-200">
                          ${formatDollarValue(usdValue)}
                        </div>
                        <div className="text-gray-400 text-[10px] mt-0.5 hidden sm:block transition-all duration-200">
                          {displayAmount && `${displayAmount} tokens`}
                        </div>
                      </div>
                      
                      {/* Expand Icon */}
                      <div className="flex justify-center min-w-[20px]">
                        {underlyingTokens && Array.isArray(underlyingTokens) && underlyingTokens.length > 0 && (
                          <button className="text-zinc-500 hover:text-white transition-colors">
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Underlying Tokens Display */}
                    {underlyingTokens && Array.isArray(underlyingTokens) && underlyingTokens.length > 0 && (
                      <div className="mx-2 sm:mx-4 pb-4 pt-2">
                        <div className="text-xs text-zinc-500 mb-2">Your share of underlying tokens:</div>
                        <div className="grid grid-cols-2 gap-2">
                          {underlyingTokens.map((underlying, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-white/5 rounded-lg p-2">
                              <div className="flex items-center space-x-2">
                                <CoinLogo 
                                  symbol={underlying.symbol} 
                                  size="sm" 
                                  className="w-4 h-4"
                                />
                                <span className="text-xs text-white">{underlying.symbol}</span>
                              </div>
                              <div className="text-right">
                                <div className="text-xs text-white font-medium">
                                  ${formatDollarValue(underlying.value)}
                                </div>
                                <div className="text-xs text-zinc-500">
                                  {formatBalance(underlying.amount)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </Section>
      )}

      {/* Validators Section */}
      {effectiveAddresses.length > 0 && isEverythingReady && !detectiveMode && showValidators && includeValidatorsFilter && validatorCount > 0 && (chainFilter === 'pulsechain' || chainFilter === 'both') && (
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
            <Card className="bg-black/60 backdrop-blur-md text-white p-4 rounded-xl border-2 border-white/10">
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
      {effectiveAddresses.length > 0 && isEverythingReady && showHexStakes && (hasStakes || hasHsiStakes) && (
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
              
              {/* Stakes Type Tabs - only show HSI tab if toggle is enabled */}
              {includePooledStakes ? (
                <div className="flex bg-black/50 backdrop-blur-xl border border-white/20 rounded-full p-1">
                  <button
                    onClick={() => setActiveStakesTab('native')}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                      activeStakesTab === 'native' 
                        ? 'bg-white text-black' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    NATIVE
                  </button>
                  <button
                    onClick={() => setActiveStakesTab('hsi')}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                      activeStakesTab === 'hsi' 
                        ? 'bg-white text-black' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    HSI
                  </button>
                </div>
              ) : (
                <div className="px-3 py-1 rounded-full text-xs font-medium bg-white text-black">
                  NATIVE
                </div>
              )}
              
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
            <div className="mb-6 p-4 bg-black/50 backdrop-blur-xl border-2 border-white/10 rounded-lg">
              {(() => {
                // Calculate total liquid HEX and eHEX (only direct HEX tokens)
                const liquidHexStats = sortedTokens.reduce((acc, token) => {
                  // Find the token configuration to determine the chain
                  const tokenConfig = TOKEN_CONSTANTS.find(config => config.ticker === token.symbol)
                  
                  if (token.symbol === 'HEX' || token.symbol === 'eHEX' || token.symbol === 'weHEX') {
                    // Check if it's an Ethereum-based HEX token (chain 1 or name contains "Eth")
                    const isEthereumHex = tokenConfig?.chain === 1 || 
                                         tokenConfig?.name?.includes('Eth') ||
                                         token.symbol === 'eHEX'
                    
                    if (isEthereumHex) {
                      // Ethereum HEX tokens (eHEX, or any HEX "on Eth")
                      acc.eHexAmount += token.balanceFormatted
                      acc.eHexValue += token.balanceFormatted * getTokenPrice(token.symbol)
                    } else {
                      // PulseChain HEX tokens (HEX "on Pls", weHEX)
                      acc.hexAmount += token.balanceFormatted
                      acc.hexValue += token.balanceFormatted * getTokenPrice(token.symbol)
                    }
                  }
                  return acc
                }, { hexAmount: 0, hexValue: 0, eHexAmount: 0, eHexValue: 0 })

                // Calculate total staked HEX (ONLY ACTIVE STAKES) - include HSI only if toggle is enabled
                const stakedHexStats = (() => {
                  // Get all active native stakes with filtering
                  const activeNativeStakes = (hexStakes || []).filter(stake => {
                    if (stake.status !== 'active') return false
                    
                    const addressObj = effectiveAddresses.find(addr => addr.address.toLowerCase() === stake.address.toLowerCase())
                    if (addressObj && removedAddressIds.has(addressObj.id)) return false
                    
                    const addressMatch = selectedAddressIds.length > 0 
                      ? selectedAddressIds.some(id => effectiveAddresses.find(addr => addr.id === id && addr.address.toLowerCase() === stake.address.toLowerCase()))
                      : true
                    
                    const chainMatch = detectiveMode 
                      ? stake.chain === 'PLS' 
                      : (chainFilter === 'both' || 
                         (chainFilter === 'ethereum' && stake.chain === 'ETH') ||
                         (chainFilter === 'pulsechain' && stake.chain === 'PLS'))
                    
                    return addressMatch && chainMatch
                  })

                  // Get all active HSI stakes with filtering - only if toggle is enabled
                  const activeHsiStakesList = includePooledStakes ? (hsiStakes || []).filter(stake => {
                    if (stake.status !== 'active') return false
                    
                    const addressObj = effectiveAddresses.find(addr => addr.address.toLowerCase() === stake.address.toLowerCase())
                    if (addressObj && removedAddressIds.has(addressObj.id)) return false
                    
                    const addressMatch = selectedAddressIds.length > 0 
                      ? selectedAddressIds.some(id => effectiveAddresses.find(addr => addr.id === id && addr.address.toLowerCase() === stake.address.toLowerCase()))
                      : true
                    
                    const chainMatch = detectiveMode 
                      ? stake.chain === 'PLS' 
                      : (chainFilter === 'both' || 
                         (chainFilter === 'ethereum' && stake.chain === 'ETH') ||
                         (chainFilter === 'pulsechain' && stake.chain === 'PLS'))
                    
                    return addressMatch && chainMatch
                  }) : []

                  // Combine native and HSI stakes for total calculation
                  const allActiveStakes = [...activeNativeStakes, ...activeHsiStakesList]
                  
                  return allActiveStakes.reduce((acc, stake) => {
                  let stakeHex;
                  if (useEESValue && stake.status === 'active') {
                    stakeHex = calculateEESValueWithDate(stake)
                  } else if (useTimeShift) {
                    // Use Time-Shift calculation for projected future yield
                    const projectedDetails = calculateEESDetailsWithDate(stake);
                    stakeHex = stake.principleHex + projectedDetails.payout;
                  } else {
                    stakeHex = stake.principleHex + stake.yieldHex
                  }
                  if (stake.chain === 'ETH') {
                    acc.eHexAmount += stakeHex
                    acc.eHexValue += stakeHex * getTokenPrice('eHEX')
                  } else {
                    acc.hexAmount += stakeHex
                    acc.hexValue += stakeHex * getTokenPrice('HEX')
                  }
                  return acc
                }, { hexAmount: 0, hexValue: 0, eHexAmount: 0, eHexValue: 0 })
                })()

                // Add pooled stakes to staked HEX if enabled
                if (includePooledStakes) {
                  stakedHexStats.hexAmount += pooledStakesData.totalHex || 0
                  stakedHexStats.eHexAmount += pooledStakesData.totalEHex || 0
                  stakedHexStats.hexValue += pooledStakesData.totalHexValue || 0
                  stakedHexStats.eHexValue += pooledStakesData.totalEHexValue || 0
                }

                const totalLiquidValue = liquidHexStats.hexValue + liquidHexStats.eHexValue
                // Calculate staked value using market prices (respecting MAXI toggle)
                const allActiveSoloValue = (() => {
                  // Get filtered native stakes
                  const filteredNativeStakes = (hexStakes || []).filter(stake => {
                    if (stake.status !== 'active') return false
                    
                    const addressObj = effectiveAddresses.find(addr => addr.address.toLowerCase() === stake.address.toLowerCase())
                    if (addressObj && removedAddressIds.has(addressObj.id)) return false
                    
                    const addressMatch = selectedAddressIds.length > 0 
                      ? selectedAddressIds.some(id => effectiveAddresses.find(addr => addr.id === id && addr.address.toLowerCase() === stake.address.toLowerCase()))
                      : true
                    
                    const chainMatch = detectiveMode 
                      ? stake.chain === 'PLS' 
                      : (chainFilter === 'both' || 
                         (chainFilter === 'ethereum' && stake.chain === 'ETH') ||
                         (chainFilter === 'pulsechain' && stake.chain === 'PLS'))
                    
                    return addressMatch && chainMatch
                  })

                  // Get filtered HSI stakes
                  const filteredHsiStakes = includePooledStakes ? (hsiStakes || []).filter(stake => {
                    if (stake.status !== 'active') return false
                    
                    const addressObj = effectiveAddresses.find(addr => addr.address.toLowerCase() === stake.address.toLowerCase())
                    if (addressObj && removedAddressIds.has(addressObj.id)) return false
                    
                    const addressMatch = selectedAddressIds.length > 0 
                      ? selectedAddressIds.some(id => effectiveAddresses.find(addr => addr.id === id && addr.address.toLowerCase() === stake.address.toLowerCase()))
                      : true
                    
                    const chainMatch = detectiveMode 
                      ? stake.chain === 'PLS' 
                      : (chainFilter === 'both' || 
                         (chainFilter === 'ethereum' && stake.chain === 'ETH') ||
                         (chainFilter === 'pulsechain' && stake.chain === 'PLS'))
                    
                    return addressMatch && chainMatch
                  }) : []

                  // Combine and calculate total value
                  const allFilteredStakes = [...filteredNativeStakes, ...filteredHsiStakes]
                  return allFilteredStakes.reduce((total, stake) => {
                  let stakeHex;
                  if (useEESValue && stake.status === 'active') {
                    stakeHex = calculateEESValueWithDate(stake)
                  } else if (useTimeShift) {
                    // Use Time-Shift calculation for projected future yield
                    const projectedDetails = calculateEESDetailsWithDate(stake);
                    stakeHex = stake.principleHex + projectedDetails.payout;
                  } else {
                    stakeHex = stake.principleHex + stake.yieldHex
                  }
                  const hexPrice = stake.chain === 'ETH' ? getTokenPrice('eHEX') : getTokenPrice('HEX')
                  return total + (stakeHex * hexPrice)
                }, 0)
                })()
                
                const totalStakedValue = allActiveSoloValue + (includePooledStakes ? pooledStakesData.totalValue : 0)
                const totalCombinedValue = totalLiquidValue + totalStakedValue
                const totalCombinedHexAmount = liquidHexStats.hexAmount + stakedHexStats.hexAmount
                const totalCombinedEHexAmount = liquidHexStats.eHexAmount + stakedHexStats.eHexAmount
                
                return (
                  <div className="space-y-4">
                    {/* Combined Total HEX Value Card */}
                    <div className="bg-black/50 backdrop-blur-xl border-2 border-white/10 rounded-lg p-4 text-center">
                      <div className="text-sm text-gray-400 mb-2">Total HEX Value</div>
                      <div className="text-2xl font-bold text-white mb-1">
                        ${formatBalance(totalCombinedValue)}
                      </div>
                      <div className="text-xs text-gray-400">
                        {(() => {
                          // Compact formatting helper for main summary
                          const formatCompact = (value: number): string => {
                            if (value >= 1000000) {
                              return (value / 1000000).toFixed(1) + 'M'
                            } else if (value >= 1000) {
                              return (value / 1000).toFixed(1) + 'K'
                            } else {
                              return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                            }
                          }

                          return (
                            <>
                        {totalCombinedHexAmount > 0 && totalCombinedEHexAmount > 0 
                                ? <>
                                    {formatHexAmount(totalCombinedHexAmount, formatCompact)}
                                    {' HEX + '}
                                    {formatHexAmount(totalCombinedEHexAmount, formatCompact)}
                                    {' eHEX'}
                                  </>
                          : totalCombinedHexAmount > 0 
                                  ? <>
                                      {formatHexAmount(totalCombinedHexAmount, formatCompact)}
                                      {' HEX'}
                                    </>
                            : totalCombinedEHexAmount > 0 
                                    ? <>
                                        {formatHexAmount(totalCombinedEHexAmount, formatCompact)}
                                        {' eHEX'}
                                      </>
                              : 'No HEX found'
                        }
                            </>
                          )
                        })()}
                        
                        {includePooledStakes && (pooledStakesData.totalHex || 0) > 0 && (
                          <span> (including pooled stakes)</span>
                        )}
                      </div>
                    </div>

                    {/* Individual Stats Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-center">
                    {/* Liquid HEX Stats */}
                    <div className="bg-black/50 backdrop-blur-xl border-2 border-white/10 rounded-lg p-4">
                      <div className="text-sm text-gray-400 mb-2">
                        Total Liquid HEX {totalCombinedValue > 0 && (
                          <span className="text-xs">({formatPercentage((totalLiquidValue / totalCombinedValue) * 100)})</span>
                        )}
                      </div>
                      <div className="text-xl font-bold text-white mb-1">
                        ${formatBalance(totalLiquidValue)}
                      </div>
                      <div className="text-xs text-gray-400 space-y-1">
                        {(() => {
                          // Compact formatting helper for liquid HEX
                          const formatCompact = (value: number): string => {
                            if (value >= 1000000) {
                              return (value / 1000000).toFixed(1) + 'M'
                            } else if (value >= 1000) {
                              return (value / 1000).toFixed(1) + 'K'
                            } else {
                              return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                            }
                          }

                          return (
                            <>
                        {liquidHexStats.hexAmount > 0 && (
                                <div>{formatHexAmount(liquidHexStats.hexAmount, formatCompact)} HEX (${formatBalance(liquidHexStats.hexValue)})</div>
                        )}
                        {liquidHexStats.eHexAmount > 0 && (
                                <div>{formatHexAmount(liquidHexStats.eHexAmount, formatCompact)} eHEX (${formatBalance(liquidHexStats.eHexValue)})</div>
                        )}
                        {totalLiquidValue === 0 && <div>No liquid HEX found</div>}
                            </>
                          )
                        })()}
                      </div>
                    </div>

                    {/* Staked HEX Stats */}
                    <div className="bg-black/50 backdrop-blur-xl border-2 border-white/10 rounded-lg p-4">
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
                          // Calculate total HEX and eHEX amounts across ALL stake sources (ONLY ACTIVE STAKES)
                          // Always include both native and HSI stakes regardless of active tab
                          const totalHexStats = { hexAmount: 0, hexValue: 0, eHexAmount: 0, eHexValue: 0 }

                          // Add native stakes
                          const filteredNativeStakes = (hexStakes || []).filter(stake => {
                            if (stake.status !== 'active') return false
                            
                            const addressObj = effectiveAddresses.find(addr => addr.address.toLowerCase() === stake.address.toLowerCase())
                            if (addressObj && removedAddressIds.has(addressObj.id)) return false
                            
                            const addressMatch = selectedAddressIds.length > 0 
                              ? selectedAddressIds.some(id => effectiveAddresses.find(addr => addr.id === id && addr.address.toLowerCase() === stake.address.toLowerCase()))
                              : true
                            
                            const chainMatch = detectiveMode 
                              ? stake.chain === 'PLS' 
                              : (chainFilter === 'both' || 
                                 (chainFilter === 'ethereum' && stake.chain === 'ETH') ||
                                 (chainFilter === 'pulsechain' && stake.chain === 'PLS'))
                            
                            return addressMatch && chainMatch
                          })

                          filteredNativeStakes.forEach(stake => {
                            let stakeHex;
                            if (useEESValue && stake.status === 'active') {
                              stakeHex = calculateEESValueWithDate(stake)
                            } else if (useTimeShift) {
                              // Use Time-Shift calculation for projected future yield
                              const projectedDetails = calculateEESDetailsWithDate(stake);
                              stakeHex = stake.principleHex + projectedDetails.payout;
                            } else {
                              stakeHex = stake.principleHex + stake.yieldHex
                            }
                            if (stake.chain === 'ETH') {
                              totalHexStats.eHexAmount += stakeHex
                              totalHexStats.eHexValue += stakeHex * getTokenPrice('eHEX')
                            } else {
                              totalHexStats.hexAmount += stakeHex
                              totalHexStats.hexValue += stakeHex * getTokenPrice('HEX')
                            }
                          })

                          // Add HSI stakes if toggle is enabled
                          if (includePooledStakes) {
                            const filteredHsiStakes = (hsiStakes || []).filter(stake => {
                              if (stake.status !== 'active') return false
                              
                              const addressObj = effectiveAddresses.find(addr => addr.address.toLowerCase() === stake.address.toLowerCase())
                              if (addressObj && removedAddressIds.has(addressObj.id)) return false
                              
                              const addressMatch = selectedAddressIds.length > 0 
                                ? selectedAddressIds.some(id => effectiveAddresses.find(addr => addr.id === id && addr.address.toLowerCase() === stake.address.toLowerCase()))
                                : true
                              
                              const chainMatch = detectiveMode 
                                ? stake.chain === 'PLS' 
                                : (chainFilter === 'both' || 
                                   (chainFilter === 'ethereum' && stake.chain === 'ETH') ||
                                   (chainFilter === 'pulsechain' && stake.chain === 'PLS'))
                              
                              return addressMatch && chainMatch
                            })

                            filteredHsiStakes.forEach(stake => {
                              let stakeHex;
                              if (useEESValue && stake.status === 'active') {
                                // For HSI stakes, we need to adapt the EES calculation
                                const adaptedStake = {
                                  principleHex: stake.principleHex,
                                  yieldHex: stake.yieldHex,
                                  progress: stake.progress,
                                  tShares: stake.tShares,
                                  startDate: stake.startDate,
                                  endDate: stake.endDate,
                                  status: stake.status,
                                  chain: stake.chain
                                }
                                stakeHex = calculateEESValueWithDate(adaptedStake)
                              } else if (useTimeShift) {
                                // Use Time-Shift calculation for projected future yield
                                const adaptedStake = {
                                  principleHex: stake.principleHex,
                                  yieldHex: stake.yieldHex,
                                  progress: stake.progress,
                                  tShares: stake.tShares,
                                  startDate: stake.startDate,
                                  endDate: stake.endDate,
                                  status: stake.status,
                                  chain: stake.chain
                                }
                                const projectedDetails = calculateEESDetailsWithDate(adaptedStake);
                                stakeHex = stake.principleHex + projectedDetails.payout;
                              } else {
                                stakeHex = stake.principleHex + stake.yieldHex
                              }
                              if (stake.chain === 'ETH') {
                                totalHexStats.eHexAmount += stakeHex
                                totalHexStats.eHexValue += stakeHex * getTokenPrice('eHEX')
                              } else {
                                totalHexStats.hexAmount += stakeHex
                                totalHexStats.hexValue += stakeHex * getTokenPrice('HEX')
                              }
                            })
                          }

                          // Add pooled stakes if enabled
                          if (includePooledStakes && pooledStakesData.tokens && pooledStakesData.tokens.length > 0) {
                                pooledStakesData.tokens.forEach((token: any) => {
                                  const isEthToken = token.symbol.startsWith('e') || token.symbol.startsWith('we')
                                  const backingPerToken = getBackingPerToken(token.symbol) || 0
                                  const tokenHexBacking = token.balance * backingPerToken
                                  
                                  const hexPrice = isEthToken ? getTokenPrice('eHEX') : getTokenPrice('HEX')
                                  const tokenValue = tokenHexBacking * hexPrice
                                  
                                  if (isEthToken) {
                                totalHexStats.eHexAmount += tokenHexBacking
                                totalHexStats.eHexValue += tokenValue
                                  } else {
                                totalHexStats.hexAmount += tokenHexBacking
                                totalHexStats.hexValue += tokenValue
                                  }
                                })
                          }

                          if (totalStakedValue === 0) {
                            return <div>No staked HEX found</div>
                          }
                                
                                // Compact formatting helper for staked HEX
                                const formatCompact = (value: number): string => {
                                  if (value >= 1000000) {
                                    return (value / 1000000).toFixed(1) + 'M'
                                  } else if (value >= 1000) {
                                    return (value / 1000).toFixed(1) + 'K'
                                  } else {
                                    return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                                  }
                          }
                                
                                return (
                                  <>
                              {totalHexStats.hexAmount > 0 && (
                                <div>{formatHexAmount(totalHexStats.hexAmount, formatCompact)} HEX (${formatBalance(totalHexStats.hexValue)})</div>
                                    )}
                              {totalHexStats.eHexAmount > 0 && (
                                <div>
                                  {formatHexAmount(totalHexStats.eHexAmount, formatCompact)}
                                  {' eHEX ($'}{formatBalance(totalHexStats.eHexValue)}{')'}
                                </div>
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
                <div className="bg-black/50 backdrop-blur-xl border-2 border-white/10 rounded-2xl p-4 text-center mb-6">
                  {(() => {
                    // Solo stakes calculations (ONLY ACTIVE STAKES)
                    const activeStakes = filteredStakes.filter(stake => stake.status === 'active')
                    const soloHexValue = activeStakes.reduce((total, stake) => {
                      let stakeHex;
                      if (useEESValue && stake.status === 'active') {
                        stakeHex = calculateEESValueWithDate(stake)
                      } else if (useTimeShift) {
                        // Use Time-Shift calculation for projected future yield
                        const projectedDetails = calculateEESDetailsWithDate(stake);
                        stakeHex = stake.principleHex + projectedDetails.payout;
                      } else {
                        stakeHex = stake.principleHex + stake.yieldHex
                      }
                      const hexPrice = stake.chain === 'ETH' ? getTokenPrice('eHEX') : getTokenPrice('HEX')
                      return total + (stakeHex * hexPrice)
                    }, 0)
                    
                    const soloTShares = activeStakes.reduce((total, stake) => total + stake.tShares, 0)
                    const soloHexAmount = activeStakes.reduce((total, stake) => {
                      if (useEESValue && stake.status === 'active') {
                        return total + calculateEESValueWithDate(stake)
                      } else if (useTimeShift) {
                        // Use Time-Shift calculation for projected future yield
                        const projectedDetails = calculateEESDetailsWithDate(stake);
                        return total + stake.principleHex + projectedDetails.payout;
                      } else {
                        return total + stake.principleHex + stake.yieldHex
                      }
                    }, 0)
                    
                    // Calculate staked value using market prices (respecting MAXI toggle)
                    const allActiveSoloValueBottom = (() => {
                      // Get filtered native stakes
                      const filteredNativeStakes = (hexStakes || []).filter(stake => {
                        if (stake.status !== 'active') return false
                        
                        const addressObj = effectiveAddresses.find(addr => addr.address.toLowerCase() === stake.address.toLowerCase())
                        if (addressObj && removedAddressIds.has(addressObj.id)) return false
                        
                        const addressMatch = selectedAddressIds.length > 0 
                          ? selectedAddressIds.some(id => effectiveAddresses.find(addr => addr.id === id && addr.address.toLowerCase() === stake.address.toLowerCase()))
                          : true
                        
                        const chainMatch = detectiveMode 
                          ? stake.chain === 'PLS' 
                          : (chainFilter === 'both' || 
                             (chainFilter === 'ethereum' && stake.chain === 'ETH') ||
                             (chainFilter === 'pulsechain' && stake.chain === 'PLS'))
                        
                        return addressMatch && chainMatch
                      })

                      // Get filtered HSI stakes
                      const filteredHsiStakes = includePooledStakes ? (hsiStakes || []).filter(stake => {
                        if (stake.status !== 'active') return false
                        
                        const addressObj = effectiveAddresses.find(addr => addr.address.toLowerCase() === stake.address.toLowerCase())
                        if (addressObj && removedAddressIds.has(addressObj.id)) return false
                        
                        const addressMatch = selectedAddressIds.length > 0 
                          ? selectedAddressIds.some(id => effectiveAddresses.find(addr => addr.id === id && addr.address.toLowerCase() === stake.address.toLowerCase()))
                          : true
                        
                        const chainMatch = detectiveMode 
                          ? stake.chain === 'PLS' 
                          : (chainFilter === 'both' || 
                             (chainFilter === 'ethereum' && stake.chain === 'ETH') ||
                             (chainFilter === 'pulsechain' && stake.chain === 'PLS'))
                        
                        return addressMatch && chainMatch
                      }) : []

                      // Combine and calculate total value
                      const allFilteredStakes = [...filteredNativeStakes, ...filteredHsiStakes]
                      return allFilteredStakes.reduce((total, stake) => {
                      let stakeHex;
                      if (useEESValue && stake.status === 'active') {
                        stakeHex = calculateEESValueWithDate(stake)
                      } else if (useTimeShift) {
                        // Use Time-Shift calculation for projected future yield
                        const projectedDetails = calculateEESDetailsWithDate(stake);
                        stakeHex = stake.principleHex + projectedDetails.payout;
                      } else {
                        stakeHex = stake.principleHex + stake.yieldHex
                      }
                      const hexPrice = stake.chain === 'ETH' ? getTokenPrice('eHEX') : getTokenPrice('HEX')
                      return total + (stakeHex * hexPrice)
                    }, 0)
                    })()
                    
                    const combinedValue = allActiveSoloValueBottom + (includePooledStakes ? pooledStakesData.totalValue : 0)
                    
                    // Calculate combined T-shares and weighted average length using native and HSI stakes (only if toggle enabled)
                    const { allActiveTShares, allActiveWeightedLength, allActiveHexAmount } = (() => {
                      // Get filtered native stakes
                      const filteredNativeStakes = (hexStakes || []).filter(stake => {
                        if (stake.status !== 'active') return false
                        
                        const addressObj = effectiveAddresses.find(addr => addr.address.toLowerCase() === stake.address.toLowerCase())
                        if (addressObj && removedAddressIds.has(addressObj.id)) return false
                        
                        const addressMatch = selectedAddressIds.length > 0 
                          ? selectedAddressIds.some(id => effectiveAddresses.find(addr => addr.id === id && addr.address.toLowerCase() === stake.address.toLowerCase()))
                          : true
                        
                        const chainMatch = detectiveMode 
                          ? stake.chain === 'PLS' 
                          : (chainFilter === 'both' || 
                             (chainFilter === 'ethereum' && stake.chain === 'ETH') ||
                             (chainFilter === 'pulsechain' && stake.chain === 'PLS'))
                        
                        return addressMatch && chainMatch
                      })

                      // Get filtered HSI stakes - only if toggle is enabled
                      const filteredHsiStakes = includePooledStakes ? (hsiStakes || []).filter(stake => {
                        if (stake.status !== 'active') return false
                        
                        const addressObj = effectiveAddresses.find(addr => addr.address.toLowerCase() === stake.address.toLowerCase())
                        if (addressObj && removedAddressIds.has(addressObj.id)) return false
                        
                        const addressMatch = selectedAddressIds.length > 0 
                          ? selectedAddressIds.some(id => effectiveAddresses.find(addr => addr.id === id && addr.address.toLowerCase() === stake.address.toLowerCase()))
                          : true
                        
                        const chainMatch = detectiveMode 
                          ? stake.chain === 'PLS' 
                          : (chainFilter === 'both' || 
                             (chainFilter === 'ethereum' && stake.chain === 'ETH') ||
                             (chainFilter === 'pulsechain' && stake.chain === 'PLS'))
                        
                        return addressMatch && chainMatch
                      }) : []

                      // Combine stakes and calculate totals
                      const allFilteredStakes = [...filteredNativeStakes, ...filteredHsiStakes]
                      const totalTShares = allFilteredStakes.reduce((total, stake) => total + stake.tShares, 0)
                      const totalHexAmount = allFilteredStakes.reduce((total, stake) => {
                        let stakeHex;
                        if (useEESValue && stake.status === 'active') {
                          stakeHex = calculateEESValueWithDate(stake)
                        } else if (useTimeShift) {
                          // Use Time-Shift calculation for projected future yield
                          const projectedDetails = calculateEESDetailsWithDate(stake);
                          stakeHex = stake.principleHex + projectedDetails.payout;
                        } else {
                          stakeHex = stake.principleHex + stake.yieldHex
                        }
                        return total + stakeHex
                      }, 0)
                      
                      const weightedLength = totalTShares > 0 ? allFilteredStakes.reduce((sum, stake) => {
                      const startDate = new Date(stake.startDate)
                      const endDate = new Date(stake.endDate)
                      const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
                      return sum + (totalDays * stake.tShares)
                    }, 0) : 0
                    
                      return { allActiveTShares: totalTShares, allActiveWeightedLength: weightedLength, allActiveHexAmount: totalHexAmount }
                    })()
                    
                    const combinedTShares = allActiveTShares + pooledStakesData.totalTShares
                    const combinedHexAmount = allActiveHexAmount + (pooledStakesData.totalHex || 0)
                    
                    // Calculate weighted average length for combined stakes (ONLY ACTIVE STAKES)
                    const pooledWeightedLength = (pooledStakesData.avgStakeLength || 0) * pooledStakesData.totalTShares
                    const combinedAvgLength = combinedTShares > 0 ? (allActiveWeightedLength + pooledWeightedLength) / combinedTShares : 0
                    
                    // Calculate weighted price change (ONLY ACTIVE STAKES)
                    const { totalValue, weightedPriceChange } = activeStakes.reduce((acc, stake) => {
                      let stakeHex;
                      if (useEESValue && stake.status === 'active') {
                        stakeHex = calculateEESValueWithDate(stake)
                      } else if (useTimeShift) {
                        // Use Time-Shift calculation for projected future yield
                        const projectedDetails = calculateEESDetailsWithDate(stake);
                        stakeHex = stake.principleHex + projectedDetails.payout;
                      } else {
                        stakeHex = stake.principleHex + stake.yieldHex
                      }
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
                          <div className="text-lg font-semibold text-white">Total staked HEX</div>
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
                              className={`text-sm font-bold cursor-pointer hover:opacity-80 transition-opacity ${
                                (() => {
                                  const dollarChange = (priceChange24h / 100) * combinedValue
                                  return showDollarChange 
                                    ? (Math.abs(dollarChange) < 10 || dollarChange === 0)
                                      ? 'text-gray-400'
                                      : dollarChange >= 10
                                        ? 'text-[#00ff55]'
                                        : 'text-red-500'
                                    : priceChange24h <= -1
                                      ? 'text-red-500'
                                      : priceChange24h >= 1
                                        ? 'text-[#00ff55]'
                                        : 'text-gray-400'
                                })()
                              }`}
                              title={showDollarChange ? "Click to show percentage" : "Click to show dollar amount"}
                            >
                              {(() => {
                                const dollarChange = (priceChange24h / 100) * combinedValue
                                return format24hChange(priceChange24h, dollarChange)
                              })()}
                            </button>
                          </div>
                                                                        <div className="text-sm text-gray-400 mt-1">
                          {(() => {
                            // Format numbers with K/M/B suffixes
                            const formatCompactHex = (value: number): string => {
                              if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`
                              if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`
                              if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`
                              return value.toFixed(0)
                            }

                            // Calculate total HEX and eHEX across all sources
                            const totalStats = { hexAmount: 0, hexTShares: 0, eHexAmount: 0, eHexTShares: 0 }

                            // Add native stakes
                            const activeNativeStakes = hexStakes?.filter(stake => 
                              stake.status === 'active' &&
                              (() => {
                                const addressObj = effectiveAddresses.find(addr => addr.address.toLowerCase() === stake.address.toLowerCase())
                                if (addressObj && removedAddressIds.has(addressObj.id)) return false
                                
                                const addressMatch = selectedAddressIds.length > 0 
                                  ? selectedAddressIds.some(id => effectiveAddresses.find(addr => addr.id === id && addr.address.toLowerCase() === stake.address.toLowerCase()))
                                  : true
                                
                                const chainMatch = detectiveMode 
                                  ? stake.chain === 'PLS' 
                                  : (chainFilter === 'both' || 
                                     (chainFilter === 'ethereum' && stake.chain === 'ETH') ||
                                     (chainFilter === 'pulsechain' && stake.chain === 'PLS'))
                                
                                return addressMatch && chainMatch
                              })()
                            ) || []

                            activeNativeStakes.forEach(stake => {
                              let stakeHex;
                              if (useEESValue && stake.status === 'active') {
                                stakeHex = calculateEESValueWithDate(stake)
                              } else if (useTimeShift) {
                                // Use Time-Shift calculation for projected future yield
                                const projectedDetails = calculateEESDetailsWithDate(stake);
                                stakeHex = stake.principleHex + projectedDetails.payout;
                              } else {
                                stakeHex = stake.principleHex + stake.yieldHex
                              }
                              if (stake.chain === 'ETH') {
                                totalStats.eHexAmount += stakeHex
                                // Only count T-Shares from stakes with HEX > 0 when EES mode is enabled
                                if (!useEESValue || stake.status !== 'active' || stakeHex > 0) {
                                totalStats.eHexTShares += stake.tShares
                                }
                              } else {
                                totalStats.hexAmount += stakeHex
                                // Only count T-Shares from stakes with HEX > 0 when EES mode is enabled
                                if (!useEESValue || stake.status !== 'active' || stakeHex > 0) {
                                totalStats.hexTShares += stake.tShares
                                }
                              }
                            })

                            // Add HSI stakes if toggle is enabled
                            if (includePooledStakes && hsiStakes) {
                              const activeHsiStakes = hsiStakes.filter(stake => 
                                stake.status === 'active' &&
                                (() => {
                                  const addressObj = effectiveAddresses.find(addr => addr.address.toLowerCase() === stake.address.toLowerCase())
                                  if (addressObj && removedAddressIds.has(addressObj.id)) return false
                                  
                                  const addressMatch = selectedAddressIds.length > 0 
                                    ? selectedAddressIds.some(id => effectiveAddresses.find(addr => addr.id === id && addr.address.toLowerCase() === stake.address.toLowerCase()))
                                    : true
                                  
                                  const chainMatch = detectiveMode 
                                    ? stake.chain === 'PLS' 
                                    : (chainFilter === 'both' || 
                                       (chainFilter === 'ethereum' && stake.chain === 'ETH') ||
                                       (chainFilter === 'pulsechain' && stake.chain === 'PLS'))
                                  
                                  return addressMatch && chainMatch
                                })()
                              )

                              activeHsiStakes.forEach(stake => {
                                let stakeHex;
                                if (useEESValue && stake.status === 'active') {
                                  // For HSI stakes, we need to adapt the EES calculation
                                  const adaptedStake = {
                                    principleHex: stake.principleHex,
                                    yieldHex: stake.yieldHex,
                                    progress: stake.progress,
                                    tShares: stake.tShares,
                                    startDate: stake.startDate,
                                    endDate: stake.endDate,
                                    status: stake.status,
                                    chain: stake.chain
                                  }
                                  stakeHex = calculateEESValueWithDate(adaptedStake)
                                } else if (useTimeShift) {
                                  // Use Time-Shift calculation for projected future yield
                                  const adaptedStake = {
                                    principleHex: stake.principleHex,
                                    yieldHex: stake.yieldHex,
                                    progress: stake.progress,
                                    tShares: stake.tShares,
                                    startDate: stake.startDate,
                                    endDate: stake.endDate,
                                    status: stake.status,
                                    chain: stake.chain
                                  }
                                  const projectedDetails = calculateEESDetailsWithDate(adaptedStake);
                                  stakeHex = stake.principleHex + projectedDetails.payout;
                                } else {
                                  stakeHex = stake.principleHex + stake.yieldHex
                                }
                                if (stake.chain === 'ETH') {
                                  totalStats.eHexAmount += stakeHex
                                  // Only count T-Shares from stakes with HEX > 0 when EES mode is enabled
                                  if (!useEESValue || stake.status !== 'active' || stakeHex > 0) {
                                  totalStats.eHexTShares += stake.tShares
                                  }
                                } else {
                                  totalStats.hexAmount += stakeHex
                                  // Only count T-Shares from stakes with HEX > 0 when EES mode is enabled
                                  if (!useEESValue || stake.status !== 'active' || stakeHex > 0) {
                                  totalStats.hexTShares += stake.tShares
                                  }
                                }
                              })
                            }

                            // Add pooled stakes if enabled
                            if (includePooledStakes && pooledStakesData.tokens) {
                              pooledStakesData.tokens.forEach((token: any) => {
                                const isEthToken = token.symbol.startsWith('e') || token.symbol.startsWith('we')
                                const backingPerToken = getBackingPerToken(token.symbol) || 0
                                const tokenHexBacking = token.balance * backingPerToken
                                
                                if (isEthToken) {
                                  totalStats.eHexAmount += tokenHexBacking
                                  totalStats.eHexTShares += token.tShares
                                } else {
                                  totalStats.hexAmount += tokenHexBacking
                                  totalStats.hexTShares += token.tShares
                                }
                              })
                            }
                              
                              return (
                                <div className="space-y-1">
                                {totalStats.hexAmount > 0 && (
                                    <div>
                                    {formatHexAmount(totalStats.hexAmount, formatCompactHex)} HEX ({totalStats.hexTShares >= 100 
                                      ? totalStats.hexTShares.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                                      : totalStats.hexTShares.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                    } T-Shares)
                                    </div>
                                  )}
                                {totalStats.eHexAmount > 0 && (
                                    <div>
                                    {formatHexAmount(totalStats.eHexAmount, formatCompactHex)}
                                    {' eHEX ('}{totalStats.eHexTShares >= 100 
                                      ? totalStats.eHexTShares.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                                      : totalStats.eHexTShares.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                    }{' T-Shares)'}
                                    </div>
                                  )}
                                  {combinedTShares > 0 && combinedAvgLength > 0 && (
                                    <div>
                                      {(combinedAvgLength / 365).toFixed(1)} year avg
                                    </div>
                                  )}
                                </div>
                              )
                          })()}
                        </div>
                      </>
                    )
                  })()}
                </div>
              )}

              {/* Split View: Solo, HSI, and Pooled Stakes */}
              {stakeStatusFilter === 'active' && (
                <div className={`grid grid-cols-1 ${includePooledStakes && hasHsiStakes ? 'md:grid-cols-3' : 'md:grid-cols-2'} gap-4 mb-6`}>
                  {/* Solo Stakes Card - Native stakes only */}
                  <div className="bg-black/50 backdrop-blur-xl border-2 border-white/10 rounded-2xl p-4 text-center">
                        {(() => {
              // Only include native stakes (exclude HSI stakes) for Solo Stakes
              const activeSoloStakes = activeStakesTab === 'native' 
                ? filteredStakes.filter(stake => stake.status === 'active')
                : hexStakes.filter(stake => stake.status === 'active' && 
                    // Apply the same filtering logic as filteredStakes but for hexStakes
                    (() => {
                      // Filter out removed addresses
                      const addressObj = effectiveAddresses.find(addr => addr.address.toLowerCase() === stake.address.toLowerCase())
                      if (addressObj && removedAddressIds.has(addressObj.id)) return false
                      
                      // Filter by selected addresses
                      const addressMatch = selectedAddressIds.length > 0 
                        ? selectedAddressIds.some(id => effectiveAddresses.find(addr => addr.id === id && addr.address.toLowerCase() === stake.address.toLowerCase()))
                        : true
                      
                      // Filter by chain
                      const chainMatch = detectiveMode 
                        ? stake.chain === 'PLS' 
                        : (chainFilter === 'both' || 
                           (chainFilter === 'ethereum' && stake.chain === 'ETH') ||
                           (chainFilter === 'pulsechain' && stake.chain === 'PLS'))
                      
                      return addressMatch && chainMatch
                    })()
                  )
              const totalHexValue = activeSoloStakes.reduce((total, stake) => {
                let stakeHex;
                if (useEESValue && stake.status === 'active') {
                  stakeHex = calculateEESValueWithDate(stake)
                } else if (useTimeShift) {
                  // Use Time-Shift calculation for projected future yield
                  const projectedDetails = calculateEESDetailsWithDate(stake);
                  stakeHex = stake.principleHex + projectedDetails.payout;
                } else {
                  stakeHex = stake.principleHex + stake.yieldHex
                }
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
                        
                        // Use EES-adjusted yield for APY calculation when EES mode is active
                        let apy
                        if (useEESValue && stake.status === 'active') {
                          const eesDetails = calculateEESDetailsWithDate(stake)
                          const eesValue = eesDetails.eesValue
                          
                          if (eesValue <= 0) {
                            // If stake is completely nuked, APY is -100% (losing entire principal)
                            apy = -100
                          } else {
                            // Calculate APY based on EES value vs principal
                            const netGainLoss = eesValue - stake.principleHex
                            apy = ((netGainLoss / stake.principleHex) / daysElapsed) * 365 * 100
                          }
                        } else {
                          // Normal APY calculation using yield
                          apy = ((stake.yieldHex / stake.principleHex) / daysElapsed) * 365 * 100
                        }
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
                            {(() => {
                              const ethSoloHex = activeSoloStakes
                                .filter(stake => stake.chain === 'ETH')
                                .reduce((total, stake) => {
                                  let stakeHex;
                                  if (useEESValue && stake.status === 'active') {
                                    stakeHex = calculateEESValueWithDate(stake)
                                  } else if (useTimeShift) {
                                    // Use Time-Shift calculation for projected future yield
                                    const projectedDetails = calculateEESDetailsWithDate(stake);
                                    stakeHex = stake.principleHex + projectedDetails.payout;
                                  } else {
                                    stakeHex = stake.principleHex + stake.yieldHex
                                  }
                                  return total + stakeHex
                                }, 0)
                              const plsSoloHex = activeSoloStakes
                                .filter(stake => stake.chain === 'PLS')
                                .reduce((total, stake) => {
                                  let stakeHex;
                                  if (useEESValue && stake.status === 'active') {
                                    stakeHex = calculateEESValueWithDate(stake)
                                  } else if (useTimeShift) {
                                    // Use Time-Shift calculation for projected future yield
                                    const projectedDetails = calculateEESDetailsWithDate(stake);
                                    stakeHex = stake.principleHex + projectedDetails.payout;
                                  } else {
                                    stakeHex = stake.principleHex + stake.yieldHex
                                  }
                                  return total + stakeHex
                                }, 0)
                              
                              if (chainFilter === 'both') {
                                // Calculate stake counts and T-Shares by chain (only count stakes with HEX > 0 in EES mode)
                                const plsStakeCount = activeSoloStakes.filter(stake => {
                                  if (stake.chain !== 'PLS') return false
                                  if (!useEESValue || stake.status !== 'active') return true
                                  const stakeHex = calculateEESValueWithDate(stake)
                                  return stakeHex > 0
                                }).length
                                const ethStakeCount = activeSoloStakes.filter(stake => {
                                  if (stake.chain !== 'ETH') return false
                                  if (!useEESValue || stake.status !== 'active') return true
                                  const stakeHex = calculateEESValueWithDate(stake)
                                  return stakeHex > 0
                                }).length
                                const plsTShares = activeSoloStakes.filter(stake => {
                                  if (stake.chain !== 'PLS') return false
                                  if (!useEESValue || stake.status !== 'active') return true
                                  const stakeHex = calculateEESValueWithDate(stake)
                                  return stakeHex > 0
                                }).reduce((total, stake) => total + stake.tShares, 0)
                                const ethTShares = activeSoloStakes.filter(stake => {
                                  if (stake.chain !== 'ETH') return false
                                  if (!useEESValue || stake.status !== 'active') return true
                                  const stakeHex = calculateEESValueWithDate(stake)
                                  return stakeHex > 0
                                }).reduce((total, stake) => total + stake.tShares, 0)
                                
                                                                  // Compact formatting helper for Solo Stakes card
                                  const formatCompact = (value: number): string => {
                                    if (value >= 1000000) {
                                      return (value / 1000000).toFixed(1) + 'M'
                                    } else if (value >= 1000) {
                                      return (value / 1000).toFixed(1) + 'K'
                                    } else {
                                      return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                                    }
                                  }
                                  
                                  const formatCompactTShares = (value: number): string => {
                                    if (value >= 1000) {
                                      return (value / 1000).toFixed(1) + 'K'
                                    } else if (value >= 100) {
                                      return value.toFixed(0)
                                    } else {
                                      return value.toFixed(2)
                                    }
                                  }
                                
                                return (
                                  <>
                                    {plsSoloHex > 0 && (
                                        <div>
                                          {formatHexAmount(plsSoloHex, formatCompact)}
                                          {' '}HEX across {plsStakeCount} stake{plsStakeCount !== 1 ? 's' : ''} ({formatCompactTShares(plsTShares)} T-Shares)
                                        </div>
                                    )}
                                    {ethSoloHex > 0 && (
                                        <div>
                                          {formatHexAmount(ethSoloHex, formatCompact)}
                                          {' '}eHEX across {ethStakeCount} stake{ethStakeCount !== 1 ? 's' : ''} ({formatCompactTShares(ethTShares)} T-Shares)
                                        </div>
                                    )}
                                  </>
                                )
                              } else {
                                // Compact formatting helper for Solo Stakes card (single chain)
                                const formatCompact = (value: number): string => {
                                  if (value >= 1000000) {
                                    return (value / 1000000).toFixed(1) + 'M'
                                  } else if (value >= 1000) {
                                    return (value / 1000).toFixed(1) + 'K'
                                  } else {
                                    return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                                  }
                                }
                                
                                const formatCompactTShares = (value: number): string => {
                                  if (value >= 1000) {
                                    return (value / 1000).toFixed(1) + 'K'
                                  } else if (value >= 100) {
                                    return value.toFixed(0)
                                  } else {
                                    return value.toFixed(2)
                                  }
                                }
                                
                                const hexLabel = chainFilter === 'ethereum' ? 'eHEX' : 'HEX'
                                const totalTSharesForChain = useEESValue ? activeSoloStakes.filter(stake => {
                                  if (stake.status !== 'active') return true
                                  const stakeHex = calculateEESValueWithDate(stake)
                                  return stakeHex > 0
                                }).reduce((total, stake) => total + stake.tShares, 0) : activeSoloStakes.reduce((total, stake) => total + stake.tShares, 0)
                                const totalHexForChain = activeSoloStakes.reduce((total, stake) => {
                                  let stakeHex;
                                  if (useEESValue && stake.status === 'active') {
                                    stakeHex = calculateEESValueWithDate(stake)
                                  } else if (useTimeShift) {
                                    // Use Time-Shift calculation for projected future yield
                                    const projectedDetails = calculateEESDetailsWithDate(stake);
                                    stakeHex = stake.principleHex + projectedDetails.payout;
                                  } else {
                                    stakeHex = stake.principleHex + stake.yieldHex
                                  }
                                  return total + stakeHex
                                }, 0)
                                // Only count stakes with HEX > 0 when EES mode is enabled
                                const stakeCountForDisplay = useEESValue ? activeSoloStakes.filter(stake => {
                                  if (stake.status !== 'active') return true
                                  const stakeHex = calculateEESValueWithDate(stake)
                                  return stakeHex > 0
                                }).length : activeSoloStakes.length
                                return (
                                  <>
                                    {formatHexAmount(totalHexForChain, formatCompact)}
                                    {' '}{hexLabel} across {stakeCountForDisplay} stake{stakeCountForDisplay !== 1 ? 's' : ''} ({formatCompactTShares(totalTSharesForChain)} T-Shares)
                                  </>
                                )
                              }
                            })()}
                          </div>
                          {totalTShares > 0 && (
                            <div className="text-sm text-gray-400 mt-1">
                              {(weightedStakeLength / 365).toFixed(1)} year avg • {weightedAPY.toFixed(1)}% APY
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </div>

                  {/* HSI Stakes Card - only show if toggle is enabled */}
                  {includePooledStakes && hasHsiStakes && (
                    <div className="bg-black/50 backdrop-blur-xl border-2 border-white/10 rounded-2xl p-4 text-center">
                      {(() => {
                        // Only include HSI stakes
                        const activeHsiStakes = activeStakesTab === 'hsi' 
                          ? filteredStakes.filter(stake => stake.status === 'active')
                          : hsiStakes.filter(stake => stake.status === 'active' && 
                              // Apply the same filtering logic as filteredStakes but for hsiStakes
                              (() => {
                                // Filter out removed addresses
                                const addressObj = effectiveAddresses.find(addr => addr.address.toLowerCase() === stake.address.toLowerCase())
                                if (addressObj && removedAddressIds.has(addressObj.id)) return false
                                
                                // Filter by selected addresses
                                const addressMatch = selectedAddressIds.length > 0 
                                  ? selectedAddressIds.some(id => effectiveAddresses.find(addr => addr.id === id && addr.address.toLowerCase() === stake.address.toLowerCase()))
                                  : true
                                
                                // Filter by chain
                                const chainMatch = detectiveMode 
                                  ? stake.chain === 'PLS' 
                                  : (chainFilter === 'both' || 
                                     (chainFilter === 'ethereum' && stake.chain === 'ETH') ||
                                     (chainFilter === 'pulsechain' && stake.chain === 'PLS'))
                                
                                return addressMatch && chainMatch
                              })()
                            )
                        const totalHsiValue = activeHsiStakes.reduce((total, stake) => {
                          const stakeHex = stake.principleHex + stake.yieldHex
                          const hexPrice = stake.chain === 'ETH' ? getTokenPrice('eHEX') : getTokenPrice('HEX')
                          return total + (stakeHex * hexPrice)
                        }, 0)
                        
                        const totalHsiTShares = activeHsiStakes.reduce((total, stake) => total + stake.tShares, 0)
                        
                        const weightedHsiStakeLength = totalHsiTShares > 0 ? activeHsiStakes.reduce((sum, stake) => {
                          const startDate = new Date(stake.startDate)
                          const endDate = new Date(stake.endDate)
                          const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
                          return sum + (totalDays * stake.tShares)
                        }, 0) / totalHsiTShares : 0
                        
                        const weightedHsiAPY = totalHsiTShares > 0 ? activeHsiStakes.reduce((sum, stake) => {
                          const startDate = new Date(stake.startDate)
                          const now = new Date()
                          const daysElapsed = Math.max(1, Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)))
                          
                          // Use EES-adjusted yield for APY calculation when EES mode is active
                          let apy
                          if (useEESValue && stake.status === 'active') {
                            const adaptedStake = {
                              principleHex: stake.principleHex,
                              yieldHex: stake.yieldHex,
                              progress: stake.progress,
                              tShares: stake.tShares,
                              startDate: stake.startDate,
                              endDate: stake.endDate,
                              status: stake.status,
                              chain: stake.chain
                            }
                            const eesDetails = calculateEESDetailsWithDate(adaptedStake)
                            const eesValue = eesDetails.eesValue
                            
                            if (eesValue <= 0) {
                              // If stake is completely nuked, APY is -100% (losing entire principal)
                              apy = -100
                            } else {
                              // Calculate APY based on EES value vs principal
                              const netGainLoss = eesValue - stake.principleHex
                              apy = ((netGainLoss / stake.principleHex) / daysElapsed) * 365 * 100
                            }
                          } else {
                            // Normal APY calculation using yield
                            apy = ((stake.yieldHex / stake.principleHex) / daysElapsed) * 365 * 100
                          }
                          return sum + (apy * stake.tShares)
                        }, 0) / totalHsiTShares : 0
                        
                        return (
                          <>
                            <div className="text-lg font-semibold text-white mb-2">HSI Stakes</div>
                            <div className="text-2xl font-bold text-white mb-2">
                              <span className="sm:hidden">${formatBalanceMobile(totalHsiValue)}</span>
                              <span className="hidden sm:inline">${formatBalance(totalHsiValue)}</span>
                            </div>
                            <div className="text-sm text-gray-400">
                              {(() => {
                                const ethHsiHex = activeHsiStakes
                                  .filter(stake => stake.chain === 'ETH')
                                  .reduce((total, stake) => total + stake.principleHex + stake.yieldHex, 0)
                                const plsHsiHex = activeHsiStakes
                                  .filter(stake => stake.chain === 'PLS')
                                  .reduce((total, stake) => total + stake.principleHex + stake.yieldHex, 0)
                                
                                if (chainFilter === 'both') {
                                  // Calculate stake counts and T-Shares by chain
                                  const plsHsiCount = activeHsiStakes.filter(stake => stake.chain === 'PLS').length
                                  const ethHsiCount = activeHsiStakes.filter(stake => stake.chain === 'ETH').length
                                  const plsHsiTShares = activeHsiStakes.filter(stake => stake.chain === 'PLS').reduce((total, stake) => total + stake.tShares, 0)
                                  const ethHsiTShares = activeHsiStakes.filter(stake => stake.chain === 'ETH').reduce((total, stake) => total + stake.tShares, 0)
                                  
                                  // Compact formatting helper for HSI card
                                  const formatCompact = (value: number): string => {
                                    if (value >= 1000000) {
                                      return (value / 1000000).toFixed(1) + 'M'
                                    } else if (value >= 1000) {
                                      return (value / 1000).toFixed(1) + 'K'
                                    } else {
                                      return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                                    }
                                  }
                                  
                                  const formatCompactTShares = (value: number): string => {
                                    if (value >= 1000) {
                                      return (value / 1000).toFixed(1) + 'K'
                                    } else if (value >= 100) {
                                      return value.toFixed(0)
                                    } else {
                                      return value.toFixed(2)
                                    }
                                  }
                                  
                                  return (
                                    <>
                                      {plsHsiHex > 0 && (
                                        <div>{formatHexAmount(plsHsiHex, formatCompact)} HEX across {plsHsiCount} HSI{plsHsiCount !== 1 ? 's' : ''} ({formatCompactTShares(plsHsiTShares)} T-Shares)</div>
                                      )}
                                      {ethHsiHex > 0 && (
                                        <div>
                                          {formatHexAmount(ethHsiHex, formatCompact)}
                                          {' eHEX across '}{ethHsiCount}{' HSI'}{ethHsiCount !== 1 ? 's' : ''}{' ('}{formatCompactTShares(ethHsiTShares)}{' T-Shares)'}
                                        </div>
                                      )}
                                    </>
                                  )
                                } else {
                                  // Compact formatting helper for HSI card (single chain)
                                  const formatCompact = (value: number): string => {
                                    if (value >= 1000000) {
                                      return (value / 1000000).toFixed(1) + 'M'
                                    } else if (value >= 1000) {
                                      return (value / 1000).toFixed(1) + 'K'
                                    } else {
                                      return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                                    }
                                  }
                                  
                                  const formatCompactTShares = (value: number): string => {
                                    if (value >= 1000) {
                                      return (value / 1000).toFixed(1) + 'K'
                                    } else if (value >= 100) {
                                      return value.toFixed(0)
                                    } else {
                                      return value.toFixed(2)
                                    }
                                  }
                                  
                                  const hexLabel = chainFilter === 'ethereum' ? 'eHEX' : 'HEX'
                                  const totalTSharesForChain = useEESValue ? activeHsiStakes.filter(stake => {
                                    if (stake.status !== 'active') return true
                                    const adaptedStake = {
                                      principleHex: stake.principleHex,
                                      yieldHex: stake.yieldHex,
                                      progress: stake.progress,
                                      tShares: stake.tShares,
                                      startDate: stake.startDate,
                                      endDate: stake.endDate,
                                      status: stake.status,
                                      chain: stake.chain
                                    }
                                    const stakeHex = calculateEESValueWithDate(adaptedStake)
                                    return stakeHex > 0
                                  }).reduce((total, stake) => total + stake.tShares, 0) : activeHsiStakes.reduce((total, stake) => total + stake.tShares, 0)
                                  const totalHexForChain = activeHsiStakes.reduce((total, stake) => {
                                    let stakeHex;
                                    if (useEESValue && stake.status === 'active') {
                                      // For HSI stakes, we need to adapt the EES calculation
                                      const adaptedStake = {
                                        principleHex: stake.principleHex,
                                        yieldHex: stake.yieldHex,
                                        progress: stake.progress,
                                        tShares: stake.tShares,
                                        startDate: stake.startDate,
                                        endDate: stake.endDate,
                                        status: stake.status,
                                        chain: stake.chain
                                      }
                                      stakeHex = calculateEESValueWithDate(adaptedStake)
                                    } else {
                                      stakeHex = stake.totalHex !== undefined ? stake.totalHex : stake.principleHex + stake.yieldHex
                                    }
                                    return total + stakeHex
                                  }, 0)
                                  // Only count HSI stakes with HEX > 0 when EES mode is enabled
                                  const hsiStakeCountForDisplay = useEESValue ? activeHsiStakes.filter(stake => {
                                    if (stake.status !== 'active') return true
                                    const adaptedStake = {
                                      principleHex: stake.principleHex,
                                      yieldHex: stake.yieldHex,
                                      progress: stake.progress,
                                      tShares: stake.tShares,
                                      startDate: stake.startDate,
                                      endDate: stake.endDate,
                                      status: stake.status,
                                      chain: stake.chain
                                    }
                                    const stakeHex = calculateEESValueWithDate(adaptedStake)
                                    return stakeHex > 0
                                  }).length : activeHsiStakes.length
                                  const formattedHex = shouldUseCompactFormat ? formatCompact(totalHexForChain) : totalHexForChain.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                                  return `${formattedHex} ${hexLabel} across ${hsiStakeCountForDisplay} HSI${hsiStakeCountForDisplay !== 1 ? 's' : ''} (${formatCompactTShares(totalTSharesForChain)} T-Shares)`
                                }
                              })()}
                            </div>
                            {totalHsiTShares > 0 && (
                              <div className="text-sm text-gray-400 mt-1">
                                {(weightedHsiStakeLength / 365).toFixed(1)} year avg • {weightedHsiAPY.toFixed(1)}% APY
                              </div>
                            )}
                          </>
                        )
                      })()}
                    </div>
                  )}

                  {/* Pooled Stakes Card */}
                  <div className="bg-black/50 backdrop-blur-xl border-2 border-white/10 rounded-2xl p-4 text-center">
                    <div className="text-lg font-semibold text-white mb-2">Pooled Stakes</div>
                    <div className="text-2xl font-bold text-white mb-2">
                      <span className="sm:hidden">${formatBalanceMobile(pooledStakesData.totalValue)}</span>
                      <span className="hidden sm:inline">${formatBalance(pooledStakesData.totalValue)}</span>
                    </div>
                    <div className="text-sm text-gray-400">
                      {(() => {
                        if (chainFilter === 'both') {
                          // Calculate breakdown by chain for pooled tokens
                          let plsHex = 0, plsTShares = 0, plsTokenCount = 0
                          let ethHex = 0, ethTShares = 0, ethTokenCount = 0
                          
                          pooledStakesData.tokens.forEach((token: any) => {
                            const isEthToken = token.symbol.startsWith('e') || token.symbol.startsWith('we')
                            const backingPerToken = getBackingPerToken(token.symbol) || 0
                            const tokenHexBacking = token.balance * backingPerToken
                            
                            if (isEthToken) {
                              ethHex += tokenHexBacking
                              ethTShares += token.tShares
                              ethTokenCount += 1
                            } else {
                              plsHex += tokenHexBacking
                              plsTShares += token.tShares
                              plsTokenCount += 1
                            }
                          })
                          
                          // Compact formatting helper for Pooled Stakes card
                          const formatCompact = (value: number): string => {
                            if (value >= 1000000) {
                              return (value / 1000000).toFixed(1) + 'M'
                            } else if (value >= 1000) {
                              return (value / 1000).toFixed(1) + 'K'
                            } else {
                              return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                            }
                          }
                          
                          const formatCompactTShares = (value: number): string => {
                            if (value >= 1000) {
                              return (value / 1000).toFixed(1) + 'K'
                            } else if (value >= 100) {
                              return value.toFixed(0)
                            } else {
                              return value.toFixed(2)
                            }
                          }
                          
                          return (
                            <>
                              {plsHex > 0 && (
                                <div>
                                  {formatHexAmount(plsHex, formatCompact)} HEX across {plsTokenCount} pooled token{plsTokenCount !== 1 ? 's' : ''} ({formatCompactTShares(plsTShares)} T-Shares)
                                </div>
                              )}
                              {ethHex > 0 && (
                                <div>
                                  {formatHexAmount(ethHex, formatCompact)}
                                  {' eHEX across '}{ethTokenCount}{' pooled token'}{ethTokenCount !== 1 ? 's' : ''}{' ('}{formatCompactTShares(ethTShares)}{' T-Shares)'}
                                </div>
                              )}
                            </>
                          )
                        } else {
                          // Single chain view - Compact formatting helper for Pooled Stakes card
                          const formatCompact = (value: number): string => {
                            if (value >= 1000000) {
                              return (value / 1000000).toFixed(1) + 'M'
                            } else if (value >= 1000) {
                              return (value / 1000).toFixed(1) + 'K'
                            } else {
                              return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                            }
                          }
                          
                          const formatCompactTShares = (value: number): string => {
                            if (value >= 1000) {
                              return (value / 1000).toFixed(1) + 'K'
                            } else if (value >= 100) {
                              return value.toFixed(0)
                            } else {
                              return value.toFixed(2)
                            }
                          }
                          
                          const pooledHex = pooledStakesData.totalHex || 0
                          const hexLabel = chainFilter === 'ethereum' ? 'eHEX' : 'HEX'
                          
                          const formattedHex = shouldUseCompactFormat ? formatCompact(pooledHex) : pooledHex.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                          return `${formattedHex} ${hexLabel} across ${pooledStakesData.tokens.length} token${pooledStakesData.tokens.length !== 1 ? 's' : ''} (${formatCompactTShares(pooledStakesData.totalTShares)} T-Shares)`
                        }
                      })()}
                    </div>
                    {pooledStakesData.totalTShares > 0 && (pooledStakesData.avgStakeLength || 0) > 0 && (
                      <div className="text-sm text-gray-400 mt-1">
                        {((pooledStakesData.avgStakeLength || 0) / 365).toFixed(1)} year avg • {(pooledStakesData.avgAPY || 0).toFixed(1)}% APY
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Original Solo Stakes Only Card - Native stakes only */
            stakeStatusFilter === 'active' && (
              <div className="bg-black border-2 border-white/10 rounded-2xl p-4 text-center mb-6">
                {(() => {
                  // Only include native stakes (exclude HSI stakes) for Solo Stakes
                  const activeStakesOnly = activeStakesTab === 'native' 
                    ? filteredStakes.filter(stake => stake.status === 'active')
                    : hexStakes.filter(stake => stake.status === 'active' && 
                        // Apply the same filtering logic as filteredStakes but for hexStakes
                        (() => {
                          // Filter out removed addresses
                          const addressObj = effectiveAddresses.find(addr => addr.address.toLowerCase() === stake.address.toLowerCase())
                          if (addressObj && removedAddressIds.has(addressObj.id)) return false
                          
                          // Filter by selected addresses
                          const addressMatch = selectedAddressIds.length > 0 
                            ? selectedAddressIds.some(id => effectiveAddresses.find(addr => addr.id === id && addr.address.toLowerCase() === stake.address.toLowerCase()))
                            : true
                          
                          // Filter by chain
                          const chainMatch = detectiveMode 
                            ? stake.chain === 'PLS' 
                            : (chainFilter === 'both' || 
                               (chainFilter === 'ethereum' && stake.chain === 'ETH') ||
                               (chainFilter === 'pulsechain' && stake.chain === 'PLS'))
                          
                          return addressMatch && chainMatch
                        })()
                      )
                  const totalHexValue = activeStakesOnly.reduce((total, stake) => {
                    let stakeHex;
                    if (useEESValue && stake.status === 'active') {
                      stakeHex = calculateEESValueWithDate(stake)
                    } else if (useTimeShift) {
                      // Use Time-Shift calculation for projected future yield
                      const projectedDetails = calculateEESDetailsWithDate(stake);
                      stakeHex = stake.principleHex + projectedDetails.payout;
                    } else {
                      stakeHex = stake.principleHex + stake.yieldHex
                    }
                    const hexPrice = stake.chain === 'ETH' ? getTokenPrice('eHEX') : getTokenPrice('HEX')
                    return total + (stakeHex * hexPrice)
                  }, 0)
                    
                const { totalValue, weightedPriceChange } = activeStakesOnly.reduce((acc, stake) => {
                  let stakeHex;
                  if (useEESValue && stake.status === 'active') {
                    stakeHex = calculateEESValueWithDate(stake)
                  } else if (useTimeShift) {
                    // Use Time-Shift calculation for projected future yield
                    const projectedDetails = calculateEESDetailsWithDate(stake);
                    stakeHex = stake.principleHex + projectedDetails.payout;
                  } else {
                    stakeHex = stake.principleHex + stake.yieldHex
                  }
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
                  
                  // Use EES-adjusted yield for APY calculation when EES mode is active
                  let apy
                  if (useEESValue && stake.status === 'active') {
                    const eesDetails = calculateEESDetailsWithDate(stake)
                    const eesValue = eesDetails.eesValue
                    
                    if (eesValue <= 0) {
                      // If stake is completely nuked, APY is -100% (losing entire principal)
                      apy = -100
                    } else {
                      // Calculate APY based on EES value vs principal
                      const netGainLoss = eesValue - stake.principleHex
                      apy = ((netGainLoss / stake.principleHex) / daysElapsed) * 365 * 100
                    }
                  } else {
                    // Normal APY calculation using yield
                    apy = ((stake.yieldHex / stake.principleHex) / daysElapsed) * 365 * 100
                  }
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
                        className={`text-sm font-bold cursor-pointer hover:opacity-80 transition-opacity ${
                          (() => {
                            const dollarChange = (priceChange24h / 100) * totalHexValue
                            return showDollarChange 
                              ? (Math.abs(dollarChange) < 10 || dollarChange === 0)
                                ? 'text-gray-400'
                                : dollarChange >= 10
                                  ? 'text-[#00ff55]'
                                  : 'text-red-500'
                              : priceChange24h <= -1
                                ? 'text-red-500'
                                : priceChange24h >= 1
                                  ? 'text-[#00ff55]'
                                  : 'text-gray-400'
                          })()
                        }`}
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
                          let stakeHex;
                          if (useEESValue && stake.status === 'active') {
                            stakeHex = calculateEESValueWithDate(stake)
                          } else {
                            stakeHex = stake.principleHex + stake.yieldHex
                          }
                          const hexPrice = stake.chain === 'ETH' ? getTokenPrice('eHEX') : getTokenPrice('HEX')
                          const stakeValue = stakeHex * hexPrice
                          
                          if (stake.chain === 'ETH') {
                            acc.eth.hexAmount += stakeHex
                            acc.eth.hexValue += stakeValue
                            // Only count T-Shares from stakes with HEX > 0 when EES mode is enabled
                            if (!useEESValue || stake.status !== 'active' || stakeHex > 0) {
                            acc.eth.tShares += stake.tShares
                            acc.eth.stakeCount += 1
                            }
                          } else {
                            acc.pls.hexAmount += stakeHex
                            acc.pls.hexValue += stakeValue
                            // Only count T-Shares from stakes with HEX > 0 when EES mode is enabled
                            if (!useEESValue || stake.status !== 'active' || stakeHex > 0) {
                            acc.pls.tShares += stake.tShares
                            acc.pls.stakeCount += 1
                            }
                          }
                          return acc
                        }, {
                          pls: { hexAmount: 0, hexValue: 0, tShares: 0, stakeCount: 0 },
                          eth: { hexAmount: 0, hexValue: 0, tShares: 0, stakeCount: 0 }
                        })

                        // Compact formatting helper for single Solo Stakes card
                        const formatCompact = (value: number): string => {
                          if (value >= 1000000) {
                            return (value / 1000000).toFixed(1) + 'M'
                          } else if (value >= 1000) {
                            return (value / 1000).toFixed(1) + 'K'
                          } else {
                            return value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })
                          }
                        }

                        if (chainFilter === 'both') {
                          return (
                            <>
                              {chainStats.pls.hexAmount > 0 && (
                                <div>
                                  {formatHexAmount(chainStats.pls.hexAmount, formatCompact)}
                                  {' '}HEX across {chainStats.pls.stakeCount} stake{chainStats.pls.stakeCount !== 1 ? 's' : ''}
                                </div>
                              )}
                              {chainStats.eth.hexAmount > 0 && (
                                <div>
                                  {formatHexAmount(chainStats.eth.hexAmount, formatCompact)}
                                  {' '}eHEX across {chainStats.eth.stakeCount} stake{chainStats.eth.stakeCount !== 1 ? 's' : ''}
                                </div>
                              )}
                            </>
                          )
                        } else {
                          // Show single line with chain-specific label when one chain is selected
                          const hexLabel = chainFilter === 'ethereum' ? 'eHEX' : 'HEX'
                          const totalHexAmount = activeStakesOnly.reduce((total, stake) => {
                            if (useEESValue && stake.status === 'active') {
                              return total + calculateEESValueWithDate(stake)
                            } else if (useTimeShift) {
                              // Use Time-Shift calculation for projected future yield
                              const projectedDetails = calculateEESDetailsWithDate(stake);
                              return total + stake.principleHex + projectedDetails.payout;
                            } else {
                              return total + stake.principleHex + stake.yieldHex
                            }
                          }, 0)
                          
                          // Only count stakes with HEX > 0 when EES mode is enabled
                          const stakeCountForSingleChain = useEESValue ? activeStakesOnly.filter(stake => {
                            if (stake.status !== 'active') return true
                            const stakeHex = calculateEESValueWithDate(stake)
                            return stakeHex > 0
                          }).length : activeStakesOnly.length
                          
                          return (
                            <div>
                              {formatHexAmount(totalHexAmount, formatCompact)}
                              {' '}{hexLabel} across {stakeCountForSingleChain} stake{stakeCountForSingleChain !== 1 ? 's' : ''}
                            </div>
                          )
                        }
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
            {filteredStakes.length === 0 ? (
              <div className="bg-black/50 backdrop-blur-xl border-2 border-white/10 rounded-2xl p-8 text-center">
                <div className="text-gray-400">
                  No stakes found with the selected filters.
                </div>
                <div className="text-sm text-gray-500 mt-2">
                  Try adjusting your status or chain filters above.
                </div>
              </div>
            ) : (
              filteredStakes.slice(0, displayedStakesCount).map((stake) => (
              <Card key={stake.id} className="bg-black/50 backdrop-blur-xl text-white p-4 rounded-xl border-2 border-white/10 relative">
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
                    {useTimeShift && stake.status === 'active' && (
                      <div className="px-3 py-1 rounded-full text-xs font-medium border border-orange-400 text-orange-400 bg-orange-400/10">
                        Time Machine
                      </div>
                    )}
                    {useEESValue && stake.status === 'active' && (
                      <div className="px-3 py-1 rounded-full text-xs font-medium border border-red-400 text-red-400 bg-red-400/10">
                        EES Mode
                      </div>
                    )}
                    {/* HSI Badge for HSI stakes */}
                    {activeStakesTab === 'hsi' && (() => {
                      const hsiStake = stake as any;
                      if (!hsiStake.isHdrnHsi) return null;
                      
                      const hasTokenId = hsiStake.hdrnHsiTokenId;
                      const isEthereum = stake.chain === 'ETH';
                      const isClickable = hasTokenId && isEthereum;
                      
                      const badgeContent = `HSI${hasTokenId ? ` #${hsiStake.hdrnHsiTokenId}` : ''}`;
                      const etherscanUrl = `https://etherscan.io/nft/0x8BD3d1472A656e312E94fB1BbdD599B8C51D18e3/${hsiStake.hdrnHsiTokenId}`;
                      
                      if (isClickable) {
                        return (
                          <a
                            href={etherscanUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 rounded-full text-xs font-medium border border-purple-400 text-purple-400 bg-purple-400/10 hover:bg-purple-400/20 hover:border-purple-300 transition-colors cursor-pointer"
                            title="View HSI NFT on Etherscan"
                          >
                            {badgeContent}
                          </a>
                        );
                      } else {
                        return (
                          <div className="px-3 py-1 rounded-full text-xs font-medium border border-purple-400 text-purple-400 bg-purple-400/10">
                            {badgeContent}
                          </div>
                        );
                      }
                    })()}
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
                        let stakeHex;
                        if (useEESValue && stake.status === 'active') {
                          // Use EES calculation when toggle is enabled for active stakes
                          stakeHex = calculateEESValueWithDate(stake)
                        } else if (useTimeShift && stake.status === 'active') {
                          // Use Time Machine calculation for projected future yield (no penalties)
                          const projectedDetails = calculateEESDetailsWithDate(stake);
                          stakeHex = stake.principleHex + projectedDetails.payout;
                        } else {
                          // Use regular calculation
                          stakeHex = stake.totalHex !== undefined ? stake.totalHex : (stake.principleHex + stake.yieldHex)
                        }
                        const totalValue = stakeHex * hexPrice
                        return (
                          <div className="flex items-center gap-2">
                            <div className="text-4xl font-bold text-white">
                              <span className="sm:hidden">${formatBalanceMobile(totalValue)}</span>
                              <span className="hidden sm:inline">${formatBalance(totalValue)}</span>
                            </div>
                            {(() => {
                              // Show contextual notes in EES or Time Machine mode
                              if (useEESValue || useTimeShift) {
                                const targetDate = useTimeShift ? timeShiftDate : (useEESValue ? new Date() : (stake.status === 'inactive' ? new Date(stake.actualEndDate || stake.endDate) : new Date(stake.endDate)))
                                const hexSymbol = stake.chain === 'ETH' ? 'eHEX' : 'HEX'
                                
                                // Format price without unnecessary decimals
                                const formatCleanPrice = (price: number): string => {
                                  if (price === 0) return '$0'
                                  
                                  // Convert to string and remove trailing zeros
                                  const priceStr = price.toString()
                                  const cleanPrice = priceStr.replace(/\.?0+$/, '')
                                  
                                  return `$${cleanPrice}`
                                }
                                
                                const formattedPrice = formatCleanPrice(hexPrice)
                                const formattedDate = targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                
                                // Determine color and text based on mode and stake status
                                let colorClass = 'text-gray-400'
                                let noteContent: React.ReactNode = null
                                
                                // Check if time shift date is after stake end date (successful completion)
                                const stakeEndDate = new Date(stake.endDate)
                                const isAfterStakeEnd = useTimeShift && timeShiftDate && timeShiftDate > stakeEndDate
                                
                                // Check for override payout values
                                const chainType = stake.chain === 'ETH' ? 'ETH' : 'PLS'
                                const overridePayout = chainType === 'ETH' ? timeMachineEthPayout : timeMachinePlsPayout
                                const hasOverridePayout = overridePayout && !isNaN(parseFloat(overridePayout)) && parseFloat(overridePayout) > 0
                                
                                if (isAfterStakeEnd) {
                                  // Time shift date is after stake end - successful completion (green)
                                  colorClass = 'text-[#70D668]'
                                  const stakeEndDateFormatted = stakeEndDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                                  noteContent = (
                                    <>
                                      Projected realized value at stake end on <span className="underline">{stakeEndDateFormatted}</span> at <span className="underline">{formattedPrice} {hexSymbol}</span>
                                      {hasOverridePayout && <> at <span className="underline">{overridePayout} {hexSymbol}</span> payout</>}
                                    </>
                                  )
                                } else if (useEESValue && useTimeShift) {
                                  // Both modes active - red for EES
                                  colorClass = 'text-red-400'
                                  noteContent = (
                                    <>
                                      Projected EES value on <span className="underline">{formattedDate}</span> at <span className="underline">{formattedPrice} {hexSymbol}</span>
                                      {hasOverridePayout && <> at <span className="underline">{overridePayout} {hexSymbol}</span> payout</>}
                                    </>
                                  )
                                } else if (useEESValue) {
                                  // EES mode only - red
                                  colorClass = 'text-red-400'
                                  noteContent = (
                                    <>
                                      Projected EES value on <span className="underline">{formattedDate}</span> at <span className="underline">{formattedPrice} {hexSymbol}</span>
                                      {hasOverridePayout && <> at <span className="underline">{overridePayout} {hexSymbol}</span> payout</>}
                                    </>
                                  )
                                } else if (useTimeShift) {
                                  // Time Machine mode only - orange, paper value
                                  colorClass = 'text-orange-400'
                                  noteContent = (
                                    <>
                                      Projected locked value on <span className="underline">{formattedDate}</span> at <span className="underline">{formattedPrice} {hexSymbol}</span>
                                      {hasOverridePayout && <> at <span className="underline">{overridePayout} {hexSymbol}</span> payout</>}
                                    </>
                                  )
                                }
                                
                                return (
                                  <div className={`text-[10px] sm:text-xs font-medium ${colorClass} text-left sm:whitespace-nowrap break-words max-w-[200px] sm:max-w-none`}>
                                    {noteContent}
                                  </div>
                                )
                              } else {
                                // Normal mode - show price change
                                const dollarChange = (priceChange24h / 100) * totalValue
                                return (
                                  <button 
                                    onClick={toggle24hChangeDisplay}
                                    className={`text-sm font-bold cursor-pointer hover:opacity-80 transition-opacity ${
                                      showDollarChange 
                                        ? (Math.abs(dollarChange) < 10 || dollarChange === 0)
                                          ? 'text-gray-400'
                                          : dollarChange >= 10
                                            ? 'text-[#00ff55]'
                                            : 'text-red-500'
                                        : priceChange24h <= -1
                                          ? 'text-red-500'
                                          : priceChange24h >= 1
                                            ? 'text-[#00ff55]'
                                            : 'text-gray-400'
                                    }`}
                                    title={showDollarChange ? "Click to show percentage" : "Click to show dollar amount"}
                                  >
                                    {format24hChange(priceChange24h, dollarChange)}
                                  </button>
                                )
                              }
                            })()}
                          </div>
                        )
                      })()}
                    </div>
                  </div>
                                        <div className="text-sm text-gray-400 mt-2">
                        {stake.isEES ? (
                          <>
                            {stake.principleHex.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} HEX principal
                          </>
                        ) : stake.status === 'active' ? (
                          <>
                            {(() => {
                              const timeShiftTargetDate = new Date(timeShiftDate);
                              const currentDate = new Date();
                              const stakeEndDate = new Date(stake.endDate);
                              
                              // Show Time-Shift projection for future dates (only when Time-Shift is enabled)
                              if (useTimeShift && timeShiftTargetDate > currentDate) {
                                if (useEESValue) {
                                                                     // EES Mode: Show EES calculation with projected yield and penalty
                                   const eesDetails = calculateEESDetailsWithDate(stake);
                                   
                                   // Calculate baseline (if EES happened today) vs projected (EES at future date or natural end)
                                   let baselineYield = eesDetails.payout;
                                   let projectedYieldAmount = 0;
                                   
                                   if (timeShiftTargetDate > currentDate) {
                                     // Calculate baseline EES (if ended today)
                                     const baselineEES = calculateEESDetails(stake); // No date = current date
                                     baselineYield = baselineEES.payout;
                                     projectedYieldAmount = eesDetails.payout - baselineEES.payout;
                                   }
                                  
                                  return (
                                    <div>
                                      {eesDetails.eesValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} total HEX = <span className="text-xs">
                                        ({stake.principleHex.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} principal + {baselineYield.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} yield{projectedYieldAmount > 0 && <span className="text-orange-400"> + {projectedYieldAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} projected yield</span>}{eesDetails.penalty > 0 && <span className="text-red-400"> - {eesDetails.penalty.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} penalty</span>})
                                </span>
                                    </div>
                                  );
                                                                 } else {
                                   // Projected Mode: Show natural yield progression (no penalties)
                                   const projectedDetails = calculateEESDetailsWithDate(stake);
                                   const currentYield = stake.yieldHex;
                                   const projectedYieldAmount = Math.max(0, projectedDetails.payout - currentYield);
                                   const totalProjectedHex = stake.principleHex + projectedDetails.payout;
                                  
                                  return (
                                    <div>
                                      {totalProjectedHex.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} total HEX = <span className="text-xs">
                                        ({stake.principleHex.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} principal + {currentYield.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} yield{projectedYieldAmount > 0 && <span className="text-orange-400"> + {projectedYieldAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} projected yield</span>})
                                      </span>
                                    </div>
                                  );
                                }
                              } else {
                                // Current date or past date - show normal view with EES penalties if enabled
                                if (useEESValue) {
                                  const eesDetails = calculateEESDetailsWithDate(stake);
                                  return (
                                    <div>
                                      {eesDetails.eesValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} total HEX = <span className="text-xs">
                                        ({stake.principleHex.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} principal + {stake.yieldHex.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} yield{eesDetails.penalty > 0 && <span className="text-red-400"> - {eesDetails.penalty.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} penalty</span>})
                                      </span>
                                    </div>
                                  );
                                } else {
                                  // Normal view
                                  let displayPenalty = 0;
                                  if (stake.penaltyHex && stake.penaltyHex > 0) {
                                    displayPenalty = stake.penaltyHex;
                                  }
                                  
                                  return (
                                    <div>
                                      {(stake.principleHex + stake.yieldHex).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} total HEX = <span className="text-xs">
                                        ({stake.principleHex.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} principal + {stake.yieldHex.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} yield{displayPenalty > 0 ? (<span className="text-red-400"> - {displayPenalty.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} penalty</span>) : ''})
                                      </span>
                                    </div>
                                  );
                                }
                              }
                            })()}
                              </>
                            ) : (
                              <>
                            {(() => {
                              // Calculate EES penalty for display if EES mode is enabled
                              let displayPenalty = 0;
                              let totalHexDisplay = stake.totalHex !== undefined ? stake.totalHex : (stake.principleHex + stake.yieldHex);
                              
                              if (useEESValue) {
                                const eesDetails = calculateEESDetailsWithDate(stake);
                                displayPenalty = eesDetails.penalty;
                                totalHexDisplay = eesDetails.eesValue;
                              } else if (stake.penaltyHex && stake.penaltyHex > 0) {
                                displayPenalty = stake.penaltyHex;
                              }
                              
                              // Show penalty text if penalty is greater than 0
                              const shouldShowPenalty = displayPenalty > 0;
                              
                              return (
                                <>
                                  {totalHexDisplay.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} total HEX = <span className="text-xs">
                                    ({stake.principleHex.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} principal + {stake.yieldHex.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} yield{shouldShowPenalty ? (<span className="text-red-400"> - {displayPenalty.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} penalty</span>) : ''})
                                  </span>
                                </>
                              );
                            })()}
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
                      
                                             // Use EES-adjusted yield for APY calculation when EES mode is active
                       let apy
                       if (useEESValue && stake.status === 'active') {
                         const eesDetails = calculateEESDetailsWithDate(stake)
                         const eesValue = eesDetails.eesValue
                         
                         if (eesValue <= 0) {
                           // If stake is completely nuked, APY is -100% (losing entire principal)
                           apy = -100
                         } else {
                           // Calculate APY based on EES value vs principal
                           const netGainLoss = eesValue - stake.principleHex
                           apy = ((netGainLoss / stake.principleHex) / daysElapsed) * 365 * 100
                         }
                       } else {
                      // Use net yield for APY calculation when available (accounts for penalties)
                      const effectiveYield = stake.netYieldHex !== undefined ? stake.netYieldHex : stake.yieldHex
                         apy = ((effectiveYield / stake.principleHex) / daysElapsed) * 365 * 100
                       }
                      
                      // Show ROI instead of APY when EES mode is active
                      if (useEESValue && stake.status === 'active') {
                        const eesDetails = calculateEESDetailsWithDate(stake)
                        const totalROI = ((eesDetails.eesValue - stake.principleHex) / stake.principleHex) * 100
                        
                        if (totalROI <= -100) {
                          return (
                            <span className="text-red-400">
                              -100% 💣
                            </span>
                          )
                        } else if (totalROI < 0) {
                          return (
                            <span className="text-red-400">
                              {totalROI.toFixed(1)}% ROI
                            </span>
                          )
                        } else {
                          return `${totalROI.toFixed(1)}% ROI`
                        }
                      } else {
                      return `${apy.toFixed(1)}% APY`
                      }
                    })()}
                  </div>
                  
                  {/* Progress Bar with percentage above and days left below */}
                  {(!stake.isOverdue) && (
                    <div className="text-xs mb-4 ml-2 mt-6 mr-4 relative">
                      <div 
                        className={`font-bold ${stake.isEES ? 'text-red-400' : 'text-[#70D668]'} absolute bottom-0 mb-2`}
                        style={{ 
                          left: `${stake.progress}%`,
                          transform: 'translateX(-50%)'
                        }}
                      >
                        {stake.progress}%
                      </div>
                      {/* Orange Time-Shift percentage indicator */}
                      {(() => {
                        // Define variables for both conditions
                        const timeShiftTargetDate = new Date(timeShiftDate);
                        const currentDate = new Date();
                        const stakeStartDate = new Date(stake.startDate);
                        const stakeEndDate = new Date(stake.endDate);
                        
                        // Show for active stakes with future Time-Shift dates (only when Time-Shift is enabled)
                        if (useTimeShift && stake.status === 'active') {
                          
                          // Only show if Time-Shift date is in the future
                          if (timeShiftTargetDate > currentDate) {
                            // Calculate Time-Shift date position as percentage of total stake duration
                            const totalStakeDuration = stakeEndDate.getTime() - stakeStartDate.getTime();
                            // If Time-Shift date is after stake end, use stake end date for progress calculation
                            const effectiveTargetDate = timeShiftTargetDate > stakeEndDate ? stakeEndDate : timeShiftTargetDate;
                            const timeShiftDateFromStart = effectiveTargetDate.getTime() - stakeStartDate.getTime();
                            const timeShiftProgress = Math.min(100, Math.max(0, (timeShiftDateFromStart / totalStakeDuration) * 100));
                            
                            // Only show if Time-Shift progress is ahead of current progress
                            if (timeShiftProgress > stake.progress) {
                              // Collision detection with green progress percentage
                              const distanceFromGreen = Math.abs(timeShiftProgress - stake.progress);
                              const veryCloseToGreen = distanceFromGreen < 8; // Within 8% = collision, move above
                              
                              // Smart positioning to avoid overlap with progress text on the right
                              const wouldOverlapRight = timeShiftProgress >= 85;
                              const shouldMoveLeft = wouldOverlapRight && timeShiftProgress < 95 && !veryCloseToGreen;
                              
                              let leftPosition = `${timeShiftProgress}%`;
                              let transform = 'translateX(-50%)';
                              
                              if (shouldMoveLeft) {
                                // Move to left of the position to avoid overlap
                                leftPosition = `${timeShiftProgress - 8}%`;
                                transform = 'translateX(0%)';
                              }
                              
                              if (veryCloseToGreen) {
                                // Position orange percentage above the green percentage when very close
                                return (
                                  <>

                                    {/* Percentage above green when too close */}
                                    <div 
                                      className="font-bold text-orange-400 absolute text-center bottom-0 mb-8"
                                      style={{ 
                                        left: leftPosition,
                                        transform: transform
                                      }}
                                    >
                                      {timeShiftProgress.toFixed(0)}%
                                    </div>
                                  </>
                                );
                              } else {
                                // Default: percentage on same level as green, text above
                                return (
                                  <>

                                    {/* Percentage at same level as green */}
                                    <div 
                                      className="font-bold text-orange-400 absolute text-center bottom-0 mb-2"
                                      style={{ 
                                        left: leftPosition,
                                        transform: transform
                                      }}
                                    >
                                      {timeShiftProgress.toFixed(0)}%
                                    </div>
                                  </>
                                );
                              }
                            }
                          }
                        }
                        // Show for successfully completed stakes (when useEESValue is true) or Time-Shift after stake end
                        else if ((useEESValue && stake.status === 'inactive' && !stake.isEES && !stake.isOverdue) || 
                                 (useTimeShift && stake.status === 'active' && timeShiftTargetDate > stakeEndDate)) {
                          return (
                            <>

                              {/* Percentage at same level as green */}
                              <div 
                                className="font-bold text-orange-400 absolute text-center bottom-0 mb-2"
                                style={{ 
                                  left: '92%',
                                  transform: 'translateX(0%)'
                                }}
                              >
                                100%
                              </div>
                            </>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
                  <div className="relative h-[4px] mb-2">
                    <div className={`absolute inset-0 rounded-full ${stake.isOverdue ? 'bg-red-900/30' : stake.isEES ? 'bg-red-900/30' : 'bg-[#23411F]'}`} />
                    <div 
                      className={`absolute inset-y-0 left-0 ${(() => {
                        // Check if Time-Shift orange bar will be shown (connecting bars)
                        const timeShiftTargetDate = new Date(timeShiftDate);
                        const currentDate = new Date();
                        const stakeEndDate = new Date(stake.endDate);
                        const hasOrangeBar = useTimeShift && stake.status === 'active' && timeShiftTargetDate > currentDate;
                        
                        // Use rounded-l-full (only left rounded) when connecting to orange, rounded-full when standalone
                        return hasOrangeBar ? 'rounded-l-full' : 'rounded-full';
                      })()} ${stake.isOverdue || stake.isEES ? 'bg-red-400' : 'bg-[#70D668]'}`}
                      style={{ width: `${stake.progress}%` }} 
                    />
                    {/* Orange Time-Shift projection bar */}
                    {(() => {
                      // Define variables for both conditions
                      const timeShiftTargetDate = new Date(timeShiftDate);
                      const currentDate = new Date();
                      const stakeStartDate = new Date(stake.startDate);
                      const stakeEndDate = new Date(stake.endDate);
                      
                      // Show for active stakes with future Time-Shift dates (only when Time-Shift is enabled)
                      if (useTimeShift && stake.status === 'active') {
                        
                        // Only show if Time-Shift date is in the future
                        if (timeShiftTargetDate > currentDate) {
                          // Calculate Time-Shift date position as percentage of total stake duration
                          const totalStakeDuration = stakeEndDate.getTime() - stakeStartDate.getTime();
                          // If Time-Shift date is after stake end, use stake end date for progress calculation
                          const effectiveTargetDate = timeShiftTargetDate > stakeEndDate ? stakeEndDate : timeShiftTargetDate;
                          const timeShiftDateFromStart = effectiveTargetDate.getTime() - stakeStartDate.getTime();
                          const timeShiftProgress = Math.min(100, Math.max(0, (timeShiftDateFromStart / totalStakeDuration) * 100));
                          
                          // Only show if Time-Shift progress is ahead of current progress
                          if (timeShiftProgress > stake.progress) {
                            return (
                               <div 
                                 className="absolute inset-y-0 rounded-r-full bg-orange-400/60"
                                 style={{ 
                                   left: `${stake.progress}%`,
                                   width: `${timeShiftProgress - stake.progress}%`
                                 }} 
                               />
                             );
                          }
                        }
                      }
                      // Show for successfully completed stakes (when useEESValue is true) or Time-Shift after stake end
                      else if ((useEESValue && stake.status === 'inactive' && !stake.isEES && !stake.isOverdue) || 
                               (useTimeShift && stake.status === 'active' && timeShiftTargetDate > stakeEndDate)) {
                        // Show orange bar from current progress to 100%
                        const remainingProgress = 100 - stake.progress;
                        if (remainingProgress > 0) {
                          return (
                             <div 
                               className="absolute inset-y-0 rounded-r-full bg-orange-400/60"
                               style={{ 
                                 left: `${stake.progress}%`,
                                 width: `${remainingProgress}%`
                               }} 
                             />
                           );
                        }
                      }
                      return null;
                    })()}
                  </div>
                  <div className="text-xs text-zinc-500 text-right">
                    {(() => {
                      const startDate = new Date(stake.startDate)
                      const endDate = new Date(stake.endDate)
                      const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
                      const daysServed = Math.round((stake.progress / 100) * totalDays)
                      
                      // Special numbers that get gradient styling
                      const specialNumbers = [5555, 555, 369, 55]
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
                      
                      if (stake.isOverdue && stake.status === 'inactive') {
                        // For late-ended stakes, calculate days late
                        const actualEndDate = new Date(stake.actualEndDate)
                        const promisedEndDate = new Date(stake.endDate)
                        const daysLate = Math.max(0, Math.round((actualEndDate.getTime() - promisedEndDate.getTime()) / (1000 * 60 * 60 * 24)))
                        return (
                          <span className="text-red-400">
                            Ended {daysLate} days late
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

                      if (stake.status === 'inactive' && !stake.isEES && !stake.isOverdue) {
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
            {filteredStakes.length > displayedStakesCount && (
              <div className="text-center pt-4">
                <button
                  onClick={() => setDisplayedStakesCount(prev => Math.min(prev + 20, filteredStakes.length))}
                  className="px-6 py-3 bg-white/5 border border-white/20 text-white rounded-lg hover:bg-white/10 transition-colors"
                >
                  Load More Stakes ({filteredStakes.length - displayedStakesCount} remaining)
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
              className="fixed bg-black/80 backdrop-blur-sm z-999 flex items-start justify-center overflow-hidden"
              style={{ 
                position: 'fixed',
                top: 0, 
                left: 0, 
                right: 0, 
                bottom: 0,
                width: '100vw',
                height: '100vh',
                minHeight: '100vh',
                margin: 0,
                paddingTop: '6rem',
                paddingLeft: '1rem',
                paddingRight: '1rem'
              }}
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
                    className={`px-4 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-all duration-200 relative z-10 ${
                      activeTab === 'addresses' 
                        ? 'bg-white text-black shadow-lg' 
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    <span className="sm:hidden">Addresses</span>
                    <span className="hidden sm:inline">{displayAddresses.length} Address{displayAddresses.length !== 1 ? 'es' : ''}</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('settings')
                      // Don't reset pending states when switching tabs - preserve user selections
                    }}
                    className={`plausible-event-name=Clicks+Settings+Tab px-6 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-all duration-200 relative z-10 ${
                      activeTab === 'settings' 
                        ? 'bg-white text-black shadow-lg' 
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    Settings
                  </button>
                  {ENABLE_TOKENS_TAB && (
                  <button
                    onClick={() => setActiveTab('coins')}
                    className={`plausible-event-name=Clicks+Token+List px-6 py-1.5 text-xs sm:text-sm font-medium rounded-full transition-all duration-200 relative z-10 ${
                      activeTab === 'coins' 
                        ? 'bg-white text-black shadow-lg' 
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    Tokens
                  </button>
                  )}
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
                        className="flex-1 text-sm text-white hover:text-gray-300 transition-colors cursor-pointer text-left"
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
                    {ENABLE_MORE_TOKENS && (
                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex-1">
                          <div className="font-medium text-white mb-1">Include More Tokens</div>
                        <div className="text-sm text-gray-400">
                            Auto scan an additional ~400 tokens from an extended whitelist. Adds support for manually adding farm positions. (This will increase loading time by around 3X.)
                        </div>
                      </div>
                      <button
                          onClick={() => {
                            const newValue = pendingIncludeMoreTokens !== null ? !pendingIncludeMoreTokens : !includeMoreTokens
                            setPendingIncludeMoreTokens(newValue)
                          }}
                          className={`plausible-event-name=Toggles+Include+More+Tokens ml-4 relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                            (pendingIncludeMoreTokens !== null ? pendingIncludeMoreTokens : includeMoreTokens) ? 'bg-white' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${
                              (pendingIncludeMoreTokens !== null ? pendingIncludeMoreTokens : includeMoreTokens) ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                    )}

                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex-1">
                        <div className="font-medium text-white mb-1">Liquidity & Farms</div>
                        <div className="text-sm text-gray-400">
                          Show PLSX liquidity pool positions in your portfolio. Allows for the manual addition of farm/lp postitions across PLSX, PHUX, 9MM, 9INCH, Uniswap, etc via the settings.
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          const currentValue = pendingShowLiquidityPositions !== null ? pendingShowLiquidityPositions : showLiquidityPositions
                          setPendingShowLiquidityPositions(!currentValue)
                        }}
                        className={`plausible-event-name=Toggles+Liquidity+Positions ml-4 relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                          (pendingShowLiquidityPositions !== null ? pendingShowLiquidityPositions : showLiquidityPositions) ? 'bg-white' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${
                            (pendingShowLiquidityPositions !== null ? pendingShowLiquidityPositions : showLiquidityPositions) ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex-1">
                        <div className="font-medium text-white mb-1">MAXI Token Backing</div>
                        <div className="text-sm text-gray-400">
                          Use the backing price instead of the current market price
                          {detectiveMode && <span className="block text-xs text-blue-400 mt-1">Detective mode defaults: OFF</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => setUseBackingPrice(!useBackingPrice)}
                        className={`plausible-event-name=Toggles+MAXI+Tokens ml-4 relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
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
                        <div className="font-medium text-white mb-1">Include Maxi & HSI Stake Data</div>
                        <div className="text-sm text-gray-400">
                          This will add support for pooled MAXI & HEDRON HSI Stake data to your HEX stake section in your portfolio.
                          {detectiveMode && <span className="block text-xs text-blue-400 mt-1">Detective mode defaults: ON</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => setIncludePooledStakes(!includePooledStakes)}
                        className={`plausible-event-name=Toggles+Pooled+Stakes ml-4 relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
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

                    {/* Time-Shift Feature Toggle and Date Picker */}
                    <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex-1">
                          <div className="font-medium text-white mb-1">Time Machine</div>
                          <div className="text-sm text-gray-400">
                            See your portfolio to a future point in time when your stakes have progresseda and HEX price/payouts have changed.
                            {detectiveMode && <span className="block text-xs text-blue-400 mt-1">Detective mode defaults: OFF</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => setUseTimeShift(!useTimeShift)}
                          className={`plausible-event-name=Toggles+Time+Machine ml-4 relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                            useTimeShift ? 'bg-white' : 'bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${
                              useTimeShift ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Date Picker and Override Fields - Only show when Time-Shift is enabled */}
                      {useTimeShift && (
                        <div className="space-y-4">
                          {/* Date Picker */}
                          <div 
                            onClick={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onMouseUp={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            onTouchEnd={(e) => e.stopPropagation()}
                          >
                            <div className="text-sm text-gray-300 mb-2">Target Date</div>
                            <DatePicker
                              date={timeShiftDate}
                              setDate={(date: Date | undefined) => {
                                if (date) {
                                  // Check if selected date is today
                                  const today = new Date();
                                  const isToday = date.toDateString() === today.toDateString();
                                  
                                  if (isToday) {
                                    // Turn off Time-Shift mode if today is selected
                                    setUseTimeShift(false);
                                    // Reset to a future date instead of null
                                    const tomorrow = new Date();
                                    tomorrow.setDate(tomorrow.getDate() + 1);
                                    setTimeShiftDate(tomorrow);
                                  } else {
                                    setTimeShiftDate(date);
                                  }
                                }
                              }}
                              placeholder="Select time-shift date"
                              minDate={(() => {
                                const yesterday = new Date();
                                yesterday.setDate(yesterday.getDate() - 1);
                                return yesterday;
                              })()}
                            />
                          </div>

                          {/* Price & Payout Overrides - Single Row */}
                          <div>
                            <div className="text-sm text-gray-300 mb-2">Price & Payout Overrides</div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                              <div>
                                <label className="text-xs text-gray-400 block mb-1">pHEX Price</label>
                                <div className="relative">
                                  <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">$</span>
                                  <input
                                    type="number"
                                    step="0.0001"
                                    value={timeMachineHexPrice}
                                    onChange={(e) => setTimeMachineHexPrice(e.target.value)}
                                    onBlur={() => {
                                      if (window.plausible) window.plausible('Edits pHEX Price Override');
                                    }}
                                    placeholder={`${formatPrice(getTokenPrice('HEX')).replace('$', '')}`}
                                    className="w-full pl-6 pr-2 py-1 text-sm bg-black border border-white/20 rounded text-white placeholder-gray-500 focus:outline-none focus:border-white/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="text-xs text-gray-400 block mb-1">eHEX Price</label>
                                <div className="relative">
                                  <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">$</span>
                                  <input
                                    type="number"
                                    step="0.0001"
                                    value={timeMachineEHexPrice}
                                    onChange={(e) => setTimeMachineEHexPrice(e.target.value)}
                                    onBlur={() => {
                                      if (window.plausible) window.plausible('Edits eHEX Price Override');
                                    }}
                                    placeholder={`${formatPrice(getTokenPrice('eHEX')).replace('$', '')}`}
                                    className="w-full pl-6 pr-2 py-1 text-sm bg-black border border-white/20 rounded text-white placeholder-gray-500 focus:outline-none focus:border-white/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                </div>
                              </div>
                              <div>
                                <label className="text-xs text-gray-400 block mb-1">pHEX Daily Payout</label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={timeMachinePlsPayout}
                                    onChange={(e) => setTimeMachinePlsPayout(e.target.value)}
                                    onBlur={() => {
                                      if (window.plausible) window.plausible('Edits pHEX Payout Override');
                                    }}
                                    placeholder={(() => {
                                      if (hexDailyDataCacheForEES?.dailyPayouts?.PLS) {
                                        const current = calculate30DayAvgPayout(hexDailyDataCacheForEES.dailyPayouts.PLS);
                                        return `${current.toFixed(2)}`;
                                      }
                                      return 'Loading...';
                                    })()}
                                    className="w-full pl-2 pr-12 py-1 text-sm bg-black border border-white/20 rounded text-white placeholder-gray-500 focus:outline-none focus:border-white/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                  <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">pHEX</span>
                                </div>
                              </div>
                              <div>
                                <label className="text-xs text-gray-400 block mb-1">eHEX Daily Payout</label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    step="0.01"
                                    value={timeMachineEthPayout}
                                    onChange={(e) => setTimeMachineEthPayout(e.target.value)}
                                    onBlur={() => {
                                      if (window.plausible) window.plausible('Edits eHEX Payout Override');
                                    }}
                                    placeholder={(() => {
                                      if (hexDailyDataCacheForEES?.dailyPayouts?.ETH) {
                                        const current = calculate30DayAvgPayout(hexDailyDataCacheForEES.dailyPayouts.ETH);
                                        return `${current.toFixed(2)}`;
                                      }
                                      return 'Loading...';
                                    })()}
                                    className="w-full pl-2 pr-12 py-1 text-sm bg-black border border-white/20 rounded text-white placeholder-gray-500 focus:outline-none focus:border-white/40 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  />
                                  <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm">eHEX</span>
                                </div>
                              </div>
                              
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex-1">
                        <div className="font-medium text-white mb-1">EES Mode</div>
                        <div className="text-sm text-gray-400">
                        Display the max extractable value via EESing your HEX stakes instead of current paper principle + yield.
                          {detectiveMode && <span className="block text-xs text-blue-400 mt-1">Detective mode defaults: OFF</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => setUseEESValue(!useEESValue)}
                        className={`plausible-event-name=Toggles+EES+Mode ml-4 relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                          useEESValue ? 'bg-white' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${
                            useEESValue ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>



                    {/* Include Liquidity Positions - Temporarily commented out */}
                    {/* <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex-1">
                        <div className="font-medium text-white mb-1">Include Liquidity Positions?</div>
                        <div className="text-sm text-gray-400">
                          Display LP tokens from PulseX and other DEXs in your portfolio.
                          {detectiveMode && <span className="block text-xs text-blue-400 mt-1">Detective mode defaults: OFF</span>}
                        </div>
                      </div>
                      <button
                        onClick={() => setShowLiquidityPositions(!showLiquidityPositions)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                          showLiquidityPositions ? 'bg-white' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${
                            showLiquidityPositions ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div> */}


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
                        onBlur={() => {
                          if (window.plausible) window.plausible('Edits Validator Count');
                        }}
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
                            // Track the event
                            if (window.plausible) window.plausible('Edits Dust Filter');
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
                          className={`ml-4 relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
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

                    {/* Font Selection Setting */}
                    <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex-1">
                          <div className="font-medium text-white mb-1">Custom Font</div>
                          <div className="text-sm text-gray-400">
                            Choose a custom font for the UI interface. When disabled, uses the default Archia font.
                          </div>
                        </div>
                        <button
                          onClick={() => setUseFontSelection(!useFontSelection)}
                          className={`plausible-event-name=Toggles+Custom+Font ml-4 relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                            useFontSelection ? 'bg-white' : 'bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${
                              useFontSelection ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Font Selector - Only show when font selection is enabled */}
                      {useFontSelection && (
                        <div className="space-y-2">
                          <div className="text-sm text-gray-300 mb-2">Select Font</div>
                          <Select value={selectedFont} onValueChange={setSelectedFont}>
                            <SelectTrigger className="w-full bg-black border-white/20 text-white">
                              <SelectValue placeholder="Select a font..." />
                            </SelectTrigger>
                            <SelectContent className="bg-black border-white/20">
                              {Object.entries(AVAILABLE_FONTS).map(([key, font]) => (
                                <SelectItem 
                                  key={key} 
                                  value={key}
                                  className="text-white hover:bg-white/10 focus:bg-white/10"
                                  style={{ fontFamily: font.name }}
                                >
                                  {font.displayName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    {/* Custom Background Color Setting */}
                    <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex-1">
                          <div className="font-medium text-white mb-1">Custom Background</div>
                          <div className="text-sm text-gray-400">
                            Add a subtle colored overlay effect to the background. Uses white by default when enabled.
                          </div>
                        </div>
                        <button
                          onClick={() => setUseCustomBackground(!useCustomBackground)}
                          className={`plausible-event-name=Toggles+Custom+Background ml-4 relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                            useCustomBackground ? 'bg-white' : 'bg-gray-600'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${
                              useCustomBackground ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                      </div>

                      {/* Color Picker - Only show when custom background is enabled */}
                      {useCustomBackground && (
                        <div className="space-y-3">
                          <div className="text-sm text-gray-300 mb-2">Background Color</div>
                          
                          {/* Color input row */}
                          <div className="flex items-center gap-3">
                            {/* Color picker */}
                            <div className="relative">
                              <div 
                                className="w-12 h-10 rounded border-2 border-white/20 bg-black cursor-pointer overflow-hidden relative"
                                title="Choose background color"
                              >
                                <input
                                  ref={colorPickerRef}
                                  type="color"
                                  value={currentPickerColor}
                                  onChange={(e) => setCurrentPickerColor(e.target.value)}
                                  onBlur={(e) => setCustomBackgroundColor(e.target.value)}
                                  onMouseUp={(e) => setCustomBackgroundColor(e.target.value)}
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div 
                                  className="w-full h-full"
                                  style={{ backgroundColor: currentPickerColor }}
                                />
                              </div>
                            </div>
                            
                            {/* Hex input */}
                            <div className="flex-1">
                              <input
                                type="text"
                                value={currentPickerColor}
                                onChange={(e) => {
                                  const value = e.target.value
                                  // Validate hex color format
                                  if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                                    setCurrentPickerColor(value)
                                  }
                                }}
                                onBlur={(e) => setCustomBackgroundColor(e.target.value)}
                                placeholder="#ffffff"
                                className="w-full px-3 py-2 bg-black border border-white/20 rounded text-white placeholder-gray-500/50 focus:border-white/40 focus:outline-none text-sm font-mono"
                                maxLength={7}
                              />
                            </div>
                          </div>
                          
                          {/* Quick color presets */}
                          <div className="flex gap-2 flex-wrap">
                            {[
                              { name: 'Purple', color: '#8b5cf6' },
                              { name: 'Pink', color: '#ec4899' },
                              { name: 'Blue', color: '#3b82f6' },
                              { name: 'White', color: '#ffffff' },
                              { name: 'Black', color: '#000000' },
                              { name: 'Green', color: '#10b981' },
                              { name: 'Yellow', color: '#f59e0b' }
                            ].map(preset => (
                              <button
                                key={preset.color}
                                onClick={() => {
                                  setCurrentPickerColor(preset.color)
                                  setCustomBackgroundColor(preset.color)
                                  
                                  // If user clicks black, turn off the toggle
                                  if (preset.color === '#000000') {
                                    setUseCustomBackground(false)
                                  }
                                }}
                                className="px-3 py-1 text-xs rounded border border-white/20 text-gray-300 hover:text-white hover:border-white/40 transition-colors"
                                style={{ backgroundColor: `${preset.color}20` }}
                              >
                                {preset.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
  
                  </div>
                </div>
              )}

              {/* Coins Tab */}
              {activeTab === 'coins' && (
                <div className="space-y-6">
                  {/* Mode Selection */}
                  <div className="space-y-4">
                    <div className="flex bg-white/5 border border-white/10 rounded-full p-1">
                      <button
                        onClick={() => handleModeSwitch('auto-detect')}
                        className={`flex-1 px-4 py-2 text-xs md:text-sm font-medium rounded-full transition-all duration-200 ${
                          (pendingCoinDetectionMode || coinDetectionMode) === 'auto-detect'
                            ? 'bg-white text-black shadow-sm'
                            : 'text-gray-300 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        Auto-scan
                      </button>
                      <button
                        onClick={() => handleModeSwitch('manual')}
                        className={`plausible-event-name=Switched+to+Advanced+Token+List flex-1 px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                          (pendingCoinDetectionMode || coinDetectionMode) === 'manual'
                            ? 'bg-white text-black shadow-sm'
                            : 'text-gray-300 hover:text-white hover:bg-white/10'
                        }`}
                      >
                       Manual Overrides
                      </button>
              </div>
                    
                    {/* Mode Description */}
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <div className="text-sm text-center leading-12 text-blue-300">
                        {(pendingCoinDetectionMode || coinDetectionMode) === 'auto-detect' ? (
                          <div>
                            <div>
                            💡 Automatically detects tokens & balances for you.
                            </div>
                          </div>
                        ) : (
                          <div>
                             💡 Manually add extra tokens & edit their balances:
                             {/* <br/><br/> - <button 
                               onClick={() => setShowImportDialog(true)}
                               className="text-blue-300 hover:text-white underline cursor-pointer transition-colors"
                               title="Check balances for all 400+ tokens from MORE_COINS"
                             >
                               Click here
                             </button> to scan & import tokens automatically (5-10 mins)
                             <br/> - Or add tokens and edit balances manually below... */}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>



                  {/* Chain Selection - Only show in Manual Mode */}
                  {(pendingCoinDetectionMode || coinDetectionMode) === 'manual' && (
                    <div className="flex bg-white/5 text-sm border border-white/10 rounded-full p-1">
                    {availableChains.map(chainId => {
                      const chainName = chainId === 369 ? 'PulseChain' : 
                                       chainId === 1 ? 'Ethereum' : 
                                       `Chain ${chainId}`
                      const tokenCount = tokensByChain[chainId]?.length || 0
                      
                      return (
                        <button
                          key={chainId}
                          onClick={() => setActiveChainTab(chainId)}
                          className={`flex-1 px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                            activeChainTab === chainId
                              ? 'bg-white text-black shadow-sm'
                              : 'text-gray-300 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          {chainName}
                        </button>
                      )
                    })}
                    </div>
                  )}

                  {/* Clear Manual Selections - Only show in Manual Mode */}
                  {(pendingCoinDetectionMode || coinDetectionMode) === 'manual' && (
                    <div className="text-center mb-4">
                      <button
                        onClick={() => setShowResetConfirmDialog(true)}
                        className="text-red-400 underline text-sm hover:text-red-300 transition-colors cursor-pointer"
                        title="Reset selection to match auto-detect mode (only tokens with balances from the curated list)"
                      >
                        Clear all manual selections & resync with what you actually hold
                      </button>
                    </div>
                  )}

                  {/* Coins List for Selected Chain - Only show in Manual Mode */}
                  {(pendingCoinDetectionMode || coinDetectionMode) === 'manual' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white">
                          {activeChainTab === 369 ? 'PulseChain' : 
                           activeChainTab === 1 ? 'Ethereum' : 
                           `Chain ${activeChainTab}`} Tokens
                        </h3>
                        <div className="text-sm text-gray-400">
                          {(() => {
                            const currentEnabled = pendingEnabledCoins || enabledCoins
                            return `${filteredTokensByChain[activeChainTab]?.filter(token => currentEnabled.has(token.ticker)).length || 0} / ${filteredTokensByChain[activeChainTab]?.length || 0} ${tokenSearchTerm ? 'filtered' : 'enabled'}`
                          })()}
                        </div>
                      </div>

                      {/* Search Bar */}
                      <div className="mb-4">
                        <input
                          type="text"
                          placeholder="Search tokens by name or symbol..."
                          value={tokenSearchTerm}
                          onChange={(e) => setTokenSearchTerm(e.target.value)}
                          className="w-full px-3 py-2 bg-black border border-white/20 rounded text-white placeholder-gray-500/50 focus:border-white/40 focus:outline-none text-sm"
                        />
                      </div>



                      {/* Token List */}
                      <div className="space-y-2">
                        {/* Manual mode: Show all tokens with toggles */}
                        {filteredTokensByChain[activeChainTab]?.length > 0 ? (
                          filteredTokensByChain[activeChainTab]?.map(token => {
                          const currentEnabled = pendingEnabledCoins || enabledCoins
                          const isEnabled = currentEnabled.has(token.ticker)
                          const isLP = token.type === 'lp'
                          const isFarm = token.type === 'farm'
                          
                          return (
                            <div
                              key={`${token.chain}-${token.a}-${token.ticker}`}
                              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                newlyEnabledTokens.has(token.ticker) 
                                  ? 'bg-green-500/10 border-green-500/30' 
                                  : 'bg-white/5 border-white/10'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
                                {isLP ? (
                                  <div className="relative w-8 h-8 flex-shrink-0">
                                    {(() => {
                                      // Check if this is a multi-token LP pair (contains " / ") or single token LP
                                      const hasMultipleTokens = token.ticker.includes(' / ')
                                      
                                      if (!hasMultipleTokens) {
                                        // Single token LP (like PHUX LPs) - use the token's own logo
                                        return (
                                          <div className="w-8 h-8 flex items-center justify-center">
                                            <CoinLogo 
                                              symbol={token.ticker} 
                                              size="lg" 
                                              className="w-8 h-8"
                                              customImageUrl={customTokens.find(t => t.ticker === token.ticker)?.logoUrl}
                                            />
                                          </div>
                                        )
                                      }
                                      
                                      // Extract token symbols from LP pair name (e.g., "HEX / WPLS" -> ["HEX", "WPLS"])
                                      const tokenSymbols = token.ticker.split(' / ')
                                      
                                      // Clean up all token symbols for logo lookup
                                      const cleanedSymbols = tokenSymbols.map(symbol => {
                                        let cleanedSymbol = symbol || 'PLS'
                                        
                                        // Handle pump.tires tokens: "HEX (from pump.tires)" -> "HEX"
                                        if (cleanedSymbol.includes('(from pump.tires)')) {
                                          cleanedSymbol = cleanedSymbol.replace(' (from pump.tires)', '').trim()
                                        }
                                        
                                        // Handle version indicators: "HEX (v1)" -> "HEX", "WPLS (Alt)" -> "WPLS"
                                        cleanedSymbol = cleanedSymbol.replace(/\s*\((v1|v2|Alt)\)$/i, '').trim()
                                        
                                        return cleanedSymbol
                                      })
                                      
                                      const token0Symbol = cleanedSymbols[0] || 'PLS'
                                      const token1Symbol = cleanedSymbols[1] || 'HEX'
                                      const token2Symbol = cleanedSymbols[2]
                                      
                                      // Handle 3-token pools with smaller triangle layout
                                      if (token2Symbol) {
                                        return (
                                          <>
                                            {/* First token (top) */}
                                            <div className="absolute top-0 left-1.5 w-5 h-5 flex-shrink-0">
                                              <CoinLogo
                                                symbol={token0Symbol}
                                                size="sm"
                                                className="w-5 h-5 rounded-full"
                                              />
                                            </div>
                                            {/* Second token (bottom left) */}
                                            <div className="absolute top-3 left-0 w-5 h-5 flex-shrink-0">
                                              <CoinLogo
                                                symbol={token1Symbol}
                                                size="sm"
                                                className="w-5 h-5 rounded-full"
                                              />
                                            </div>
                                            {/* Third token (bottom right) */}
                                            <div className="absolute top-3 left-3 w-5 h-5 flex-shrink-0">
                                              <CoinLogo
                                                symbol={token2Symbol}
                                                size="sm"
                                                className="w-5 h-5 rounded-full"
                                              />
                                            </div>
                                          </>
                                        )
                                      }
                                      
                                      // Handle 2-token pools with standard overlapping layout
                                      return (
                                        <>
                                          {/* First token (back) */}
                                          <div className="absolute top-0 left-0 w-6 h-6 flex-shrink-0">
                                            <CoinLogo
                                              symbol={token0Symbol}
                                              size="sm"
                                              className="w-6 h-6 rounded-full shadow-sm"
                                            />
                                          </div>
                                          {/* Second token (front, overlapping) */}
                                          <div className="absolute top-2 left-2.5 w-6 h-6 flex-shrink-0">
                                            <CoinLogo
                                              symbol={token1Symbol}
                                              size="sm"
                                              className="w-6 h-6 rounded-full shadow-sm"
                                            />
                                          </div>
                                        </>
                                      )
                                    })()}
                                  </div>
                                ) : (
                                  <div className="relative w-8 h-8 flex-shrink-0">
                                    {(() => {
                                      // Check if this is a farm token with dual logos (contains " / ")
                                      const hasDualLogos = isFarm && token.ticker.includes(' / ')
                                      
                                      if (!hasDualLogos) {
                                        // Single logo for regular tokens
                                        return (
                                    <CoinLogo 
                                      symbol={token.ticker} 
                                      size="lg" 
                                      className="w-8 h-8"
                                      customImageUrl={customTokens.find(t => t.ticker === token.ticker)?.logoUrl}
                                          />
                                        )
                                      }
                                      
                                      // Dual logos for farm tokens - match LP token styling exactly
                                      const tokenSymbols = token.ticker.split(' / ')
                                      const cleanedSymbols = tokenSymbols.map(symbol => cleanTickerForLogo(symbol || 'PLS'))
                                      
                                      const token0Symbol = cleanedSymbols[0] || 'PLS'
                                      const token1Symbol = cleanedSymbols[1] || 'HEX'
                                      
                                      return (
                                        <div className="relative w-8 h-8 flex-shrink-0">
                                          {/* First token (back) */}
                                          <div className="absolute top-0 left-0 w-6 h-6 flex-shrink-0">
                                            <CoinLogo
                                              symbol={token0Symbol}
                                              size="sm"
                                              className="w-6 h-6 rounded-full shadow-sm"
                                              customImageUrl={customTokens.find(t => t.ticker === token0Symbol)?.logoUrl}
                                            />
                                          </div>
                                          {/* Second token (front, overlapping) */}
                                          <div className="absolute top-2 left-2.5 w-6 h-6 flex-shrink-0">
                                            <CoinLogo
                                              symbol={token1Symbol}
                                              size="sm"
                                              className="w-6 h-6 rounded-full shadow-sm"
                                              customImageUrl={customTokens.find(t => t.ticker === token1Symbol)?.logoUrl}
                                            />
                                          </div>
                                        </div>
                                      )
                                    })()}
                                  </div>
                                )}
                                <div className="min-w-0 flex-1 max-w-[50%] sm:max-w-none">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-medium text-white text-[11px] md:text-base break-words leading-tight">{getDisplayTicker(token.ticker)}</span>
                                    {isLP && (
                                      <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-300 rounded">
                                        LP
                                      </span>
                                    )}
                                    {isFarm && (
                                      <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-300 rounded">
                                        Farm
                                      </span>
                                    )}
                                    {(() => {
                                      // Show "Watchlist" label for tokens that are toggled ON and have 0 in input (not ?)
                                      if (!isEnabled) return null // Only show if token is toggled on
                                      
                                      // Check if this is a V3 position
                                      const isV3Position = token.name?.includes('9MM LP V3')
                                      
                                      if (isV3Position) {
                                        // For V3 positions, check customV3Values instead of customBalances
                                        const hasCustomV3Value = customV3Values.has(token.ticker)
                                        const customV3Value = hasCustomV3Value ? customV3Values.get(token.ticker) : ''
                                        const isZeroV3Value = !hasCustomV3Value || customV3Value === '0' || customV3Value === ''
                                        
                                        return isZeroV3Value && (
                                          <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-300 rounded">
                                            <span className="hidden md:inline">Watchlist</span>
                                            <span className="md:hidden">W</span>
                                          </span>
                                        )
                                      } else {
                                        // For regular tokens, use existing logic
                                      const currentBalance = getCurrentBalance(token.ticker)
                                      const hasCustomValue = customBalances.has(token.ticker)
                                      const customValue = hasCustomValue ? customBalances.get(token.ticker) : ''
                                      const inputValue = hasCustomValue ? customValue : (currentBalance || '0')
                                      const isZeroBalance = inputValue === '0' || inputValue === 0
                                      const isLoading = currentBalance === null && !hasCustomValue // Shows ? in placeholder
                                      
                                      return isZeroBalance && !isLoading && (
                                        <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-300 rounded">
                                          <span className="hidden md:inline">Watchlist</span>
                                          <span className="md:hidden">W</span>
                                        </span>
                                      )
                                      }
                                    })()}
                                    {/* Custom label - show inline on all screen sizes */}
                                    {token.id && token.id.startsWith('custom_') && (
                                      <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-300 rounded">
                                        <span className="hidden md:inline">Custom</span>
                                        <span className="md:hidden">C</span>
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-col">

                                    <div className="text-xs md:text:sm text-gray-400 truncate hidden md:block">
                                      {token.name}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Balance input field - only show for enabled tokens */}
                              {isEnabled && (
                                <div className={`xs:w-[100px] sm:w-[140px] md:w-[160px] mr-6 ${  
                                  token.id && token.id.startsWith('custom_') ? 'w-20' : 'w-20'
                                }`}>
                                  {(() => {
                                    // Check if this is a V3 position (has 9MM LP V3 name, includes both static and dynamic V3 positions)
                                    const isV3Position = token.name?.includes('9MM LP V3')
                                    
                                    console.log(`[V3 Detection] ${token.ticker}: isV3Position=${isV3Position}, name="${token.name}"`)
                                    
                                    if (isV3Position) {
                                      // V3 Position: Use USD value input
                                      return (
                                        <div className="relative">
                                          <span className="absolute left-2 md:left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-xs md:text-sm">$</span>
                                          <input
                                            type="text"
                                            placeholder="0.00"
                                            value={formatInputValue(customV3Values.get(token.ticker) || '')}
                                            onChange={(e) => {
                                              const newCustomV3Values = new Map(customV3Values)
                                              if (e.target.value === '') {
                                                newCustomV3Values.delete(token.ticker)
                                              } else {
                                                const parsedValue = parseInputValue(e.target.value)
                                                console.log(`[Custom V3 Value Input] ${token.ticker}: input="${e.target.value}" -> parsed="${parsedValue}"`)
                                                newCustomV3Values.set(token.ticker, parsedValue)
                                                
                                                // Auto-enable liquidity positions for V3 positions
                                                const currentLiquidityPositions = pendingShowLiquidityPositions !== null ? pendingShowLiquidityPositions : showLiquidityPositions
                                                if (!currentLiquidityPositions) {
                                                  console.log(`[Auto-Enable] Enabling liquidity positions for V3 position: ${token.ticker}`)
                                                  setPendingShowLiquidityPositions(true)
                                                }
                                              }
                                              setCustomV3Values(newCustomV3Values)
                                            }}
                                            className="w-full h-8 pl-5 md:pl-6 pr-2 md:pr-3 bg-black border border-white/20 rounded text-white placeholder-gray-500 focus:border-white/20 focus:outline-none text-xs md:text-sm text-right"
                                            title="Enter USD value for this V3 position"
                                          />
                                        </div>
                                      )
                                    } else {
                                      // Regular Token: Use token amount input
                                      return (
                                  <input
                                    type="text"
                                    placeholder={formatBalanceForPlaceholder(getCurrentBalance(token.ticker))}
                                    value={formatInputValue(customBalances.get(token.ticker) || '')}
                                    onChange={(e) => {
                                      const newCustomBalances = new Map(customBalances)
                                      if (e.target.value === '') {
                                        newCustomBalances.delete(token.ticker)
                                      } else {
                                        // Store the parsed value (without commas) for calculations
                                        const parsedValue = parseInputValue(e.target.value)
                                        console.log(`[Custom Balance Input] ${token.ticker}: input="${e.target.value}" -> parsed="${parsedValue}"`)
                                        newCustomBalances.set(token.ticker, parsedValue)
                                        
                                        // Auto-enable liquidity positions if this is a farm or LP token
                                        const tokenType = (token as any).type
                                        if ((tokenType === 'farm' || tokenType === 'lp') && parseFloat(parsedValue) > 0) {
                                          const currentLiquidityPositions = pendingShowLiquidityPositions !== null ? pendingShowLiquidityPositions : showLiquidityPositions
                                          if (!currentLiquidityPositions) {
                                            console.log(`[Auto-Enable] Enabling liquidity positions for ${tokenType} token: ${token.ticker}`)
                                            setPendingShowLiquidityPositions(true)
                                          }
                                        }
                                      }
                                      setCustomBalances(newCustomBalances)
                                    }}
                                    className="w-full h-8 px-2 md:px-3 bg-black border border-white/20 rounded text-white placeholder-gray-500 focus:border-white/20 focus:outline-none text-xs md:text-sm text-right"
                                  />
                                      )
                                    }
                                  })()}
                                </div>
                              )}
                              
                              {/* Edit and Delete buttons for custom tokens - only show when toggle is off */}
                              {token.id && token.id.startsWith('custom_') ? (
                                <div className="flex items-center">
                                  {!isEnabled ? (
                                    <>
                                    <button
                                      onClick={() => editCustomToken(token.id)}
                                        className="p-1 mr-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded"
                                      title="Edit custom token"
                                    >
                                      <Icons.edit className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => deleteCustomToken(token.id)}
                                      className="p-1 mr-4 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded"
                                      title="Delete custom token"
                                    >
                                      <Icons.trash className="w-4 h-4" />
                                    </button>
                                    </>
                                  ) : (
                                    <div className="w-[40px]"></div>
                                  )}
                                </div>
                              ) : (
                                <div className="hidden md:block w-[0px]"></div>
                              )}
                              
                              <button
                                onClick={() => {
                                  const currentEnabled = pendingEnabledCoins || enabledCoins
                                  const newEnabled = new Set(currentEnabled)
                                  if (isEnabled) {
                                    newEnabled.delete(token.ticker)
                                    
                                    // Clear custom V3 value when toggled off
                                    const isV3Position = token.name?.includes('9MM LP V3')
                                    if (isV3Position) {
                                      const newCustomV3Values = new Map(customV3Values)
                                      newCustomV3Values.delete(token.ticker)
                                      setCustomV3Values(newCustomV3Values)
                                      console.log(`[V3 Toggle OFF] Cleared custom V3 value for ${token.ticker}`)
                                    }
                                    
                                    // Remove green styling when toggling OFF non-custom tokens
                                    const isCustomToken = (token as any).id?.startsWith('custom_')
                                    if (!isCustomToken) {
                                      setNewlyEnabledTokens(prev => {
                                        const newSet = new Set(prev)
                                        newSet.delete(token.ticker)
                                        return newSet
                                      })
                                    }
                                  } else {
                                    newEnabled.add(token.ticker)
                                    // Track that this token was just toggled on
                                    setNewlyEnabledTokens(prev => new Set([...prev, token.ticker]))
                                    
                                    // Track Plausible event for toggling ON regular tokens (not custom tokens)
                                    const isCustomToken = (token as any).id?.startsWith('custom_')
                                    if (!isCustomToken && window.plausible) {
                                      window.plausible('Toggled on Token in Advanced Mode')
                                    }
                                  }
                                  setPendingEnabledCoins(newEnabled)
                                  setHasUserMadeManualChanges(true)
                                }}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                                  isEnabled ? 'bg-white' : 'bg-gray-600'
                                }`}
                              >
                                <span
                                  className={`inline-block h-4 w-4 transform rounded-full bg-black transition-transform ${
                                    isEnabled ? 'translate-x-6' : 'translate-x-1'
                                  }`}
                                />
                              </button>
                            </div>
                          )
                        })
                        ) : (
                          // No tokens found (either no tokens on this chain or search returned no results)
                          <div className="text-center py-8 text-gray-400">
                            <div className="text-lg mb-2">🔍</div>
                            <div className="text-sm">
                              {tokenSearchTerm 
                                ? `No tokens found matching "${tokenSearchTerm}"`
                                : `No tokens available on ${activeChainTab === 369 ? 'PulseChain' : activeChainTab === 1 ? 'Ethereum' : `Chain ${activeChainTab}`}`
                              }
                            </div>
                            {tokenSearchTerm && (
                              <div className="text-xs mt-1 text-gray-500">
                                Try searching for a different term
                              </div>
                            )}
                          </div>
                        )}
                      </div>


                    </div>
                  )}
                </div>
              )}
              </div>

              {/* Fixed Footer - Add Custom Token (only for coins tab) */}
              {activeTab === 'coins' && (pendingCoinDetectionMode || coinDetectionMode) === 'manual' && (
                <div className="border-t-2 border-white/10 bg-white/5">
                  {/* Toggle Header - Entire shelf clickable */}
                    <button
                      onClick={() => setIsCustomTokenSectionOpen(!isCustomTokenSectionOpen)}
                    className="flex items-center justify-between w-full text-left py-4 px-4 sm:px-6"
                    >
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-white">
                          {editingTokenId ? 'Edit Custom Token' : 'Add Custom Token'}
                        </h3>
                      </div>
                      <ChevronDown 
                        className={`w-5 h-5 text-gray-400 hover:text-white transition-all duration-200 ${
                          isCustomTokenSectionOpen ? 'rotate-180' : ''
                        }`} 
                      />
                    </button>

                    {/* Collapsible Content */}
                    {isCustomTokenSectionOpen && (
                      <div className="space-y-4 max-h-[50vh] overflow-y-auto scrollbar-hide md:max-h-none md:overflow-visible bg-transparent rounded-lg p-4" style={{ WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain' }}>
                    
                    {/* Duplicate Token Error Message */}
                    {duplicateTokenError && (
                      <div className="p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm flex items-center gap-2">
                        <span>⚠️</span>
                        <span>{duplicateTokenError}</span>
                      </div>
                    )}

                    {/* Add new token form */}
                    <div className="space-y-3">
                      {/* First row: Ticker and Token Name */}
                      <div className="grid grid-cols-2 gap-3 items-center text-sm md:text-base">
                        <input
                          type="text"
                          placeholder="Ticker (required)"
                          value={newTokenForm.ticker}
                          onChange={(e) => {
                            setNewTokenForm(prev => ({ ...prev, ticker: e.target.value.toUpperCase() }))
                            setDuplicateTokenError(null) // Clear error when user types
                          }}
                          className="h-10 px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-gray-400 focus:outline-none focus:border-white/20"
                        />
                        <input
                          type="text"
                          placeholder="Token Name"
                          value={newTokenForm.name}
                          onChange={(e) => setNewTokenForm(prev => ({ ...prev, name: e.target.value }))}
                          className="h-10 px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-gray-400 focus:outline-none focus:border-white/20"
                        />
                      </div>
                      
                      {/* Second row: Contract Address (full width) */}
                      <input
                        type="text"
                        placeholder="Contract Address"
                        value={newTokenForm.contractAddress}
                        onChange={(e) => setNewTokenForm(prev => ({ ...prev, contractAddress: e.target.value }))}
                        className="w-full px-3 py-2 text-sm md:text-base bg-white/10 border border-white/20 rounded text-white placeholder-gray-400 focus:outline-none focus:border-white/20"
                      />
                      
                      {/* Third row: Chain selector and Add button */}
                      <div className="grid grid-cols-2 gap-3"> 
                        <Select
                          value={newTokenForm.chain.toString()}
                          onValueChange={(value) => setNewTokenForm(prev => ({ ...prev, chain: parseInt(value) }))}
                        >
                          <SelectTrigger className="h-10 bg-white/10 border-white/20 text-sm md:text-base text-white focus:outline-none focus:ring-0 focus:border-white/20">
                            <SelectValue placeholder="Select chain" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="369">PulseChain</SelectItem>
                            <SelectItem value="1">Ethereum</SelectItem>
                          </SelectContent>
                        </Select>
                        <button
                          onClick={addCustomToken}
                          disabled={!newTokenForm.ticker}
                          className="px-4 py-2 bg-white text-black rounded font-medium hover:bg-gray-200 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                          {editingTokenId ? 'Update' : '+'}
                        </button>
                      </div>
                    </div>
                      </div>
                    )}
                </div>
              )}

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

              {/* Reset Confirmation Overlay - Inside the  modal */}
              <AnimatePresence>
              {showResetConfirmDialog && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-10"
                  onClick={(e) => {
                    e.stopPropagation()
                    // If clicking on the background (not the dialog), close only the reset dialog
                    if (e.target === e.currentTarget) {
                      setShowResetConfirmDialog(false)
                    }
                  }}
                >
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.95, opacity: 0 }}
                    className="bg-black border-2 border-white/10 rounded-xl p-6 max-w-md mx-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-yellow-400 flex items-center gap-2 text-lg font-semibold mb-4">
                      <span>⚠️</span>
                      Clear all manual changes?
                    </div>
                    <div className="text-gray-300 space-y-3 mb-6">
                      <p>This will:</p>
                      <ul className="space-y-1 ml-4 text-sm">
                        <li>• Remove all manually enabled tokens</li>
                        <li>• Clear all custom balance input overrides</li>
                        <li>• Clear all watchlist coins</li>
                      </ul>
                      <p className="font-medium">Are you sure you want to continue?</p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowResetConfirmDialog(false)}
                        className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleResetToAutoDetect}
                        className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                      >
                        OK
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
              </AnimatePresence>



              {/* Import dialog removed - no longer needed since manual mode doesn't require scanning */}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transactions Tab - Only in detective mode */}
      {detectiveMode && isEverythingReady && (
        <Section 
          {...(showMotion ? {
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 },
            transition: { 
              duration: 0.5,
              delay: 0.6,
              ease: [0.23, 1, 0.32, 1]
            },
          } : {})}
          className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-white">Transactions</h2>
            <div className="text-sm text-gray-400">
              {enrichedTransactions.length} transaction{enrichedTransactions.length !== 1 ? 's' : ''}
            </div>
                  </div>

          {enrichedTransactions.length > 0 ? (
            <div className="space-y-4">
                    {enrichedTransactions.map((tx, index) => (
                <div key={tx.hash} className="bg-white/5 rounded-lg p-4 border border-white/5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className={`w-3 h-3 rounded-full ${
                          tx.originalData.status === '1' ? 'bg-green-500' : 'bg-red-500'
                        }`} />
                        <div className="font-medium text-white">
                          {tx.originalData.functionName || 'Contract Interaction'}
                          </div>
                        <div className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded">
                          {new Date(parseInt(tx.originalData.timeStamp) * 1000).toLocaleDateString()}
                            </div>
                            </div>
                          </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">Gas Used</div>
                      <div className="text-white font-mono text-sm">
                        {parseInt(tx.originalData.gasUsed).toLocaleString()}
                        </div>
                              </div>
                              </div>

                  {/* Token Transfer Information */}
                  {tx.isTokenTransfer && tx.tokenTransfers && tx.tokenTransfers.length > 0 && (
                    <div className="mb-3">
                      <div className="text-sm text-gray-400 mb-2">Token Transfers</div>
                                  <div className="space-y-2">
                        {(() => {
                          return tx.tokenTransfers.map((transfer: any, transferIndex: number) => (
                                      <div key={transferIndex} className="bg-white/5 p-2 rounded border border-white/5">
                                        <div className="flex items-center space-x-2">
                                          {transfer.tokenSymbol && (
                                            <CoinLogo
                                              symbol={transfer.tokenSymbol}
                                              size="sm"
                                              className="rounded-none"
                                            />
                                          )}
                                          <div>
                                            <div className="text-white text-sm">
                                              {transfer.amountFormatted.toLocaleString()} {transfer.tokenSymbol}
                                            </div>
                                            {transfer.usdValue && transfer.usdValue > 0 && (
                                              <div className="text-gray-400 text-xs">
                                                ${transfer.usdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                          ))
                            })()}
                      </div>
                          </div>
                        )}

                        {/* Transaction Details Grid */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <div className="text-gray-400 text-xs mb-1">From</div>
                            <div className="text-white text-xs">
                              {tx.originalData.fromName || `${tx.originalData.from.slice(0, 6)}...${tx.originalData.from.slice(-4)}`}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-400 text-xs mb-1">To</div>
                            <div className="text-white text-xs">
                        {tx.originalData.toName || `${tx.originalData.to.slice(0, 6)}...${tx.originalData.to.slice(-4)}`}
                            </div>
                          </div>
                          <div>
                      <div className="text-gray-400 text-xs mb-1">Block</div>
                      <div className="text-white font-mono text-xs">
                        {parseInt(tx.originalData.blockNumber).toLocaleString()}
                            </div>
                          </div>
                          <div>
                      <div className="text-gray-400 text-xs mb-1">Transaction Hash</div>
                      <div className="text-blue-400 font-mono text-xs">
                        {tx.originalData.hash.slice(0, 10)}...{tx.originalData.hash.slice(-8)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 text-lg mb-2">No transactions found</div>
              <div className="text-gray-500 text-sm">
                This address has no recent transaction history
                  </div>
              </div>
            )}
        </Section>
      )}

    </Container>



      </div>
    </>
  )
} 
