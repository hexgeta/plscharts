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
    console.log('[isTokenTransfer] ⏭️ Skipping irrelevant method:', tx.hash?.slice(0, 10), tx.method)
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
    console.log('[isTokenTransfer] ✅ Identified relevant token transfer/trade:', tx.hash?.slice(0, 10), tx.method, tx.txTypes)
  }
  
  return isToken
}

// Helper to extract token info from transaction
function extractTokenInfo(tx: any): { symbol: string; address: string; amount: number; transferType: 'sent' | 'received' | 'unknown' } | null {
  try {

    // Check if it's a native PLS transfer first (most common)
    if (tx.value && tx.valueFormatted && tx.valueFormatted > 0) {
      console.log(`[extractTokenInfo] ✅ Found PLS transfer: ${tx.valueFormatted} PLS`)
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
          console.log(`[extractTokenInfo] Decoded params for ${tokenConfig.ticker}:`, params)
          
          // Try different strategies to find the amount
          for (let i = params.length - 1; i >= 0; i--) {
            const param = params[i]
            
            // Strategy 1: String with only digits
            if (typeof param === 'string' && /^\d+$/.test(param)) {
              const decimals = tokenConfig.decimals || 18
              const parsedAmount = parseInt(param) / Math.pow(10, decimals)
              if (parsedAmount > 0) {
                amount = parsedAmount
                console.log(`[extractTokenInfo] ✅ Parsed amount from string param ${i}: ${amount} (${param} / 10^${decimals})`)
                break
              }
            }
            
            // Strategy 2: Number parameter
            if (typeof param === 'number' && param > 0) {
              const decimals = tokenConfig.decimals || 18
              const parsedAmount = param / Math.pow(10, decimals)
              amount = parsedAmount
              console.log(`[extractTokenInfo] ✅ Parsed amount from number param ${i}: ${amount} (${param} / 10^${decimals})`)
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
                  console.log(`[extractTokenInfo] ✅ Parsed amount from BigInt param ${i}: ${amount}`)
                  break
                }
              } catch (e) {
                console.log(`[extractTokenInfo] Failed to parse BigInt param ${i}:`, param)
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
                  console.log(`[extractTokenInfo] ✅ Parsed amount from hex param ${i}: ${amount} (${param} = ${hexValue})`)
                  break
                }
              } catch (e) {
                console.log(`[extractTokenInfo] Failed to parse hex param ${i}:`, param)
              }
            }
          }
          
          if (amount === 0) {
            console.log(`[extractTokenInfo] ⚠️ No amount found in params for ${tokenConfig.ticker}. Will try alternative methods...`)
          }
        } else {
          console.log(`[extractTokenInfo] ⚠️ No decoded input parameters for ${tokenConfig.ticker}`)
        }
        
        // If still no amount found, try to estimate from transaction patterns
        if (amount === 0) {
          // For token transfers, sometimes the amount isn't in decoded params
          // Try to use a reasonable default or estimate based on context
          console.log(`[extractTokenInfo] 🔍 Attempting fallback estimation for ${tokenConfig.ticker}...`)
          
          // If this is a token transfer method, assume some amount was transferred
          if (tx.method === 'transfer' || tx.method === 'transferFrom') {
            // Use a placeholder amount that indicates a transfer occurred
            // This isn't ideal but better than 0 for cost basis calculations
            amount = 1 // Will be corrected when we implement better parsing
            console.log(`[extractTokenInfo] 🔧 Using placeholder amount for ${tokenConfig.ticker} transfer: ${amount}`)
          }
        }

        // Try to determine if this was a send or receive by looking at decoded params
        let transferType: 'sent' | 'received' | 'unknown' = 'unknown'
        
        if (tx.decodedInput?.parameters && (tx.method === 'transfer' || tx.method === 'transferFrom')) {
          // For transfer(to, amount) or transferFrom(from, to, amount)
          // The recipient address is usually the first parameter for transfer, second for transferFrom
          const params = tx.decodedInput.parameters
          console.log(`[extractTokenInfo] Analyzing transfer direction for ${tokenConfig.ticker}:`, {
            method: tx.method,
            params: params,
            txFrom: tx.from,
            userAddress: 'Will be determined by caller'
          })
          
          // Note: We'll determine the actual direction in the caller function
          // where we have access to the user's address
        }

        console.log(`[extractTokenInfo] ✅ Found token transfer: ${amount} ${tokenConfig.ticker} (${tx.to})`)
        return {
          symbol: tokenConfig.ticker,
          address: tx.to,
          amount,
          transferType
        }
      } else {
        console.log(`[extractTokenInfo] ❌ Unknown token contract: ${tx.to} - checking token list...`)
        
        // Check if this contract exists in our token constants
        const possibleToken = TOKEN_CONSTANTS.find(token => 
          token.a?.toLowerCase() === tx.to?.toLowerCase()
        )
        if (possibleToken) {
          console.log(`[extractTokenInfo] 🔍 Found token in constants but filtered out: ${possibleToken.ticker} (${possibleToken.a})`)
        } else {
          console.log(`[extractTokenInfo] 🔍 Contract ${tx.to} not found in TOKEN_CONSTANTS at all`)
        }
      }
    }

    // Pattern 2: DEX interactions - try to infer received tokens
    if (tx.method?.includes('swap') || tx.method?.includes('exchange') || tx.method === 'multicall' || tx.txTypes?.includes('token_transfer')) {
      console.log(`[extractTokenInfo] 🔄 Found DEX interaction:`, tx.method, tx.txTypes, 'attempting to parse...')
      
      // For DEX transactions, we need to look at txTypes for clues about which tokens were involved
      if (tx.txTypes?.includes('token_transfer')) {
        // Look through known tokens to see if any might match this transaction
        // This is a heuristic approach - we'll try to match based on timing and your current holdings
        console.log(`[extractTokenInfo] 🔍 DEX transaction with token_transfer type - this likely involved receiving tokens`)
        
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

    console.log(`[extractTokenInfo] ❌ No token info extracted for tx ${tx.hash?.slice(0, 10)}`)
    return null
  } catch (error) {
    console.error('[extractTokenInfo] Error extracting token info:', error)
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
    
    console.log(`[getTokenTransferDirection] 🔄 DEX transaction detected - assuming RECEIVED tokens`)
    return 'in' // For DEX transactions, assume user received tokens
  }
  
  // For direct token transfers, we need to look at the decoded parameters to find the actual recipient
  if (tx.decodedInput?.parameters && (tx.method === 'transfer' || tx.method === 'transferFrom')) {
    const params = tx.decodedInput.parameters
    
    console.log(`[getTokenTransferDirection] Analyzing ${tokenInfo.symbol} transfer:`, {
      method: tx.method,
      params: params,
      txFrom: tx.from,
      userAddress: userAddress,
      hash: tx.hash?.slice(0, 10)
    })
    
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
      console.log(`[getTokenTransferDirection] Found recipient: ${recipientLower}, user: ${user}`)
      
      if (recipientLower === user) {
        console.log(`[getTokenTransferDirection] ✅ User is RECIPIENT - this is an INCOMING transfer`)
        return 'in'
      } else if (from === user) {
        console.log(`[getTokenTransferDirection] ✅ User is SENDER - this is an OUTGOING transfer`)
        return 'out'
      }
    }
  }
  
  // Fallback to basic direction logic for non-token or unclear cases
  const to = tx.to?.toLowerCase()
  if (from === user && to === user) return 'self'
  if (from === user) return 'out'
  if (to === user) return 'in'
  
  console.log(`[getTokenTransferDirection] ⚠️ Could not determine direction, defaulting to 'out'`)
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
      console.log('[useEnrichedTransactions] ❌ No raw transactions available')
      return []
    }

    console.log(`[useEnrichedTransactions] 📊 Processing ${rawTransactions.transactions.length} transactions for address ${address}`)

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
        isTokenTransfer: isToken,
        tokenInfo: tokenInfo || undefined,
        direction,
      }
    })

    const tokenTransferCount = enriched.filter(tx => tx.isTokenTransfer).length
    const skippedCount = enriched.length - tokenTransferCount
    console.log(`[useEnrichedTransactions] ✅ Found ${tokenTransferCount} relevant token transfers out of ${enriched.length} total transactions (skipped ${skippedCount} irrelevant transactions like staking, approvals, etc.)`)

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
      console.log('[useEnrichedTransactions] Already fetched prices for these transactions, skipping')
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
    console.log(`[useEnrichedTransactions] Fetching historic prices for ${priceRequestsArray.length} unique token/date combinations from ${tokenTransactions.length} transactions`)

    const fetchAllPrices = async () => {
      const priceResults: Record<string, number> = {}
      const totalRequests = priceRequestsArray.length
      
      console.log(`[useEnrichedTransactions] Starting to fetch ${totalRequests} historic prices:`)
      priceRequestsArray.forEach((req, i) => {
        console.log(`  ${i+1}. ${req.symbol} (${req.address}) on ${new Date(req.timestamp * 1000).toDateString()} ${req.isNative ? '[NATIVE→WPLS]' : ''}`)
      })
      
      setPricesProgress({ total: totalRequests, fetched: 0, percentage: 0 })
      
      for (let i = 0; i < priceRequestsArray.length; i++) {
        const request = priceRequestsArray[i]
        const priceKey = `${request.address}-${request.timestamp}`
        
        const tokenDescription = request.isNative ? `${request.symbol} (using WPLS price)` : request.symbol
        console.log(`[useEnrichedTransactions] Fetching price ${i+1}/${totalRequests}: ${tokenDescription} at ${new Date(request.timestamp * 1000).toDateString()}`)
        
        try {
          const historicPrice = await fetchHistoricPrice(request.address, request.timestamp)
          
          if (historicPrice !== null && historicPrice !== undefined) {
            if (historicPrice > 0) {
              priceResults[priceKey] = historicPrice
              console.log(`[useEnrichedTransactions] ✅ Found historic price for ${tokenDescription}: $${historicPrice}`)
              
              // For native PLS, also store under the native key for easy lookup
              if (request.isNative) {
                const nativeKey = `native-${request.timestamp}`
                priceResults[nativeKey] = historicPrice
                console.log(`[useEnrichedTransactions] ✅ Stored PLS price under native key: ${nativeKey}`)
              }
            } else {
              console.log(`[useEnrichedTransactions] ⚠️ Found zero price for ${tokenDescription} (API returned: $${historicPrice})`)
              // Store zero price to indicate we have data but it's zero
              priceResults[priceKey] = 0
              if (request.isNative) {
                const nativeKey = `native-${request.timestamp}`
                priceResults[nativeKey] = 0
              }
            }
          } else {
            console.log(`[useEnrichedTransactions] ❌ No price data found for ${tokenDescription} (returned: ${historicPrice})`)
            console.log(`[useEnrichedTransactions] 🔍 Debug - Raw API response for key ${priceKey}:`, {
              address: request.address,
              symbol: request.symbol,
              timestamp: request.timestamp,
              date: new Date(request.timestamp * 1000).toDateString(),
              historicPrice
            })
          }
        } catch (error) {
          console.warn(`[useEnrichedTransactions] ❌ Failed to fetch historic price for ${tokenDescription}:`, error)
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
      console.log(`[useEnrichedTransactions] 🎯 FINAL RESULT: Fetched ${Object.keys(priceResults).length} historic prices for ${totalRequests} requests`)
      console.log(`[useEnrichedTransactions] Price results:`, priceResults)
    }

    fetchAllPrices()
  }, [baseEnrichedTransactions, fetchHistoricPrice])

  // Final enriched transactions with historic prices
  const enrichedTransactions = useMemo(() => {
    console.log(`[useEnrichedTransactions] Applying historic prices to ${baseEnrichedTransactions.length} transactions`)
    console.log(`[useEnrichedTransactions] Available historic prices:`, Object.keys(historicPrices))
    
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
        console.log(`[useEnrichedTransactions] Checking price for ${tokenDescription} on ${new Date(dayTimestamp * 1000).toDateString()}: key=${priceKey}, price=${historicPrice}`)
        
        if (historicPrice !== undefined) {
          if (historicPrice > 0) {
            console.log(`[useEnrichedTransactions] ✅ Applied historic price $${historicPrice} to ${tokenDescription}`)
            return {
              ...tx,
              tokenInfo: {
                ...tx.tokenInfo,
                historicPriceUSD: historicPrice,
                valueUSD: tx.tokenInfo.amount * historicPrice
              }
            }
          } else {
            console.log(`[useEnrichedTransactions] ⚠️ Applied zero historic price to ${tokenDescription} (price data exists but is $0)`)
            return {
              ...tx,
              tokenInfo: {
                ...tx.tokenInfo,
                historicPriceUSD: 0,
                valueUSD: 0
              }
            }
          }
        } else {
          console.log(`[useEnrichedTransactions] ❌ No historic price found for ${tokenDescription}`)
        }
      }
      return tx
    })
    
    const withPrices = result.filter(tx => tx.tokenInfo?.historicPriceUSD !== undefined).length
    const withPositivePrices = result.filter(tx => tx.tokenInfo?.historicPriceUSD !== undefined && tx.tokenInfo.historicPriceUSD > 0).length
    console.log(`[useEnrichedTransactions] Final result: ${withPrices} transactions have historic prices applied (${withPositivePrices} with positive prices, ${withPrices - withPositivePrices} with zero prices)`)
    
    return result
  }, [baseEnrichedTransactions, historicPrices])

  // Calculate token summary for cost basis
  const tokenSummary = useMemo(() => {
    if (!enrichedTransactions.length) {
      console.log('[useEnrichedTransactions] No enriched transactions for token summary')
      return []
    }

    console.log(`[useEnrichedTransactions] Calculating token summary from ${enrichedTransactions.length} enriched transactions`)

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
        console.log(`[useEnrichedTransactions] 🔄 Found DEX transaction: ${tx.hash?.slice(0, 10)}, method: ${tx.method}, direction: ${tx.direction}`)
        console.log(`[useEnrichedTransactions] 🔄 DEX transaction details:`, {
          timestamp: new Date(tx.timestamp).toLocaleDateString(),
          method: tx.method,
          txTypes: tx.txTypes,
          to: tx.to,
          from: tx.from
        })
        
        // For now, skip DEX transactions until we can properly identify the tokens
        // TODO: Implement proper DEX transaction parsing
        skippedNoTokenInfo++
        return
      }
      
      if (!tx.tokenInfo.amount) {
        skippedNoAmount++
        console.log(`[useEnrichedTransactions] ❌ Skipping ${tx.tokenInfo.symbol} - no amount (${tx.tokenInfo.amount})`)
        console.log(`[useEnrichedTransactions] 📋 Transaction details for ${tx.tokenInfo.symbol}:`, {
          hash: tx.hash?.slice(0, 10),
          method: tx.method,
          timestamp: new Date(tx.timestamp).toLocaleDateString(),
          direction: tx.direction,
          txTypes: tx.txTypes,
          decodedInput: tx.decodedInput
        })
        return
      }

      processedTokenTxs++
      const { symbol, address: tokenAddress, amount } = tx.tokenInfo
      
      console.log(`[useEnrichedTransactions] ✅ Processing token tx: ${symbol}, amount: ${amount}, direction: ${tx.direction}, price: $${tx.tokenInfo?.historicPriceUSD || 'No price'}`)
      
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
          console.log(`[useEnrichedTransactions] 📈 Added PURCHASE: ${amount} ${symbol} at $${price} (user-initiated transaction)`)
        } else {
          console.log(`[useEnrichedTransactions] 🎁 Added RECEIVED: ${amount} ${symbol} at $0 cost basis (sent by someone else)`)
        }
      } else if (tx.direction === 'out') {
        tokenData.sells.push({
          amount,
          price: tx.tokenInfo?.historicPriceUSD || 0,
          timestamp: tx.timestampDate
        })
        console.log(`[useEnrichedTransactions] 📉 Added SELL: ${amount} ${symbol} at $${tx.tokenInfo?.historicPriceUSD || 0}`)
      } else {
        skippedBadDirection++
        console.log(`[useEnrichedTransactions] ❌ Skipping ${symbol} - unknown direction: ${tx.direction}`)
      }
    })

    console.log(`[useEnrichedTransactions] 📊 SUMMARY: Processed ${processedTokenTxs} token txs, Skipped: ${skippedNoTokenInfo} (no token info), ${skippedNoAmount} (no amount), ${skippedBadDirection} (bad direction)`)

    console.log(`[useEnrichedTransactions] 🎯 Processed ${processedTokenTxs} token transactions, found ${tokenMap.size} unique tokens`)

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