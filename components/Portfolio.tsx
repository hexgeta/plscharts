'use client'

import { useState, useMemo, useEffect, memo, useCallback, useRef } from 'react'
import { CoinLogo } from '@/components/ui/CoinLogo'
import { useTokenPrices } from '@/hooks/crypto/useTokenPrices'
import { useTokenSupply } from '@/hooks/crypto/useTokenSupply'
import { usePortfolioBalance } from '@/hooks/crypto/usePortfolioBalance'
import { useMaxiTokenData } from '@/hooks/crypto/useMaxiTokenData'
import { useHexStakes } from '@/hooks/crypto/useHexStakes'
import { useHsiStakes } from '@/hooks/crypto/useHsiStakes'
import { useBackgroundPreloader } from '@/hooks/crypto/useBackgroundPreloader'
import { useHexDailyDataCache, calculateYieldForStake } from '@/hooks/crypto/useHexDailyData'
import { usePulseXLPDataSWR } from '@/hooks/crypto/usePulseXLPData'
import { useAllDefinedLPTokenPrices } from '@/hooks/crypto/useAllLPTokenPrices'
import { useAddressTransactions } from '@/hooks/crypto/useAddressTransactions'
import { useEnrichedTransactions } from '@/hooks/crypto/useEnrichedTransactions'
import { motion, AnimatePresence } from 'framer-motion'
import { TOKEN_CONSTANTS } from '@/constants/crypto'
import { MORE_COINS } from '@/constants/more-coins'
import { Icons } from '@/components/ui/icons'
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Toggle } from '@/components/ui/toggle'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { DatePicker } from '@/components/ui/date-range-picker'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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

interface CustomToken {
  id: string
  chain: number
  a: string
  dexs: string
  ticker: string
  decimals: number
  name: string
  createdAt: number
}

interface PortfolioProps {
  detectiveMode?: boolean
  detectiveAddress?: string
}

export default function Portfolio({ detectiveMode = false, detectiveAddress }: PortfolioProps) {
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

  // Custom token form state
  const [newTokenForm, setNewTokenForm] = useState({
    contractAddress: '',
    dexPairAddress: '',
    name: '',
    ticker: '',
    decimals: 18,
    chain: 369
  })

  // Custom token section toggle state
  const [isCustomTokenSectionOpen, setIsCustomTokenSectionOpen] = useState(false)

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

  // Add state for reset confirmation dialog
  const [showResetConfirmDialog, setShowResetConfirmDialog] = useState(false)

  // Track newly enabled tokens (show ? until portfolio reloads)
  const [newlyEnabledTokens, setNewlyEnabledTokens] = useState<Set<string>>(new Set())

  // State for import all tokens functionality
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importProgress, setImportProgress] = useState(0)
  const [importTotal, setImportTotal] = useState(0)
  const [importCurrentToken, setImportCurrentToken] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const [importResults, setImportResults] = useState<{found: string[], notFound: string[]}>(
    {found: [], notFound: []}
  )

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
    
    // If no balance data at all, show loading
    if (!rawBalances || rawBalances.length === 0) return null
    
    let totalBalance = 0
    let foundToken = false
    let hasValidData = false
    let hasPlaceholder = false
    
    rawBalances.forEach(balanceData => {
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



  // Group tokens by chain for the coins tab (combine TOKEN_CONSTANTS + MORE_COINS + CUSTOM_TOKENS in manual mode)
  const tokensByChain = useMemo(() => {
    const grouped: Record<number, typeof TOKEN_CONSTANTS> = {}
    
    // Determine which token list to use based on mode
    const tokensToUse = coinDetectionMode === 'manual' 
      ? [...TOKEN_CONSTANTS, ...MORE_COINS, ...customTokens]  // Combine all lists in manual mode
      : [...TOKEN_CONSTANTS, ...customTokens]  // Main list + custom tokens in auto-detect mode
    
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
  }, [coinDetectionMode, customTokens])

  // Filter and sort tokens based on search term and enabled status
  const filteredTokensByChain = useMemo(() => {
    const currentEnabled = pendingEnabledCoins || enabledCoins
    
    console.log('[Portfolio] filteredTokensByChain - current enabled:', Array.from(currentEnabled))
    
    const sortTokens = (tokens: typeof TOKEN_CONSTANTS) => {
      return tokens.sort((a, b) => {
        const aEnabled = currentEnabled.has(a.ticker)
        const bEnabled = currentEnabled.has(b.ticker)
        
        // Primary sort: enabled tokens first
        if (aEnabled !== bEnabled) {
          return bEnabled ? 1 : -1 // enabled tokens come first
        }
        
        // Secondary sort: alphabetical by ticker
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
      const filteredTokens = tokens.filter(token => 
        token.name.toLowerCase().includes(searchLower) ||
        token.ticker.toLowerCase().includes(searchLower)
      )
      
      if (filteredTokens.length > 0) {
        filtered[parseInt(chain)] = sortTokens(filteredTokens)
      }
    })
    
    return filtered
  }, [tokensByChain, tokenSearchTerm, enabledCoins, pendingEnabledCoins])

  // Get available chains for the coins tab
  const availableChains = useMemo(() => {
    return Object.keys(tokensByChain).map(Number).sort()
  }, [tokensByChain])



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

  // Save custom balances to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const balancesObject = Object.fromEntries(customBalances)
      localStorage.setItem('portfolioCustomBalances', JSON.stringify(balancesObject))
    }
  }, [customBalances])



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

  // Function to import all tokens from MORE_COINS
  const importAllTokens = async () => {
    setIsImporting(true)
    setImportProgress(0)
    setImportResults({found: [], notFound: []})
    
    // Get all valid tokens from MORE_COINS (PulseChain only, with valid addresses)
    const validTokens = MORE_COINS.filter(token => 
      token.chain === 369 && 
      token.a && 
      token.a.length === 42 && 
      token.a !== "0x0" &&
      !token.a.includes('xxx') && // Skip placeholder addresses
      !token.a.includes('eee') &&
      !token.a.includes('sss')
    )
    
    setImportTotal(validTokens.length)
    
    const tokensWithBalance: string[] = []
    const tokensWithoutBalance: string[] = []
    
    // Check each address's balance for each token
    for (let i = 0; i < validTokens.length; i++) {
      const token = validTokens[i]
      setImportCurrentToken(token.ticker)
      setImportProgress(i + 1)
      
      let hasBalance = false
      
      // Check balance for each of the user's addresses
      for (const addressObj of addresses) {
        try {
          const balance = await checkTokenBalance(token.a, addressObj.address, token.decimals)
          if (balance > 0) {
            hasBalance = true
            break // Found balance, no need to check other addresses
          }
        } catch (error) {
          console.error(`Error checking ${token.ticker} for ${addressObj.address}:`, error)
        }
      }
      
      if (hasBalance) {
        tokensWithBalance.push(token.ticker)
      } else {
        tokensWithoutBalance.push(token.ticker)
      }
      
      // Small delay to prevent overwhelming the RPC
      await new Promise(resolve => setTimeout(resolve, 50))
    }
    
    setImportResults({
      found: tokensWithBalance,
      notFound: tokensWithoutBalance
    })
    
    // Enable all tokens that have balances
    if (tokensWithBalance.length > 0) {
      const currentEnabled = pendingEnabledCoins || enabledCoins
      const newEnabled = new Set([...currentEnabled, ...tokensWithBalance])
      setPendingEnabledCoins(newEnabled)
      setHasUserMadeManualChanges(true)
    }
    
    setIsImporting(false)
  }

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

  // Show liquidity positions state (default to false/off)
  const [showLiquidityPositions, setShowLiquidityPositions] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('portfolioShowLiquidityPositions')
      return saved !== null ? saved === 'true' : false // Default to false
    }
    return false
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
    if (typeof window !== 'undefined' && addresses.length > 0) {
      localStorage.setItem('portfolioAddresses', JSON.stringify(addresses))
    }
  }, [addresses, detectiveMode])

  // Save chain filter to localStorage whenever it changes
  useEffect(() => {
    console.log('[Portfolio] Saving chain filter:', chainFilter)
    if (typeof window !== 'undefined') {
      localStorage.setItem('portfolioChainFilter', chainFilter)
    }
  }, [chainFilter])

  // Save selected address IDs to localStorage whenever they change
  useEffect(() => {
    console.log('[Portfolio] Saving selected addresses:', selectedAddressIds.length, 'addresses')
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

  // Custom token management functions
  const addCustomToken = () => {
    if (!newTokenForm.name || !newTokenForm.ticker) {
      return // Validation failed - only name and ticker are required
    }

    const customToken: CustomToken = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      chain: newTokenForm.chain,
      a: newTokenForm.contractAddress ? newTokenForm.contractAddress.toLowerCase() : '',
      dexs: newTokenForm.dexPairAddress || '',
      ticker: newTokenForm.ticker.toUpperCase(),
      decimals: newTokenForm.decimals,
      name: newTokenForm.name,
      createdAt: Date.now()
    }

    setCustomTokens(prev => [...prev, customToken])
    
    // Auto-enable the new token and mark as newly enabled for proper styling and ? placeholder
    if (coinDetectionMode === 'manual') {
      // Only update pending state - don't directly update enabledCoins to avoid immediate reload
      setPendingEnabledCoins(prev => {
        const current = prev || enabledCoins
        return new Set([...current, customToken.ticker])
      })
    } else {
      // In auto-detect mode, directly enable since it should auto-detect
      setEnabledCoins(prev => new Set([...prev, customToken.ticker]))
    }
    
    // Always mark as newly enabled to show green styling and ? placeholder
    setNewlyEnabledTokens(prev => new Set([...prev, customToken.ticker]))

    // Reset form
    setNewTokenForm({
      contractAddress: '',
      dexPairAddress: '',
      name: '',
      ticker: '',
      decimals: 18,
      chain: 369
    })
    
    // Close the custom token section after adding with a small delay to prevent flicker
    setTimeout(() => {
      setIsCustomTokenSectionOpen(false)
    }, 50)
  }

  const deleteCustomToken = (tokenId: string) => {
    const tokenToDelete = customTokens.find(t => t.id === tokenId)
    if (tokenToDelete) {
      // Remove from custom tokens
      setCustomTokens(prev => prev.filter(t => t.id !== tokenId))
      
      // Remove from enabled coins if it was enabled
      setEnabledCoins(prev => {
        const newSet = new Set(prev)
        newSet.delete(tokenToDelete.ticker)
        return newSet
      })
      
      // Remove from pending enabled coins if it was pending
      setPendingEnabledCoins(prev => {
        if (!prev) return prev
        const newSet = new Set(prev)
        newSet.delete(tokenToDelete.ticker)
        return newSet
      })
      
      // Remove custom balance if set
      setCustomBalances(prev => {
        const newMap = new Map(prev)
        newMap.delete(tokenToDelete.ticker)
        return newMap
      })
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

  // Handle reset to auto-detect confirmation
  const handleResetToAutoDetect = () => {
    // Reset to auto-detect mode: only enable tokens with balances from crypto.ts
    const tokensWithBalances = new Set<string>()
    if (rawBalances && rawBalances.length > 0) {
      rawBalances.forEach(balanceData => {
        if (balanceData.nativeBalance && balanceData.nativeBalance.balanceFormatted > 0) {
          tokensWithBalances.add(balanceData.nativeBalance.symbol)
        }
        balanceData.tokenBalances.forEach(token => {
          if (token.balanceFormatted > 0) {
            const isFromCrypto = TOKEN_CONSTANTS.some(t => t.ticker === token.symbol)
            if (isFromCrypto) {
              tokensWithBalances.add(token.symbol)
            }
          }
        })
      })
    }
    console.log('[Portfolio] Reset to auto-detect - tokens with balances:', Array.from(tokensWithBalances))
    setPendingEnabledCoins(tokensWithBalances)
    setCustomBalances(new Map()) // Clear all custom balances
    setHasUserMadeManualChanges(true)
    setShowResetConfirmDialog(false) // Close the dialog
  }

  // Handle mode switching with smart token preservation
  const handleModeSwitch = (newMode: 'auto-detect' | 'manual') => {
    console.log('[Portfolio] Mode switch:', coinDetectionMode, '->', newMode)
    
    if (coinDetectionMode === newMode) {
      return // No change needed
    }
    
    if (newMode === 'manual' && coinDetectionMode === 'auto-detect') {
      // Switching from auto-detect to manual: preserve auto-detected tokens
      console.log('[Portfolio] Preserving auto-detected tokens:', Array.from(autoDetectedCoins))
      
      // If we're in a pending state, update pending; otherwise update the main state
      if (pendingEnabledCoins !== null) {
        setPendingEnabledCoins(new Set([...pendingEnabledCoins, ...autoDetectedCoins]))
      } else {
        setEnabledCoins(new Set([...enabledCoins, ...autoDetectedCoins]))
      }
      
      setHasUserMadeManualChanges(true) // Mark that user has made manual changes
    } else if (newMode === 'auto-detect' && coinDetectionMode === 'manual') {
      // Switching from manual to auto-detect: clear manual selections
      console.log('[Portfolio] Clearing manual selections for auto-detect mode')
      
      if (pendingEnabledCoins !== null) {
        setPendingEnabledCoins(new Set())
      } else {
        setEnabledCoins(new Set())
      }
      
      setCustomBalances(new Map()) // Clear custom balances too
      setHasUserMadeManualChanges(false) // Reset manual changes flag
    }
    
    setCoinDetectionMode(newMode)
  }

  // Handle modal close - commit any pending addresses and removals
  const handleModalClose = () => {
    console.log('[Portfolio] handleModalClose called')
    commitPendingAddresses()
    
    // Commit pending coin changes and always reload to ensure everything stays in sync
    if (pendingEnabledCoins !== null) {
      console.log('[Portfolio] Committing pending coin changes:', {
        currentEnabled: Array.from(enabledCoins),
        pendingEnabled: Array.from(pendingEnabledCoins),
        coinDetectionMode
      })
      
      setEnabledCoins(pendingEnabledCoins)
      setPendingEnabledCoins(null)
      
      // Always force a reload when coin settings change to ensure everything stays in sync
      console.log('[Portfolio] Coin settings changed, forcing full reload')
      mutateBalances()
    } else {
      console.log('[Portfolio] No pending coin changes to commit')
    }
    
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
  
  // Fetch HSI stakes data for user's addresses
  const { stakes: hsiStakes, isLoading: hsiStakesLoading, error: hsiStakesError, hasStakes: hasHsiStakes } = useHsiStakes(allAddressStrings)
  
  console.log('Portfolio Debug - Using address strings:', allAddressStrings)

  // Always fetch all tokens to avoid cache invalidation when switching modes
  // We'll filter client-side in the rawBalances memo instead
  const { balances: allRawBalances, isLoading: balancesLoading, error: balancesError, mutate: mutateBalances } = usePortfolioBalance(allAddressStrings, enabledCoins, customTokens)
  
  // Filter the raw balances client-side based on enabled coins and apply custom balance overrides
  const rawBalances = useMemo(() => {
    if (!allRawBalances) return allRawBalances
    
    const applyCustomBalances = (balances: any[]) => {
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
            ? parseFloat(customBalances.get(token.symbol) || '0')
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
        
        // Add tokens with custom balances
        customBalances.forEach((balance, symbol) => {
          if (!existingTokenSymbols.has(symbol) && parseFloat(balance) > 0) {
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
        
        // Add enabled tokens that don't have balance data yet (in manual mode)
        if (coinDetectionMode === 'manual') {
          enabledCoins.forEach(symbol => {
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
    
    // In auto-detect mode, show all fetched tokens with custom balances applied
    if (coinDetectionMode === 'auto-detect') {
      return applyCustomBalances(allRawBalances)
    }
    
    // In manual mode, filter based on enabled coins and apply custom balances
    const filteredBalances = allRawBalances.map(addressData => ({
      ...addressData,
      // Keep native balance if it's enabled
      nativeBalance: (addressData.nativeBalance && enabledCoins.has(addressData.nativeBalance.symbol)) 
        ? addressData.nativeBalance 
        : null,
      // Filter token balances to only enabled tokens
      tokenBalances: addressData.tokenBalances?.filter(token => enabledCoins.has(token.symbol)) || []
    }))
    
    return applyCustomBalances(filteredBalances)
  }, [allRawBalances, coinDetectionMode, enabledCoins, customBalances])
  console.log('Portfolio Debug - Balance hook result:', { balances: rawBalances, balancesLoading, balancesError })

  // Clear newly enabled tokens when balance data changes (portfolio reload completed)
  useEffect(() => {
    if (rawBalances && rawBalances.length > 0) {
      setNewlyEnabledTokens(new Set()) // Clear the newly enabled tokens after reload
    }
  }, [rawBalances])

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
        console.log('[Portfolio] Initial auto-population of enabled coins based on balances:', Array.from(tokensWithBalances))
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

    console.log('[Portfolio] Auto-detected coins:', Array.from(detectedCoins))
    return detectedCoins
  }, [coinDetectionMode, rawBalances])

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
    
    const allTickers = [...new Set([...tokens, ...baseTokens, ...stakeTokens])]
    
    // Return a stable array - only change if the actual content changes
    return allTickers.sort() // Sort for consistent ordering
  }, [
    // Only depend on the actual token symbols, not the balance objects
    balances && balances.map(b => [
      b.nativeBalance?.symbol || '',
      ...(b.tokenBalances?.map(t => t.symbol) || [])
    ].join(',')).sort().join('|'),
    // Also depend on HEX stakes to include their tokens in price fetching
    hexStakes && hexStakes.map(s => s.chain).sort().join('|')
  ])

  // Minimal debug logging (only when needed)
  // console.log('[Portfolio] Component render - balances:', balances?.length, 'tickers:', allTokenTickers.length, 'chainFilter:', chainFilter, 'selectedIds:', selectedAddressIds.length)

  // Fetch prices for all tokens with balances
  const { prices: rawPrices, isLoading: pricesLoading } = useTokenPrices(allTokenTickers)

  // We need to create a placeholder for LP underlying prices that will be populated later
  // This prevents the dependency cycle while still allowing the prices to be combined
  const [lpUnderlyingPricesState, setLpUnderlyingPricesState] = useState<any>({})

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
    // Combine main prices with LP underlying token prices
    const combinedPrices = { ...(rawPrices || {}), ...(lpUnderlyingPricesState || {}) }
    
    // Add some debugging to see if prices are updating
    if (rawPrices && !isInitialLoad) {
      console.log('[Portfolio] Prices updated:', Object.keys(rawPrices).length, 'main tokens');
    }
    if (lpUnderlyingPricesState && Object.keys(lpUnderlyingPricesState).length > 0) {
      console.log('[Portfolio] LP underlying prices updated:', Object.keys(lpUnderlyingPricesState).length, 'LP tokens:', Object.keys(lpUnderlyingPricesState));
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

  // Get LP token data for PulseX V2 tokens
  const lpTokens = TOKEN_CONSTANTS.filter(token => 
    token.platform === 'PLSX V2' || 
    (token.name && token.name.includes(' LP')) ||
    (token.name && token.name.includes(' / '))
  )
  
  // Fetch all LP token prices at once using the new batch hook
  const { lpPrices, loading: allLPLoading, error: allLPError } = useAllDefinedLPTokenPrices(TOKEN_CONSTANTS)
  
  // Convert to the format expected by existing code
  const lpTokenPrices: { [ticker: string]: number } = {}
  const lpTokenData: { [ticker: string]: any } = {}
  
  Object.entries(lpPrices).forEach(([ticker, lpPrice]) => {
    if (lpPrice.pricePerToken && lpPrice.pricePerToken > 0) {
      lpTokenPrices[ticker] = lpPrice.pricePerToken
      console.log(`[Portfolio] ${ticker} LP price fetched: $${lpPrice.pricePerToken.toFixed(6)}`)
    } else if (lpPrice.error) {
      console.error(`[Portfolio] Error fetching ${ticker} LP price:`, lpPrice.error)
    } else if (lpPrice.loading) {
      console.log(`[Portfolio] Loading ${ticker} LP price...`)
    } else {
      console.log(`[Portfolio] ${ticker} LP price not available yet`)
    }
    
    // Store LP data for detailed display (underlying token breakdown)
    if (lpPrice.data) {
      lpTokenData[ticker] = lpPrice.data
    }
  })
  
  if (allLPError) {
    console.error(`[Portfolio] Batch LP price fetch error:`, allLPError)
  }

  // Helper function to get LP token price from PulseX V2
  const getLPTokenPrice = useCallback((symbol: string): number => {
    return lpTokenPrices[symbol] || 0
  }, [lpTokenPrices])

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
    if (tokenConfig?.platform === 'PLSX V2') {
      // This is a PulseX V2 LP token, get price from LP data
      const lpPrice = getLPTokenPrice(symbol)
      if (lpPrice > 0) {
        return lpPrice
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
        console.warn(`[Portfolio] No backing data found for ${symbol}, using fallback calculation`)
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
    
    // Use market price
    return prices[symbol]?.price || 0
  }, [isStablecoin, shouldUseBackingPrice, useBackingPrice, prices, getBackingPerToken, getLPTokenPrice, useTimeShift, timeMachineHexPrice, timeMachineEHexPrice])

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
      
      if (isLPToken) {
        return false // Always hide LP tokens from main table (they show in LP section)
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
    if (!mainTokensWithBalances.length) return []
    
    // Filter for LP tokens (tokens with type: "lp")
    const lpTokens = mainTokensWithBalances.filter(token => {
      const tokenConfig = TOKEN_CONSTANTS.find(t => t.ticker === token.symbol)
      return tokenConfig?.type === 'lp' ||
             token.symbol.includes('LP') || 
             token.name?.includes(' LP') ||
             token.name?.includes(' / ')
    })
    
    console.log(`[LP Detection] Found ${lpTokens.length} LP tokens:`, lpTokens.map(t => t.symbol))
    
    // Sort by USD value (highest first)
    return [...lpTokens].sort((a, b) => {
      const aPrice = getLPTokenPrice(a.symbol) || 0
      const bPrice = getLPTokenPrice(b.symbol) || 0
      const aValue = a.balanceFormatted * aPrice
      const bValue = b.balanceFormatted * bPrice
      
      console.log(`[LP Sorting] ${a.symbol}: ${a.balanceFormatted} × $${aPrice} = $${aValue}`)
      console.log(`[LP Sorting] ${b.symbol}: ${b.balanceFormatted} × $${bPrice} = $${bValue}`)
      
      return bValue - aValue // Higher value first
    })
  }, [
    mainTokensWithBalances.map(t => `${t.symbol}-${t.balanceFormatted?.toFixed(6) || '0'}`).join('|'),
    lpTokenPrices
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
    
    // For very small prices, use scientific notation
    if (price > 0 && price < 0.01) {
      return `$${price.toExponential(2)}`
    }
    
    // For large prices (≥ 10,000), use comma formatting
    if (price >= 10000) {
      return `$${Math.round(price).toLocaleString()}`
    }
    
    // For moderate prices (0.01 to 9,999), use regular decimal formatting
    if (price >= 1) {
      return `$${price.toFixed(2)}`
    } else {
      // For prices between 0.01 and 1, show appropriate decimal places
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
    
    // Auto-sort by change when switching to dollar mode for better UX
    if (newShowDollarChange && tokenSortField !== 'change') {
      setTokenSortField('change')
      setTokenSortDirection('desc') // Show highest dollar changes first
    }
  }, [showDollarChange, tokenSortField])



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
      return currentBalance !== null ? formatBalance(currentBalance) : '?'
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
        if (addressData.nativeBalance) {
        const nativePrice = getTokenPrice(addressData.nativeBalance.symbol)
        const nativeValue = addressData.nativeBalance.balanceFormatted * nativePrice
        addressValue += nativeValue
        console.log(`[Portfolio] ${addressData.address.slice(0, 8)}... native ${addressData.nativeBalance.symbol}: ${addressData.nativeBalance.balanceFormatted.toFixed(4)} @ $${nativePrice.toFixed(4)} = $${nativeValue.toFixed(2)}`)
        }
        
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
        if (addressData.nativeBalance) {
        const nativePrice = getTokenPrice(addressData.nativeBalance.symbol)
        addressValue += addressData.nativeBalance.balanceFormatted * nativePrice
        }
        
        // Add token values, but exclude pooled tokens if they're included as stakes to avoid double counting
        addressData.tokenBalances?.forEach(token => {
          const tokenPrice = getTokenPrice(token.symbol)
          const tokenValue = token.balanceFormatted * tokenPrice
          
          // If pooled stakes are enabled and this is a pooled token, don't count it as liquid
          if (includePooledStakes && POOLED_STAKE_TOKENS.includes(token.symbol)) {
            // Skip adding this token value as it will be counted as a stake instead
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

    // Add validator value if enabled (but not in detective mode)
    if (!detectiveMode && showValidators && validatorCount > 0 && chainFilter !== 'ethereum') {
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

    // Add LP token values if liquidity positions are enabled
    if (showLiquidityPositions && lpTokensWithBalances) {
      lpTokensWithBalances.forEach(lpToken => {
        const lpPrice = getLPTokenPrice(lpToken.symbol)
        const lpValue = lpToken.balanceFormatted * lpPrice
        totalValue += lpValue
        
        // Add to address values array (find the address that holds this LP token)
        const addressData = filteredBalances.find(balance => 
          balance.tokenBalances?.some(token => token.symbol === lpToken.symbol)
        )
        if (addressData) {
          const existingIndex = addressVals.findIndex(av => av.address === addressData.address)
          if (existingIndex >= 0) {
            addressVals[existingIndex].value += lpValue
          } else {
            addressVals.push({
              address: addressData.address,
              label: effectiveAddresses.find(a => a.address === addressData.address)?.label || '',
              value: lpValue
            })
          }
        }
      })
    }

    return { totalUsdValue: totalValue, addressValues: addressVals }
  }, [filteredBalances, prices, addresses, getTokenPrice, showValidators, validatorCount, showLiquidBalances, showHexStakes, hexStakes, hsiStakes, includePooledStakes, pooledStakesData.totalValue, detectiveMode, chainFilter, selectedAddressIds, effectiveAddresses, removedAddressIds, timeShiftDate, useTimeShift, timeShiftDateString, useEESValue, calculateEESDetailsWithDate, calculateEESValueWithDate, showLiquidityPositions, lpTokensWithBalances, getLPTokenPrice])

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

    // Add validator value if enabled (but not in detective mode)
    if (!detectiveMode && showValidators && validatorCount > 0 && chainFilter !== 'ethereum') {
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
  }, [filteredBalances, prices, addresses, getTokenPrice, useBackingPrice, shouldUseBackingPrice, isStablecoin, showLiquidBalances, showValidators, validatorCount, showHexStakes, hexStakes, hsiStakes, includePooledStakes, pooledStakesData.totalValue, pooledStakesData.totalHex, pooledStakesData.totalEHex, pooledStakesData.totalHexValue, pooledStakesData.totalEHexValue, detectiveMode, chainFilter, selectedAddressIds, effectiveAddresses, removedAddressIds, timeShiftDate, useTimeShift, timeShiftDateString, useEESValue, calculateEESDetailsWithDate, calculateEESValueWithDate])

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

    // Add validator value if enabled (but not in detective mode)
    if (!detectiveMode && showValidators && validatorCount > 0 && chainFilter !== 'ethereum') {
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
    );
  }

  return (
    <>
      {/* EES Mode Page Glow Effect - Temporarily disabled for performance testing */}
      {/* {hasMounted && useEESValue && (
        <>
          <div 
            className="fixed top-0 left-0 w-12 h-full pointer-events-none z-0"
            style={{
              background: 'linear-gradient(to right, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.1) 50%, transparent 100%)'
            }}
          />
          <div 
            className="fixed top-0 right-0 w-12 h-full pointer-events-none z-0"
            style={{
              background: 'linear-gradient(to left, rgba(239, 68, 68, 0.2) 0%, rgba(239, 68, 68, 0.1) 50%, transparent 100%)'
            }}
          />
        </>
      )} */}
      
      {/* EES Mode / Time Machine Banner - Centered with Frosted Glass Effect */}
      {hasMounted && (useEESValue || useTimeShift) && (
                 <div className="sticky top-4 w-full flex justify-center py-2 z-50">
          <div className={`w-full max-w-[760px] min-w-[300px] py-2 mx-auto rounded-full text-center text-sm font-medium backdrop-blur-md shadow-lg ${
            useEESValue && useTimeShift 
              ? 'border border-red-400 text-red-400 bg-red-400/10' 
              : useEESValue 
                ? 'border border-red-400 text-red-400 bg-red-400/10' 
                : 'border border-orange-400 text-orange-400 bg-orange-400/10'
          }`}>
            {useEESValue && useTimeShift && (
              <>EES Mode & Time Machine Active <span className="underline">{timeShiftDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></>
            )}
            {useEESValue && !useTimeShift && 'EES Mode Active'}
            {!useEESValue && useTimeShift && (
              <>Time Machine Active <span className="underline">{timeShiftDate?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></>
            )}
          </div>
        </div>
      )}
      
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
                
                {/* Always show liquidity positions checkbox in advanced filters */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="liquidity-positions-filter"
                      checked={showLiquidityPositions}
                      onCheckedChange={(checked) => setShowLiquidityPositions(checked === true)}
                    />
                    <label 
                      htmlFor="liquidity-positions-filter" 
                      className={`text-sm cursor-pointer ${showLiquidityPositions ? 'text-white' : 'text-gray-400'}`}
                    >
                      Include liquidity positions
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

      {/* Liquidity Pools Section */}
      {showLiquidityPositions && isEverythingReady && lpTokensWithBalances.length > 0 && (
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-white">Liquidity Pools</h3>
          </div>
          
          <div className="bg-black border-2 border-white/10 rounded-2xl p-1 sm:p-6">
            <div className="space-y-3">
              {lpTokensWithBalances.map((token, tokenIndex) => {
                const tokenPrice = getLPTokenPrice(token.symbol) || 0
                const stableKey = `${token.chain}-${token.symbol}-${token.address || 'lp'}`
                const tokenConfig = TOKEN_CONSTANTS.find(t => t.ticker === token.symbol)
                const displayAmount = token.balanceFormatted !== null ? formatBalance(token.balanceFormatted) : '?'
                const usdValue = token.balanceFormatted ? token.balanceFormatted * tokenPrice : 0
                
                const underlyingTokens = calculateLPUnderlyingTokens(token.symbol, token.balanceFormatted || 0)
                
                // Calculate pool ownership percentage
                const lpData = lpTokenData[token.symbol]
                const poolOwnershipPercentage = lpData && lpData.totalSupply && token.balanceFormatted
                  ? (token.balanceFormatted / parseFloat(lpData.totalSupply)) * 100
                  : null
                
                if (poolOwnershipPercentage !== null) {
                  console.log(`[LP Ownership] ${token.symbol}: ${token.balanceFormatted} / ${lpData.totalSupply} = ${poolOwnershipPercentage.toFixed(4)}% of pool`)
                }
                
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
                            // Extract token symbols from LP pair name (e.g., "HEX / WPLS" -> ["HEX", "WPLS"])
                            const tokenSymbols = token.symbol.split(' / ')
                            const token0Symbol = tokenSymbols[0] || 'PLS'
                            const token1Symbol = tokenSymbols[1] || 'HEX'
                            
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
                            {token.symbol}
                          </div>
                          <div className="text-gray-400 text-[10px] break-words leading-tight">
                            <span className="sm:hidden">{displayAmount} tokens</span>
                            <span className="hidden sm:block">{tokenConfig?.name || `${token.symbol} Liquidity Pool`}</span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Price Column - Hidden on Mobile */}
                      <div className="hidden sm:block text-center">
                        <div className="text-gray-400 text-xs font-medium">
                          {tokenPrice === 0 ? '--' : `$${formatDollarValue(tokenPrice)}`}
                        </div>
                      </div>

                      {/* 24h Price Change Column - Pool Ownership on Mobile */}
                      <div className="text-center">
                        {poolOwnershipPercentage !== null ? (
                          <div className="text-purple-400 text-xs font-medium sm:hidden">
                            {poolOwnershipPercentage.toFixed(2)}%
                          </div>
                        ) : (
                          <div className="text-gray-400 text-xs sm:hidden">--</div>
                        )}
                      </div>

                      {/* League Column - Pool Ownership Percentage on Desktop */}
                      <div className="hidden sm:flex flex-col items-center justify-center min-w-[60px]">
                        {poolOwnershipPercentage !== null ? (
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
                          {displayAmount} tokens
                        </div>
                      </div>

                      {/* Chart & Copy Icons - Far Right Column */}
                      <div className="flex flex-col items-center ml-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            const isExpanded = expandedLPTokens.has(token.symbol)
                            const newExpanded = new Set(expandedLPTokens)
                            if (isExpanded) {
                              newExpanded.delete(token.symbol)
                            } else {
                              newExpanded.add(token.symbol)
                            }
                            setExpandedLPTokens(newExpanded)
                          }}
                          className="p-1 text-gray-400 hover:text-white transition-colors"
                          title={expandedLPTokens.has(token.symbol) ? "Hide underlying tokens" : "Show underlying tokens"}
                        >
                          <ChevronDown 
                            className={`w-4 h-4 transition-transform duration-200 ${
                              expandedLPTokens.has(token.symbol) ? '' : 'rotate-180'
                            }`}
                          />
                        </button>
                      </div>
                    </div>
                    
                    {/* Underlying Tokens Breakdown */}
                    <AnimatePresence>
                      {underlyingTokens && expandedLPTokens.has(token.symbol) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: "easeInOut" }}
                          className="px-4 pb-3 border-t border-white/5 overflow-hidden"
                        >
                          <div className="text-xs text-gray-400 mb-2 mt-2">Your share of underlying tokens:</div>
                        <div className="grid grid-cols-2 gap-3">
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
                                {formatBalance(underlyingTokens.token0.amount)} {underlyingTokens.token0.symbol}
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
                                {formatBalance(underlyingTokens.token1.amount)} {underlyingTokens.token1.symbol}
                              </div>
                            </div>
                          </div>
                        </div>
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
                <div className="flex bg-black border border-white/20 rounded-full p-1">
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
            <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-lg">
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
                    <div className="bg-black/20 border border-white/10 rounded-lg p-4 text-center">
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
                <div className="bg-black border-2 border-white/10 rounded-2xl p-4 text-center mb-6">
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
                  <div className="bg-black border-2 border-white/10 rounded-2xl p-4 text-center">
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
                    <div className="bg-black border-2 border-white/10 rounded-2xl p-4 text-center">
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
                  <div className="bg-black border-2 border-white/10 rounded-2xl p-4 text-center">
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
              <div className="bg-black border-2 border-white/10 rounded-2xl p-8 text-center">
                <div className="text-gray-400">
                  No stakes found with the selected filters.
                </div>
                <div className="text-sm text-gray-500 mt-2">
                  Try adjusting your status or chain filters above.
                </div>
              </div>
            ) : (
              filteredStakes.slice(0, displayedStakesCount).map((stake) => (
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
                                  noteContent = (
                                    <>
                                      Projected realized value at stake end of <span className="underline">{formattedDate}</span> at <span className="underline">{formattedPrice} {hexSymbol}</span>
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
                                        ({stake.principleHex.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} principal + {baselineYield.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} yield{projectedYieldAmount > 0 && <span className="text-orange-400"> + {projectedYieldAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} projected yield</span>} <span className="text-red-400">- {eesDetails.penalty.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} penalty</span>)
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
                              
                              return (
                                <>
                                  {totalHexDisplay.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} total HEX = <span className="text-xs">
                                    ({stake.principleHex.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} principal + {stake.yieldHex.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} yield{displayPenalty > 0 ? (<span className="text-red-400"> - {displayPenalty.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} penalty</span>) : ''})
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
                  <button
                    onClick={() => setActiveTab('coins')}
                    className={`px-6 py-1.5 text-sm font-medium rounded-full transition-all duration-200 relative z-10 ${
                      activeTab === 'coins' 
                        ? 'bg-white text-black shadow-lg' 
                        : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    Coins
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
                        <div className="font-medium text-white mb-1">Include Pooled & HSI Stakes?</div>
                        <div className="text-sm text-gray-400">
                          This will add support for pooled MAXI & HEDRON HSI Stakes to your portfolio.
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

                    <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex-1">
                        <div className="font-medium text-white mb-1">Liquidity Positions</div>
                        <div className="text-sm text-gray-400">
                          Show liquidity pool positions in your portfolio. (May increase loading time.)
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
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
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
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
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

              {/* Coins Tab */}
              {activeTab === 'coins' && (
                <div className="space-y-6">
                  {/* Mode Selection */}
                  <div className="space-y-4">
                    <div className="flex bg-white/5 border border-white/10 rounded-full p-1">
                      <button
                        onClick={() => handleModeSwitch('auto-detect')}
                        className={`flex-1 px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                          coinDetectionMode === 'auto-detect'
                            ? 'bg-white text-black shadow-sm'
                            : 'text-gray-300 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        Simple Mode
                      </button>
                      <button
                        onClick={() => handleModeSwitch('manual')}
                        className={`flex-1 px-4 py-2 text-sm font-medium rounded-full transition-all duration-200 ${
                          coinDetectionMode === 'manual'
                            ? 'bg-white text-black shadow-sm'
                            : 'text-gray-300 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        Advanced Mode
                      </button>
              </div>
                    
                    {/* Mode Description */}
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <div className="text-sm text-blue-300">
                        {coinDetectionMode === 'auto-detect' ? (
                          <div>
                            <div>
                            💡 Automatically detects the top 200 main PulseChain coins only. (Faster & simpler)
                            </div>
                          </div>
                        ) : (
                          <div>
                              Manually track up to 400+ extra tokens, control which ones you see, and edit their balances. (This mode can slow down your portfolio loading if you activate more than 200 tokens, or speed it up if you have less than 200 toggled on.)
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Chain Selection - Only show in Manual Mode */}
                  {coinDetectionMode === 'manual' && (
                    <div className="flex bg-white/5 border border-white/10 rounded-full p-1">
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

                  {/* Coins List for Selected Chain - Only show in Manual Mode */}
                  {coinDetectionMode === 'manual' && (
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

                      {/* Bulk Actions */}
                      <div className="flex gap-2 mb-4">
                        <button
                          onClick={() => setShowImportDialog(true)}
                          className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                          title="Check balances for all 400+ tokens from MORE_COINS"
                        >
                          Scan for & import tokens from an extended 400+ token list (Slower)
                        </button>
                        <button
                          onClick={() => setShowResetConfirmDialog(true)}
                          className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                          title="Reset selection to match auto-detect mode (only tokens with balances from the curated list)"
                        >
                          Reset to match Simple Mode's 200 token list (Faster)
                        </button>
                      </div>

                      {/* Token List */}
                      <div className="space-y-2">
                        {/* Manual mode: Show all tokens with toggles */}
                        {filteredTokensByChain[activeChainTab]?.length > 0 ? (
                          filteredTokensByChain[activeChainTab]?.map(token => {
                          const currentEnabled = pendingEnabledCoins || enabledCoins
                          const isEnabled = currentEnabled.has(token.ticker)
                          const isLP = token.type === 'lp'
                          
                          return (
                            <div
                              key={`${token.chain}-${token.a}-${token.ticker}`}
                              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                                newlyEnabledTokens.has(token.ticker) 
                                  ? 'bg-green-500/10 border-green-500/30 hover:bg-green-500/15' 
                                  : 'bg-white/5 border-white/10 hover:bg-white/10'
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                {isLP ? (
                                  <div className="relative w-8 h-8 flex-shrink-0">
                                    {(() => {
                                      // Extract token symbols from LP pair name (e.g., "HEX / WPLS" -> ["HEX", "WPLS"])
                                      const tokenSymbols = token.ticker.split(' / ')
                                      const token0Symbol = tokenSymbols[0] || 'PLS'
                                      const token1Symbol = tokenSymbols[1] || 'HEX'
                                      
                                      return (
                                        <>
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
                                        </>
                                      )
                                    })()}
                                  </div>
                                ) : (
                                  <div className="w-8 h-8 flex items-center justify-center">
                                    <CoinLogo symbol={token.ticker} size="md" />
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-white">{token.ticker}</span>
                                    {isLP && (
                                      <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-300 rounded">
                                        LP
                                      </span>
                                    )}
                                  </div>
                                  <div className="text-sm text-gray-400 truncate">
                                    {token.name}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Balance input field - only show for enabled tokens */}
                              {isEnabled && (
                                <div className="mx-4 w-32 md:w-64">
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
                                        newCustomBalances.set(token.ticker, parsedValue)
                                      }
                                      setCustomBalances(newCustomBalances)
                                    }}
                                    className="w-full px-3 py-2 bg-black/50 border border-white/20 rounded text-white placeholder-gray-500/50 focus:border-white/40 focus:outline-none text-sm text-right"
                                  />
                                </div>
                              )}
                              
                              <button
                                onClick={() => {
                                  const currentEnabled = pendingEnabledCoins || enabledCoins
                                  const newEnabled = new Set(currentEnabled)
                                  if (isEnabled) {
                                    newEnabled.delete(token.ticker)
                                    console.log('[Portfolio] Toggled OFF:', token.ticker, 'pending enabled:', Array.from(newEnabled))
                                  } else {
                                    newEnabled.add(token.ticker)
                                    // Track that this token was just toggled on
                                    setNewlyEnabledTokens(prev => new Set([...prev, token.ticker]))
                                    console.log('[Portfolio] Toggled ON:', token.ticker, 'pending enabled:', Array.from(newEnabled))
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
              {activeTab === 'coins' && coinDetectionMode === 'manual' && (
                <div className="border-t border-white/10 bg-black">
                  <div className="p-4 sm:p-6">
                    {/* Toggle Header */}
                    <button
                      onClick={() => setIsCustomTokenSectionOpen(!isCustomTokenSectionOpen)}
                      className="flex items-center justify-between w-full text-left"
                    >
                      <h3 className="text-lg font-semibold text-white">Add Custom Token</h3>
                      <ChevronDown 
                        className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                          isCustomTokenSectionOpen ? 'rotate-180' : ''
                        }`} 
                      />
                    </button>

                    {/* Collapsible Content */}
                    {isCustomTokenSectionOpen && (
                      <div className="space-y-4 mt-4">
                    
                    {/* Custom tokens list */}
                    {customTokens.length > 0 && (
                      <div className="space-y-2 max-h-40 overflow-y-auto">
                        <h4 className="text-sm font-medium text-gray-300">Your Custom Tokens:</h4>
                        {customTokens.map(token => (
                            <div key={token.id} className="flex items-center justify-between p-2 bg-white/5 rounded-lg border border-white/10">
                              <div className="flex items-center gap-3">
                                <div>
                                  <div className="text-sm font-medium text-white">{token.ticker}</div>
                                  <div className="text-xs text-gray-400">{token.name}</div>
                                </div>
                              </div>
                              
                              <button
                                onClick={() => deleteCustomToken(token.id)}
                                className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded"
                                title="Delete token"
                              >
                                <Icons.trash className="w-3 h-3" />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    
                    {/* Add new token form */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                        type="text"
                        placeholder="Ticker (e.g., MYTOKEN)"
                        value={newTokenForm.ticker}
                        onChange={(e) => setNewTokenForm(prev => ({ ...prev, ticker: e.target.value.toUpperCase() }))}
                        className="px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-gray-400"
                      />
                                            <input
                        type="text"
                        placeholder="Token Name"
                        value={newTokenForm.name}
                        onChange={(e) => setNewTokenForm(prev => ({ ...prev, name: e.target.value }))}
                        className="px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-gray-400"
                      />
                                              <input
                          type="text"
                          placeholder="Contract Address (optional)"
                          value={newTokenForm.contractAddress}
                          onChange={(e) => setNewTokenForm(prev => ({ ...prev, contractAddress: e.target.value }))}
                          className="px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-gray-400"
                        />
                      <input
                        type="text"
                        placeholder="Dexscreener Pair Address"
                        value={newTokenForm.dexPairAddress}
                        onChange={(e) => setNewTokenForm(prev => ({ ...prev, dexPairAddress: e.target.value }))}
                        className="px-3 py-2 bg-white/10 border border-white/20 rounded text-white placeholder-gray-400"
                      />


                                              <div className="flex gap-2">
                          <Select
                            value={newTokenForm.decimals.toString()}
                            onValueChange={(value) => setNewTokenForm(prev => ({ ...prev, decimals: parseInt(value) }))}
                          >
                            <SelectTrigger className="flex-1 bg-white/10 border-white/20 text-white">
                              <SelectValue placeholder="Select decimals" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="18">18 decimals</SelectItem>
                              <SelectItem value="8">8 decimals</SelectItem>
                              <SelectItem value="9">9 decimals</SelectItem>
                              <SelectItem value="6">6 decimals</SelectItem>
                              <SelectItem value="12">12 decimals</SelectItem>
                            </SelectContent>
                          </Select>
                          <Select
                            value={newTokenForm.chain.toString()}
                            onValueChange={(value) => setNewTokenForm(prev => ({ ...prev, chain: parseInt(value) }))}
                          >
                            <SelectTrigger className="bg-white/10 border-white/20 text-white">
                              <SelectValue placeholder="Select chain" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="369">PulseChain</SelectItem>
                              <SelectItem value="1">Ethereum</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      <button
                        onClick={addCustomToken}
                        disabled={!newTokenForm.name || !newTokenForm.ticker}
                        className="px-4 py-2 bg-white text-black rounded font-medium hover:bg-gray-200 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                      >
                        Add +
                      </button>
                    </div>
                      </div>
                    )}
                  </div>
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

              {/* Reset Confirmation Overlay - Inside the 
               modal */}
              {showResetConfirmDialog && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-10">
                  <div className="bg-black border-2 border-white/10 rounded-lg p-6 max-w-md mx-4">
                    <div className="text-yellow-400 flex items-center gap-2 text-lg font-semibold mb-4">
                      <span>⚠️</span>
                      Reset to Auto-Detect?
                    </div>
                    <div className="text-gray-300 space-y-3 mb-6">
                      <p>This will:</p>
                      <ul className="space-y-1 ml-4 text-sm">
                        <li>• Remove all manually enabled tokens</li>
                        <li>• Clear all custom balance overrides</li>
                        <li>• Reset manual mode to look the same as auto-mode</li>
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
                  </div>
                </div>
              )}

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Import All Tokens Dialog */}
      <AnimatePresence>
        {showImportDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => !isImporting && setShowImportDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-zinc-900 border border-white/20 rounded-xl p-6 max-w-md w-full"
            >
              <div className="text-center space-y-4">
                <h3 className="text-lg font-semibold text-white">
                  {isImporting ? 'Importing Tokens...' : 'Import extra tokens from 400+ token list'}
                </h3>
                
                {!isImporting && importResults.found.length === 0 && importResults.notFound.length === 0 ? (
                  <div className="space-y-4">
                    <p className="text-gray-300 text-sm">
                      This will check your wallet balances for all {MORE_COINS.length} additional tokens from the extended token list.
                      Only tokens with non-zero balances will be enabled.
                      You only have to do this process once and it's done forever. It will take 5-10 mins.
                      <br />
                      <br />
                      ⚠️ WARNING:
                      <br />
                      • If you hold lots of tokens, this may make your portfolio load times much longer
                      <br />
                      • This will override your current manual token entries & balances
                      <br />
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowImportDialog(false)}
                        className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={importAllTokens}
                        className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                      >
                        Start Import
                      </button>
                    </div>
                  </div>
                ) : !isImporting && (importResults.found.length > 0 || importResults.notFound.length > 0) ? (
                  <div className="space-y-4">
                    <div className="text-green-400 font-medium">
                      Import Complete!
                    </div>
                    <div className="text-sm text-gray-300 space-y-2">
                      <div>
                        <span className="text-green-400">✓ Found {importResults.found.length} tokens with balances</span>
                        {importResults.found.length > 0 && (
                          <div className="text-xs text-gray-400 mt-1">
                            {importResults.found.slice(0, 5).join(', ')}
                            {importResults.found.length > 5 && ` and ${importResults.found.length - 5} more...`}
                          </div>
                        )}
                      </div>
                      <div>
                        <span className="text-gray-400">• Checked {importResults.notFound.length} tokens with zero balance</span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowImportDialog(false)
                        setImportResults({found: [], notFound: []})
                      }}
                      className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-sm text-gray-300">
                      Checking: <span className="text-white font-medium">{importCurrentToken}</span>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${importTotal > 0 ? (importProgress / importTotal) * 100 : 0}%` }}
                      />
                    </div>
                    
                    <div className="text-xs text-gray-400">
                      {importProgress} / {importTotal} tokens checked
                    </div>
                    
                    <button
                      onClick={() => {
                        setIsImporting(false)
                        setShowImportDialog(false)
                        // TODO: Cancel import process
                      }}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
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
            }
          } : {})}
          className="max-w-[860px] w-full"
        >
          <div className="bg-black border-2 border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">Recent Transactions</h3>
              {!showTransactions && (
                <button
                  onClick={() => setShowTransactions(true)}
                  className="px-4 py-2 bg-white text-black rounded-lg font-medium hover:bg-gray-100 transition-colors"
                >
                  Load Transactions
                </button>
              )}
            </div>
            
            {showTransactions && (
              <div className="space-y-4">
                {/* Loading State */}
                {(transactionsLoading || enrichmentLoading) && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin w-5 h-5 border-2 border-gray-600 border-t-white rounded-full mr-3"></div>
                    <span className="text-gray-400">
                      {transactionsLoading ? 'Loading transactions...' : 'Enriching transaction details...'}
                    </span>
                  </div>
                )}
                
                {/* Error State */}
                {(transactionsError || enrichmentError) && (
                  <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
                    Error loading transactions: {transactionsError?.message || transactionsError || enrichmentError}
                  </div>
                )}
                
                {/* Transactions List */}
                {enrichedTransactions && enrichedTransactions.length > 0 && (
                  <div className="space-y-3">
                    {enrichedTransactions.map((tx, index) => (
                      <div key={tx.hash} className="p-4 bg-white/5 rounded-lg border border-white/10">
                        {/* Transaction Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => copyTransactionHash(tx.hash)}
                              className="text-white font-medium text-sm hover:text-gray-300 transition-colors cursor-pointer"
                              title="Click to copy transaction hash"
                            >
                              {tx.hash.slice(0, 6)}...{tx.hash.slice(-4)}
                            </button>
                            <a
                              href={`https://midgard.wtf/tx-standard/${tx.hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-gray-400 hover:text-white transition-colors"
                            >
                              <Icons.externalLink size={14} />
                            </a>
                          </div>
                          <div className="text-right">
                            <div className="text-white text-sm">
                              {new Date(tx.originalData.timestamp).toLocaleDateString()}
                            </div>
                            <div className="text-gray-400 text-xs">
                              {new Date(tx.originalData.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                        </div>

                        {/* Method and Type Tags */}
                        {(tx.method || (tx.txTypes && tx.txTypes.length > 0)) && (
                          <div className="flex items-center space-x-2 mb-3">
                            {tx.method && (
                              <div className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs font-medium flex items-center space-x-1">
                                {tx.method.includes('swap') && <span>🔄</span>}
                                <span>{tx.method}</span>
                              </div>
                            )}
                            {tx.txTypes && tx.txTypes.slice(0, 2).map((type, idx) => (
                              <div key={idx} className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded text-xs">
                                {type.replace('_', ' ')}
                              </div>
                            ))}
                          </div>
                        )}

                                                {/* Token Transfers - Simplified Swap View */}
                        {tx.tokenTransfers && tx.tokenTransfers.length > 0 && (
                          <div className="mb-4">
                            {(() => {
                              const userAddress = detectiveAddress?.toLowerCase()
                              
                              // For swaps, calculate net token changes (total received - total sent for each token)
                              if (tx.method && tx.method.includes('swap') && tx.tokenTransfers.length > 0) {
                                const tokenBalances: { [symbol: string]: { net: number, usdValue: number, symbol: string } } = {}
                                
                                // Calculate net change for each token
                                tx.tokenTransfers.forEach(transfer => {
                                  const symbol = transfer.tokenSymbol || 'Unknown'
                                  if (!tokenBalances[symbol]) {
                                    tokenBalances[symbol] = { net: 0, usdValue: 0, symbol }
                                  }
                                  
                                  if (transfer.from.toLowerCase() === userAddress) {
                                    // User sent this token (negative)
                                    tokenBalances[symbol].net -= transfer.amountFormatted
                                    tokenBalances[symbol].usdValue -= (transfer.usdValue || 0)
                                  } else if (transfer.to.toLowerCase() === userAddress) {
                                    // User received this token (positive)
                                    tokenBalances[symbol].net += transfer.amountFormatted
                                    tokenBalances[symbol].usdValue += (transfer.usdValue || 0)
                                  }
                                })
                                
                                // Find the main input (most negative net) and output (most positive net)
                                const tokenChanges = Object.values(tokenBalances).filter(t => Math.abs(t.net) > 0.000001)
                                const mainInput = tokenChanges.find(t => t.net < 0 && Math.abs(t.usdValue) > 1)
                                const mainOutput = tokenChanges.find(t => t.net > 0 && Math.abs(t.usdValue) > 1)
                                
                                if (mainInput && mainOutput) {
                                  return (
                                    <div>
                                      <div className="text-gray-400 text-xs mb-2">Swap:</div>
                                      <div className="bg-white/5 p-3 rounded border border-white/5">
                                        <div className="flex items-center justify-between">
                                          {/* Input */}
                                          <div className="flex items-center space-x-2">
                                            <CoinLogo
                                              symbol={mainInput.symbol}
                                              size="sm"
                                              className="rounded-none"
                                            />
                                            <div>
                                              <div className="text-white text-sm font-medium">
                                                {Math.abs(mainInput.net).toLocaleString()} {mainInput.symbol}
                                              </div>
                                              <div className="text-gray-400 text-xs">
                                                ${Math.abs(mainInput.usdValue).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                              </div>
                                            </div>
                                          </div>
                                          
                                          {/* Arrow */}
                                          <div className="text-gray-400 mx-4">→</div>
                                          
                                          {/* Output */}
                                          <div className="flex items-center space-x-2">
                                            <CoinLogo
                                              symbol={mainOutput.symbol}
                                              size="sm"
                                              className="rounded-none"
                                            />
                                            <div>
                                              <div className="text-white text-sm font-medium">
                                                {mainOutput.net.toLocaleString()} {mainOutput.symbol}
                                              </div>
                                              <div className="text-gray-400 text-xs">
                                                ${mainOutput.usdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                }
                              }
                              
                              // Fallback: show all transfers
                              return (
                                <div>
                                  <div className="text-gray-400 text-xs mb-2">Token Transfers:</div>
                                  <div className="space-y-2">
                                    {tx.tokenTransfers.map((transfer, transferIndex) => (
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
                                    ))}
                                  </div>
                                </div>
                              )
                            })()}
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
                              {tx.originalData.to ? (tx.originalData.toName || `${tx.originalData.to.slice(0, 6)}...${tx.originalData.to.slice(-4)}`) : 'Contract Creation'}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-400 text-xs mb-1">Value</div>
                            <div className="text-white">
                              {tx.originalData.valueFormatted > 0 ? `${tx.originalData.valueFormatted.toFixed(6)} PLS` : '0 PLS'}
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-400 text-xs mb-1">Status</div>
                            <div className={`font-medium ${(tx.status || tx.originalData.status) === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                              {(tx.status || tx.originalData.status) === 'success' ? 'Success' : (tx.status || tx.originalData.status)}
                            </div>
                          </div>
                        </div>

                        {/* Additional Info */}
                        <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
                          <div className="text-gray-400 text-xs">
                            Block {tx.originalData.blockNumber.toLocaleString()}
                          </div>
                          {tx.originalData.fee && (
                            <div className="text-gray-400 text-xs">
                              Fee: {(parseFloat(tx.originalData.fee.value) / 1e18).toFixed(6)} PLS
                            </div>
                          )}
                        </div>

                        {/* Decoded Function Call */}
                        {tx.originalData.decodedInput && (
                          <div className="mt-3 pt-3 border-t border-white/10">
                            <div className="text-gray-400 text-xs mb-1">Function Call:</div>
                            <div className="text-white text-xs bg-gray-900/50 p-2 rounded">
                              {tx.originalData.decodedInput.method_call}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* No Transactions Found */}
                {transactionData && transactionData.transactions && transactionData.transactions.length === 0 && !transactionsLoading && !enrichmentLoading && (
                  <div className="text-center py-8 text-gray-400">
                    No recent transactions found for this address
                  </div>
                )}
              </div>
            )}
          </div>
        </Section>
      )}

    </Container>



      </div>
    </>
  )
} 