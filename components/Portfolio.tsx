'use client'

import { useState, useCallback } from 'react'
import { CoinLogo } from '@/components/ui/CoinLogo'
import { TOKEN_CONSTANTS } from '@/constants/crypto'

// RPC endpoints from the existing cron job
const RPC_ENDPOINTS = {
  pulsechain: 'https://rpc-pulsechain.g4mm4.io',
  ethereum: 'https://rpc-ethereum.g4mm4.io'
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
  chain: 'ethereum' | 'pulsechain'
  timestamp: string
  nativeBalance: TokenBalance
  tokenBalances: TokenBalance[]
  error?: string
}

interface AddressInput {
  address: string
  chain: 'ethereum' | 'pulsechain'
}

export default function Portfolio() {
  const [addresses, setAddresses] = useState<AddressInput[]>([
    { address: '', chain: 'ethereum' }
  ])
  const [balances, setBalances] = useState<BalanceData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  // Function to validate Ethereum address
  const isValidAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  }

  // Handle checking balances
  const handleCheckBalances = useCallback(async () => {
    setError(null)
    setLoading(true)

    try {
      // Validate all addresses
      const validAddresses = addresses.filter(item => 
        item.address.trim() && isValidAddress(item.address.trim())
      )

      if (validAddresses.length === 0) {
        throw new Error('Please enter at least one valid Ethereum address')
      }

      // Fetch balances for all valid addresses
      const balancePromises = validAddresses.map(item =>
        getAddressBalances(item.address.trim(), item.chain)
      )

      const results = await Promise.all(balancePromises)
      setBalances(results)

    } catch (err) {
      setError(err.message)
      console.error('Error checking balances:', err)
    } finally {
      setLoading(false)
    }
  }, [addresses])

  // Add new address input
  const addAddressInput = () => {
    setAddresses([...addresses, { address: '', chain: 'ethereum' }])
  }

  // Remove address input
  const removeAddressInput = (index: number) => {
    if (addresses.length > 1) {
      setAddresses(addresses.filter((_, i) => i !== index))
    }
  }

  // Update address input
  const updateAddress = (index: number, field: keyof AddressInput, value: string) => {
    const updated = [...addresses]
    updated[index] = { ...updated[index], [field]: value }
    setAddresses(updated)
  }

  // Format balance for display
  const formatBalance = (balance: number): string => {
    if (balance === 0) return '0'
    if (balance < 0.0001) return balance.toFixed(8)
    if (balance < 1) return balance.toFixed(6)
    if (balance < 1000) return balance.toFixed(4)
    return balance.toLocaleString('en-US', { maximumFractionDigits: 2 })
  }

  // Format address for display
  const formatAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <div className="space-y-6">
      {/* Address Input Section */}
      <div className="bg-black border-2 border-white/10 rounded-2xl p-6">
        <h2 className="text-xl font-bold mb-4">Enter Addresses to Check</h2>
        
        <div className="space-y-4">
          {addresses.map((item, index) => (
            <div key={index} className="flex gap-4 items-center">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="0x..."
                  value={item.address}
                  onChange={(e) => updateAddress(index, 'address', e.target.value)}
                  className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>
              
              <select
                value={item.chain}
                onChange={(e) => updateAddress(index, 'chain', e.target.value as 'ethereum' | 'pulsechain')}
                className="px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
              >
                <option value="ethereum">Ethereum</option>
                <option value="pulsechain">PulseChain</option>
              </select>

              {addresses.length > 1 && (
                <button
                  onClick={() => removeAddressInput(index)}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-4 mt-4">
          <button
            onClick={addAddressInput}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white transition-colors"
          >
            Add Address
          </button>
          
          <button
            onClick={handleCheckBalances}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 rounded-lg text-white transition-colors"
          >
            {loading ? 'Checking...' : 'Check All Balances'}
          </button>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
            {error}
          </div>
        )}
      </div>

      {/* Results Section */}
      {balances.length > 0 && (
        <div className="space-y-6">
          {balances.map((addressData, addressIndex) => (
            <div key={addressIndex} className="bg-black border-2 border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">
                  {formatAddress(addressData.address)} on {addressData.chain}
                </h2>
                <div className="flex items-center space-x-2">
                  <CoinLogo
                    symbol={addressData.chain === 'ethereum' ? 'ETH' : 'PLS'}
                    size="sm"
                    className="rounded-none"
                    variant="default"
                  />
                  <span className="capitalize text-gray-400">
                    {addressData.chain}
                  </span>
                </div>
              </div>

              {addressData.error && (
                <div className="mb-4 p-4 bg-red-900/50 border border-red-500 rounded-lg text-red-200">
                  Error: {addressData.error}
                </div>
              )}

              {/* Native Balance */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-gray-300">Native Balance</h3>
                <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <CoinLogo
                        symbol={addressData.nativeBalance.symbol}
                        size="md"
                        className="rounded-none"
                        variant="default"
                      />
                      <div>
                        <div className="text-white font-medium">{addressData.nativeBalance.symbol}</div>
                        <div className="text-gray-400 text-sm">{addressData.nativeBalance.name}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-white font-medium">
                        {formatBalance(addressData.nativeBalance.balanceFormatted)}
                      </div>
                      {addressData.nativeBalance.error && (
                        <div className="text-red-400 text-sm">Error</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Token Balances */}
              {addressData.tokenBalances.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 text-gray-300">
                    ERC-20 Tokens ({addressData.tokenBalances.length} found)
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-700">
                          <th className="text-left py-3 px-4 text-gray-400">Token</th>
                          <th className="text-right py-3 px-4 text-gray-400">Balance</th>
                          <th className="text-right py-3 px-4 text-gray-400">Contract</th>
                        </tr>
                      </thead>
                      <tbody>
                        {addressData.tokenBalances
                          .sort((a, b) => b.balanceFormatted - a.balanceFormatted) // Sort by balance descending
                          .map((token, tokenIndex) => (
                          <tr key={tokenIndex} className="border-b border-gray-800 hover:bg-gray-900/50">
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-3">
                                <CoinLogo
                                  symbol={token.symbol}
                                  size="sm"
                                  className="rounded-none"
                                  variant="default"
                                />
                                <div>
                                  <div className="text-white font-medium">{token.symbol}</div>
                                  <div className="text-gray-400 text-sm">{token.name}</div>
                                </div>
                              </div>
                            </td>
                            
                            <td className="py-3 px-4 text-right">
                              <div className="text-white font-medium">
                                {formatBalance(token.balanceFormatted)}
                              </div>
                              <div className="text-xs text-gray-400">
                                {token.symbol}
                              </div>
                            </td>
                            
                            <td className="py-3 px-4 text-right">
                              <div className="font-mono text-gray-400 text-sm">
                                {formatAddress(token.address)}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {addressData.tokenBalances.length === 0 && !addressData.error && (
                <div className="text-center py-8 text-gray-400">
                  No ERC-20 tokens found with balance &gt; 0
                </div>
              )}

              <div className="mt-4 text-xs text-gray-500">
                Last updated: {new Date(addressData.timestamp).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Info Section */}
      <div className="bg-gray-900/50 border border-gray-700 rounded-2xl p-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-300">How it works</h3>
        <ul className="space-y-2 text-gray-400 text-sm">
          <li>• Enter one or more Ethereum addresses (0x...)</li>
          <li>• Select the chain (Ethereum or PulseChain)</li>
          <li>• Click "Check All Balances" to fetch native and ERC-20 token balances</li>
          <li>• Uses Gamma RPC API for real-time balance data</li>
          <li>• Shows native balance (ETH/PLS) and all ERC-20 tokens with balance &gt; 0</li>
          <li>• Checks {TOKEN_CONSTANTS.filter(t => t.chain === 1 && t.a !== "0x0").length} Ethereum tokens and {TOKEN_CONSTANTS.filter(t => t.chain === 369 && t.a !== "0x0").length} PulseChain tokens</li>
        </ul>
      </div>
    </div>
  )
} 