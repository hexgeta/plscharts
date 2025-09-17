import { useState, useEffect, useCallback } from 'react'
import { createPublicClient, http } from 'viem'
import { pulsechain } from 'viem/chains'
import useSWR from 'swr'
import { TOKEN_CONSTANTS } from '../../constants/crypto'
import { MORE_COINS } from '../../constants/more-coins'

// 9MM V3 NonfungiblePositionManager ABI (positions and collect functions)
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
  },
  {
    name: 'collect',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      {
        name: 'params',
        type: 'tuple',
        components: [
          {
            name: 'tokenId',
            type: 'uint256'
          },
          {
            name: 'recipient',
            type: 'address'
          },
          {
            name: 'amount0Max',
            type: 'uint128'
          },
          {
            name: 'amount1Max',
            type: 'uint128'
          }
        ]
      }
    ],
    outputs: [
      {
        name: 'amount0',
        type: 'uint256'
      },
      {
        name: 'amount1',
        type: 'uint256'
      }
    ]
  }
] as const

// 9MM V3 Position Manager contract address on PulseChain
const POSITION_MANAGER_ADDRESS = '0xCC05bf158202b4F461Ede8843d76dcd7Bbad07f2'

// Helper function to get token decimals from constants
function getTokenDecimals(tokenAddress: string): number {
  const allTokens = [...TOKEN_CONSTANTS, ...MORE_COINS]
  const token = allTokens.find(t => t.a?.toLowerCase() === tokenAddress.toLowerCase())
  
  // Handle specific token addresses that might not be in constants
  if (tokenAddress.toLowerCase() === '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39') {
    return 8 // HEX token
  }
  if (tokenAddress.toLowerCase() === '0x57fde0a71132198bbec939b98976993d8d89d225') {
    return 8 // weHEX token (not WPLS as originally thought)
  }
  
  return token?.decimals || 18 // Default to 18 if not found
}

// Helper function to convert tick to price (Uniswap V3 formula)
function tickToPrice(tick: number, token0Decimals: number = 18, token1Decimals: number = 18): number {
  const price = Math.pow(1.0001, tick)
  // Adjust for token decimals
  const adjustedPrice = price * Math.pow(10, token0Decimals - token1Decimals)
  return adjustedPrice
}

// V3 Pool ABI - just the slot0 function to get current tick
const V3_POOL_ABI = [
  {
    name: 'slot0',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [
      {
        name: 'sqrtPriceX96',
        type: 'uint160'
      },
      {
        name: 'tick',
        type: 'int24'
      },
      {
        name: 'observationIndex',
        type: 'uint16'
      },
      {
        name: 'observationCardinality',
        type: 'uint16'
      },
      {
        name: 'observationCardinalityNext',
        type: 'uint16'
      },
      {
        name: 'feeProtocol',
        type: 'uint8'
      },
      {
        name: 'unlocked',
        type: 'bool'
      }
    ]
  }
] as const

// Helper function to get current tick from pool contract
async function getCurrentTickFromPool(poolAddress: string): Promise<number> {
  try {
    const result = await client.readContract({
      address: poolAddress as `0x${string}`,
      abi: V3_POOL_ABI,
      functionName: 'slot0'
    })
    
    const [sqrtPriceX96, tick] = result
    return Number(tick)
  } catch (error) {
    return 0
  }
}

// Helper function to calculate current token amounts from liquidity and price
function calculateTokenAmounts(
  liquidity: bigint,
  tickLower: number,
  tickUpper: number,
  currentTick: number,
  token0Decimals: number = 18,
  token1Decimals: number = 18
): { token0Amount: number; token1Amount: number } {
  if (liquidity === BigInt(0)) {
    return { token0Amount: 0, token1Amount: 0 }
  }

  // Convert ticks to sqrt prices
  const sqrtPriceLower = Math.sqrt(Math.pow(1.0001, tickLower))
  const sqrtPriceUpper = Math.sqrt(Math.pow(1.0001, tickUpper))
  const sqrtPriceCurrent = Math.sqrt(Math.pow(1.0001, currentTick))

  // Calculate token amounts based on current tick position
  let token0Amount = 0
  let token1Amount = 0

  if (currentTick < tickLower) {
    // Position is entirely in token0
    const amount0 = Number(liquidity) * (1 / sqrtPriceLower - 1 / sqrtPriceUpper)
    token0Amount = amount0 / Math.pow(10, token0Decimals)
  } else if (currentTick >= tickUpper) {
    // Position is entirely in token1
    const amount1 = Number(liquidity) * (sqrtPriceUpper - sqrtPriceLower)
    token1Amount = amount1 / Math.pow(10, token1Decimals)
  } else {
    // Position is active (current tick is within range)
    const amount0 = Number(liquidity) * (1 / sqrtPriceCurrent - 1 / sqrtPriceUpper)
    const amount1 = Number(liquidity) * (sqrtPriceCurrent - sqrtPriceLower)
    token0Amount = amount0 / Math.pow(10, token0Decimals)
    token1Amount = amount1 / Math.pow(10, token1Decimals)
  }

  return { token0Amount, token1Amount }
}

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
  liquidity: string // Raw liquidity value from contract
  token0: string // Token0 address
  token1: string // Token1 address
  fee: number // Fee tier
  tokensOwed0: number // Unclaimed fees for token0 (decimal adjusted)
  tokensOwed1: number // Unclaimed fees for token1 (decimal adjusted)
  currentTick: number // Current pool tick
  token0Amount: number // Current token0 amount in position
  token1Amount: number // Current token1 amount in position
}

// SWR fetcher function for V3 position data
const fetchV3Position = async (tokenId: string, poolAddress?: string): Promise<V3PositionTickData> => {
  
  const result = await client.readContract({
    address: POSITION_MANAGER_ADDRESS as `0x${string}`,
    abi: POSITION_MANAGER_ABI,
    functionName: 'positions',
    args: [BigInt(tokenId)]
  })

  // Extract tick data from the result
  const [nonce, operator, token0, token1, fee, tickLower, tickUpper, liquidity, feeGrowthInside0LastX128, feeGrowthInside1LastX128, tokensOwed0, tokensOwed1] = result
  
  // Get token decimals from constants
  const token0Decimals = getTokenDecimals(token0)
  const token1Decimals = getTokenDecimals(token1)
  
  
  // Get current tick from pool if pool address is provided
  let currentTick = 0
  if (poolAddress) {
    currentTick = await getCurrentTickFromPool(poolAddress)
  }
  
  // Convert ticks to prices with proper decimal adjustment
  const lowerPrice = tickToPrice(Number(tickLower), token0Decimals, token1Decimals)
  const upperPrice = tickToPrice(Number(tickUpper), token0Decimals, token1Decimals)

  // Calculate current token amounts if we have the current tick
  let token0Amount = 0
  let token1Amount = 0
  const tickLowerNum = Number(tickLower)
  const tickUpperNum = Number(tickUpper)
  
  if (currentTick !== undefined && liquidity > BigInt(0)) {
    const amounts = calculateTokenAmounts(
      liquidity,
      tickLowerNum,
      tickUpperNum,
      currentTick,
      token0Decimals,
      token1Decimals
    )
    token0Amount = amounts.token0Amount
    token1Amount = amounts.token1Amount
  }


  // Get real-time unclaimed fees using static call to collect function
  let tokensOwed0Adjusted = 0
  let tokensOwed1Adjusted = 0
  
  try {
    // Use static call to collect function to get current unclaimed fees
    const collectResult = await client.simulateContract({
      address: POSITION_MANAGER_ADDRESS as `0x${string}`,
      abi: POSITION_MANAGER_ABI,
      functionName: 'collect',
      args: [{
        tokenId: BigInt(tokenId),
        recipient: '0x0000000000000000000000000000000000000000', // Dummy address for simulation
        amount0Max: BigInt('340282366920938463463374607431768211455'), // Max uint128
        amount1Max: BigInt('340282366920938463463374607431768211455')  // Max uint128
      }]
    })
    
    // Extract the amounts from the simulation result
    tokensOwed0Adjusted = Number(collectResult.result[0]) / Math.pow(10, token0Decimals)
    tokensOwed1Adjusted = Number(collectResult.result[1]) / Math.pow(10, token1Decimals)
    
  } catch (error) {
    // Fallback to tokensOwed values
    tokensOwed0Adjusted = Number(tokensOwed0) / Math.pow(10, token0Decimals)
    tokensOwed1Adjusted = Number(tokensOwed1) / Math.pow(10, token1Decimals)
  }

  return {
    tokenId,
    tickLower: tickLowerNum,
    tickUpper: tickUpperNum,
    lowerPrice: lowerPrice,
    upperPrice: upperPrice,
    liquidity: liquidity.toString(),
    token0: token0,
    token1: token1,
    fee: Number(fee),
    tokensOwed0: tokensOwed0Adjusted,
    tokensOwed1: tokensOwed1Adjusted,
    currentTick: currentTick || 0,
    token0Amount,
    token1Amount
  }
}

/**
 * Hook to fetch a single V3 position's tick data using SWR
 */
export function useV3PositionTick(tokenId: string | null, poolAddress?: string) {
  const { data, error, isLoading } = useSWR(
    tokenId ? `v3-position-${tokenId}-${poolAddress || 'no-pool'}` : null,
    () => tokenId ? fetchV3Position(tokenId, poolAddress) : null,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60000, // Cache for 1 minute
      errorRetryCount: 5,
      errorRetryInterval: 2000,
      onError: (error) => {
      },
      onSuccess: (data) => {
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
  fetchPositionTicks: (tokenId: string, poolAddress?: string) => void
} {
  const [requestedTokenIds, setRequestedTokenIds] = useState<Set<string>>(new Set())
  const [tickData, setTickData] = useState<Record<string, V3PositionTickData | null>>({})
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, any>>({})

  const fetchPositionTicks = useCallback((tokenId: string, poolAddress?: string) => {
    const key = `${tokenId}-${poolAddress || 'no-pool'}`
    if (!requestedTokenIds.has(key)) {
      setRequestedTokenIds(prev => new Set([...prev, key]))
    }
  }, [requestedTokenIds])

  // Use SWR for each requested token ID
  useEffect(() => {
    requestedTokenIds.forEach(key => {
      const [tokenId, poolAddress] = key.split('-')
      const actualPoolAddress = poolAddress === 'no-pool' ? undefined : poolAddress
      
      // Skip if already loading or loaded
      if (isLoading[tokenId] || tickData[tokenId]) {
        return
      }
      
      // Set loading state
      setIsLoading(prev => ({ ...prev, [tokenId]: true }))
      
      fetchV3Position(tokenId, actualPoolAddress)
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
  }, [requestedTokenIds, isLoading, tickData])

  return {
    tickData,
    isLoading,
    errors,
    fetchPositionTicks
  }
}
