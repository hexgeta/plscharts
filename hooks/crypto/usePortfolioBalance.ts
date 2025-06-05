'use client'

import { useState, useEffect } from 'react'
import { TOKEN_CONSTANTS } from '@/constants/crypto'

// RPC endpoint for PulseChain
const PULSECHAIN_RPC = 'https://rpc-pulsechain.g4mm4.io'

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
  chain: 'pulsechain'
  timestamp: string
  nativeBalance: TokenBalance
  tokenBalances: TokenBalance[]
  error?: string
}

interface UsePortfolioBalanceResult {
  balances: BalanceData[]
  isLoading: boolean
  error: any
}

// Function to get native PLS balance
async function getNativeBalance(address: string): Promise<TokenBalance> {
  try {
    const response = await fetch(PULSECHAIN_RPC, {
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
      symbol: 'PLS',
      name: 'PulseChain',
      balance: balanceWei.toString(),
      balanceFormatted,
      decimals: 18,
      isNative: true
    }
  } catch (error) {
    return {
      address: '0x0',
      symbol: 'PLS',
      name: 'PulseChain',
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
  name: string
): Promise<TokenBalance> {
  try {
    // ERC-20 balanceOf(address) function signature + padded wallet address
    const data = '0x70a08231' + walletAddress.slice(2).padStart(64, '0')
    
    const response = await fetch(PULSECHAIN_RPC, {
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
  } catch (error) {
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

// Function to get all balances for an address on PulseChain
async function getAddressBalances(address: string): Promise<BalanceData> {
  try {
    console.log(`[usePortfolioBalance] Fetching balances for ${address} on PulseChain`)
    
    // Get native PLS balance
    const nativeBalance = await getNativeBalance(address)

    // Get relevant PulseChain tokens (chain ID 369)
    const relevantTokens = TOKEN_CONSTANTS.filter(token => 
      token.chain === 369 && 
      token.a !== "0x0" && // Skip native tokens
      token.a && 
      token.a.length === 42 // Valid address format
    )

    console.log(`[usePortfolioBalance] Checking ${relevantTokens.length} PulseChain tokens for ${address}`)

    // Get token balances in batches to avoid overwhelming the RPC
    const batchSize = 10
    const tokenBalances: TokenBalance[] = []

    for (let i = 0; i < relevantTokens.length; i += batchSize) {
      const batch = relevantTokens.slice(i, i + batchSize)
      
      const batchPromises = batch.map(async (token) => {
        return getTokenBalance(address, token.a, token.decimals, token.ticker, token.name)
      })

      const batchResults = await Promise.all(batchPromises)
      
      // Only add tokens with balance > 0
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

    console.log(`[usePortfolioBalance] Found ${tokenBalances.length} tokens with balances for ${address}`)

    return {
      address,
      chain: 'pulsechain',
      timestamp: new Date().toISOString(),
      nativeBalance,
      tokenBalances
    }
  } catch (error) {
    console.error(`[usePortfolioBalance] Error fetching balances for ${address}:`, error)
    return {
      address,
      chain: 'pulsechain',
      timestamp: new Date().toISOString(),
      nativeBalance: {
        address: '0x0',
        symbol: 'PLS',
        name: 'PulseChain',
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

export function usePortfolioBalance(walletAddresses: string[]): UsePortfolioBalanceResult {
  const [balances, setBalances] = useState<BalanceData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<any>(null)
  
  useEffect(() => {
    // Ensure walletAddresses is an array and has length
    if (!Array.isArray(walletAddresses) || walletAddresses.length === 0) {
      setBalances([])
      setIsLoading(false)
      setError(null)
      return
    }

    const fetchAllBalances = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        console.log(`[usePortfolioBalance] Fetching balances for ${walletAddresses.length} addresses`)
        
        // Fetch balances for all addresses in parallel
        const balancePromises = walletAddresses.map(address => getAddressBalances(address))
        const allBalanceData = await Promise.all(balancePromises)
        
        // Filter out any failed requests
        const validBalances = allBalanceData.filter(data => !data.error)
        
        console.log(`[usePortfolioBalance] Successfully fetched balances for ${validBalances.length}/${walletAddresses.length} addresses`)
        
        setBalances(validBalances)
        
        // If some addresses failed, set a warning error
        if (validBalances.length < walletAddresses.length) {
          const failedAddresses = allBalanceData.filter(data => data.error)
          setError(`Failed to fetch balances for ${failedAddresses.length} address(es)`)
        }
      } catch (err) {
        console.error('[usePortfolioBalance] Error fetching balances:', err)
        setError(err)
        setBalances([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchAllBalances()
  }, [JSON.stringify(walletAddresses)]) // Use JSON.stringify to compare array contents
  
  return {
    balances,
    isLoading,
    error
  }
} 