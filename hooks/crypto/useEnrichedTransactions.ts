'use client'

import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { useAddressTransactions } from './useAddressTransactions'
import { usePulseXHistoricPrices } from './usePulseXHistoricPrices'
import { TOKEN_CONSTANTS } from '@/constants/crypto'

interface EnrichedTransaction {
  hash: string
  from: string
  to: string | null
  value: string
  valueFormatted: number
  gasPrice: string
  gasUsed: string
  blockNumber: number
  timestamp: string
  timestampDate: Date
  method: string | null
  status: string
  txTypes: string[]
  decodedInput?: {
    method_call: string
    method_id: string
    parameters: any[]
  }
  fee?: {
    type: string
    value: string
  }
  toName?: string
  fromName?: string
  // Original transaction data for compatibility
  originalData: {
    hash: string
    from: string
    to: string | null
    value: string
    valueFormatted: number
    gasPrice: string
    gasUsed: string
    blockNumber: number
    timestamp: string
    method: string | null
    status: string
    txTypes: string[]
    decodedInput?: {
      method_call: string
      method_id: string
      parameters: any[]
    }
    fee?: {
      type: string
      value: string
    }
    toName?: string
    fromName?: string
    timeStamp: string // Additional field for timestamp compatibility
    functionName?: string // Additional field for function name compatibility
  }
  // Enhanced fields
  isTokenTransfer: boolean
  tokenInfo?: {
    symbol: string
    address: string
    amount: number
    historicPriceUSD?: number
    valueUSD?: number
  }
  direction: 'in' | 'out' | 'self'
  historicPLSPriceUSD?: number
  gasCostUSD?: number
  tokenTransfers?: any[] // Additional field for token transfers compatibility
}

interface TokenTransaction {
  symbol: string
  address: string
  totalBought: number
  totalSold: number
  avgBuyPrice: number
  avgSellPrice: number
  currentHoldings: number
  realizePL: number
  unrealizedPL: number
  totalCostBasis: number
}

interface UseEnrichedTransactionsResult {
  transactions: EnrichedTransaction[]
  tokenSummary: TokenTransaction[]
  isLoading: boolean
  error: any
  pricesProgress?: {
    total: number
    fetched: number
    percentage: number
  }
  debugLogs: string[]
}

// Helper to identify if transaction is a relevant token transfer/trade
function isTokenTransfer(tx: any): boolean {
  // Skip irrelevant transaction types
  const irrelevantMethods = [
    'stakeStart', 'stakeEnd', 'stakeGoodAccounting',
    'approve', 'permit', 'claimReward',
    'increaseAllowance', 'decreaseAllowance',
    'deposit', 'withdraw', 'claim'
  ]
  
  if (irrelevantMethods.includes(tx.method)) {
    return false
  }
  
  // Focus on actual token transfers and trading
  const isToken = tx.txTypes?.includes('token_transfer') || 
         tx.method === 'transfer' || 
         tx.method === 'transferFrom' ||
         tx.method === 'swapExactETHForTokens' ||
         tx.method === 'swapETHForExactTokens' ||
         tx.method === 'swapExactTokensForETH' ||
         tx.method === 'swapTokensForExactETH' ||
         tx.method === 'swapExactTokensForTokens' ||
         tx.method === 'multicall' ||
         (tx.to && tx.value === '0' && tx.decodedInput?.method_call?.includes('transfer')) ||
         (tx.value && tx.valueFormatted && tx.valueFormatted > 0) // PLS transfers
  
  if (isToken) {
  }
  
  return isToken
}

// Helper to extract token info from transaction
function extractTokenInfo(tx: any): { symbol: string; address: string; amount: number; transferType: 'sent' | 'received' | 'unknown' } | null {
  try {

    // Check if it's a native PLS transfer first (most common)
    if (tx.value && tx.valueFormatted && tx.valueFormatted > 0) {
      return {
        symbol: 'PLS',
        address: 'native',
        amount: tx.valueFormatted,
        transferType: 'unknown' // Will be determined by caller based on from/to
      }
    }

    // Check for token transfers based on transaction patterns
    // Pattern 1: Direct token contract interaction
    if (tx.to && (tx.value === '0' || tx.valueFormatted === 0)) {
      const tokenConfig = TOKEN_CONSTANTS.find(token => 
        token.a?.toLowerCase() === tx.to?.toLowerCase()
      )

      if (tokenConfig) {
        // For token contracts, try to parse the amount from decoded input or estimate
        let amount = 0
        
        if (tx.decodedInput?.parameters) {
          // Look for amount parameter (usually the last or second-to-last numeric parameter)
          const params = tx.decodedInput.parameters
          
          // Try different strategies to find the amount
          for (let i = params.length - 1; i >= 0; i--) {
            const param = params[i]
            
            // Strategy 1: String with only digits
            if (typeof param === 'string' && /^\d+$/.test(param)) {
              const decimals = tokenConfig.decimals || 18
              const parsedAmount = parseInt(param) / Math.pow(10, decimals)
              if (parsedAmount > 0) {
                amount = parsedAmount
                break
              }
            }
            
            // Strategy 2: Number parameter
            if (typeof param === 'number' && param > 0) {
              const decimals = tokenConfig.decimals || 18
              const parsedAmount = param / Math.pow(10, decimals)
              amount = parsedAmount
              break
            }
            
            // Strategy 3: BigInt string
            if (typeof param === 'string' && param.includes('n')) {
              try {
                const bigIntValue = BigInt(param.replace('n', ''))
                const decimals = tokenConfig.decimals || 18
                const parsedAmount = Number(bigIntValue) / Math.pow(10, decimals)
                if (parsedAmount > 0) {
                  amount = parsedAmount
                  break
                }
              } catch (e) {
              }
            }
            
            // Strategy 4: Hex string
            if (typeof param === 'string' && param.startsWith('0x')) {
              try {
                const hexValue = parseInt(param, 16)
                if (hexValue > 0) {
                  const decimals = tokenConfig.decimals || 18
                  const parsedAmount = hexValue / Math.pow(10, decimals)
                  amount = parsedAmount
                  break
                }
              } catch (e) {
              }
            }
          }
          
          if (amount === 0) {
          }
        } else {
        }
        
        // If still no amount found, try to estimate from transaction patterns
        if (amount === 0) {
          // For token transfers, sometimes the amount isn't in decoded params
          // Try to use a reasonable default or estimate based on context
          
          // If this is a token transfer method, assume some amount was transferred
          if (tx.method === 'transfer' || tx.method === 'transferFrom') {
            // Use a placeholder amount that indicates a transfer occurred
            // This isn't ideal but better than 0 for cost basis calculations
            amount = 1 // Will be corrected when we implement better parsing
          }
        }

        // Try to determine if this was a send or receive by looking at decoded params
        let transferType: 'sent' | 'received' | 'unknown' = 'unknown'
        
        if (tx.decodedInput?.parameters && (tx.method === 'transfer' || tx.method === 'transferFrom')) {
          // For transfer(to, amount) or transferFrom(from, to, amount)
          // The recipient address is usually the first parameter for transfer, second for transferFrom
          const params = tx.decodedInput.parameters
          
          // Note: We'll determine the actual direction in the caller function
          // where we have access to the user's address
        }

        return {
          symbol: tokenConfig.ticker,
          address: tx.to,
          amount,
          transferType
        }
      } else {
        
        // Check if this contract exists in our token constants
        const possibleToken = TOKEN_CONSTANTS.find(token => 
          token.a?.toLowerCase() === tx.to?.toLowerCase()
        )
        if (possibleToken) {
        } else {
        }
      }
    }

    // Pattern 2: DEX interactions - try to infer received tokens
    if (tx.method?.includes('swap') || tx.method?.includes('exchange') || tx.method === 'multicall' || tx.txTypes?.includes('token_transfer')) {
      
      // For DEX transactions, we need to look at txTypes for clues about which tokens were involved
      if (tx.txTypes?.includes('token_transfer')) {
        // Look through known tokens to see if any might match this transaction
        // This is a heuristic approach - we'll try to match based on timing and your current holdings
        
        // For now, we'll return a special marker that indicates this was a DEX transaction
        // The caller can then try to match this with tokens you currently hold
        return {
          symbol: 'DEX_TRANSACTION',
          address: tx.to || 'unknown',
          amount: 1, // Placeholder - will be estimated based on current holdings
          transferType: 'received' // DEX transactions where you hold the token = you received it
        }
      }
    }

    return null
  } catch (error) {
    return null
  }
}

// Helper to determine transaction direction for token transfers
function getTokenTransferDirection(tx: any, userAddress: string, tokenInfo: any): 'in' | 'out' | 'self' {
  const user = userAddress.toLowerCase()
  const from = tx.from?.toLowerCase()
  
  // Special handling for DEX transactions
  if (tokenInfo?.symbol === 'DEX_TRANSACTION' || 
      tx.method?.includes('swap') || 
      tx.method?.includes('exchange') || 
      tx.method === 'multicall') {
    
    return 'in' // For DEX transactions, assume user received tokens
  }
  
  // For direct token transfers, we need to look at the decoded parameters to find the actual recipient
  if (tx.decodedInput?.parameters && (tx.method === 'transfer' || tx.method === 'transferFrom')) {
    const params = tx.decodedInput.parameters
    
    let recipientAddress: any = null
    
    if (tx.method === 'transfer') {
      // transfer(to, amount) - recipient is first parameter
      recipientAddress = params[0]
    } else if (tx.method === 'transferFrom') {
      // transferFrom(from, to, amount) - recipient is second parameter  
      recipientAddress = params[1]
    }
    
    if (recipientAddress && typeof recipientAddress === 'string') {
      const recipientLower = (recipientAddress as string).toLowerCase()
      
      if (recipientLower === user) {
        return 'in'
      } else if (from === user) {
        return 'out'
      }
    }
  }
  
  // Fallback to basic direction logic for non-token or unclear cases
  const to = tx.to?.toLowerCase()
  if (from === user && to === user) return 'self'
  if (from === user) return 'out'
  if (to === user) return 'in'
  
  return 'out'
}

// Helper to determine transaction direction (keeping for non-token transactions)
function getTransactionDirection(tx: any, userAddress: string): 'in' | 'out' | 'self' {
  const from = tx.from?.toLowerCase()
  const to = tx.to?.toLowerCase()
  const user = userAddress.toLowerCase()

  if (from === user && to === user) return 'self'
  if (from === user) return 'out'
  if (to === user) return 'in'
  return 'out' // Default for unclear cases
}

/**
 * Hook that enriches transaction data with historic prices and token information
 * for cost basis analysis
 */
export function useEnrichedTransactions(address: string): UseEnrichedTransactionsResult {
  // Only call useAddressTransactions if we have a valid address
  const validAddress = address && typeof address === 'string' && address.trim() !== ''
  const { transactions: rawTransactions, isLoading: txLoading, error: txError } = useAddressTransactions(validAddress ? address : '')
  const { fetchHistoricPrice, isLoading: priceLoading, error: priceError } = usePulseXHistoricPrices()

  // State to store historic prices for transactions
  const [historicPrices, setHistoricPrices] = useState<Record<string, number>>({})
  const [pricesFetching, setPricesFetching] = useState(false)
  const [pricesProgress, setPricesProgress] = useState({ total: 0, fetched: 0, percentage: 0 })
  const [debugLogs, setDebugLogs] = useState<string[]>([])
  const fetchedTransactionsRef = useRef<string>('')
  const lastAddressRef = useRef<string>('')

  // Helper function to add debug logs (memoized to prevent infinite re-renders)
  const addDebugLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setDebugLogs(prev => [...prev, `[${timestamp}] ${message}`])
  }, [])

  // Reset state when address changes
  useEffect(() => {
    if (address !== lastAddressRef.current) {
      addDebugLog('🔄 Address changed, resetting state')
      setDebugLogs([]) // Clear previous logs for new address
      setHistoricPrices({})
      setPricesFetching(false)
      setPricesProgress({ total: 0, fetched: 0, percentage: 0 })
      fetchedTransactionsRef.current = ''
      lastAddressRef.current = address
    }
  }, [address])

  // Basic enriched transactions without historic prices
  const baseEnrichedTransactions = useMemo(() => {
    if (!rawTransactions?.transactions) {
      return []
    }


    const enriched = rawTransactions.transactions.map((tx): EnrichedTransaction => {
      const timestampDate = new Date(tx.timestamp)
      const isToken = isTokenTransfer(tx)
      const tokenInfo = isToken ? extractTokenInfo(tx) : undefined
      
      // Use specialized direction logic for token transfers
      const direction = isToken && tokenInfo 
        ? getTokenTransferDirection(tx, address, tokenInfo)
        : getTransactionDirection(tx, address)

      return {
        ...tx,
        timestampDate,
        originalData: {
          ...tx,
          timeStamp: tx.timestamp, // Convert timestamp to timeStamp for compatibility
          functionName: tx.method || undefined // Convert method to functionName for compatibility
        },
        isTokenTransfer: isToken,
        tokenInfo: tokenInfo || undefined,
        direction,
        tokenTransfers: isToken && tokenInfo ? [{ // Create tokenTransfers array for compatibility
          tokenSymbol: tokenInfo.symbol,
          tokenAddress: tokenInfo.address,
          amount: tokenInfo.amount,
          amountFormatted: tokenInfo.amount,
          direction: direction,
          usdValue: 0 // Will be updated when historic prices are applied
        }] : []
      }
    })

    const tokenTransferCount = enriched.filter(tx => tx.isTokenTransfer).length
    const skippedCount = enriched.length - tokenTransferCount

    return enriched
  }, [rawTransactions, address])

  // Fetch historic prices for token transactions
  useEffect(() => {
    if (!baseEnrichedTransactions.length || pricesFetching) return

    const tokenTransactions = baseEnrichedTransactions.filter(
      tx => tx.isTokenTransfer && tx.tokenInfo
    )

    if (tokenTransactions.length === 0) return

    // Create a unique identifier for this set of transactions
    const transactionIds = tokenTransactions.map(tx => tx.hash).sort().join(',')
    
    // Don't re-fetch if we've already processed these exact transactions
    if (fetchedTransactionsRef.current === transactionIds) {
      return
    }

    // Clear previous state for new transactions
    setHistoricPrices({})
    fetchedTransactionsRef.current = transactionIds

    // Create unique price requests (avoid duplicates for same token on same day)
    const uniquePriceRequests = new Map<string, { address: string; symbol: string; timestamp: number; isNative: boolean }>()
    
    tokenTransactions.forEach(tx => {
      if (!tx.tokenInfo) return
      
      const timestamp = Math.floor(new Date(tx.timestamp).getTime() / 1000)
      const dayTimestamp = Math.floor(timestamp / 86400) * 86400 // Round to day
      
      // For PLS (native), use WPLS contract address for price lookup
      const isNative = tx.tokenInfo.address === 'native'
      const priceAddress = isNative ? '0xa1077a294dde1b09bb078844df40758a5d0f9a27' : tx.tokenInfo.address // WPLS contract
      const priceKey = `${priceAddress}-${dayTimestamp}`
      
      if (!uniquePriceRequests.has(priceKey)) {
        uniquePriceRequests.set(priceKey, {
          address: priceAddress,
          symbol: tx.tokenInfo.symbol,
          timestamp: dayTimestamp,
          isNative
        })
      }
    })

    const priceRequestsArray = Array.from(uniquePriceRequests.values())
    
    if (priceRequestsArray.length === 0) return

    setPricesFetching(true)

    const fetchAllPrices = async () => {
      const priceResults: Record<string, number> = {}
      const totalRequests = priceRequestsArray.length
      
      priceRequestsArray.forEach((req, i) => {
      })
      
      setPricesProgress({ total: totalRequests, fetched: 0, percentage: 0 })
      
      for (let i = 0; i < priceRequestsArray.length; i++) {
        const request = priceRequestsArray[i]
        const priceKey = `${request.address}-${request.timestamp}`
        
        const tokenDescription = request.isNative ? `${request.symbol} (using WPLS price)` : request.symbol
        
        try {
          const historicPrice = await fetchHistoricPrice(request.address, request.timestamp)
          
          if (historicPrice !== null && historicPrice !== undefined) {
            if (historicPrice > 0) {
              priceResults[priceKey] = historicPrice
              
              // For native PLS, also store under the native key for easy lookup
              if (request.isNative) {
                const nativeKey = `native-${request.timestamp}`
                priceResults[nativeKey] = historicPrice
              }
            } else {
              // Store zero price to indicate we have data but it's zero
              priceResults[priceKey] = 0
              if (request.isNative) {
                const nativeKey = `native-${request.timestamp}`
                priceResults[nativeKey] = 0
              }
            }
          } else {
            // No price data found for this request
          }
        } catch (error) {
        }
        
        // Update progress
        const fetched = i + 1
        const percentage = Math.round((fetched / totalRequests) * 100)
        setPricesProgress({ total: totalRequests, fetched, percentage })
        
        // Small delay to prevent overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      setHistoricPrices(priceResults)
      setPricesFetching(false)
    }

    fetchAllPrices()
  }, [baseEnrichedTransactions, fetchHistoricPrice])

  // Final enriched transactions with historic prices
  const enrichedTransactions = useMemo(() => {
    
    const result = baseEnrichedTransactions.map(tx => {
      if (tx.isTokenTransfer && tx.tokenInfo) {
        // Use day-rounded timestamp to match how we stored the prices
        const timestamp = Math.floor(new Date(tx.timestamp).getTime() / 1000)
        const dayTimestamp = Math.floor(timestamp / 86400) * 86400
        
        // Use the correct price key based on whether it's native or not
        const isNative = tx.tokenInfo.address === 'native'
        const priceKey = isNative ? `native-${dayTimestamp}` : `${tx.tokenInfo.address}-${dayTimestamp}`
        const historicPrice = historicPrices[priceKey]
        
        const tokenDescription = isNative ? `${tx.tokenInfo.symbol} (native PLS)` : tx.tokenInfo.symbol
        
        if (historicPrice !== undefined) {
          if (historicPrice > 0) {
            const valueUSD = tx.tokenInfo.amount * historicPrice
            return {
              ...tx,
              tokenInfo: {
                ...tx.tokenInfo,
                historicPriceUSD: historicPrice,
                valueUSD
              },
              tokenTransfers: (tx.tokenTransfers || []).map(transfer => ({
                ...transfer,
                usdValue: valueUSD
              }))
            }
          } else {
            return {
              ...tx,
              tokenInfo: {
                ...tx.tokenInfo,
                historicPriceUSD: 0,
                valueUSD: 0
              },
              tokenTransfers: (tx.tokenTransfers || []).map(transfer => ({
                ...transfer,
                usdValue: 0
              }))
            }
          }
        } else {
        }
      }
      return tx
    })
    
    const withPrices = result.filter(tx => tx.tokenInfo?.historicPriceUSD !== undefined).length
    const withPositivePrices = result.filter(tx => tx.tokenInfo?.historicPriceUSD !== undefined && tx.tokenInfo.historicPriceUSD > 0).length
    
    return result
  }, [baseEnrichedTransactions, historicPrices])

  // Calculate token summary for cost basis
  const tokenSummary = useMemo(() => {
    if (!enrichedTransactions.length) {
      return []
    }


    const tokenMap = new Map<string, {
      symbol: string
      address: string
      buys: { amount: number; price: number; timestamp: Date }[]
      sells: { amount: number; price: number; timestamp: Date }[]
    }>()

    // Group transactions by token
    let processedTokenTxs = 0
    let skippedNoTokenInfo = 0
    let skippedNoAmount = 0
    let skippedBadDirection = 0
    
    enrichedTransactions.forEach(tx => {
      if (!tx.tokenInfo) {
        skippedNoTokenInfo++
        return
      }
      
      // Special handling for DEX transactions
      if (tx.tokenInfo.symbol === 'DEX_TRANSACTION') {
        // For now, skip DEX transactions until we can properly identify the tokens
        // TODO: Implement proper DEX transaction parsing
        skippedNoTokenInfo++
        return
      }
      
      if (!tx.tokenInfo.amount) {
        skippedNoAmount++
        return
      }

      processedTokenTxs++
      const { symbol, address: tokenAddress, amount } = tx.tokenInfo
      
      
      if (!tokenMap.has(symbol)) {
        tokenMap.set(symbol, {
          symbol,
          address: tokenAddress,
          buys: [],
          sells: []
        })
      }

      const tokenData = tokenMap.get(symbol)!
      
      // Categorize as buy or sell based on direction and transaction type
      if (tx.direction === 'in') {
        // Incoming tokens - determine if purchased or received
        const userInitiated = tx.from?.toLowerCase() === address.toLowerCase()
        const price = userInitiated ? (tx.tokenInfo?.historicPriceUSD || 0) : 0 // $0 cost basis for received tokens
        
        tokenData.buys.push({
          amount,
          price,
          timestamp: tx.timestampDate
        })
        
        if (userInitiated) {
        } else {
        }
      } else if (tx.direction === 'out') {
        tokenData.sells.push({
          amount,
          price: tx.tokenInfo?.historicPriceUSD || 0,
          timestamp: tx.timestampDate
        })
      } else {
        skippedBadDirection++
      }
    })



    // Calculate cost basis for each token
    return Array.from(tokenMap.values()).map(tokenData => {
      const totalBought = tokenData.buys.reduce((sum, buy) => sum + buy.amount, 0)
      const totalSold = tokenData.sells.reduce((sum, sell) => sum + sell.amount, 0)
      
      const totalBuyValue = tokenData.buys.reduce((sum, buy) => sum + (buy.amount * buy.price), 0)
      const totalSellValue = tokenData.sells.reduce((sum, sell) => sum + (sell.amount * sell.price), 0)
      
      const avgBuyPrice = totalBought > 0 ? totalBuyValue / totalBought : 0
      const avgSellPrice = totalSold > 0 ? totalSellValue / totalSold : 0
      
      const currentHoldings = totalBought - totalSold
      const realizePL = totalSellValue - (totalSold * avgBuyPrice)
      const totalCostBasis = currentHoldings * avgBuyPrice

      return {
        symbol: tokenData.symbol,
        address: tokenData.address,
        totalBought,
        totalSold,
        avgBuyPrice,
        avgSellPrice,
        currentHoldings,
        realizePL,
        unrealizedPL: 0, // Will be calculated with current price
        totalCostBasis
      } as TokenTransaction
    })
  }, [enrichedTransactions])

  const isLoading = txLoading || priceLoading || pricesFetching
  const error = txError || priceError

  return {
    transactions: enrichedTransactions,
    tokenSummary,
    isLoading,
    error,
    pricesProgress: pricesFetching ? pricesProgress : undefined,
    debugLogs
  }
} 