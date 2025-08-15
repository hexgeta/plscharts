'use client'

import { usePhuxPools, usePhuxPoolsByToken, formatPhuxPool } from '@/hooks/crypto/usePhuxPools'
import { formatNumber } from '@/utils/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton2'
import { CoinLogo } from '@/components/ui/CoinLogo'

interface PhuxPoolsTableProps {
  tokenFilter?: string // Optional filter to show only pools containing this token
  maxPools?: number // Limit number of pools displayed
  orderBy?: string // Field to order by
  orderDirection?: 'asc' | 'desc'
}

export function PhuxPoolsTable({ 
  tokenFilter, 
  maxPools = 20,
  orderBy = 'totalLiquidity',
  orderDirection = 'desc'
}: PhuxPoolsTableProps) {
  const { pools, isLoading, error, getTotalTVL, getTopPoolsByTVL } = usePhuxPools({
    first: 100,
    orderBy,
    orderDirection
  })

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>PHUX Pools</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-red-500">
            <p>Failed to load PHUX pool data</p>
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
          <CardTitle>PHUX Pools</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-6 w-32" />
                </div>
                <div className="text-right">
                  <Skeleton className="h-6 w-24 mb-1" />
                  <Skeleton className="h-4 w-16" />
                </div>
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
      pool.tokens.some(token => 
        token.symbol.toLowerCase().includes(tokenFilter.toLowerCase())
      )
    )
  }

  // Limit pools if maxPools is provided
  const displayPools = filteredPools.slice(0, maxPools)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span>PHUX Pools</span>
            <Badge variant="secondary">{pools.length} pools</Badge>
          </div>
          <div className="text-sm text-gray-500">
            Total TVL: {formatNumber(getTotalTVL(), { prefix: '$', compact: true })}
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
            {displayPools.map((pool) => {
              const formatted = formatPhuxPool(pool)
              return (
                <div 
                  key={pool.id} 
                  className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <div className="flex items-center space-x-3">
                    {/* Token logos */}
                    <div className="flex -space-x-2">
                      {pool.tokens.slice(0, 2).map((token, idx) => (
                        <div key={token.address} className="relative">
                          <CoinLogo 
                            symbol={token.symbol} 
                            size="sm" 
                            className="border-2 border-white dark:border-gray-800 rounded-full" 
                          />
                        </div>
                      ))}
                      {pool.tokens.length > 2 && (
                        <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center text-xs font-medium border-2 border-white dark:border-gray-800">
                          +{pool.tokens.length - 2}
                        </div>
                      )}
                    </div>
                    
                    {/* Pool info */}
                    <div>
                      <div className="font-semibold">
                        {formatted.displayName}
                      </div>
                      <div className="flex items-center space-x-2 text-sm text-gray-500">
                        <Badge variant="outline" className="text-xs">
                          {pool.poolType}
                        </Badge>
                        <span>{formatted.feeFormatted} fee</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* TVL and shares */}
                  <div className="text-right">
                    <div className="font-semibold">
                      {formatted.tvlFormatted}
                    </div>
                    <div className="text-sm text-gray-500">
                      {parseFloat(pool.totalShares).toLocaleString()} shares
                    </div>
                  </div>
                </div>
              )
            })}
            
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

// Simplified widget for embedding in other components
export function PhuxPoolsWidget({ tokenSymbol }: { tokenSymbol: string }) {
  const { pools, isLoading, totalTVL, count } = usePhuxPoolsByToken(tokenSymbol)
  
  if (isLoading) {
    return <Skeleton className="h-6 w-32" />
  }
  
  if (count === 0) {
    return null
  }
  
  return (
    <div className="inline-flex items-center space-x-2 text-sm">
      <Badge variant="outline">{count} PHUX pool{count !== 1 ? 's' : ''}</Badge>
      {totalTVL > 0 && (
        <span className="text-gray-500">
          TVL: {formatNumber(totalTVL, { prefix: '$', compact: true })}
        </span>
      )}
    </div>
  )
}

// Top pools component for dashboard display
export function PhuxTopPools({ limit = 5 }: { limit?: number }) {
  const { isLoading, error, getTopPoolsByTVL } = usePhuxPools()
  
  if (error || isLoading) {
    return null
  }
  
  const topPools = getTopPoolsByTVL(limit)
  
  return (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold">Top PHUX Pools</h3>
      <div className="space-y-2">
        {topPools.map((pool) => {
          const formatted = formatPhuxPool(pool)
          return (
            <div key={pool.id} className="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-800 rounded">
              <div className="flex items-center space-x-2">
                <div className="flex -space-x-1">
                  {pool.tokens.slice(0, 2).map((token) => (
                    <CoinLogo key={token.address} symbol={token.symbol} size="xs" />
                  ))}
                </div>
                <span className="text-sm font-medium">{formatted.displayName}</span>
              </div>
              <span className="text-sm">{formatted.tvlFormatted}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
