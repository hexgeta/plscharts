import { useState, useEffect, useCallback } from 'react'
import { createPublicClient, http } from 'viem'
import { pulsechain } from 'viem/chains'
import useSWR from 'swr'

// 9MM V3 NonfungiblePositionManager ABI (just the positions function we need)
const POSITION_MANAGER_ABI = [
  {
    name: 'positions',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      {
        name: 'tokenId',
        type: 'uint256'
      }
    ],
    outputs: [
      {
        name: 'nonce',
        type: 'uint96'
      },
      {
        name: 'operator',
        type: 'address'
      },
      {
        name: 'token0',
        type: 'address'
      },
      {
        name: 'token1',
        type: 'address'
      },
      {
        name: 'fee',
        type: 'uint24'
      },
      {
        name: 'tickLower',
        type: 'int24'
      },
      {
        name: 'tickUpper',
        type: 'int24'
      },
      {
        name: 'liquidity',
        type: 'uint128'
      },
      {
        name: 'feeGrowthInside0LastX128',
        type: 'uint256'
      },
      {
        name: 'feeGrowthInside1LastX128',
        type: 'uint256'
      },
      {
        name: 'tokensOwed0',
        type: 'uint128'
      },
      {
        name: 'tokensOwed1',
        type: 'uint128'
      }
    ]
  }
] as const

// 9MM V3 Position Manager contract address on PulseChain
const POSITION_MANAGER_ADDRESS = '0xCC05bf158202b4F461Ede8843d76dcd7Bbad07f2'

// Create public client for PulseChain with better configuration
const client = createPublicClient({
  chain: pulsechain,
  transport: http('https://rpc.pulsechain.com', {
    timeout: 10000, // 10 second timeout per call
    retryCount: 0, // Let SWR handle retries
  })
})

export interface V3PositionTickData {
  tokenId: string
  tickLower: number
  tickUpper: number
  lowerPrice: number
  upperPrice: number
}

// SWR fetcher function for V3 position data
const fetchV3Position = async (tokenId: string): Promise<V3PositionTickData> => {
  console.log(`[V3 SWR] Fetching position ${tokenId}`)
  
  const result = await client.readContract({
    address: POSITION_MANAGER_ADDRESS as `0x${string}`,
    abi: POSITION_MANAGER_ABI,
    functionName: 'positions',
    args: [BigInt(tokenId)]
  })

  // Extract tick data from the result
  const [nonce, operator, token0, token1, fee, tickLower, tickUpper, liquidity, feeGrowthInside0LastX128, feeGrowthInside1LastX128, tokensOwed0, tokensOwed1] = result
  
  // Convert ticks to prices
  const lowerPrice = Math.pow(1.0001, Number(tickLower))
  const upperPrice = Math.pow(1.0001, Number(tickUpper))

  console.log(`[V3 SWR] Position ${tokenId} fetched successfully:`, {
    tickLower: Number(tickLower),
    tickUpper: Number(tickUpper),
    lowerPrice: lowerPrice.toFixed(8),
    upperPrice: upperPrice.toFixed(8)
  })

  return {
    tokenId,
    tickLower: Number(tickLower),
    tickUpper: Number(tickUpper),
    lowerPrice,
    upperPrice
  }
}

/**
 * Hook to fetch a single V3 position's tick data using SWR
 */
export function useV3PositionTick(tokenId: string | null) {
  const { data, error, isLoading } = useSWR(
    tokenId ? `v3-position-${tokenId}` : null,
    () => tokenId ? fetchV3Position(tokenId) : null,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // Cache for 1 minute
      errorRetryCount: 5,
      errorRetryInterval: 2000,
      onError: (error) => {
        console.error(`[V3 SWR Error] Position ${tokenId}:`, error.message)
      },
      onSuccess: (data) => {
        console.log(`[V3 SWR Success] Position ${tokenId} loaded`)
      }
    }
  )

  return {
    data,
    error,
    isLoading
  }
}

/**
 * Hook to fetch multiple V3 positions' tick data using SWR
 */
export function useV3PositionTicks(): { 
  tickData: Record<string, V3PositionTickData | null>
  isLoading: Record<string, boolean>
  errors: Record<string, any>
  fetchPositionTicks: (tokenId: string) => void
} {
  const [requestedTokenIds, setRequestedTokenIds] = useState<Set<string>>(new Set())
  const [tickData, setTickData] = useState<Record<string, V3PositionTickData | null>>({})
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, any>>({})

  const fetchPositionTicks = useCallback((tokenId: string) => {
    if (!requestedTokenIds.has(tokenId)) {
      setRequestedTokenIds(prev => new Set([...prev, tokenId]))
    }
  }, [requestedTokenIds])

  // Use SWR for each requested token ID
  useEffect(() => {
    requestedTokenIds.forEach(tokenId => {
      // Use SWR hook for each position
      const key = `v3-position-${tokenId}`
      
      // Set loading state
      setIsLoading(prev => ({ ...prev, [tokenId]: true }))
      
      fetchV3Position(tokenId)
        .then(data => {
          setTickData(prev => ({ ...prev, [tokenId]: data }))
          setIsLoading(prev => ({ ...prev, [tokenId]: false }))
          setErrors(prev => ({ ...prev, [tokenId]: null }))
        })
        .catch(error => {
          setErrors(prev => ({ ...prev, [tokenId]: error }))
          setIsLoading(prev => ({ ...prev, [tokenId]: false }))
          setTickData(prev => ({ ...prev, [tokenId]: null }))
        })
    })
  }, [requestedTokenIds])

  return {
    tickData,
    isLoading,
    errors,
    fetchPositionTicks
  }
}
