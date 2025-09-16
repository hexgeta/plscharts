'use client'

import React, { useState, useMemo } from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

interface TickData {
  tickIdx: string
  liquidityGross: string
  liquidityNet: string
  price0: string
  price1: string
}

interface SurroundingTicksChartProps {
  ticks: TickData[]
  currentPrice?: number
  title?: string
  height?: number
}

interface ChartDataPoint {
  tickIdx: number
  price: number
  liquidity: number
  normalizedLiquidity: number
  distanceFromCurrent: number
  // Add your existing chart data fields here
  volume?: number
  fees?: number
  tvl?: number
}

export function SurroundingTicksChart({ 
  ticks, 
  currentPrice = 1, 
  title = "Liquidity Distribution with Surrounding Ticks",
  height = 400
}: SurroundingTicksChartProps) {
  const [showOtherPositions, setShowOtherPositions] = useState(true)
  const [showVolume, setShowVolume] = useState(true)
  const [showLiquidity, setShowLiquidity] = useState(true)
  const [showFees, setShowFees] = useState(false)
  const [showTVL, setShowTVL] = useState(false)

  // Transform surrounding ticks data for the chart
  const chartData = useMemo(() => {
    if (!ticks || ticks.length === 0) return []

    return ticks.map(tick => {
      const tickIdx = parseInt(tick.tickIdx)
      const price = parseFloat(tick.price0)
      const liquidity = parseFloat(tick.liquidityGross)
      
      return {
        tickIdx,
        price,
        liquidity,
        // Normalize liquidity for better visualization (log scale)
        normalizedLiquidity: liquidity > 0 ? Math.log10(liquidity + 1) : 0,
        // Calculate distance from current price
        distanceFromCurrent: Math.abs(price - currentPrice),
        // Mock data for demonstration - replace with your actual data
        volume: Math.random() * 1000000,
        fees: Math.random() * 10000,
        tvl: Math.random() * 5000000
      }
    }).sort((a, b) => a.tickIdx - b.tickIdx) // Sort by tick index
  }, [ticks, currentPrice])

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-black/90 border border-white/10 p-3 rounded-lg">
          <p className="text-white font-semibold">Tick: {data.tickIdx}</p>
          <p className="text-blue-400">Price: ${data.price.toFixed(6)}</p>
          <p className="text-green-400">Liquidity: {data.liquidity.toLocaleString()}</p>
          <p className="text-gray-400 text-sm">
            Distance from current: {data.distanceFromCurrent.toFixed(6)}
          </p>
          {showVolume && <p className="text-yellow-400">Volume: ${data.volume?.toLocaleString()}</p>}
          {showFees && <p className="text-purple-400">Fees: ${data.fees?.toLocaleString()}</p>}
          {showTVL && <p className="text-orange-400">TVL: ${data.tvl?.toLocaleString()}</p>}
        </div>
      )
    }
    return null
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{title}</span>
          <div className="flex items-center space-x-2">
            <Label htmlFor="show-other-positions" className="text-sm">
              Show Other Positions
            </Label>
            <Switch
              id="show-other-positions"
              checked={showOtherPositions}
              onCheckedChange={setShowOtherPositions}
            />
          </div>
        </CardTitle>
        
        {/* Chart Type Toggles */}
        <div className="flex flex-wrap gap-4 mt-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="show-volume"
              checked={showVolume}
              onCheckedChange={setShowVolume}
            />
            <Label htmlFor="show-volume" className="text-sm">Volume</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="show-liquidity"
              checked={showLiquidity}
              onCheckedChange={setShowLiquidity}
            />
            <Label htmlFor="show-liquidity" className="text-sm">Liquidity</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="show-fees"
              checked={showFees}
              onCheckedChange={setShowFees}
            />
            <Label htmlFor="show-fees" className="text-sm">Fees</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="show-tvl"
              checked={showTVL}
              onCheckedChange={setShowTVL}
            />
            <Label htmlFor="show-tvl" className="text-sm">TVL</Label>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div style={{ height: `${height}px` }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(136, 136, 136, 0.2)" />
              <XAxis 
                dataKey="tickIdx"
                stroke="#888"
                tick={{ fill: '#888', fontSize: 12 }}
                label={{ value: 'Tick Index', position: 'insideBottom', offset: -10, style: { fill: '#888' } }}
              />
              <YAxis 
                stroke="#888"
                tick={{ fill: '#888', fontSize: 12 }}
                label={{ value: 'Value', angle: -90, position: 'insideLeft', style: { fill: '#888' } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              
              {/* Semi-transparent bars for other people's liquidity positions */}
              {showOtherPositions && (
                <Bar 
                  dataKey="normalizedLiquidity" 
                  fill="#ff6b6b" 
                  fillOpacity={0.3}
                  radius={[2, 2, 0, 0]}
                  name="Other Positions"
                />
              )}
              
              {/* Your existing data series */}
              {showVolume && (
                <Line 
                  type="monotone" 
                  dataKey="volume" 
                  stroke="#00ff55" 
                  strokeWidth={2}
                  dot={false}
                  name="Volume"
                />
              )}
              
              {showLiquidity && (
                <Line 
                  type="monotone" 
                  dataKey="liquidity" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={false}
                  name="Liquidity"
                />
              )}
              
              {showFees && (
                <Line 
                  type="monotone" 
                  dataKey="fees" 
                  stroke="#8b5cf6" 
                  strokeWidth={2}
                  dot={false}
                  name="Fees"
                />
              )}
              
              {showTVL && (
                <Line 
                  type="monotone" 
                  dataKey="tvl" 
                  stroke="#f59e0b" 
                  strokeWidth={2}
                  dot={false}
                  name="TVL"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export default SurroundingTicksChart
