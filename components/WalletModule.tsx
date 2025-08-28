'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

// Optional wallet context - only loads if wallet features are enabled
interface WalletContextType {
  isConnected: boolean
  address?: string
  connect: () => void
  disconnect: () => void
  isWalletEnabled: boolean
}

const WalletContext = createContext<WalletContextType>({
  isConnected: false,
  connect: () => {},
  disconnect: () => {},
  isWalletEnabled: false
})

export const useWallet = () => useContext(WalletContext)

interface WalletProviderProps {
  children: React.ReactNode
  enabled?: boolean
}

export function WalletProvider({ children, enabled = false }: WalletProviderProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [address, setAddress] = useState<string>()

  // Only enable wallet features if explicitly enabled
  const isWalletEnabled = enabled && typeof window !== 'undefined'

  const connect = async () => {
    if (!isWalletEnabled) return
    
    try {
      // Basic wallet connection logic (can be extended)
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        })
        if (accounts.length > 0) {
          setAddress(accounts[0])
          setIsConnected(true)
        }
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error)
    }
  }

  const disconnect = () => {
    setIsConnected(false)
    setAddress(undefined)
  }

  // Auto-connect if previously connected
  useEffect(() => {
    if (!isWalletEnabled) return

    const checkConnection = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({ 
            method: 'eth_accounts' 
          })
          if (accounts.length > 0) {
            setAddress(accounts[0])
            setIsConnected(true)
          }
        } catch (error) {
          console.error('Failed to check wallet connection:', error)
        }
      }
    }

    checkConnection()
  }, [isWalletEnabled])

  return (
    <WalletContext.Provider value={{
      isConnected,
      address,
      connect,
      disconnect,
      isWalletEnabled
    }}>
      {children}
    </WalletContext.Provider>
  )
}

// Optional wallet connect button component
export function WalletConnectButton() {
  const { isConnected, address, connect, disconnect, isWalletEnabled } = useWallet()

  if (!isWalletEnabled) {
    return null // Don't render if wallet is disabled
  }

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-400">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
        <button
          onClick={disconnect}
          className="px-3 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded"
        >
          Disconnect
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={connect}
      className="px-3 py-1 text-xs bg-blue-500 hover:bg-blue-600 text-white rounded"
    >
      Connect Wallet
    </button>
  )
}
