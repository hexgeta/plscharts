'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { getDailyCacheKey } from '@/utils/swr-config'
import { TOKEN_CONSTANTS } from '@/constants/crypto'

// RPC endpoints from the existing cron job
const RPC_ENDPOINTS = {
  pulsechain: 'https://rpc-pulsechain.g4mm4.io',
  ethereum: 'https://rpc-ethereum.g4mm4.io',
  bsc: 'https://bsc-rpc.publicnode.com' // Updated BSC endpoint
}

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
  chain: 'ethereum' | 'pulsechain' | 'bsc'
  timestamp: string
  nativeBalance: TokenBalance
  tokenBalances: TokenBalance[]
  error?: string
}

interface UseBridgeBalanceCheckResult {
  balances: BalanceData[]
  isLoading: boolean
  error: any
}

// Cache management functions
const CACHE_KEYS = {
  TOKEN_BALANCES: 'bridge_token_balances_cache',
  TIMESTAMP: 'bridge_cache_timestamp'
}

// Check if cache is valid (before 1am UTC today)
const isCacheValid = (): boolean => {
  try {
    const cachedTimestamp = localStorage.getItem(CACHE_KEYS.TIMESTAMP)
    if (!cachedTimestamp) return false
    
    const cacheTime = parseInt(cachedTimestamp)
    const now = Date.now()
    
    // Create 1am UTC cutoff for today
    const today = new Date()
    const cutoff = new Date(today)
    cutoff.setUTCHours(1, 0, 0, 0)
    
    // If current time is before 1am UTC, use yesterday's 1am as cutoff
    if (today.getUTCHours() < 1) {
      cutoff.setUTCDate(cutoff.getUTCDate() - 1)
    }
    
    return cacheTime > cutoff.getTime()
  } catch (error) {
    return false
  }
}

// Get cached token balance
const getCachedTokenBalance = (cacheKey: string): TokenBalance | null => {
  try {
    if (!isCacheValid()) return null
    
    const cached = localStorage.getItem(`${CACHE_KEYS.TOKEN_BALANCES}_${cacheKey}`)
    if (!cached) return null
    
    return JSON.parse(cached)
  } catch (error) {
    return null
  }
}

// Cache token balance
const cacheTokenBalance = (cacheKey: string, tokenBalance: TokenBalance): void => {
  try {
    localStorage.setItem(`${CACHE_KEYS.TOKEN_BALANCES}_${cacheKey}`, JSON.stringify(tokenBalance))
    localStorage.setItem(CACHE_KEYS.TIMESTAMP, Date.now().toString())
  } catch (error) {
  }
}

// Function to get native balance (ETH/PLS/BNB) using eth_getBalance
async function getNativeBalance(address: string, chain: 'ethereum' | 'pulsechain' | 'bsc'): Promise<TokenBalance> {
  try {
    const rpcUrl = chain === 'ethereum' ? RPC_ENDPOINTS.ethereum : 
                   chain === 'pulsechain' ? RPC_ENDPOINTS.pulsechain : 
                   RPC_ENDPOINTS.bsc
    
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
      symbol: chain === 'ethereum' ? 'ETH' : chain === 'pulsechain' ? 'PLS' : 'BNB',
      name: chain === 'ethereum' ? 'Ethereum' : chain === 'pulsechain' ? 'PulseChain' : 'Binance Smart Chain',
      balance: balanceWei.toString(),
      balanceFormatted,
      decimals: 18,
      isNative: true
    }
  } catch (error) {
    return {
      address: '0x0',
      symbol: chain === 'ethereum' ? 'ETH' : chain === 'pulsechain' ? 'PLS' : 'BNB',
      name: chain === 'ethereum' ? 'Ethereum' : chain === 'pulsechain' ? 'PulseChain' : 'Binance Smart Chain',
      balance: '0',
      balanceFormatted: 0,
      decimals: 18,
      isNative: true,
      error: error.message
    }
  }
}

// Function to get token balance (ERC-20) with caching
const getTokenBalance = async (tokenAddress: string, walletAddress: string, decimals: number, symbol: string, rpcUrl: string): Promise<TokenBalance> => {
  const cacheKey = `${tokenAddress}-${walletAddress}-${symbol}`
  
  // Check localStorage cache first
  const cached = getCachedTokenBalance(cacheKey)
  if (cached) {
    return cached
  }

  
  try {
    // ERC-20 balanceOf(address) function signature
    const data = `0x70a08231000000000000000000000000${walletAddress.slice(2)}`
    
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

    const result = await response.json()
    
    if (result.error) {
      throw new Error(`RPC Error: ${result.error.message}`)
    }

    const balance = result.result || '0x0'
    const balanceFormatted = balance !== '0x0' ? 
      Number(BigInt(balance)) / Math.pow(10, decimals) : 0
    
    const tokenBalance: TokenBalance = {
      address: tokenAddress,
      symbol,
      name: symbol, // Using symbol as name for now
      balance,
      balanceFormatted,
      decimals,
      isNative: false
    }

    // Cache the result
    cacheTokenBalance(cacheKey, tokenBalance)

    return tokenBalance
  } catch (error) {
    return {
      address: tokenAddress,
      symbol,
      name: symbol,
      balance: '0x0',
      balanceFormatted: 0,
      decimals,
      isNative: false,
      error: error.message
    }
  }
}

// Function to get all balances for an address
async function getAddressBalances(address: string, chain: 'ethereum' | 'pulsechain' | 'bsc'): Promise<BalanceData> {
  try {
    
    // Get native balance
    const nativeBalance = await getNativeBalance(address, chain)

    // Get relevant tokens for the chain
    const chainId = chain === 'ethereum' ? 1 : chain === 'pulsechain' ? 369 : 56
    const relevantTokens = TOKEN_CONSTANTS.filter(token => 
      token.chain === chainId && 
      token.a !== "0x0" && // Skip native tokens
      token.a && 
      token.a.length === 42 // Valid address format
    )


    // Get token balances in batches to avoid overwhelming the RPC
    const batchSize = 10
    const tokenBalances: TokenBalance[] = []

    for (let i = 0; i < relevantTokens.length; i += batchSize) {
      const batch = relevantTokens.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async (token) => {
        const rpcUrl = chain === 'ethereum' ? RPC_ENDPOINTS.ethereum : 
                       chain === 'pulsechain' ? RPC_ENDPOINTS.pulsechain : 
                       RPC_ENDPOINTS.bsc
        const tokenBalance = await getTokenBalance(token.a, address, token.decimals, token.ticker, rpcUrl)
        // getTokenBalance now returns a complete TokenBalance object
        return tokenBalance
      })
      
      const batchResults = await Promise.all(batchPromises)
      
      // Filter out tokens with zero balance and add the ones with balance > 0
      batchResults.forEach((tokenBalance) => {
        if (tokenBalance.balanceFormatted > 0) {
          tokenBalances.push(tokenBalance)
        }
      })

      // Small delay between batches
      if (i + batchSize < relevantTokens.length) {
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    }

    // Filter out tokens with zero balance for cleaner display
    const nonZeroTokenBalances = tokenBalances.filter(token => token.balanceFormatted > 0)


    return {
      address,
      chain,
      timestamp: new Date().toISOString(),
      nativeBalance,
      tokenBalances: nonZeroTokenBalances
    }
  } catch (error) {
    return {
      address,
      chain,
      timestamp: new Date().toISOString(),
      nativeBalance: {
        address: '0x0',
        symbol: chain === 'ethereum' ? 'ETH' : chain === 'pulsechain' ? 'PLS' : 'BNB',
        name: chain === 'ethereum' ? 'Ethereum' : chain === 'pulsechain' ? 'PulseChain' : 'Binance Smart Chain',
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

// Clear old cache entries to prevent localStorage bloat
const clearOldCache = (): void => {
  try {
    if (!isCacheValid()) {
      // Clear all token balance cache entries
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith(CACHE_KEYS.TOKEN_BALANCES)) {
          localStorage.removeItem(key)
        }
      })
      localStorage.removeItem(CACHE_KEYS.TIMESTAMP)
    }
  } catch (error) {
  }
}

// Check if we have cached balance data for this address
const hasCachedBalanceData = (walletAddress: string): boolean => {
  try {
    if (!isCacheValid()) {
      clearOldCache()
      return false
    }
    
    // Check if we have at least some cached token balances for this address
    const keys = Object.keys(localStorage)
    let validTokenCount = 0
    
    keys.forEach(key => {
      if (key.startsWith(CACHE_KEYS.TOKEN_BALANCES) && key.includes(walletAddress)) {
        try {
          const cached = localStorage.getItem(key)
          if (cached) {
            const tokenBalance = JSON.parse(cached)
            if (tokenBalance.balanceFormatted > 0) {
              validTokenCount++
            }
          }
        } catch (error) {
        }
      }
    })
    
    const hasValidData = validTokenCount >= 5 // Require at least 5 tokens to consider cache valid
    
    if (hasValidData) {
    } else {
    }
    
    return hasValidData
  } catch (error) {
    return false
  }
}

export function useBridgeBalanceCheck(walletAddress: string): UseBridgeBalanceCheckResult {
  const [balances, setBalances] = useState<BalanceData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<any>(null)
  
  // Create SWR key that rotates daily at 1am UTC
  const cacheKey = walletAddress ? getDailyCacheKey(`bridge-balances-${walletAddress}`) : null
  
  // Simplified: Always let SWR handle caching, remove conditional fetching
  const { data, error: swrError, isLoading: swrLoading } = useSWR(
    cacheKey, // Always fetch when we have a wallet address
    async () => {
      // Fetch both Ethereum and BSC balances
      const [ethereumResult, bscResult] = await Promise.all([
        getAddressBalances(walletAddress, 'ethereum'),
        getAddressBalances(walletAddress, 'bsc')
      ])
      
      return [ethereumResult, bscResult]
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      refreshInterval: 0, // Only refresh when cache key rotates at 1am UTC
      dedupingInterval: 60 * 60 * 1000, // 1 hour deduping
      revalidateIfStale: true, // Allow revalidation if data is stale
      onSuccess: (data) => {
      },
      onError: (error) => {
      }
    }
  )
  
  // Simplified effect: Just use SWR data directly
  useEffect(() => {

    // Use SWR data directly - no complex cache reconstruction
    const balanceArray = data ? data : []
    setBalances(balanceArray)
    setIsLoading(swrLoading)
    setError(swrError)
    
    if (data) {
    } else if (!swrLoading) {
    }
  }, [data, swrLoading, swrError, walletAddress])
  
  return {
    balances,
    isLoading,
    error
  }
} 