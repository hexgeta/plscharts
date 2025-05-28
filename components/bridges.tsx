'use client'

import { useState, useCallback, useEffect } from 'react'
import { CoinLogo } from '@/components/ui/CoinLogo'
import { TOKEN_CONSTANTS } from '@/constants/crypto'
import { useTokenPrices } from '@/hooks/crypto/useTokenPrices'

// RPC endpoints from the existing cron job
const RPC_ENDPOINTS = {
  pulsechain: 'https://rpc-pulsechain.g4mm4.io',
  ethereum: 'https://rpc-ethereum.g4mm4.io'
}

// Hardcoded address to check
const HARDCODED_ADDRESS = '0x1715a3e4a142d8b698131108995174f37aeba10d'

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
  chain: 'ethereum' | 'pulsechain'
  timestamp: string
  nativeBalance: TokenBalance
  tokenBalances: TokenBalance[]
  error?: string
}

export default function Bridge() {
  const [balances, setBalances] = useState<BalanceData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cstSupplyPulseChain, setCstSupplyPulseChain] = useState<number | null>(null)
  const [cstSupplyLoading, setCstSupplyLoading] = useState(false)
  const [cstSupplyError, setCstSupplyError] = useState<string | null>(null)

  // Priority tokens to display
  const MAIN_TOKENS = ['DAI', 'eHEX', 'WETH', 'USDC', 'CST', 'USDT', 'WBTC']
  const MAXIMUS_TOKENS = ['eMAXI', 'eDECI', 'eLUCKY', 'eTRIO', 'eBASE']

  // Get all unique token tickers from balances for price fetching, but prioritize our list
  const allTokenTickers = balances.flatMap(addressData => 
    addressData.tokenBalances.map(token => {
      // Add "w" prefix for Maximus tokens when fetching prices
      if (MAXIMUS_TOKENS.includes(token.symbol)) {
        return `w${token.symbol}`
      }
      return token.symbol
    })
  ).filter((ticker, index, array) => array.indexOf(ticker) === index) // Remove duplicates

  // Add CST to price fetching if not already included
  const allTokenTickersWithCST = [...new Set([...allTokenTickers, 'CST'])]

  // Fetch prices for all tokens with balances plus CST
  const { prices, isLoading: pricesLoading } = useTokenPrices(allTokenTickersWithCST)

  // Get main tokens with balances from Ethereum chain
  const mainTokensWithBalances = balances.flatMap(addressData => 
    addressData.tokenBalances.filter(token => 
      MAIN_TOKENS.includes(token.symbol)
    ).map(token => ({
      ...token,
      chain: addressData.chain
    }))
  )

  // Add CST entry even if no balance (for supply display)
  const mainTokensWithCST = [
    ...mainTokensWithBalances,
    // Add CST entry if not already present
    ...(mainTokensWithBalances.find(token => token.symbol === 'CST') ? [] : [{
      address: '0x0', // Placeholder address
      symbol: 'CST',
      name: 'Cryptoshares',
      balance: '0',
      balanceFormatted: 0,
      decimals: 18,
      isNative: false,
      chain: 'ethereum' as const
    }])
  ]

  // Get Maximus tokens with balances from Ethereum chain
  const maximusTokensWithBalances = balances.flatMap(addressData => 
    addressData.tokenBalances.filter(token => 
      MAXIMUS_TOKENS.includes(token.symbol)
    ).map(token => ({
      ...token,
      chain: addressData.chain
    }))
  )

  // Calculate total USD value from ALL tokens with balances (not just displayed ones) + CST supply value
  const allTokensValue = balances.flatMap(addressData => 
    addressData.tokenBalances.map(token => {
      let tokenPrice = 0
      
      // Use $1 for stablecoins
      if (token.symbol === 'DAI' || token.symbol === 'USDC' || token.symbol === 'USDT') {
        tokenPrice = 1
      }
      // Use "w" prefix for Maximus tokens
      else if (MAXIMUS_TOKENS.includes(token.symbol)) {
        const priceTicker = `w${token.symbol}`
        tokenPrice = prices[priceTicker]?.price || 0
      }
      // Use regular ticker for other tokens
      else {
        tokenPrice = prices[token.symbol]?.price || 0
      }
      
      return token.balanceFormatted * tokenPrice
    })
  ).reduce((total, value) => total + value, 0)

  // Add CST value to total (CST supply × $1)
  const cstValue = cstSupplyPulseChain ? cstSupplyPulseChain * 1 : 0
  const totalUsdValue = allTokensValue + cstValue

  // Function to get native balance (ETH/PLS) using eth_getBalance
  const getNativeBalance = async (address: string, chain: 'ethereum' | 'pulsechain'): Promise<TokenBalance> => {
    try {
      const rpcUrl = chain === 'ethereum' ? RPC_ENDPOINTS.ethereum : RPC_ENDPOINTS.pulsechain
      
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
        symbol: chain === 'ethereum' ? 'ETH' : 'PLS',
        name: chain === 'ethereum' ? 'Ethereum' : 'PulseChain',
        balance: balanceWei.toString(),
        balanceFormatted,
        decimals: 18,
        isNative: true
      }
    } catch (error) {
      return {
        address: '0x0',
        symbol: chain === 'ethereum' ? 'ETH' : 'PLS',
        name: chain === 'ethereum' ? 'Ethereum' : 'PulseChain',
        balance: '0',
        balanceFormatted: 0,
        decimals: 18,
        isNative: true,
        error: error.message
      }
    }
  }

  // Function to get ERC-20 token balance using eth_call
  const getTokenBalance = async (
    walletAddress: string, 
    tokenAddress: string, 
    chain: 'ethereum' | 'pulsechain'
  ): Promise<string> => {
    try {
      const rpcUrl = chain === 'ethereum' ? RPC_ENDPOINTS.ethereum : RPC_ENDPOINTS.pulsechain
      
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
      if (!hexBalance || hexBalance === '0x') {
        return '0'
      }

      return BigInt(hexBalance).toString()
    } catch (error) {
      console.error(`Error fetching token balance for ${tokenAddress}:`, error)
      return '0'
    }
  }

  // Function to get all balances for an address
  const getAddressBalances = async (address: string, chain: 'ethereum' | 'pulsechain'): Promise<BalanceData> => {
    try {
      // Get native balance
      const nativeBalance = await getNativeBalance(address, chain)

      // Get relevant tokens for the chain
      const chainId = chain === 'ethereum' ? 1 : 369
      const relevantTokens = TOKEN_CONSTANTS.filter(token => 
        token.chain === chainId && 
        token.a !== "0x0" && // Skip native tokens
        token.a && 
        token.a.length === 42 // Valid address format
      )

      console.log(`Checking ${relevantTokens.length} tokens for ${address} on ${chain}`)

      // Get token balances in batches to avoid overwhelming the RPC
      const batchSize = 10
      const tokenBalances: TokenBalance[] = []

      for (let i = 0; i < relevantTokens.length; i += batchSize) {
        const batch = relevantTokens.slice(i, i + batchSize)
        
        const batchPromises = batch.map(async (token) => {
          const balance = await getTokenBalance(address, token.a, chain)
          const balanceFormatted = balance !== '0' ? Number(balance) / Math.pow(10, token.decimals) : 0

          return {
            address: token.a,
            symbol: token.ticker,
            name: token.name,
            balance,
            balanceFormatted,
            decimals: token.decimals,
            isNative: false
          }
        })

        const batchResults = await Promise.all(batchPromises)
        tokenBalances.push(...batchResults)

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
      console.error(`Error fetching balances for ${address} on ${chain}:`, error)
      return {
        address,
        chain,
        timestamp: new Date().toISOString(),
        nativeBalance: {
          address: '0x0',
          symbol: chain === 'ethereum' ? 'ETH' : 'PLS',
          name: chain === 'ethereum' ? 'Ethereum' : 'PulseChain',
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

  // Load balances on component mount
  useEffect(() => {
    const loadBalances = async () => {
      setError(null)
      setLoading(true)

      try {
        // Fetch balances only for Ethereum chain
        const ethereumBalances = await getAddressBalances(HARDCODED_ADDRESS, 'ethereum')
        setBalances([ethereumBalances])
        
        // Also fetch CST supply on PulseChain
        await getCstSupplyPulseChain()
      } catch (err) {
        setError(err.message)
        console.error('Error loading balances:', err)
      } finally {
        setLoading(false)
      }
    }

    loadBalances()
  }, [])

  // Format balance for display
  const formatBalance = (balance: number): string => {
    if (balance === 0) return '0'
    return Math.floor(balance).toLocaleString('en-US')
  }

  // Format supply for display
  const formatSupply = (supply: number): string => {
    if (supply === 0) return '0'
    
    if (supply >= 1e15) {
      const rounded = Math.round(supply / 1e15)
      return rounded >= 10 ? rounded + 'Q' : (supply / 1e15).toFixed(1) + 'Q'
    }
    if (supply >= 1e12) {
      const rounded = Math.round(supply / 1e12)
      return rounded >= 10 ? rounded + 'T' : (supply / 1e12).toFixed(1) + 'T'
    }
    if (supply >= 1e9) {
      const rounded = Math.round(supply / 1e9)
      return rounded >= 10 ? rounded + 'B' : (supply / 1e9).toFixed(1) + 'B'
    }
    return Math.round(supply).toLocaleString('en-US')
  }

  // Format address for display
  const formatAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  // Function to get CST total supply on PulseChain
  const getCstSupplyPulseChain = async (): Promise<void> => {
    setCstSupplyLoading(true)
    setCstSupplyError(null)
    
    try {
      // Find CST token address on PulseChain (chain 369)
      const cstToken = TOKEN_CONSTANTS.find(token => 
        token.ticker === 'CST' && token.chain === 369
      )
      
      if (!cstToken || !cstToken.a) {
        throw new Error('CST token not found on PulseChain')
      }

      // ERC-20 totalSupply() function signature
      const data = '0x18160ddd'
      
      const response = await fetch(RPC_ENDPOINTS.pulsechain, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_call',
          params: [
            {
              to: cstToken.a,
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

      const hexValue = result.result
      if (!hexValue || hexValue === '0x') {
        setCstSupplyPulseChain(0)
        return
      }

      // Convert hex to BigInt then to formatted number
      const supplyBigInt = BigInt(hexValue)
      const divisor = BigInt(10 ** cstToken.decimals)
      const formattedSupply = Number(supplyBigInt) / Number(divisor)
      
      setCstSupplyPulseChain(formattedSupply)
      console.log(`CST PulseChain Supply: ${formattedSupply.toLocaleString()}`)
      
    } catch (error) {
      console.error('Error fetching CST supply on PulseChain:', error)
      setCstSupplyError(error.message)
      setCstSupplyPulseChain(null)
    } finally {
      setCstSupplyLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-black border-2 border-white/10 rounded-2xl p-6 text-center">
          <div className="text-xl font-bold mb-4">Loading Holdings...</div>
          <div className="text-gray-400">Fetching balances for {formatAddress(HARDCODED_ADDRESS)}</div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-black border-2 border-white/10 rounded-2xl p-6">
          <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
            Error: {error}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 flex flex-col items-center">
      {/* Total Value */}
      <div className="bg-black border-2 border-white/10 rounded-2xl p-6 text-center max-w-[460px] w-full">
        <h2 className="text-2xl font-bold mb-2">Total Bridged Value</h2>
        <div className="text-3xl font-bold text-green-400">
          ${formatBalance(totalUsdValue)}
        </div>
      </div>

      {/* Main Tokens Table */}
      {mainTokensWithCST.length > 0 && (
        <div className="bg-black border-2 border-white/10 rounded-2xl p-6 max-w-[460px] w-full">
          <div className="space-y-3">
            {mainTokensWithCST
              .sort((a, b) => {
                const aPrice = (a.symbol === 'DAI' || a.symbol === 'USDC' || a.symbol === 'USDT') ? 1 : 
                             (a.symbol === 'CST') ? 1 : 
                             (prices[a.symbol]?.price || 0)
                const bPrice = (b.symbol === 'DAI' || b.symbol === 'USDC' || b.symbol === 'USDT') ? 1 : 
                             (b.symbol === 'CST') ? 1 : 
                             (prices[b.symbol]?.price || 0)
                const aValue = a.symbol === 'CST' ? 
                             (cstSupplyPulseChain ? cstSupplyPulseChain * 1 : 0) : 
                             (a.balanceFormatted * aPrice)
                const bValue = b.symbol === 'CST' ? 
                             (cstSupplyPulseChain ? cstSupplyPulseChain * 1 : 0) : 
                             (b.balanceFormatted * bPrice)
                return bValue - aValue // Sort by USD value descending
              })
              .map((token, tokenIndex) => {
                const tokenPrice = (token.symbol === 'DAI' || token.symbol === 'USDC' || token.symbol === 'USDT') ? 1 : 
                                 (token.symbol === 'CST') ? 1 : 
                                 (prices[token.symbol]?.price || 0)
                const usdValue = token.symbol === 'CST' ? 
                               (cstSupplyPulseChain ? cstSupplyPulseChain * 1 : 0) : 
                               (token.balanceFormatted * tokenPrice)
                
                const displayAmount = token.symbol === 'CST' ? (
                  cstSupplyLoading ? 'Loading...' : 
                  cstSupplyError ? 'Error' : 
                  cstSupplyPulseChain ? formatSupply(cstSupplyPulseChain) : 'N/A'
                ) : (
                  formatBalance(token.balanceFormatted)
                )
                
                return (
                <div key={`${token.chain}-${token.symbol}-${tokenIndex}`} className="flex items-center justify-between py-2">
                  <div className="flex items-center space-x-3">
                    <CoinLogo
                      symbol={token.symbol}
                      size="sm"
                      className="rounded-none"
                      variant="default"
                    />
                    <span className="text-white font-medium text-lg">
                      {displayAmount} {token.symbol}
                    </span>
                  </div>
                  <span className="text-white font-medium text-lg">
                    ${formatBalance(usdValue)}
                  </span>
                </div>
              )})}
          </div>
        </div>
      )}

      {mainTokensWithCST.length === 0 && !loading && (
        <div className="bg-black border-2 border-white/10 rounded-2xl p-6 text-center max-w-[460px] w-full">
          <div className="text-gray-400">
            No main tokens found with balance &gt; 0
          </div>
        </div>
      )}

      {/* Maximus Tokens Table */}
      {maximusTokensWithBalances.length > 0 && (
        <div className="bg-black border-2 border-white/10 rounded-2xl p-6 max-w-[460px] w-full">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-2 px-4 text-gray-400 text-sm">Token</th>
                  <th className="text-right py-2 px-4 text-gray-400 text-sm">Balance</th>
                  <th className="text-right py-2 px-4 text-gray-400 text-sm">Value</th>
                </tr>
              </thead>
              <tbody>
                {maximusTokensWithBalances
                  .sort((a, b) => {
                    const aPriceTicker = `w${a.symbol}`
                    const bPriceTicker = `w${b.symbol}`
                    const aPrice = prices[aPriceTicker]?.price || 0
                    const bPrice = prices[bPriceTicker]?.price || 0
                    const aValue = a.balanceFormatted * aPrice
                    const bValue = b.balanceFormatted * bPrice
                    return bValue - aValue // Sort by USD value descending
                  })
                  .map((token, tokenIndex) => {
                    const priceTicker = `w${token.symbol}`
                    const tokenPrice = prices[priceTicker]?.price || 0
                    const usdValue = token.balanceFormatted * tokenPrice
                    
                    return (
                    <tr key={`${token.chain}-${token.symbol}-${tokenIndex}`} className="hover:bg-gray-900/50">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <CoinLogo
                            symbol={token.symbol}
                            size="sm"
                            className="rounded-none"
                            variant="default"
                          />
                          <span className="text-white font-medium">{token.symbol}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-white font-medium">
                          {formatBalance(token.balanceFormatted)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-white font-medium">
                          ${formatBalance(usdValue)}
                        </span>
                      </td>
                    </tr>
                  )})}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {maximusTokensWithBalances.length === 0 && !loading && (
        <div className="bg-black border-2 border-white/10 rounded-2xl p-6 text-center max-w-[460px] w-full">
          <div className="text-gray-400">
            No Maximus tokens found with balance &gt; 0
          </div>
        </div>
      )}
    </div>
  )
} 
