'use client'

import { usePhattyPools } from '@/hooks/crypto/usePhattyPools'
import { formatDollarValue } from '@/utils/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface PhattyPoolsTableProps {
  tokenFilter?: string // Optional filter to show only pools containing this token
  maxPools?: number // Limit number of pools displayed
}

export function PhattyPoolsTable({ tokenFilter, maxPools = 10 }: PhattyPoolsTableProps) {
  const { pools, isLoading, error, getTotalTVL } = usePhattyPools()

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Phatty Pools</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-500">
            <p>Failed to load pool data</p>
            <p className="text-sm text-gray-500 mt-1">{error.message}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Phatty Pools</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-6 w-20" />
                </div>
                <Skeleton className="h-6 w-24" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Filter pools if tokenFilter is provided
  let filteredPools = pools
  if (tokenFilter) {
    filteredPools = pools.filter(pool => 
      pool.token0.symbol.toLowerCase().includes(tokenFilter.toLowerCase()) ||
      pool.token1.symbol.toLowerCase().includes(tokenFilter.toLowerCase())
    )
  }

  // Limit pools if maxPools is provided
  const displayPools = filteredPools.slice(0, maxPools)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Phatty Pools</span>
          <div className="text-sm text-gray-500">
            Total TVL: {formatDollarValue(getTotalTVL())}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {displayPools.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            {tokenFilter ? `No pools found containing "${tokenFilter}"` : 'No pools available'}
          </div>
        ) : (
          <div className="space-y-3">
            {displayPools.map((pool) => (
              <div 
                key={pool.id} 
                className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <Badge variant="outline">
                    {pool.token0.symbol}
                  </Badge>
                  <span className="text-gray-400">·</span>
                  <Badge variant="outline">
                    {pool.token1.symbol}
                  </Badge>
                  {pool.fee && (
                    <Badge variant="secondary" className="text-xs">
                      {pool.fee}% fee
                    </Badge>
                  )}
                </div>
                
                <div className="text-right">
                  {pool.tvl && (
                    <div className="font-semibold">
                      {formatDollarValue(pool.tvl)}
                    </div>
                  )}
                  {pool.volume24h && (
                    <div className="text-sm text-gray-500">
                      24h: {formatDollarValue(pool.volume24h)}
                    </div>
                  )}
                </div>
              </div>
            ))}
            
            {filteredPools.length > maxPools && (
              <div className="text-center text-sm text-gray-500 pt-2">
                Showing {maxPools} of {filteredPools.length} pools
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Simplified version for embedding in other components
export function PhattyPoolsWidget({ tokenSymbol }: { tokenSymbol: string }) {
  const { pools, isLoading, getPoolsByToken } = usePhattyPools()
  
  if (isLoading) {
    return <Skeleton className="h-6 w-32" />
  }
  
  const tokenPools = getPoolsByToken(tokenSymbol)
  
  if (tokenPools.length === 0) {
    return null
  }
  
  const totalTVL = tokenPools.reduce((sum, pool) => sum + (pool.tvl || 0), 0)
  
  return (
    <div className="inline-flex items-center space-x-2 text-sm">
      <Badge variant="outline">{tokenPools.length} pools</Badge>
      {totalTVL > 0 && (
        <span className="text-gray-500">
          TVL: {formatDollarValue(totalTVL)}
        </span>
      )}
    </div>
  )
}
