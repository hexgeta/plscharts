'use client';

import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { useCOMHistoricalRates } from '@/hooks/crypto/useCOMHistoricalRates';

// Constants for COM rate calculation
const DEFAULT_HEX_PRINCIPAL = 100000; // 100K HEX
const DEFAULT_STAKE_DAYS = 5555;
const START_DAY = 1280;

export default function COMPage() {
  const [hexPrincipal] = useState(DEFAULT_HEX_PRINCIPAL);
  const [stakeDays] = useState(DEFAULT_STAKE_DAYS);
  
  const { historicalRates, isLoading, currentPrices } = useCOMHistoricalRates(
    START_DAY,
    hexPrincipal,
    stakeDays
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-black/90 border border-white/10 p-3 rounded-lg">
          <p className="text-white">{format(new Date(label), 'MMM d, yyyy')}</p>
          <p className="text-[#00ff55] font-mono">
            {data.rate.toFixed(2)}% APR
          </p>
          <p className="text-gray-400 text-sm">
            T-Shares: {data.tShares.toFixed(4)}
          </p>
          <p className="text-gray-400 text-sm">
            COM Bonus: {data.comStartBonus.toFixed(2)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold mb-8">COM Coupon Rate History</h1>
      <Card className="p-6">
        <div className="text-sm text-gray-400 mb-4">
          Showing historical COM coupon rates for a {stakeDays}-day stake of {hexPrincipal.toLocaleString()} HEX
        </div>
        <div className="text-sm text-gray-400 mb-6">
          Current Prices: HEX ${currentPrices.hex.toFixed(6)} | COM ${currentPrices.com.toFixed(6)}
        </div>
        <div className="h-[600px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={historicalRates}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => format(new Date(value), 'MMM d')}
                stroke="#666"
              />
              <YAxis 
                stroke="#666"
                tickFormatter={(value) => `${value.toFixed(1)}%`}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="rate" 
                stroke="#00ff55" 
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
} 