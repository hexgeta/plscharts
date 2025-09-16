'use client'

import { useState } from 'react'
import { SurroundingTicksChart } from '@/components/SurroundingTicksChart'
import { useSurroundingTicks } from '@/hooks/crypto/useSurroundingTicks'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'

export default function SurroundingTicksDemo() {
  const [poolAddress, setPoolAddress] = useState('0x8437bfee6629327bd369fb136a6e74')
  const [currentPrice, setCurrentPrice] = useState(1.0)
  
  const { ticks, isLoading, error } = useSurroundingTicks(poolAddress)

  const handlePoolAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPoolAddress(e.target.value)
  }

  const handleCurrentPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCurrentPrice(parseFloat(e.target.value) || 1.0)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Surrounding Ticks Chart Demo</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Visualize other people's liquidity positions around your own positions
        </p>
      </div>

      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Chart Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="pool-address">Pool Address</Label>
              <Input
                id="pool-address"
                value={poolAddress}
                onChange={handlePoolAddressChange}
                placeholder="Enter pool address"
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="current-price">Current Price</Label>
              <Input
                id="current-price"
                type="number"
                value={currentPrice}
                onChange={handleCurrentPriceChange}
                placeholder="Enter current price"
                className="mt-1"
                step="0.000001"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      <SurroundingTicksChart
        ticks={ticks}
        currentPrice={currentPrice}
        title="Liquidity Distribution with Surrounding Ticks"
        height={500}
      />

      {/* Data Info */}
      <Card>
        <CardHeader>
          <CardTitle>Data Information</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading surrounding ticks data...</p>
            </div>
          )}
          
          {error && (
            <div className="text-center py-4">
              <p className="text-red-600">Error loading data: {error.message}</p>
            </div>
          )}
          
          {!isLoading && !error && ticks.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                <strong>Total Ticks:</strong> {ticks.length}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Pool Address:</strong> {poolAddress}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Current Price:</strong> ${currentPrice.toFixed(6)}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Price Range:</strong> ${Math.min(...ticks.map(t => parseFloat(t.price0))).toFixed(6)} - ${Math.max(...ticks.map(t => parseFloat(t.price0))).toFixed(6)}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>How to Use</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h4 className="font-semibold">1. Semi-Transparent Bars</h4>
            <p className="text-sm text-gray-600">
              The red semi-transparent bars show other people's liquidity positions at different price levels.
            </p>
          </div>
          <div>
            <h4 className="font-semibold">2. Toggle Controls</h4>
            <p className="text-sm text-gray-600">
              Use the switches to show/hide different data series (Volume, Liquidity, Fees, TVL).
            </p>
          </div>
          <div>
            <h4 className="font-semibold">3. Interactive Tooltip</h4>
            <p className="text-sm text-gray-600">
              Hover over the chart to see detailed information about each tick.
            </p>
          </div>
          <div>
            <h4 className="font-semibold">4. Integration</h4>
            <p className="text-sm text-gray-600">
              This component can be integrated into your existing chart by replacing the chart type with ComposedChart and adding the Bar component.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
