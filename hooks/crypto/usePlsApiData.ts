'use client'

import useSWR from 'swr'

interface PlsApiData {
  poolAddress: string;
  chainId: number;
  virtualPriceRaw: string;
  virtualPriceFormatted: number;
  contractAddress: string;
  timestamp: string;
  date: string;
  id?: number;
  createdAt?: string;
}

interface PlsApiResponse {
  data: PlsApiData[];
  success: boolean;
  error?: string;
}

const fetcher = async (url: string): Promise<PlsApiResponse> => {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  }
  return response.json()
}

export function usePlsApiData() {
  const { data, error, isLoading, mutate } = useSWR<PlsApiResponse>(
    '/api/pls-pool-data',
    fetcher,
    {
      refreshInterval: 1000 * 60 * 60, // Refresh every hour
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      errorRetryCount: 3,
      errorRetryInterval: 5000
    }
  )

  // Get the latest virtual price
  const latestData = data?.data?.[0]
  const virtualPrice = latestData?.virtualPriceFormatted || null
  const lastUpdated = latestData ? new Date(latestData.timestamp) : null

  return {
    virtualPrice,
    lastUpdated,
    data: data?.data || [],
    isLoading,
    error: error?.message || data?.error || null,
    refetch: mutate
  }
}
