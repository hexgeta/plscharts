'use client'

import { useMemo } from 'react'
import { usePhuxPools } from './usePhuxPools'

// Types for LP position calculations
export interface LPTokenPrice {
  poolId: string
  poolAddress: string
  poolName: string
  symbol: string
  pricePerShare: number
  totalLiquidity: number
  totalShares: number
  tokens: Array<{
    symbol: string
    name: string
    address: string
  }>
}

export interface LPPosition {
  poolAddress: string
  poolName: string
  symbol: string
  shares: number
  valueUSD: number
  pricePerShare: number
  tokens: Array<{
    symbol: string
    name: string
  }>
}

// Hook to get LP token prices from PHUX pools
export function useLPTokenPrices() {
  const { pools, isLoading, error } = usePhuxPools({
    first: 1000, // Get all pools to have comprehensive LP pricing
    orderBy: 'totalLiquidity',
    orderDirection: 'desc'
  })

  const lpTokenPrices = useMemo(() => {
    if (!pools || pools.length === 0) return new Map<string, LPTokenPrice>()

    const priceMap = new Map<string, LPTokenPrice>()

    pools.forEach(pool => {
      const totalLiquidity = parseFloat(pool.totalLiquidity) || 0
      const totalShares = parseFloat(pool.totalShares) || 0
      
      // Calculate price per share (TVL / total shares)
      const pricePerShare = totalShares > 0 ? totalLiquidity / totalShares : 0

      if (pricePerShare > 0) {
        const lpTokenPrice: LPTokenPrice = {
          poolId: pool.id,
          poolAddress: pool.address.toLowerCase(),
          poolName: pool.name || pool.tokens.map(t => t.symbol).join(' / '),
          symbol: pool.symbol || pool.tokens.map(t => t.symbol).join('-'),
          pricePerShare,
          totalLiquidity,
          totalShares,
          tokens: pool.tokens.map(token => ({
            symbol: token.symbol,
            name: token.name,
            address: token.address.toLowerCase()
          }))
        }



        // Map by pool address (the LP token contract address)
        priceMap.set(pool.address.toLowerCase(), lpTokenPrice)
        
        // Also map by pool ID for convenience
        priceMap.set(pool.id, lpTokenPrice)
      }
    })

    return priceMap
  }, [pools])

      return {
      lpTokenPrices,
      isLoading,
      error,
      getLPTokenPrice: (tokenAddress: string) => {
        if (!tokenAddress) return undefined
        const price = lpTokenPrices.get(tokenAddress.toLowerCase())

        return price
      },
      isLPToken: (tokenAddress: string) => {
        if (!tokenAddress) return false
        return lpTokenPrices.has(tokenAddress.toLowerCase())
      },
      getAllLPTokens: () => Array.from(lpTokenPrices.values())
    }
}

// Hook to calculate LP positions for a specific address
export function useLiquidityPositions(
  holdings: Array<{ 
    contract_address: string
    balance: string
    name?: string
    symbol?: string
  }>,
  enabled: boolean = true
) {
  const { lpTokenPrices, getLPTokenPrice, isLoading, error } = useLPTokenPrices()

  const positions = useMemo(() => {
    if (!enabled || !holdings || holdings.length === 0 || lpTokenPrices.size === 0) {
      return []
    }

    const lpPositions: LPPosition[] = []

    holdings.forEach(holding => {
      const lpTokenPrice = getLPTokenPrice(holding.contract_address)
      
      if (lpTokenPrice) {
        // Use balanceFormatted if available (already decimal-adjusted), otherwise parse balance
        let shares = holding.balanceFormatted !== undefined 
          ? holding.balanceFormatted 
          : parseFloat(holding.balance) || 0
        
        // Safety check: if shares seems too large (>1B), likely using raw balance - apply decimals
        if (shares > 1000000000) {
          console.warn(`[LP] Applying decimal adjustment to ${lpTokenPrice.poolName}: ${shares} -> ${shares / 1e18}`)
          shares = shares / 1e18 // Most LP tokens use 18 decimals
        }
        
        const valueUSD = shares * lpTokenPrice.pricePerShare

        // Debug log only for extremely large values that are clearly wrong
        if (valueUSD > 100000000) { // > $100M
          console.warn(`[LP] Large value: ${lpTokenPrice.poolName} = $${valueUSD.toLocaleString()}`, {
            shares,
            pricePerShare: lpTokenPrice.pricePerShare,
            totalLiquidity: lpTokenPrice.totalLiquidity,
            totalShares: lpTokenPrice.totalShares
          })
        }

        if (shares > 0 && valueUSD > 0.01) { // Filter out dust positions
          lpPositions.push({
            poolAddress: lpTokenPrice.poolAddress,
            poolName: lpTokenPrice.poolName,
            symbol: lpTokenPrice.symbol,
            shares,
            valueUSD,
            pricePerShare: lpTokenPrice.pricePerShare,
            tokens: lpTokenPrice.tokens
          })
        }
      }
    })

    // Sort by USD value descending
    return lpPositions.sort((a, b) => b.valueUSD - a.valueUSD)
  }, [holdings, enabled, lpTokenPrices, getLPTokenPrice])

  const totalLPValue = useMemo(() => {
    const total = positions.reduce((sum, position) => sum + position.valueUSD, 0)
    
    // Only log if total is extremely large (likely wrong)
    if (total > 1000000000) { // > $1B
      console.warn(`[LP] Total value: $${total.toLocaleString()} (${positions.length} positions)`)
    }
    
    return total
  }, [positions])

  return {
    positions,
    totalLPValue,
    isLoading,
    error,
    hasPositions: positions.length > 0
  }
}

// Hook to enhance portfolio holdings with LP pricing
export function useEnhancedPortfolioHoldings(
  holdings: Array<{ 
    contract_address: string
    balance: string
    name?: string
    symbol?: string
    price_usd?: number
  }>,
  includeLPPositions: boolean = false
) {
  const { getLPTokenPrice, isLPToken } = useLPTokenPrices()

  const enhancedHoldings = useMemo(() => {
    if (!holdings || holdings.length === 0) return holdings

    return holdings.map(holding => {
      // Check if this is an LP token
      if (includeLPPositions && isLPToken(holding.contract_address)) {
        const lpTokenPrice = getLPTokenPrice(holding.contract_address)
        
        if (lpTokenPrice) {
          // Use balanceFormatted (decimal-adjusted) instead of raw balance to match LP display calculation
          const shares = parseFloat(holding.balanceFormatted) || 0
          const lpValue = shares * lpTokenPrice.pricePerShare
          
          // Removed excessive debug logging

          return {
            ...holding,
            price_usd: lpTokenPrice.pricePerShare,
            value_usd: lpValue,
            is_lp_token: true,
            lp_pool_name: lpTokenPrice.poolName,
            lp_tokens: lpTokenPrice.tokens
          }
        }
      }

      return {
        ...holding,
        is_lp_token: false
      }
    })
  }, [holdings, includeLPPositions, getLPTokenPrice, isLPToken])

  return enhancedHoldings
}
