'use client'

import { useState, useEffect } from 'react'

interface CustomTokenData {
  totalSupply: number | null
  price: number | null
  decimals: number | null
  name: string | null
  symbol: string | null
}

interface UseCustomTokenDataResult {
  data: CustomTokenData | null
  loading: boolean
  error: string | null
}

// RPC endpoints
const RPC_ENDPOINTS = {
  ethereum: 'https://rpc-ethereum.g4mm4.io',
  pulsechain: 'https://rpc-pulsechain.g4mm4.io'
}

// ERC-20 function signatures
const ERC20_FUNCTIONS = {
  totalSupply: '0x18160ddd',
  decimals: '0x313ce567',
  name: '0x06fdde03',
  symbol: '0x95d89b41'
}

export function useCustomTokenData(
  contractAddress: string,
  chain: 'ethereum' | 'pulsechain'
): UseCustomTokenDataResult {
  const [data, setData] = useState<CustomTokenData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!contractAddress || contractAddress.length !== 42) {
      setData(null)
      setLoading(false)
      setError(null)
      return
    }

    const fetchTokenData = async () => {
      setLoading(true)
      setError(null)

      try {
        const rpcUrl = RPC_ENDPOINTS[chain]
        
        // Fetch basic token data and price data in parallel
        const [
          totalSupplyResult, 
          decimalsResult, 
          nameResult, 
          symbolResult,
          dexScreenerPrice
        ] = await Promise.all([
          makeRpcCall(rpcUrl, contractAddress, ERC20_FUNCTIONS.totalSupply),
          makeRpcCall(rpcUrl, contractAddress, ERC20_FUNCTIONS.decimals),
          makeRpcCall(rpcUrl, contractAddress, ERC20_FUNCTIONS.name),
          makeRpcCall(rpcUrl, contractAddress, ERC20_FUNCTIONS.symbol),
          fetchDexScreenerPrice(contractAddress, chain)
        ])

        // Parse results
        const decimals = decimalsResult ? parseInt(decimalsResult, 16) : 18
        const rawSupply = totalSupplyResult ? BigInt(totalSupplyResult) : BigInt(0)
        const totalSupply = Number(rawSupply) / Math.pow(10, decimals)
        
        // Decode name and symbol (they're hex-encoded strings)
        const name = nameResult ? hexToString(nameResult) : null
        const symbol = symbolResult ? hexToString(symbolResult) : null

        console.log(`Fetching data for ${contractAddress} on ${chain}`)
        
        setData({
          totalSupply,
          price: dexScreenerPrice,
          decimals,
          name,
          symbol
        })
        
        console.log(`Token data fetched:`, {
          symbol,
          name,
          totalSupply,
          price: dexScreenerPrice,
          decimals
        })
      } catch (err) {
        console.error('Error fetching custom token data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch token data')
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchTokenData()
  }, [contractAddress, chain])

  return { data, loading, error }
}

// Helper function to make RPC calls
async function makeRpcCall(rpcUrl: string, contractAddress: string, functionSig: string): Promise<string | null> {
  try {
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
            to: contractAddress,
            data: functionSig
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

    return result.result
  } catch (error) {
    console.error('RPC call failed:', error)
    return null
  }
}

// Helper function to decode hex-encoded strings
function hexToString(hex: string): string | null {
  try {
    if (!hex || hex === '0x') return null
    
    // Remove 0x prefix
    const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex
    
    // Convert hex to bytes
    const bytes: number[] = []
    for (let i = 0; i < cleanHex.length; i += 2) {
      bytes.push(parseInt(cleanHex.substr(i, 2), 16))
    }
    
    // Find the actual string length (before null bytes)
    let actualLength = bytes.length
    for (let i = bytes.length - 1; i >= 0; i--) {
      if (bytes[i] === 0) {
        actualLength = i
      } else {
        break
      }
    }
    
    // Convert to string
    const decoder = new TextDecoder('utf-8')
    const uint8Array = new Uint8Array(bytes.slice(0, actualLength))
    return decoder.decode(uint8Array)
  } catch (error) {
    console.error('Error decoding hex string:', error)
    return null
  }
}

// Helper function to fetch price data from DexScreener
async function fetchDexScreenerPrice(contractAddress: string, chain: 'ethereum' | 'pulsechain'): Promise<number | null> {
  try {
    // DexScreener API endpoint for token data
    const response = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${contractAddress}`)
    
    if (!response.ok) {
      console.warn(`DexScreener API error: ${response.status}`)
      return null
    }

    const data = await response.json()
    
    if (!data.pairs || data.pairs.length === 0) {
      console.warn('No trading pairs found on DexScreener')
      return null
    }

    // Filter pairs by chain and find the one with highest liquidity
    const chainName = chain === 'ethereum' ? 'ethereum' : 'pulsechain'
    const chainPairs = data.pairs.filter((pair: any) => 
      pair.chainId === chainName || pair.chainId === chain
    )

    if (chainPairs.length === 0) {
      console.warn(`No pairs found for chain: ${chain}`)
      return null
    }

    // Sort by liquidity (USD) descending and take the highest
    const bestPair = chainPairs.sort((a: any, b: any) => {
      const liquidityA = parseFloat(a.liquidity?.usd || '0')
      const liquidityB = parseFloat(b.liquidity?.usd || '0')
      return liquidityB - liquidityA
    })[0]

    const price = parseFloat(bestPair.priceUsd)
    
    console.log(`DexScreener price for ${contractAddress} on ${chain}:`, price)
    return isNaN(price) ? null : price

  } catch (error) {
    console.error('Error fetching DexScreener price:', error)
    return null
  }
} 