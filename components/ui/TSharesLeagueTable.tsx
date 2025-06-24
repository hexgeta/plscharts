'use client'

import { useMemo } from 'react'
import Image from 'next/image'

interface TSharesLeagueRank {
  name: string
  icon: string
  percentage: number
  minTShares: number
  color: string
}

interface TSharesLeagueTableProps {
  userTShares: number
  totalTShares: number
  chainName: string // 'Ethereum' or 'PulseChain'
  hexPrice: number // Current HEX price for dollar calculations
}

// Sea creature ranks from highest to lowest - same as token leagues
const TSHARES_LEAGUE_RANKS: Omit<TSharesLeagueRank, 'minTShares'>[] = [
  {
    name: 'Poseidon',
    icon: '/other-images/poseidon.png',
    percentage: 10,
    color: 'text-yellow-400'
  },
  {
    name: 'Whale',
    icon: '/other-images/whale.png',
    percentage: 1,
    color: 'text-blue-400'
  },
  {
    name: 'Shark',
    icon: '/other-images/shark.png',
    percentage: 0.1,
    color: 'text-gray-300'
  },
  {
    name: 'Dolphin',
    icon: '/other-images/dolphin.png',
    percentage: 0.01,
    color: 'text-cyan-400'
  },
  {
    name: 'Squid',
    icon: '/other-images/squid.png',
    percentage: 0.001,
    color: 'text-orange-400'
  },
  {
    name: 'Turtle',
    icon: '/other-images/turtle.png',
    percentage: 0.0001,
    color: 'text-green-400'
  },
  {
    name: 'Crab',
    icon: '/other-images/crab.png',
    percentage: 0.00001,
    color: 'text-orange-500'
  },
  {
    name: 'Shrimp',
    icon: '/other-images/shrimp.png',
    percentage: 0.000001,
    color: 'text-orange-600'
  },
  {
    name: 'Shell',
    icon: '/other-images/shell.png',
    percentage: 0.0000001,
    color: 'text-gray-400'
  }
]

// Format T-shares with appropriate precision
function formatTShares(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K'
  }
  if (num >= 100) {
    return Math.round(num).toString()
  }
  if (num >= 1) {
    return num.toFixed(1)
  }
  return num.toFixed(2)
}

// Format dollar amounts with appropriate precision
function formatDollars(amount: number): string {
  if (amount >= 1000000) {
    return '$' + (amount / 1000000).toFixed(1) + 'M'
  }
  if (amount >= 1000) {
    return '$' + (amount / 1000).toFixed(1) + 'K'
  }
  if (amount >= 1) {
    return '$' + Math.round(amount).toLocaleString()
  }
  if (amount >= 0.01) {
    return '$' + amount.toFixed(2)
  }
  return '$' + amount.toFixed(4)
}

// Format percentage with appropriate precision
function formatPercentage(percentage: number): string {
  if (percentage === 0) return '0%'
  if (percentage >= 10) return percentage.toFixed(0) + '%'
  if (percentage >= 1) return percentage.toFixed(1) + '%'
  if (percentage >= 0.1) return percentage.toFixed(2) + '%'
  if (percentage >= 0.01) return percentage.toFixed(3) + '%'
  if (percentage >= 0.001) return percentage.toFixed(4) + '%'
  if (percentage >= 0.0001) return percentage.toFixed(5) + '%'
  if (percentage >= 0.00001) return percentage.toFixed(6) + '%'
  
  return percentage.toPrecision(2) + '%'
}

export default function TSharesLeagueTable({ userTShares, totalTShares, chainName, hexPrice }: TSharesLeagueTableProps) {
  
  // Calculate user's current league
  const userCurrentLeague = useMemo(() => {
    if (userTShares <= 0) return null
    
    const userPercentage = (userTShares / totalTShares) * 100
    
    // Find the highest league they qualify for
    for (const rank of TSHARES_LEAGUE_RANKS) {
      if (userPercentage >= rank.percentage) {
        return rank.name
      }
    }
    return null
  }, [userTShares, totalTShares])

  // Calculate league requirements
  const leagueRanks = useMemo(() => {
    return TSHARES_LEAGUE_RANKS.map(rank => {
      const minTShares = (totalTShares * rank.percentage) / 100
      // Rough approximation: 1 T-Share ≈ 10,000 HEX (varies based on stake length and time)
      const approximateHex = minTShares * 10000
      const dollarValue = approximateHex * hexPrice
      
      return {
        ...rank,
        minTShares,
        dollarValue
      }
    })
  }, [totalTShares, hexPrice])

  const userPercentage = userTShares > 0 ? (userTShares / totalTShares) * 100 : 0

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="text-center border-b border-white/10 pb-2">
        <div className="mt-1 text-gray-300">
          <div className="text-2xl font-semibold">
            {formatDollars(userTShares * 10000 * hexPrice)}
          </div>
          {userTShares > 0 && (
            <div className="text-md text-gray-400">
              {formatTShares(userTShares)} T-Shares ({formatPercentage(userPercentage)})
            </div>
          )}
        </div>
      </div>

      {/* League Table - Show all leagues */}
      <div className="space-y-1">
        {leagueRanks.map((rank, index) => {
          const isUserLeague = userCurrentLeague === rank.name
          
          return (
            <div
              key={rank.name}
              className={`flex items-center gap-0 py-1 px-4 transition-all duration-300 hover:bg-white/5 hover:shadow-lg cursor-pointer ${
                isUserLeague 
                  ? 'bg-white/10 rounded-lg' 
                  : 'rounded-lg'
              }`}
            >
              {/* League Icon */}
              <div className="flex-shrink-0">
                <Image
                  src={rank.icon}
                  alt={rank.name}
                  width={20}
                  height={20}
                  className="object-contain"
                />
              </div>
              {/* League Info */}
              <div className="flex-1 min-w-0 ml-3">
                <div className="flex items-center gap-1">
                  <span className="font-medium text-xs text-white">
                    {rank.name}
                  </span>
                </div>
              </div>

              {/* Required T-Shares */}
              <div className="text-right">
                <div className="text-sm font-medium text-white">
                  {formatDollars(rank.dollarValue)}
                </div>
                <div className="text-xs font-medium text-gray-400">
                  {formatTShares(rank.minTShares)} T-Shares
                </div>
              </div>
            </div>
          )
        })}
        

      </div>

      {/* Footer Note */}
      <div className="text-[10px] text-gray-500 text-center pt-2 border-t border-white/10">
        T-Shares calculated from active HEX stakes excluding OA amounts
      </div>
    </div>
  )
} 