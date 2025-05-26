'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { CoinLogo } from '@/components/ui/CoinLogo'

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

export default function LeagueTable({ tokenTicker }: LeagueTableProps) {
  const [totalSupply, setTotalSupply] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // For now, we'll use mock data for HEX
    // Later this can be connected to your Supabase data
    const mockTotalSupply = 665000000000 // 665B HEX from your image
    
    setTimeout(() => {
      setTotalSupply(mockTotalSupply)
      setLoading(false)
    }, 500)
  }, [tokenTicker])

  const calculateLeagueRanks = (): LeagueRank[] => {
    return LEAGUE_RANKS.map(rank => {
      const minTokens = Math.floor((totalSupply * rank.percentage) / 100)
      const marketCap = minTokens * 0.0083 // Assuming $0.0083 per HEX token
      
      return {
        ...rank,
        minTokens,
        marketCap
      }
    })
  }

  const formatNumber = (num: number): string => {
    if (num >= 1e12) return (num / 1e12).toFixed(1) + 'T'
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B'
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M'
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K'
    return num.toLocaleString()
  }

  const formatCurrency = (num: number): string => {
    if (num >= 1e9) return '$' + (num / 1e9).toFixed(0) + 'B'
    if (num >= 1e6) return '$' + (num / 1e6).toFixed(0) + 'M'
    if (num >= 1e3) return '$' + (num / 1e3).toFixed(0) + 'K'
    return '$' + num.toFixed(0)
  }

  if (loading) {
    return (
      <div className="bg-black border border-gray-800 rounded-2xl p-6 w-full max-w-md">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded mb-4"></div>
          <div className="space-y-3">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-700 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-black border border-gray-800 rounded-2xl p-6 w-full max-w-md">
        <div className="text-red-400 text-center">
          <p>Error loading {tokenTicker} league data</p>
          <p className="text-sm text-gray-500 mt-2">{error}</p>
        </div>
      </div>
    )
  }

  const leagueRanks = calculateLeagueRanks()

  return (
    <div className="bg-black border border-gray-800 rounded-2xl p-6 w-full max-w-md">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <CoinLogo
            symbol="HEX"
            size="sm"
            className="brightness-0 invert rounded-none"
            variant="no-bg"
          />
          <div>
            <div className="text-white font-bold text-xl">{tokenTicker}</div>
            <div className="text-gray-400 text-sm">{tokenTicker}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-gray-400 text-sm">Market Cap</div>
          <div className="text-white font-bold">$5.5B</div>
        </div>
        <div className="text-right">
          <div className="text-gray-400 text-sm">Supply</div>
          <div className="text-white font-bold">{formatNumber(totalSupply)}</div>
        </div>
      </div>

      {/* League Table */}
      <div className="space-y-3">
        {leagueRanks.map((rank, index) => (
          <div
            key={rank.name}
            className="flex items-center justify-between py-2"
          >
            {/* Rank Info */}
            <div className="flex items-center space-x-3 flex-1">
              <div className="w-6 h-6 relative">
                <Image
                  src={rank.icon}
                  alt={rank.name}
                  fill
                  className="object-contain"
                />
              </div>
              <div className="text-white font-medium">
                {rank.name}
              </div>
            </div>

            {/* Market Cap */}
            <div className="text-white font-medium text-right min-w-[100px]">
              {formatCurrency(rank.marketCap)}
            </div>

            {/* Supply Required */}
            <div className="text-gray-400 text-right min-w-[80px] flex items-center">
              {formatNumber(rank.minTokens)}
              <div className="w-4 h-4 ml-1 bg-gray-600 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 