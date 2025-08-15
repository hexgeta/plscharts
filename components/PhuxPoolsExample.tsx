'use client'

import { PhuxPoolsTable, PhuxPoolsWidget, PhuxTopPools } from './PhuxPoolsTable'
import { usePhuxPools, usePhuxPoolsByToken } from '@/hooks/crypto/usePhuxPools'

// Example component showing different ways to use the PHUX pools integration
export function PhuxPoolsExample() {
  const { pools, isLoading, getTotalTVL } = usePhuxPools()
  const { pools: hexPools } = usePhuxPoolsByToken('HEX')

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">PHUX Pools Integration Example</h1>
      
      {/* Basic stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-800 dark:text-blue-200">Total Pools</h3>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
            {isLoading ? '...' : pools.length}
          </p>
        </div>
        
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
          <h3 className="font-semibold text-green-800 dark:text-green-200">Total TVL</h3>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400">
            {isLoading ? '...' : `$${getTotalTVL().toLocaleString()}`}
          </p>
        </div>
        
        <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
          <h3 className="font-semibold text-purple-800 dark:text-purple-200">HEX Pools</h3>
          <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
            {hexPools.length}
          </p>
        </div>
      </div>

      {/* Widget examples */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Pool Widgets</h2>
        <div className="flex flex-wrap gap-4">
          <PhuxPoolsWidget tokenSymbol="HEX" />
          <PhuxPoolsWidget tokenSymbol="PLS" />
          <PhuxPoolsWidget tokenSymbol="USDT" />
          <PhuxPoolsWidget tokenSymbol="DECI" />
        </div>
      </div>

      {/* Top pools sidebar component */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Full pools table */}
          <PhuxPoolsTable maxPools={100} />
        </div>
        
        <div>
          {/* Top pools widget */}
          <PhuxTopPools limit={5} />
          
          {/* Filtered pools */}
          <div className="mt-6">
            <PhuxPoolsTable 
              tokenFilter="HEX" 
              maxPools={5}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default PhuxPoolsExample
