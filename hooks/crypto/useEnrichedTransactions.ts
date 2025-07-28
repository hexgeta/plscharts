import { useState, useEffect, useMemo } from 'react'
import { useTokenPrices } from './useTokenPrices'
import { TOKEN_CONSTANTS } from '@/constants/crypto'

interface TransactionReceipt {
  status: string
  gasUsed: string
  logs: Array<{
    address: string
    topics: string[]
    data: string
  }>
}

interface TokenTransfer {
  tokenAddress: string
  tokenSymbol?: string
  tokenDecimals?: number
  from: string
  to: string
  amount: string
  amountFormatted: number
  usdValue?: number
}

interface EnrichedTransaction {
  hash: string
  method?: string
  txTypes?: string[]
  fee: string
  tokenTransfers: TokenTransfer[]
  status?: 'success' | 'failed'
  gasUsed?: string
  // Include original PLSfolio data
  originalData: any
}

// ERC-20 Transfer event signature
const TRANSFER_EVENT_SIGNATURE = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

// Helper function to get token info by address from TOKEN_CONSTANTS
function getTokenInfoByAddress(address: string): { symbol: string; decimals: number } | null {
  const normalizedAddress = address.toLowerCase()
  
  // Find token in TOKEN_CONSTANTS by address
  const token = TOKEN_CONSTANTS.find(token => 
    token.a.toLowerCase() === normalizedAddress ||
    token.a.toLowerCase() === `0x${normalizedAddress.slice(2)}`
  )
  
  if (token) {
    return {
      symbol: token.ticker,
      decimals: token.decimals
    }
  }
  
  return null
}

async function fetchTransactionReceipt(hash: string): Promise<TransactionReceipt | null> {
  try {
    const response = await fetch('https://rpc-pulsechain.g4mm4.io', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: `receipt-${Date.now()}`,
        method: 'eth_getTransactionReceipt',
        params: [hash],
      }),
    })

    if (!response.ok) {
      console.error(`[Receipt] HTTP error for ${hash}: ${response.status}`)
      return null
    }

    const data = await response.json()
    
    if (data.error) {
      console.error(`[Receipt] RPC error for ${hash}:`, data.error)
      return null
    }

    return data.result
  } catch (error) {
    console.error(`[Receipt] Error fetching receipt for ${hash}:`, error)
    return null
  }
}

function parseTransferLogs(logs: any[]): TokenTransfer[] {
  const transfers: TokenTransfer[] = []

  for (const log of logs) {
    // Check if this is a Transfer event
    if (log.topics && log.topics[0] === TRANSFER_EVENT_SIGNATURE && log.topics.length >= 3) {
      try {
        const tokenAddress = log.address.toLowerCase()
        const tokenInfo = getTokenInfoByAddress(tokenAddress)
        
        // Extract from/to addresses from topics
        const fromAddress = '0x' + log.topics[1].slice(-40)
        const toAddress = '0x' + log.topics[2].slice(-40)
        
        // Extract amount from data
        const amountHex = log.data || '0x0'
        const amountBigInt = BigInt(amountHex)
        
        // Format amount based on token decimals
        const decimals = tokenInfo?.decimals || 18
        const amountFormatted = Number(amountBigInt) / Math.pow(10, decimals)
        
        transfers.push({
          tokenAddress,
          tokenSymbol: tokenInfo?.symbol,
          tokenDecimals: decimals,
          from: fromAddress,
          to: toAddress,
          amount: amountBigInt.toString(),
          amountFormatted,
        })
      } catch (error) {
        console.error('[Receipt] Error parsing transfer log:', error)
      }
    }
  }

  return transfers
}

export function useEnrichedTransactions(transactions: any[]) {
  const [enrichedData, setEnrichedData] = useState<{ [hash: string]: EnrichedTransaction }>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Get all unique token symbols for price fetching
  const tokenSymbols = useMemo(() => {
    const symbols = new Set<string>()
    Object.values(enrichedData).forEach(tx => {
      tx.tokenTransfers.forEach(transfer => {
        if (transfer.tokenSymbol) {
          symbols.add(transfer.tokenSymbol)
        }
      })
    })
    return Array.from(symbols)
  }, [enrichedData])

  // Fetch prices for all tokens found in transactions
  const { prices } = useTokenPrices(tokenSymbols)

  // Enrich transactions with receipt data
  useEffect(() => {
    if (!transactions || transactions.length === 0) return

    const enrichTransactions = async () => {
      setIsLoading(true)
      setError(null)
      
      try {
        const newEnrichedData: { [hash: string]: EnrichedTransaction } = {}
        
        // Process transactions in batches to avoid overwhelming the RPC
        const batchSize = 5
        for (let i = 0; i < transactions.length; i += batchSize) {
          const batch = transactions.slice(i, i + batchSize)
          
          const batchPromises = batch.map(async (tx) => {
            // Skip if already enriched
            if (enrichedData[tx.hash]) {
              newEnrichedData[tx.hash] = enrichedData[tx.hash]
              return
            }

            console.log(`[Enrich] Fetching receipt for ${tx.hash}`)
            const receipt = await fetchTransactionReceipt(tx.hash)
            
            if (receipt) {
              const tokenTransfers = parseTransferLogs(receipt.logs || [])
              const status = receipt.status === '0x1' ? 'success' : 'failed'
              const gasUsed = receipt.gasUsed ? parseInt(receipt.gasUsed, 16).toString() : undefined

              newEnrichedData[tx.hash] = {
                hash: tx.hash,
                method: tx.method,
                txTypes: tx.txTypes,
                fee: tx.fee,
                tokenTransfers,
                status,
                gasUsed,
                originalData: tx,
              }
              
              console.log(`[Enrich] ${tx.hash}: Found ${tokenTransfers.length} transfers, status: ${status}`)
            } else {
              // Fallback with original data only
              newEnrichedData[tx.hash] = {
                hash: tx.hash,
                method: tx.method,
                txTypes: tx.txTypes,
                fee: tx.fee,
                tokenTransfers: [],
                originalData: tx,
              }
            }
          })

          await Promise.all(batchPromises)
          
          // Small delay between batches to avoid rate limiting
          if (i + batchSize < transactions.length) {
            await new Promise(resolve => setTimeout(resolve, 500))
          }
        }
        
        setEnrichedData(newEnrichedData)
      } catch (err) {
        console.error('[Enrich] Error enriching transactions:', err)
        setError(err instanceof Error ? err.message : 'Failed to enrich transactions')
      } finally {
        setIsLoading(false)
      }
    }

    enrichTransactions()
  }, [transactions])

  // Add USD values to enriched data when prices are available
  const enrichedWithPrices = useMemo(() => {
    if (!prices || Object.keys(prices).length === 0) return enrichedData

    const updatedData: { [hash: string]: EnrichedTransaction } = {}
    
    Object.entries(enrichedData).forEach(([hash, tx]) => {
      const updatedTransfers = tx.tokenTransfers.map(transfer => ({
        ...transfer,
        usdValue: transfer.tokenSymbol && prices[transfer.tokenSymbol] 
          ? transfer.amountFormatted * prices[transfer.tokenSymbol].price 
          : undefined
      }))

      updatedData[hash] = {
        ...tx,
        tokenTransfers: updatedTransfers
      }
    })

    return updatedData
  }, [enrichedData, prices])

  // Convert to array for easier consumption
  const enrichedTransactions = useMemo(() => {
    return transactions.map(tx => enrichedWithPrices[tx.hash] || {
      hash: tx.hash,
      method: tx.method,
      txTypes: tx.txTypes,
      fee: tx.fee,
      tokenTransfers: [],
      originalData: tx,
    })
  }, [transactions, enrichedWithPrices])

  return {
    enrichedTransactions,
    isLoading,
    error,
  }
} 