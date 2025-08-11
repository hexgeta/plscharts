'use client'

import useSWR from 'swr'
import { TOKEN_CONSTANTS } from '@/constants/crypto'
import { MORE_COINS } from '@/constants/more-coins'

// RPC endpoints for both chains
const PULSECHAIN_RPC = 'https://rpc-pulsechain.g4mm4.io'
const ETHEREUM_RPC = 'https://rpc-ethereum.g4mm4.io'

interface TokenBalance {
  address: string
  symbol: string
  name: string
  balance: string
  balanceFormatted: number
  decimals: number
  isNative: boolean
  error?: string
}

interface BalanceData {
  address: string
  chain: number
  timestamp: string
  nativeBalance: TokenBalance
  tokenBalances: TokenBalance[]
  error?: string
}

interface UsePortfolioBalanceResult {
  balances: BalanceData[]
  isLoading: boolean
  error: any
  mutate: () => void
}

// Function to get native balance (PLS or ETH)
async function getNativeBalance(address: string, chainId: number): Promise<TokenBalance> {
  try {
    const rpcUrl = chainId === 369 ? PULSECHAIN_RPC : ETHEREUM_RPC
    const nativeSymbol = chainId === 369 ? 'PLS' : 'ETH'
    const nativeName = chainId === 369 ? 'PulseChain' : 'Ethereum'
    
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getBalance',
        params: [address, 'latest'],
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
    const balanceWei = hexBalance && hexBalance !== '0x' ? BigInt(hexBalance) : BigInt(0)
    const balanceFormatted = Number(balanceWei) / 1e18

    return {
      address: '0x0', // Native token
      symbol: nativeSymbol,
      name: nativeName,
      balance: balanceWei.toString(),
      balanceFormatted,
      decimals: 18,
      isNative: true
    }
  } catch (error: any) {
    return {
      address: '0x0',
      symbol: chainId === 369 ? 'PLS' : 'ETH',
      name: chainId === 369 ? 'PulseChain' : 'Ethereum',
      balance: '0',
      balanceFormatted: 0,
      decimals: 18,
      isNative: true,
      error: error.message
    }
  }
}

// Function to get ERC-20 token balance
async function getTokenBalance(
  walletAddress: string, 
  tokenAddress: string, 
  decimals: number,
  symbol: string,
  name: string,
  chainId: number
): Promise<TokenBalance> {
  try {
    const rpcUrl = chainId === 369 ? PULSECHAIN_RPC : ETHEREUM_RPC
    
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

    return {
      address: tokenAddress,
      symbol,
      name,
      balance,
      balanceFormatted,
      decimals,
      isNative: false
    }
  } catch (error: any) {
    return {
      address: tokenAddress,
      symbol,
      name,
      balance: '0',
      balanceFormatted: 0,
      decimals,
      isNative: false,
      error: error.message
    }
  }
}

// Function to get all balances for an address on a specific chain
async function getAddressBalances(address: string, chainId: number, enabledCoins?: Set<string>, customTokens?: any[]): Promise<BalanceData> {
  try {
    const chainName = chainId === 369 ? 'PulseChain' : 'Ethereum'
    console.log(`[usePortfolioBalance] Fetching balances for ${address} on ${chainName}`)
    
    // Get native balance (PLS or ETH) - check if native tokens are enabled
    const nativeSymbol = chainId === 369 ? 'PLS' : 'ETH'
    const shouldIncludeNative = !enabledCoins || enabledCoins.has(nativeSymbol)
    const nativeBalance = shouldIncludeNative ? await getNativeBalance(address, chainId) : null

    // Get relevant tokens for this chain
    // In auto-detect mode (no enabledCoins filter), only use TOKEN_CONSTANTS + custom tokens
    // In manual mode (with enabledCoins filter), use TOKEN_CONSTANTS + MORE_COINS + custom tokens
    const baseTokens = enabledCoins ? [...TOKEN_CONSTANTS, ...MORE_COINS] : TOKEN_CONSTANTS
    const allTokens = customTokens ? [...baseTokens, ...customTokens] : baseTokens
    const relevantTokens = allTokens.filter(token => 
      token.chain === chainId && 
      token.a !== "0x0" && // Skip native tokens
      token.a && 
      token.a.length === 42 && // Valid address format
      token.a.startsWith('0x') && // Must be a valid hex address
      (!enabledCoins || enabledCoins.has(token.ticker)) // Only include enabled coins if filter is provided
    )

    console.log(`[usePortfolioBalance] Checking ${relevantTokens.length} ${chainName} tokens for ${address}`)

    // Get token balances in batches to avoid overwhelming the RPC
    const batchSize = 10 // Test larger batch size - increase until you see errors
    const tokenBalances: TokenBalance[] = []
    let totalErrors = 0
    let totalSuccessful = 0
    const batchStartTime = Date.now()

    for (let i = 0; i < relevantTokens.length; i += batchSize) {
      const batch = relevantTokens.slice(i, i + batchSize)
      const batchNum = Math.floor(i / batchSize) + 1
      const totalBatches = Math.ceil(relevantTokens.length / batchSize)
      
      const batchTimer = Date.now()
      console.log(`[usePortfolioBalance] Processing batch ${batchNum}/${totalBatches} (${batch.length} tokens) for ${address} on ${chainName}`)
      
      // Add debug log to panel for batch progress
      if (typeof window !== 'undefined' && (window as any).addDebugLog) {
        const addDebugLogFn = (window as any).addDebugLog as Function
        addDebugLogFn('progress', 'Portfolio Balances', `Batch ${batchNum}/${totalBatches} - ${batch.length} tokens (${address.slice(0, 8)}... on ${chainName})`)
      }
      
      const batchPromises = batch.map(async (token) => {
        return getTokenBalance(address, token.a, token.decimals, token.ticker, token.name, chainId)
      })

      const batchResults = await Promise.all(batchPromises)
      const batchDuration = Date.now() - batchTimer
      
      // Track errors and successful fetches
      batchResults.forEach((tokenBalance) => {
        if (tokenBalance.error) {
          totalErrors++
          if (tokenBalance.error.includes('429') || tokenBalance.error.includes('rate limit')) {
            console.error(`[usePortfolioBalance] 🚨 RATE LIMIT HIT - Batch size ${batchSize} is too large!`)
          }
          console.warn(`[usePortfolioBalance] Error fetching ${tokenBalance.symbol}:`, tokenBalance.error)
        } else {
          totalSuccessful++
          if (tokenBalance.balanceFormatted > 0) {
            tokenBalances.push(tokenBalance)
            console.log(`[usePortfolioBalance] Found balance: ${tokenBalance.balanceFormatted} ${tokenBalance.symbol}`)
          }
        }
      })

      console.log(`[usePortfolioBalance] Batch ${batchNum} completed in ${batchDuration}ms (${totalErrors} errors so far)`)
      
      // Add batch completion to debug panel
      if (typeof window !== 'undefined' && (window as any).addDebugLog) {
        const errorText = totalErrors > 0 ? ` (${totalErrors} errors)` : ''
        const addDebugLogFn = (window as any).addDebugLog as Function
        addDebugLogFn('complete', 'Portfolio Balances', `Batch ${batchNum}/${totalBatches} done in ${batchDuration}ms${errorText}`)
      }

      // Add delay between batches to prevent rate limiting
      if (i + batchSize < relevantTokens.length) {
        await new Promise(resolve => setTimeout(resolve, 50)) // 50ms delay between batches
      }
    }

    console.log(`[usePortfolioBalance] Batch processing complete for ${address} on ${chainName}: ${totalSuccessful} successful, ${totalErrors} errors, ${tokenBalances.length} with balances`)

    console.log(`[usePortfolioBalance] Found ${tokenBalances.length} tokens with balances for ${address} on ${chainName}`)

    return {
      address,
      chain: chainId,
      timestamp: new Date().toISOString(),
      nativeBalance: nativeBalance || {
        address: '0x0',
        symbol: nativeSymbol,
        name: chainId === 369 ? 'PulseChain' : 'Ethereum',
        balance: '0',
        balanceFormatted: 0,
        decimals: 18,
        isNative: true
      },
      tokenBalances
    }
  } catch (error: any) {
    console.error(`[usePortfolioBalance] Error fetching balances for ${address} on chain ${chainId}:`, error)
    const nativeSymbol = chainId === 369 ? 'PLS' : 'ETH'
    const nativeName = chainId === 369 ? 'PulseChain' : 'Ethereum'
    
    return {
      address,
      chain: chainId,
      timestamp: new Date().toISOString(),
      nativeBalance: {
        address: '0x0',
        symbol: nativeSymbol,
        name: nativeName,
        balance: '0',
        balanceFormatted: 0,
        decimals: 18,
        isNative: true,
        error: 'Failed to fetch'
      },
      tokenBalances: [],
      error: error.message
    }
  }
}

// Create cache keys
const BALANCE_CACHE_KEYS = {
  balances: (addresses: string[]) => `portfolio-balances:${addresses.sort().join(',')}`
}

// Fetcher function for SWR
async function fetchAllAddressBalances(addresses: string[], enabledCoins?: Set<string>, customTokens?: any[]): Promise<BalanceData[]> {
  if (!Array.isArray(addresses) || addresses.length === 0) {
    return []
  }

  console.log(`[usePortfolioBalance] Fetching balances for ${addresses.length} addresses`)
  
  // Fetch balances for all addresses on both chains
  const balancePromises: Promise<BalanceData>[] = []
  
  addresses.forEach(address => {
    // Fetch PulseChain balances
    balancePromises.push(getAddressBalances(address, 369, enabledCoins, customTokens))
    // Fetch Ethereum balances
    balancePromises.push(getAddressBalances(address, 1, enabledCoins, customTokens))
  })
  
  const allBalanceData = await Promise.all(balancePromises)
  
  // Count successful vs failed requests
  const validBalances = allBalanceData.filter(data => !data.error)
  const failedBalances = allBalanceData.filter(data => data.error)
  
  if (failedBalances.length > 0) {
    console.warn(`[usePortfolioBalance] ${failedBalances.length} address/chain combinations failed:`)
    failedBalances.forEach(failed => {
      console.warn(`[usePortfolioBalance] Failed: ${failed.address} on chain ${failed.chain} - ${failed.error}`)
    })
  }
  
  console.log(`[usePortfolioBalance] Successfully fetched balances for ${validBalances.length}/${addresses.length * 2} address/chain combinations`)
  
  return validBalances
}

export function usePortfolioBalance(walletAddresses: string[], enabledCoins?: Set<string>, customTokens?: any[]): UsePortfolioBalanceResult {
  // Create cache key that includes enabled coins and custom tokens to invalidate cache when they change
  const enabledCoinsArray = enabledCoins ? Array.from(enabledCoins).sort() : []
  const customTokensIds = customTokens ? customTokens.map(t => t.id).sort() : []
  const cacheKey = walletAddresses.length > 0 ? 
    `${BALANCE_CACHE_KEYS.balances(walletAddresses)}-coins:${enabledCoinsArray.join(',')}-custom:${customTokensIds.join(',')}` : null
  
  // Debug: Log when this hook is called and with what cache key
  console.log('[usePortfolioBalance] Hook called with addresses:', walletAddresses.length, 'enabled coins:', enabledCoinsArray.length, 'custom tokens:', customTokensIds.length, 'cacheKey:', cacheKey)
  
  const { data: balances, error, isLoading, mutate } = useSWR(
    cacheKey,
    () => fetchAllAddressBalances(walletAddresses, enabledCoins, customTokens),
    {
      // Disable all automatic revalidation - only fetch on mount/reload
      refreshInterval: 0, // No automatic refresh
      dedupingInterval: 0, // No deduping - always fresh on mount
      revalidateOnFocus: false, // Don't refetch when window gets focus
      revalidateOnReconnect: false, // Don't refetch on network reconnect
      revalidateIfStale: false, // Don't refetch if data is stale
      revalidateOnMount: true, // Only fetch on component mount
      errorRetryInterval: 10000,
      errorRetryCount: 2
    }
  )
  
  return {
    balances: balances || [],
    isLoading,
    error,
    mutate
  }
} 