'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { useHexStakes } from '@/hooks/crypto/useHexStakes'
import { Icons } from '@/components/ui/icons'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { motion, AnimatePresence } from 'framer-motion'
import { useWallet } from '@/components/WalletModule'

// Add type for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      networkVersion: string;
    };
  }
}

// HEX contract addresses
const HEX_ADDRESSES: Record<number, `0x${string}`> = {
  1: '0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39', // Ethereum HEX
  369: '0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39', // PulseChain HEX
}

// HEX contract ABI for stake ending
const hexAbi = [
  {
    "inputs": [
      { "name": "stakeIndex", "type": "uint256" },
      { "name": "stakeIdParam", "type": "uint40" }
    ],
    "name": "stakeEnd",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "staker", "type": "address" },
      { "name": "stakeIndex", "type": "uint256" }
    ],
    "name": "stakeLists",
    "outputs": [
      { "name": "stakeId", "type": "uint40" },
      { "name": "stakedHearts", "type": "uint72" },
      { "name": "stakeShares", "type": "uint72" },
      { "name": "lockedDay", "type": "uint16" },
      { "name": "stakedDays", "type": "uint16" },
      { "name": "unlockedDay", "type": "uint16" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "currentDay",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const

// Warning popup type
type WarningPopup = {
  show: boolean;
  stakeId: string;
  stakeIndex: number;
  chain: 'ETH' | 'PLS';
}

interface ScannedAddress {
  address: string
  label: string
  id: string
}

export default function HexStakesViewer() {
  const [addressInput, setAddressInput] = useState('')
  const [addresses, setAddresses] = useState<ScannedAddress[]>([])
  const [error, setError] = useState<string | null>(null)
  const [warningPopup, setWarningPopup] = useState<WarningPopup>({ 
    show: false, 
    stakeId: '', 
    stakeIndex: 0, 
    chain: 'ETH' 
  })
  const [endingStake, setEndingStake] = useState<{stakeId: string, stakeIndex: number, chain: 'ETH' | 'PLS'} | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  // Use optional wallet module
  const { address: connectedAddress, isConnected: isWalletConnected, disconnect, connect } = useWallet()

  // Get address strings for balance fetching
  const addressStrings = useMemo(() => {
    return addresses.map(addr => addr.address)
  }, [addresses])

  // Fetch HEX stakes data
  const { stakes: hexStakes, isLoading: hexStakesLoading, error: hexStakesError, hasStakes } = useHexStakes(addressStrings)

  // Validate Ethereum address format
  const isValidAddress = (address: string): boolean => {
    return /^0x[a-fA-F0-9]{40}$/.test(address)
  }

  // Parse multiple addresses from various formats
  const parseAddresses = (text: string) => {
    const cleaned = text.trim()
    if (!cleaned) return { valid: [], invalid: [] }

    const potentialAddresses = cleaned
      .split(/[\n\r,;|\s\t]+/)
      .map(addr => addr.trim())
      .filter(addr => addr.length > 0)

    const valid: string[] = []
    const invalid: string[] = []

    potentialAddresses.forEach(addr => {
      const cleanAddr = addr.replace(/[^0-9a-fA-Fx]/g, '')
      
      if (isValidAddress(cleanAddr)) {
        if (!valid.includes(cleanAddr)) {
          valid.push(cleanAddr)
        }
      } else if (addr.length > 0) {
        invalid.push(addr)
      }
    })

    return { valid, invalid }
  }

  // Auto-process addresses when input changes
  useEffect(() => {
    const { valid, invalid } = parseAddresses(addressInput)
    
    if (valid.length === 0) {
      if (addressInput.trim() && invalid.length > 0) {
        setError('No valid addresses found')
      } else {
        setError(null)
      }
      setAddresses([])
      return
    }

    // Create address objects
    const newAddresses: ScannedAddress[] = valid.map((addr, index) => ({
      address: addr,
      label: `Address ${index + 1}`,
      id: `${Date.now()}-${index}`
    }))

    setAddresses(newAddresses)
    
    // Show warning about invalid addresses if any
    if (invalid.length > 0) {
      setError(`Processing ${valid.length} valid address${valid.length > 1 ? 'es' : ''}, skipped ${invalid.length} invalid`)
      setTimeout(() => setError(null), 4000)
    } else {
      setError(null)
    }
  }, [addressInput])

  // Handle wallet connection
  const handleConnectWallet = async () => {
    try {
      setError(null)
      if (!connect) {
        setError('Wallet connection not available. Please refresh the page and try again.')
        return
      }
      
      await connect()
      // The address will be auto-populated via useEffect when wallet connects
      
    } catch (err: any) {
      console.error('Wallet connection error:', err)
      if (err.code === 4001) {
        setError('Wallet connection was rejected by user')
      } else if (err.code === -32002) {
        setError('Wallet connection request is already pending. Please check your wallet.')
      } else {
        setError(`Failed to connect wallet: ${err.message || 'Unknown error'}`)
      }
    }
  }

  // Handle stake ending
  const handleEndStake = async (stakeId: string, stakeIndex: number, chain: 'ETH' | 'PLS') => {
    try {
      if (!isWalletConnected || !connectedAddress) {
        setError('Please connect your wallet to end stakes')
        return
      }

      console.log('Starting stake end process:', { stakeId, stakeIndex, chain, connectedAddress })
      setEndingStake({ stakeId, stakeIndex, chain })
      
      // Get chain ID for the network
      const chainId = chain === 'ETH' ? 1 : 369
      const hexAddress = HEX_ADDRESSES[chainId]
      
      if (!hexAddress) {
        setError('HEX contract not available for this network')
        setEndingStake(null)
        return
      }

      console.log('Using HEX contract address:', hexAddress)

      // Check if we're on the correct network
      if (typeof window !== 'undefined' && window.ethereum) {
        const currentChainId = await window.ethereum.request({ method: 'eth_chainId' })
        const currentChainIdNumber = parseInt(currentChainId, 16)
        
        console.log('Current chain ID:', currentChainIdNumber, 'Expected:', chainId)
        
        if (currentChainIdNumber !== chainId) {
          // Try to switch networks automatically
          try {
            if (chainId === 369) {
              // Switch to PulseChain
              await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x171' }], // 369 in hex
              })
            } else {
              // Switch to Ethereum
              await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x1' }], // 1 in hex
              })
            }
            // If successful, continue with the transaction
            console.log('Network switched successfully')
          } catch (switchError: any) {
            if (switchError.code === 4902) {
              // Network not added, try to add it
              if (chainId === 369) {
                try {
                  await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [{
                      chainId: '0x171',
                      chainName: 'PulseChain',
                      rpcUrls: ['https://rpc.pulsechain.com'],
                      nativeCurrency: {
                        name: 'PLS',
                        symbol: 'PLS',
                        decimals: 18,
                      },
                      blockExplorerUrls: ['https://scan.pulsechain.com'],
                    }],
                  })
                  console.log('PulseChain network added successfully')
                } catch (addError) {
                  setError('Failed to add PulseChain network. Please add it manually.')
                  setEndingStake(null)
                  return
                }
              }
            } else {
              setError(`Please switch to ${chain === 'ETH' ? 'Ethereum' : 'PulseChain'} to end this stake`)
              setEndingStake(null)
              return
            }
          }
        }

        // Encode the transaction data properly
        // stakeEnd function signature: stakeEnd(uint256,uint40)
        // Function selector: 0xcd1de2b2 (first 4 bytes of keccak256("stakeEnd(uint256,uint40)"))
        const stakeIndexHex = stakeIndex.toString(16).padStart(64, '0')
        const stakeIdHex = parseInt(stakeId).toString(16).padStart(64, '0')
        const txData = `0xcd1de2b2${stakeIndexHex}${stakeIdHex}`
        
        console.log('🔄 STAKE END TRANSACTION:', {
          stakeName: `Stake ${stakeId}`,
          stakeIndex,
          stakeId,
          stakeIndexHex,
          stakeIdHex,
          txData,
          contractAddress: HEX_ADDRESSES[chainId],
          functionSelector: '0xcd1de2b2 (stakeEnd)',
          decodedCall: `stakeEnd(${stakeIndex}, ${stakeId})`
        })

        // Execute the transaction
        const txParams = {
          from: connectedAddress,
          to: hexAddress,
          data: txData,
          gas: '0x7A120', // 500000 gas
        }
        
        console.log('Sending transaction with params:', txParams)

        const txHash = await window.ethereum.request({
          method: 'eth_sendTransaction',
          params: [txParams],
        })

        console.log('Transaction submitted:', txHash)
        setSuccessMessage(`✅ Transaction submitted: ${txHash}`)

        console.log('🚀 TRANSACTION SUBMITTED:', {
          txHash,
          explorer: chainId === 369 
            ? `https://scan.pulsechain.com/tx/${txHash}`
            : `https://etherscan.io/tx/${txHash}`,
          stakeName: `Stake ${stakeId}`,
          action: 'stakeEnd'
        })
        
        // Monitor transaction status
        const checkTransaction = async () => {
          try {
            const receipt = await window.ethereum.request({
              method: 'eth_getTransactionReceipt',
              params: [txHash],
            })
            
            if (receipt) {
              console.log('✅ TRANSACTION RECEIPT:', receipt)
              if (receipt.status === '0x1') {
                console.log('✅ STAKE END SUCCESS:', {
                  txHash,
                  stakeName: `Stake ${stakeId}`,
                  message: 'Stake ended successfully on blockchain!'
                })
                setSuccessMessage('✅ Stake ended successfully! Refreshing data...')
                // Force refresh the stakes data
                setTimeout(() => window.location.reload(), 2000)
              } else {
                console.error('❌ TRANSACTION FAILED:', { txHash, receipt })
                setError('❌ Transaction failed. Please check the transaction hash on the block explorer.')
                setEndingStake(null)
        }
      } else {
              // Transaction still pending, check again
              setTimeout(checkTransaction, 3000)
            }
          } catch (err) {
            console.error('Error checking transaction:', err)
            // Fallback: assume success after 10 seconds
            setTimeout(() => {
              setSuccessMessage('⏳ Transaction should be confirmed. Refreshing data...')
              window.location.reload()
            }, 10000)
          }
        }
        
        // Start checking transaction status after 5 seconds
        setTimeout(checkTransaction, 5000)
      }
    } catch (err: any) {
      console.error('End stake error:', err)
      if (err.code === 4001) {
        setError('Transaction was rejected by user')
      } else if (err.code === -32603) {
        setError('Transaction failed. Please check if you have enough gas or if the stake is still valid.')
      } else {
        setError(`Failed to end stake: ${err.message || 'Unknown error'}`)
      }
      setEndingStake(null)
    }
  }

  // Initiate stake ending with warning for early end
  const initiateEndStake = (stake: any) => {
    if (!isWalletConnected) {
      setError('Please connect your wallet to end stakes')
      return
    }

    console.log('Initiating stake end for stake:', stake)
    
    // For HEX stakes, the stakeIndex is usually the array index in the stakes list
    // We need to find the actual index in the user's stakes array
    const stakeIndex = hexStakes?.findIndex(s => s.stakeId === stake.stakeId) ?? 0
    const daysLeft = stake.daysLeft || 0
    
    console.log('Stake details:', { 
      stakeId: stake.stakeId, 
      stakeIndex, 
      chain: stake.chain, 
      daysLeft 
    })
    
    if (daysLeft > 0) {
      // Show warning for early end
      setWarningPopup({ 
        show: true, 
        stakeId: stake.stakeId, 
        stakeIndex: stakeIndex, 
        chain: stake.chain 
      })
    } else {
      // Direct end for completed stakes
      handleEndStake(stake.stakeId, stakeIndex, stake.chain)
    }
  }

  // Handle warning confirmation
  const handleWarningConfirm = () => {
    if (warningPopup.show) {
      handleEndStake(warningPopup.stakeId, warningPopup.stakeIndex, warningPopup.chain)
      setWarningPopup({ show: false, stakeId: '', stakeIndex: 0, chain: 'ETH' })
    }
  }

  // Auto-populate address input when wallet is connected
  useEffect(() => {
    if (isWalletConnected && connectedAddress) {
      setAddressInput(connectedAddress)
    } else if (!isWalletConnected) {
      // Clear input when wallet disconnects, but don't clear addresses automatically
      // Let user decide whether to keep viewing the data
    }
  }, [isWalletConnected, connectedAddress])

  // Auto-clear success messages
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  // Auto-clear error messages
  useEffect(() => {
    if (error && !error.includes('No valid addresses')) {
      const timer = setTimeout(() => {
        setError(null)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  // Handle disconnect wallet
  const handleDisconnectWallet = () => {
    if (typeof disconnect === 'function') {
      disconnect()
    }
    setAddressInput('')
    setAddresses([])
  }

  // Handle check another address
  const handleCheckAnotherAddress = () => {
    setAddresses([])
    setAddressInput('')
    setError(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Handle manual refresh
  const handleRefresh = () => {
    // Clear any potential cache
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name)
        })
      })
    }
    
    // Add timestamp to force fresh data
    const url = new URL(window.location.href)
    url.searchParams.set('refresh', Date.now().toString())
    window.location.href = url.toString()
  }

  // Format stake values
  const formatStakeValue = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M`
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(2)}K`
    }
    return value.toFixed(2)
  }

  // Calculate stake progress percentage
  const getStakeProgress = (startDate: string, endDate: string): number => {
    const start = new Date(startDate).getTime()
    const end = new Date(endDate).getTime()
    const now = Date.now()
    
    if (now < start) return 0
    if (now > end) return 100
    
    const progress = ((now - start) / (end - start)) * 100
    return Math.min(Math.max(progress, 0), 100)
  }

  return (
    <div className="min-h-screen bg-black text-white p-4" style={{ backgroundColor: '#000000' }}>
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
            HEX Stakes Viewer
          </h1>
          <p className="text-gray-400 text-lg">
            View your HEX stakes across Ethereum and PulseChain
          </p>
        </div>

        {/* Address Input Section - Hidden when addresses are loaded */}
        {addresses.length === 0 && (
          <Card className="p-6 bg-gray-900/50 border-gray-700">
            <div className="space-y-6">
              
              {/* Wallet Connection */}
              <div className="text-center">
                {!isWalletConnected ? (
                  <div className="space-y-2">
                    <Button
                      onClick={handleConnectWallet}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-full font-medium transition-all duration-200 transform hover:scale-105"
                    >
                      <Icons.wallet className="w-5 h-5 mr-2" />
                      Connect Wallet
                    </Button>
                    <p className="text-xs text-gray-500">
                      Connect your wallet to automatically load your address
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center space-x-2 text-green-400">
                      <Icons.check className="w-5 h-5" />
                      <span>Wallet Connected</span>
                    </div>
                    <div className="text-sm text-gray-400 font-mono">
                      {connectedAddress?.slice(0, 6)}...{connectedAddress?.slice(-4)}
                    </div>
                    <Button
                      onClick={handleDisconnectWallet}
                      variant="outline"
                      size="sm"
                      className="text-gray-400 border-gray-600 hover:border-gray-500"
                    >
                      Disconnect
                    </Button>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center space-x-4">
                <div className="flex-1 h-px bg-gray-700"></div>
                <span className="text-gray-500 text-sm">OR</span>
                <div className="flex-1 h-px bg-gray-700"></div>
              </div>

              {/* Manual Address Input */}
              <div className="space-y-4">
                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-300 mb-2">
                    Enter Address Manually
                  </label>
                  <textarea
                    id="address"
                    value={addressInput}
                    onChange={(e) => setAddressInput(e.target.value)}
                    placeholder="0xaf10cc6c50defff901b535691550d7af208939c5"
                    className="w-full h-24 px-4 py-3 bg-black border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none transition-colors resize-none"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter one or more Ethereum/PulseChain addresses (separated by commas, spaces, or new lines)
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-red-900/50 border border-red-500 rounded-lg text-red-200 text-sm">
                    ❌ {error}
                  </div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Loading Section */}
        {hexStakesLoading && addresses.length > 0 && (
          <Card className="p-8 bg-gray-900/50 border-gray-700">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <Icons.loader className="w-8 h-8 animate-spin text-blue-500" />
              </div>
              <p className="text-gray-400">Loading HEX stakes...</p>
            </div>
          </Card>
        )}

        {/* Error Section */}
        {hexStakesError && (
          <Card className="p-6 bg-red-900/20 border-red-700">
            <div className="text-center space-y-2">
              <p className="text-red-400">Error loading HEX stakes:</p>
              <p className="text-red-300 text-sm">{hexStakesError}</p>
            </div>
          </Card>
        )}

        {/* Success Message */}
        {successMessage && (
          <Card className="p-4 bg-green-900/20 border-green-700">
            <div className="text-center space-y-2">
              <p className="text-green-400">{successMessage}</p>
              <p className="text-sm text-green-300">
                If the stake still appears active, click "Refresh" to update the data or wait a few minutes for the blockchain to sync.
              </p>
            </div>
          </Card>
        )}

        {/* Error Message */}
        {error && !error.includes('No valid addresses') && (
          <Card className="p-4 bg-red-900/20 border-red-700">
            <div className="text-center">
              <p className="text-red-400">{error}</p>
            </div>
          </Card>
        )}

        {/* Warning Popup */}
        {warningPopup.show && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="bg-gray-900 border-red-500 p-6 max-w-md w-full mx-4">
              <div className="space-y-4">
                <h3 className="text-xl font-bold text-white">Early End Stake Warning</h3>
                <p className="text-gray-300">
                  You are about to end your stake early. This will result in penalties according to the HEX protocol. 
                  Are you sure you want to continue?
                </p>
                <div className="flex justify-end space-x-4">
                  <Button
                    onClick={() => setWarningPopup({ show: false, stakeId: '', stakeIndex: 0, chain: 'ETH' })}
                    variant="outline"
                    className="border-gray-600 hover:border-gray-500"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleWarningConfirm}
                    className="bg-red-500 hover:bg-red-600 text-white"
                  >
                    End Stake
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Stakes Display */}
        {!hexStakesLoading && addresses.length > 0 && (
          <div className="space-y-6">
            
            {/* Address List */}
            <Card className="p-4 bg-gray-900/50 border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium">Viewing Stakes For:</h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {addresses.map((addr) => (
                      <span key={addr.id} className="text-sm font-mono bg-gray-800 px-2 py-1 rounded">
                        {addr.address.slice(0, 6)}...{addr.address.slice(-4)}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleRefresh}
                    variant="outline"
                    className="border-blue-600 hover:border-blue-500 text-blue-400"
                  >
                    <Icons.loader className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                <Button
                  onClick={handleCheckAnotherAddress}
                  variant="outline"
                  className="border-gray-600 hover:border-gray-500"
                >
                  Check Another Address
                </Button>
                </div>
              </div>
            </Card>

            {/* Stakes Summary */}
            {hexStakes && hexStakes.length > 0 ? (
              <div className="space-y-4">
                
                {/* Summary Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-4 bg-gradient-to-br from-blue-900/30 to-purple-900/30 border-blue-700/50">
                    <div className="text-center">
                      <p className="text-blue-300 text-sm font-medium">Total Stakes</p>
                      <p className="text-2xl font-bold text-white">{hexStakes.length}</p>
                    </div>
                  </Card>
                  
                  <Card className="p-4 bg-gradient-to-br from-green-900/30 to-emerald-900/30 border-green-700/50">
                    <div className="text-center">
                      <p className="text-green-300 text-sm font-medium">Active Stakes</p>
                      <p className="text-2xl font-bold text-white">
                        {hexStakes.filter(stake => stake.status === 'active').length}
                      </p>
                    </div>
                  </Card>
                  
                  <Card className="p-4 bg-gradient-to-br from-purple-900/30 to-pink-900/30 border-purple-700/50">
                    <div className="text-center">
                      <p className="text-purple-300 text-sm font-medium">Total HEX Staked</p>
                      <p className="text-2xl font-bold text-white">
                        {formatStakeValue(hexStakes.reduce((sum, stake) => sum + stake.principleHex, 0))}
                      </p>
                    </div>
                  </Card>
                </div>

                {/* Stakes List */}
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold">Your HEX Stakes</h3>
                  
                  <div className="grid gap-4">
                    <AnimatePresence>
                      {hexStakes.map((stake, index) => {
                        const progress = getStakeProgress(stake.startDate, stake.endDate)
                        const isActive = stake.status === 'active'
                        
                        return (
                          <motion.div
                            key={stake.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <Card className={`p-6 border-l-4 ${
                              isActive 
                                ? 'bg-green-900/20 border-l-green-500 border-green-700/50' 
                                : 'bg-gray-900/50 border-l-gray-500 border-gray-700'
                            }`}>
                              <div className="space-y-4">
                                
                                {/* Stake Header */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <div className={`w-3 h-3 rounded-full ${
                                      isActive ? 'bg-green-500' : 'bg-gray-500'
                                    }`}></div>
                                    <h4 className="font-medium">
                                      Stake #{stake.stakeId}
                                    </h4>
                                    <span className="text-xs bg-gray-800 px-2 py-1 rounded">
                                      {stake.chain}
                                    </span>
                                  </div>
                                  
                                  <div className="text-right">
                                    <p className="text-sm text-gray-400">
                                      {isActive ? 'Active' : 'Ended'}
                                    </p>
                                    {stake.isOverdue && (
                                      <p className="text-xs text-red-400">Overdue</p>
                                    )}
                                  </div>
                                </div>

                                {/* Stake Details */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  <div>
                                    <p className="text-xs text-gray-400">Principal</p>
                                    <p className="font-medium">{formatStakeValue(stake.principleHex)} HEX</p>
                                  </div>
                                  
                                  <div>
                                    <p className="text-xs text-gray-400">Yield</p>
                                    <p className="font-medium text-green-400">
                                      {formatStakeValue(stake.yieldHex)} HEX
                                    </p>
                                  </div>
                                  
                                  <div>
                                    <p className="text-xs text-gray-400">T-Shares</p>
                                    <p className="font-medium">{formatStakeValue(stake.tShares)}</p>
                                  </div>
                                  
                                  <div>
                                    <p className="text-xs text-gray-400">Days Left</p>
                                    <p className="font-medium">
                                      {stake.daysLeft > 0 ? stake.daysLeft : 'Ended'}
                                    </p>
                                  </div>
                                </div>

                                {/* Progress Bar */}
                                {isActive && (
                                  <div className="space-y-2">
                                    <div className="flex justify-between text-xs text-gray-400">
                                      <span>Progress</span>
                                      <span>{progress.toFixed(1)}%</span>
                                    </div>
                                    <div className="w-full bg-gray-700 rounded-full h-2">
                                      <div
                                        className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${Math.min(progress, 100)}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                )}

                                {/* Dates */}
                                <div className="grid grid-cols-2 gap-4 text-xs text-gray-400">
                                  <div>
                                    <p>Start Date</p>
                                    <p className="text-white">{new Date(stake.startDate).toLocaleDateString()}</p>
                                  </div>
                                  <div>
                                    <p>End Date</p>
                                    <p className="text-white">{new Date(stake.endDate).toLocaleDateString()}</p>
                                  </div>
                                </div>

                                {/* End Stake Button - Only show for active stakes and if wallet is connected */}
                                {isActive && isWalletConnected && connectedAddress && (
                                  <div className="flex justify-end mt-4">
                                    <Button
                                      onClick={() => initiateEndStake(stake)}
                                      disabled={endingStake?.stakeId === stake.stakeId}
                                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                        stake.daysLeft > 0
                                          ? 'bg-red-500 hover:bg-red-600 text-white'
                                          : 'bg-green-500 hover:bg-green-600 text-white'
                                      } ${endingStake?.stakeId === stake.stakeId ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                      {endingStake?.stakeId === stake.stakeId ? (
                                        <div className="flex items-center space-x-2">
                                          <Icons.loader className="w-4 h-4 animate-spin" />
                                          <span>Ending...</span>
                                        </div>
                                      ) : (
                                        stake.daysLeft > 0 ? 'Emergency End Stake' : 'End Stake'
                                      )}
                                    </Button>
                                  </div>
                                )}

                                {/* Connect Wallet Message for active stakes */}
                                {isActive && !isWalletConnected && (
                                  <div className="flex justify-end mt-4">
                                    <Button
                                      onClick={handleConnectWallet}
                                      variant="outline"
                                      className="border-blue-500 text-blue-400 hover:bg-blue-500 hover:text-white"
                                    >
                                      Connect Wallet to End Stake
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </Card>
                          </motion.div>
                        )
                      })}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            ) : (
              /* No Stakes Found */
              <Card className="p-8 bg-gray-900/50 border-gray-700">
                <div className="text-center space-y-4">
                  <Icons.search className="w-12 h-12 text-gray-500 mx-auto" />
                  <h3 className="text-xl font-medium text-gray-300">No HEX Stakes Found</h3>
                  <p className="text-gray-500">
                    No HEX stakes were found for the provided address(es).
                    Make sure you've entered the correct addresses.
                  </p>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
