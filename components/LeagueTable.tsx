'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { CoinLogo } from '@/components/ui/CoinLogo'
import { useTokenPrices } from '@/hooks/crypto/useTokenPrices'

interface LeagueRank {
  name: string
  icon: string
  percentage: number
  minTokens: number
  marketCap: number
  color: string
}

interface LeagueTableProps {
  tokenTicker: string
  containerStyle?: boolean
}

// Sea creature ranks from highest to lowest
const LEAGUE_RANKS: Omit<LeagueRank, 'minTokens' | 'marketCap'>[] = [
  {
    name: 'Poseidon',
    icon: '/poseidon.png',
    percentage: 10,
    color: 'text-yellow-400'
  },
  {
    name: 'Whale',
    icon: '/whale.png',
    percentage: 1,
    color: 'text-blue-400'
  },
  {
    name: 'Shark',
    icon: '/shark.png',
    percentage: 0.1,
    color: 'text-gray-300'
  },
  {
    name: 'Dolphin',
    icon: '/dolphin.png',
    percentage: 0.01,
    color: 'text-cyan-400'
  },
  {
    name: 'Squid',
    icon: '/squid.png',
    percentage: 0.001,
    color: 'text-orange-400'
  },
  {
    name: 'Turtle',
    icon: '/turtle.png',
    percentage: 0.0001,
    color: 'text-green-400'
  },
  {
    name: 'Crab',
    icon: '/crab.png',
    percentage: 0.00001,
    color: 'text-orange-500'
  },
  {
    name: 'Shrimp',
    icon: '/shrimp.png',
    percentage: 0.000001,
    color: 'text-orange-600'
  },
  {
    name: 'Shell',
    icon: '/shell.png',
    percentage: 0.0000001,
    color: 'text-gray-400'
  }
]

// Local formatting functions to match the website's style
function formatCompactNumber(num: number): string {
  if (num >= 1e15) {
    const rounded = Math.round(num / 1e15)
    return rounded >= 10 ? rounded + 'Q' : (num / 1e15).toFixed(1) + 'Q'
  }
  if (num >= 1e12) {
    const rounded = Math.round(num / 1e12)
    return rounded >= 10 ? rounded + 'T' : (num / 1e12).toFixed(1) + 'T'
  }
  if (num >= 1e9) {
    const rounded = Math.round(num / 1e9)
    return rounded >= 10 ? rounded + 'B' : (num / 1e9).toFixed(1) + 'B'
  }
  if (num >= 1e6) {
    const rounded = Math.round(num / 1e6)
    return rounded >= 10 ? rounded + 'M' : (num / 1e6).toFixed(1) + 'M'
  }
  if (num >= 1e3) {
    const rounded = Math.round(num / 1e3)
    return rounded >= 10 ? rounded + 'K' : (num / 1e3).toFixed(1) + 'K'
  }
  if (num >= 1) {
    return Math.round(num).toString()
  }
  // For fractional amounts, show decimals
  if (num >= 0.01) {
    return num.toFixed(2)
  }
  if (num >= 0.001) {
    return num.toFixed(3)
  }
  return num.toFixed(4)
}

// For header market cap - uses compact notation
function formatHeaderMarketCap(num: number): string {
  if (num >= 1e9) {
    const rounded = Math.round(num / 1e9)
    return rounded >= 10 ? '$' + rounded + 'B' : '$' + (num / 1e9).toFixed(1) + 'B'
  }
  if (num >= 1e6) {
    const rounded = Math.round(num / 1e6)
    return rounded >= 10 ? '$' + rounded + 'M' : '$' + (num / 1e6).toFixed(1) + 'M'
  }
  return '$' + num.toLocaleString('en-US', { maximumFractionDigits: 0 })
}

// For league row market caps - uses full numbers with commas
function formatLeagueMarketCap(num: number): string {
  if (num >= 1000) {
    return '$' + num.toLocaleString('en-US', { maximumFractionDigits: 0 })
  }
  if (num >= 0.01) {
    return '$' + num.toFixed(2)
  }
  if (num >= 0.001) {
    return '$' + num.toFixed(3)
  }
  if (num >= 0.0001) {
    return '$' + num.toFixed(4)
  }
  return '$' + num.toFixed(5)
}

// Custom hook for fetching token supply data
function useTokenSupply(tokenTicker: string) {
  const [totalSupply, setTotalSupply] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Skip API call for PLS since it uses hardcoded supply
    if (tokenTicker === 'PLS') {
      setTotalSupply(137000000000000) // 137T for PLS
      setLoading(false)
      return
    }

    const fetchTokenSupply = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch from API route instead of direct Supabase access
        const response = await fetch(`/api/token-supply?ticker=${tokenTicker}`)
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        if (data.totalSupply === null || data.totalSupply === undefined) {
          throw new Error('Invalid supply data received')
        }
        setTotalSupply(data.totalSupply)
      } catch (err) {
        console.error('Error fetching token supply:', err)
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
        setTotalSupply(0)
      } finally {
        setLoading(false)
      }
    }

    fetchTokenSupply()
  }, [tokenTicker])

  return { totalSupply, loading, error }
}

export default function LeagueTable({ tokenTicker, containerStyle = true }: LeagueTableProps) {
  const { prices, isLoading, error } = useTokenPrices([tokenTicker])
  const { totalSupply, loading: supplyLoading } = useTokenSupply(tokenTicker)
  
  const tokenPrice = prices[tokenTicker]
  const loading = isLoading || supplyLoading

  // Add debugging
  console.log(`LeagueTable ${tokenTicker}:`, {
    prices,
    tokenPrice,
    totalSupply,
    isLoading,
    supplyLoading,
    error
  })

  const calculateLeagueRanks = (): LeagueRank[] => {
    return LEAGUE_RANKS.map(rank => {
      const minTokens = (totalSupply * rank.percentage) / 100
      const marketCap = minTokens * (tokenPrice?.price || 0)
      
      return {
        ...rank,
        minTokens,
        marketCap
      }
    })
  }

  // Calculate total market cap
  const totalMarketCap = totalSupply * (tokenPrice?.price || 0)

  if (error) {
    return (
      <div className="bg-black border-2 border-white/10 rounded-2xl p-6 w-full max-w-sm">
        <div className="text-red-400 text-center">
          <p>Error loading {tokenTicker} league data</p>
          <p className="text-sm text-gray-500 mt-2">Failed to fetch price data</p>
        </div>
      </div>
    )
  }

  const leagueRanks = calculateLeagueRanks()

  const content = (
    <div className="w-full">
      {/* Header */}
      <div className="grid grid-cols-3 items-center gap-4 mb-6">
        <div className="flex items-center space-x-3">
          <CoinLogo
            symbol={tokenTicker}
            size="xl"
            className="rounded-none"
            variant="default"
          />
          <div>
            <div className="text-white font-bold text-xl">{tokenTicker}</div>
            <div className="text-gray-400 text-sm">{tokenTicker}</div>
          </div>
        </div>
        <div className="text-center">
          <div className="text-gray-400 text-sm">Market Cap</div>
          <div className="text-white font-bold">{formatHeaderMarketCap(totalMarketCap)}</div>
        </div>
        <div className="text-right">
          <div className="text-gray-400 text-sm">Supply</div>
          <div className="text-white font-bold">{formatCompactNumber(totalSupply)}</div>
        </div>
      </div>

      {/* League Table */}
      <div className="space-y-3">
        {leagueRanks.map((rank, index) => (
          <div
            key={rank.name}
            className="grid grid-cols-3 items-center gap-4 py-2"
          >
            {/* Rank Info - Left Aligned */}
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 relative">
                <Image
                  src={rank.icon}
                  alt={rank.name}
                  fill
                  className="object-contain"
                />
              </div>
              <div className="text-white font-bold text-sm">
                {rank.name}
              </div>
            </div>

            {/* Market Cap - Center Aligned */}
            <div className="text-white font-medium text-center">
              {formatLeagueMarketCap(rank.marketCap)}
            </div>

            {/* Supply Required - Right Aligned */}
            <div className="text-gray-400 text-right flex items-center justify-end">
              {formatCompactNumber(rank.minTokens)}
              {(tokenTicker === 'HDRN' || tokenTicker === 'eHDRN' || tokenTicker === 'ICSA' || tokenTicker === 'eICSA') ? (
                <img
                  src="/coin-logos/HDRN-white.svg"
                  alt={`${tokenTicker} logo`}
                  className="w-4 h-4 rounded-none ml-1"
                />
              ) : (
                <CoinLogo
                  symbol={tokenTicker}
                  size="sm"
                  className="brightness-0 invert rounded-none ml-1"
                  variant="no-bg"
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  if (!containerStyle) {
    return content;
  }

  return (
    <div className="bg-black border-2 border-white/10 rounded-2xl p-6">
      {content}
    </div>
  )
} 