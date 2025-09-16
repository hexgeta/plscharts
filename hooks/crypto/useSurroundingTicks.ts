import { useState, useEffect } from 'react'
import useSWR from 'swr'

interface TickData {
  tickIdx: string
  liquidityGross: string
  liquidityNet: string
  price0: string
  price1: string
}

interface SurroundingTicksResponse {
  data: {
    ticks: TickData[]
  }
}

const fetcher = async (url: string, poolAddress: string): Promise<SurroundingTicksResponse> => {
  const query = `
    query surroundingTicks($poolAddress: String!) {
      ticks(
        where: { pool: $poolAddress }
        orderBy: tickIdx
        orderDirection: asc
        first: 1000
      ) {
        tickIdx
        liquidityGross
        liquidityNet
        price0
        price1
      }
    }
  `

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables: { poolAddress },
    }),
  })

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`)
  }

  const result = await response.json()
  
  if (result.errors) {
    throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`)
  }

  return result
}

export function useSurroundingTicks(poolAddress: string | null) {
  const [isEnabled, setIsEnabled] = useState(false)

  // Enable the hook when we have a pool address
  useEffect(() => {
    setIsEnabled(!!poolAddress)
  }, [poolAddress])

  const { data, error, isLoading, mutate } = useSWR(
    isEnabled ? ['surrounding-ticks', poolAddress] : null,
    ([, address]) => fetcher('https://api.9mm.finance/subgraphs/name/9mm-v3-latest', address),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      refreshInterval: 30000, // Refresh every 30 seconds
      errorRetryCount: 3,
      errorRetryInterval: 5000,
    }
  )

  return {
    ticks: data?.data?.ticks || [],
    isLoading,
    error,
    mutate,
    isEnabled
  }
}

export default useSurroundingTicks
