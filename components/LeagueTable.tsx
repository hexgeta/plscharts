'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { CoinLogo } from '@/components/ui/CoinLogo'
import { formatNumber } from '@/utils/format'
import { createClient } from '@supabase/supabase-js'

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

// Custom hook for fetching token supply data
function useTokenSupply(tokenTicker: string) {
  const [totalSupply, setTotalSupply] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTokenSupply = async () => {
      try {
        setLoading(true)
        setError(null)

        // Initialize Supabase client
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        // Fetch the latest supply data for the token
        const { data, error: supabaseError } = await supabase
          .from('daily_token_supplies')
          .select('total_supply_formatted')
          .eq('ticker', tokenTicker)
          .order('date', { ascending: false })
          .limit(1)
          .single()

        if (supabaseError) {
          console.error('Supabase error:', supabaseError)
          throw new Error(`Failed to fetch supply data: ${supabaseError.message}`)
        }

        if (!data) {
          throw new Error(`No supply data found for ${tokenTicker}`)
        }

        setTotalSupply(data.total_supply_formatted)
      } catch (err) {
        console.error('Error fetching token supply:', err)
        setError(err instanceof Error ? err.message : 'Unknown error occurred')
        // Fallback to mock data for HEX if there's an error
        if (tokenTicker === 'HEX') {
          setTotalSupply(665000000000) // 665B HEX fallback
        }
      } finally {
        setLoading(false)
      }
    }

    fetchTokenSupply()
  }, [tokenTicker])

  return { totalSupply, loading, error }
}

export default function LeagueTable({ tokenTicker }: LeagueTableProps) {
  const { totalSupply, loading, error } = useTokenSupply(tokenTicker)

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

  const formatCurrency = (num: number): string => {
    return formatNumber(num, { prefix: '$', compact: true, decimals: 0 })
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
      <div className="grid grid-cols-3 items-center gap-4 mb-6">
        <div className="flex items-center space-x-3">
          <CoinLogo
            symbol="HEX"
            size="md"
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
          <div className="text-white font-bold">$5.55B</div>
        </div>
        <div className="text-right">
          <div className="text-gray-400 text-sm">Supply</div>
          <div className="text-white font-bold">{formatNumber(totalSupply, { compact: true })}</div>
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
              {formatCurrency(rank.marketCap)}
            </div>

            {/* Supply Required - Right Aligned */}
            <div className="text-gray-400 text-right flex items-center justify-end">
              {formatNumber(rank.minTokens, { compact: true })}
              <CoinLogo
                symbol="HEX"
                size="sm"
                className="brightness-0 invert rounded-none ml-1"
                variant="no-bg"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 