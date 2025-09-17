'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { getDailyCacheKey } from '@/utils/swr-config'

// PLSfolio API endpoint for transactions
const PLSFOLIO_API = 'https://api.plsfolio.com'

interface Transaction {
  hash: string
  from: string
  to: string | null
  value: string
  valueFormatted: number
  gasPrice: string
  gasUsed: string
  blockNumber: number
  timestamp: string
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
}

interface TransactionData {
  address: string
  chain: 'pulsechain'
  transactions: Transaction[]
  totalFound: number
  timestamp: string
  error?: string
}

interface UseAddressTransactionsResult {
  transactions: TransactionData | null
  isLoading: boolean
  error: any
}

// Helper function to format wei to ether
function formatWeiToEther(weiValue: string): number {
  try {
    const wei = BigInt(weiValue || '0')
    return Number(wei) / 1e18
  } catch {
    return 0
  }
}

// Helper function to format address for display
function formatAddress(address: string): string {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

// Fetcher function for SWR
async function fetchTransactions(address: string): Promise<TransactionData> {
  if (!address || typeof address !== 'string' || address.trim() === '') {
    throw new Error('Valid address is required')
  }

  try {
    
    const allTransactions: any[] = []
    let nextPageParams: any = null
    let pageCount = 0
    const maxPages = 20 // Safety limit to prevent infinite loops

    // Fetch first page
    let url = `${PLSFOLIO_API}/transactions/${address}`
    
    do {
      pageCount++
      
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        if (!response.ok) {
          throw new Error(`PLSfolio API error: ${response.status} ${response.statusText}`)
        }

        const data = await response.json()
        
        if (!data.items || !Array.isArray(data.items)) {
          throw new Error('Invalid response format from PLSfolio API')
        }

        // Add transactions from this page
        allTransactions.push(...data.items)

        // Check if there are more pages
        nextPageParams = data.next_page_params
        
        if (nextPageParams && pageCount < maxPages) {
          // Build URL for next page using ALL pagination parameters (cursor-based pagination)
          const params = new URLSearchParams()
          Object.keys(nextPageParams).forEach(key => {
            if (nextPageParams[key] !== null && nextPageParams[key] !== undefined) {
              params.append(key, nextPageParams[key].toString())
            }
          })
          url = `${PLSFOLIO_API}/transactions/${address}?${params.toString()}`
        } else {
        }
        
        // Small delay to be nice to the API
        if (nextPageParams && pageCount < maxPages) {
          await new Promise(resolve => setTimeout(resolve, 100))
        }
      } catch (pageError) {
        // Break the loop on error to prevent infinite attempts
        break
      }
    } while (nextPageParams && pageCount < maxPages)


    // Convert PLSfolio format to our format
    const transactions: Transaction[] = allTransactions.map((item: any) => ({
      hash: item.hash || '',
      from: item.from?.hash || '',
      to: item.to?.hash || null,
      value: item.value || '0',
      valueFormatted: formatWeiToEther(item.value || '0'),
      gasPrice: item.gas_price || '0',
      gasUsed: item.gas_used?.toString() || '0',
      blockNumber: item.block || 0,
      timestamp: item.timestamp || new Date().toISOString(),
      method: item.method || null,
      status: item.status === 'ok' ? 'success' : (item.status || 'unknown'),
      txTypes: item.tx_types || [],
      decodedInput: item.decoded_input ? {
        method_call: item.decoded_input.method_call || '',
        method_id: item.decoded_input.method_id || '',
        parameters: item.decoded_input.parameters || []
      } : undefined,
      fee: item.fee ? {
        type: item.fee.type || 'actual',
        value: item.fee.value || '0'
      } : undefined,
      toName: item.to?.name || undefined,
      fromName: item.from?.name || undefined
    }))
    
    
    return {
      address,
      chain: 'pulsechain',
      transactions,
      totalFound: transactions.length, // Total transactions across all pages
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    throw error
  }
}

/**
 * Hook to fetch recent transactions for a PulseChain address
 * Uses the PLSfolio API for fast and reliable transaction data
 */
export function useAddressTransactions(address: string): UseAddressTransactionsResult {
  const [error, setError] = useState<any>(null)

  // Create SWR key - only fetch if address is provided and valid
  const swrKey = address && typeof address === 'string' && address.trim() !== '' ? 
    getDailyCacheKey(`address-transactions-${address.toLowerCase()}`) : 
    null

  const { data, error: swrError, isLoading } = useSWR(
    swrKey,
    () => fetchTransactions(address),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 0, // Don't auto-refresh
      dedupingInterval: 300000, // 5 minutes deduping
      errorRetryCount: 2,
      errorRetryInterval: 1000,
      onError: (error) => {
        setError(error)
      },
      onSuccess: () => {
        setError(null)
      }
    }
  )

  return {
    transactions: data || null,
    isLoading: isLoading,
    error: error || swrError
  }
} 