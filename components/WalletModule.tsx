'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

// Add type for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
    };
  }
}

// Optional wallet context - only loads if wallet features are enabled
interface WalletContextType {
  isConnected: boolean
  address?: string
  connect: () => Promise<void>
  disconnect: () => void
  isWalletEnabled: boolean
}

const WalletContext = createContext<WalletContextType>({
  isConnected: false,
  connect: async () => {},
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
      // Failed to connect wallet
    }
  }

  const disconnect = () => {
    setIsConnected(false)
    setAddress(undefined)
  }

  // Auto-connect if previously connected and setup event listeners
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
          // Failed to check wallet connection
        }
      }
    }

    // Handle account changes
    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length > 0) {
        setAddress(accounts[0])
        setIsConnected(true)
      } else {
        setAddress(undefined)
        setIsConnected(false)
      }
    }

    checkConnection()

    // Setup event listeners
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged)
    }

    // Cleanup event listeners
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged)
      }
    }
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
