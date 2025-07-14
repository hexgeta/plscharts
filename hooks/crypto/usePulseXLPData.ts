import { useState, useEffect } from 'react'
import useSWR from 'swr'

const PULSEX_V2_SUBGRAPH = 'https://graph.pulsechain.com/subgraphs/name/pulsechain/pulsexv2'

export interface LPTokenData {
  id: string
  totalSupply: string
  token0: {
    id: string
    symbol: string
    name: string
    decimals: string
  }
  token1: {
    id: string
    symbol: string
    name: string
    decimals: string
  }
  reserve0: string
  reserve1: string
  token0Price: string
  token1Price: string
  reserveUSD: string
  totalValueLockedUSD: string
}

export interface UsePulseXLPDataResult {
  data: LPTokenData | null
  loading: boolean
  error: string | null
  pricePerToken: number | null
}

// GraphQL query to fetch LP token data
const LP_TOKEN_QUERY = `
  query GetLPToken($lpAddress: String!) {
    pair(id: $lpAddress) {
      id
      totalSupply
      token0 {
        id
        symbol
        name
        decimals
      }
      token1 {
        id
        symbol
        name
        decimals
      }
      reserve0
      reserve1
      token0Price
      token1Price
      reserveUSD
      totalValueLockedUSD
    }
  }
`

async function fetchLPData(lpAddress: string): Promise<LPTokenData | null> {
  try {
    console.log(`[PulseX LP] Fetching data for LP token: ${lpAddress}`)
    
    const response = await fetch(PULSEX_V2_SUBGRAPH, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: LP_TOKEN_QUERY,
        variables: {
          lpAddress: lpAddress.toLowerCase()
        }
      })
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()
    
    if (result.errors) {
      console.error('[PulseX LP] GraphQL errors:', result.errors)
      throw new Error(`GraphQL error: ${result.errors[0]?.message || 'Unknown error'}`)
    }

    const lpData = result.data?.pair
    
    if (!lpData) {
      console.warn(`[PulseX LP] No LP data found for address: ${lpAddress}`)
      return null
    }

    console.log(`[PulseX LP] Successfully fetched data:`, {
      pair: `${lpData.token0?.symbol}/${lpData.token1?.symbol}`,
      totalValueLocked: lpData.totalValueLockedUSD,
      totalSupply: lpData.totalSupply
    })

    return lpData
  } catch (error) {
    console.error('[PulseX LP] Error fetching LP data:', error)
    throw error
  }
}

export function usePulseXLPData(lpAddress: string): UsePulseXLPDataResult {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<LPTokenData | null>(null)
  const [pricePerToken, setPricePerToken] = useState<number | null>(null)

  useEffect(() => {
    if (!lpAddress || lpAddress === '0x0') {
      setData(null)
      setPricePerToken(null)
      return
    }

    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        const lpData = await fetchLPData(lpAddress)
        setData(lpData)

        // Calculate price per LP token
        if (lpData && lpData.totalSupply && lpData.totalValueLockedUSD) {
          const totalSupply = parseFloat(lpData.totalSupply)
          const totalValueUSD = parseFloat(lpData.totalValueLockedUSD)
          
          if (totalSupply > 0) {
            const pricePerLPToken = totalValueUSD / totalSupply
            setPricePerToken(pricePerLPToken)
            
            console.log(`[PulseX LP] Calculated price per LP token: $${pricePerLPToken.toFixed(6)}`)
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch LP data'
        setError(errorMessage)
        setData(null)
        setPricePerToken(null)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [lpAddress])

  return { data, loading, error, pricePerToken }
}

// Hook with SWR caching for better performance
export function usePulseXLPDataSWR(lpAddress: string): UsePulseXLPDataResult {
  const { data: lpData, error, isLoading } = useSWR(
    lpAddress && lpAddress !== '0x0' ? `pulsex-lp-${lpAddress.toLowerCase()}` : null,
    () => fetchLPData(lpAddress),
    {
      refreshInterval: 30000, // 30 seconds
      revalidateOnFocus: false,
      dedupingInterval: 30000
    }
  )

  const pricePerToken = lpData && lpData.totalSupply && lpData.totalValueLockedUSD
    ? parseFloat(lpData.totalValueLockedUSD) / parseFloat(lpData.totalSupply)
    : null

  return {
    data: lpData || null,
    loading: isLoading,
    error: error?.message || null,
    pricePerToken
  }
} 