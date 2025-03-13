'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Skeleton } from "@/components/ui/skeleton2";
import { useCryptoPrice } from "@/hooks/crypto/useCryptoPrice";

interface StakeData {
  id: string;
  address: string;
  stakedHearts: string;
  stakeTShares: string;
  stakedDays: string;
  startDay: string;
  endDay: string;
  isActive: boolean;
  chain: 'ETH' | 'PLS';
}

interface Props {
  stakes: StakeData[];
  isLoading: boolean;
  title: string;
}

function OAStakesChart({ stakes, isLoading, title }: Props) {
  const [chartData, setChartData] = useState<any[]>([]);
  const { priceData: pHexPrice } = useCryptoPrice('pHEX');
  const { priceData: eHexPrice } = useCryptoPrice('eHEX');

  useEffect(() => {
    if (stakes.length > 0) {
      // Process stakes data for the chart
      const processedData = stakes.map(stake => {
        const hexAmount = Number(stake.stakedHearts) / 1e8;
        const price = stake.chain === 'ETH' ? eHexPrice?.price : pHexPrice?.price;
        const usdValue = price ? hexAmount * price : 0;
        
        return {
          address: `${stake.address.slice(0, 6)}...${stake.address.slice(-4)}`,
          ethStart: stake.chain === 'ETH' ? hexAmount : 0,
          plsStart: stake.chain === 'PLS' ? hexAmount : 0,
          ethEnd: stake.chain === 'ETH' ? hexAmount : 0,
          plsEnd: stake.chain === 'PLS' ? hexAmount : 0,
          startDate: new Date(Number(stake.startDay) * 86400000 + new Date('2019-12-03').getTime()),
          endDate: new Date(Number(stake.endDay) * 86400000 + new Date('2019-12-03').getTime()),
          usdValue,
          chain: stake.chain,
          isActive: stake.isActive,
          fullAddress: stake.address
        };
      });

      // Sort by start date and amount
      const sortedData = processedData.sort((a, b) => {
        const dateCompare = b.startDate.getTime() - a.startDate.getTime();
        if (dateCompare !== 0) return dateCompare;
        return (b.ethStart + b.plsStart) - (a.ethStart + a.plsStart);
      });

      setChartData(sortedData);
    }
  }, [stakes, eHexPrice, pHexPrice]);

  const formatNumber = (value: number) => {
    if (value >= 1_000_000_000) {
      return `${(value / 1_000_000_000).toFixed(1)}B`;
    }
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(1)}M`;
    }
    if (value >= 1_000) {
      return `${(value / 1_000).toFixed(1)}K`;
    }
    return value.toFixed(1);
  };

  const customLegend = (props: any) => {
    const { payload } = props;
    
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        width: '100%', 
        marginTop: '35px' 
      }}>
        <ul style={{ 
          listStyle: 'none', 
          padding: 0, 
          display: 'flex', 
          flexWrap: 'wrap', 
          justifyContent: 'center',
          gap: '20px'
        }}>
          <li style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: '#00FFFF', fontSize: '28px' }}>●</span>
            <span style={{ color: '#fff', fontSize: '12px' }}>ETH Stakes</span>
          </li>
          <li style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: '#9945FF', fontSize: '28px' }}>●</span>
            <span style={{ color: '#fff', fontSize: '12px' }}>PLS Stakes</span>
          </li>
          <li style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: '#FF4B4B', fontSize: '28px' }}>●</span>
            <span style={{ color: '#fff', fontSize: '12px' }}>ETH Maturity</span>
          </li>
          <li style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: '#FF8F00', fontSize: '28px' }}>●</span>
            <span style={{ color: '#fff', fontSize: '12px' }}>PLS Maturity</span>
          </li>
        </ul>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="w-full h-[450px] my-10 relative">
        <Skeleton variant="chart" />
      </div>
    );
  }

  return (
    <div className="w-full h-[450px] my-10 relative">
      <div className="w-full h-full p-5 border border-white/20 rounded-[15px]">
        <h2 className="text-left text-white text-2xl mb-0 ml-10">
          {title}
        </h2>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={chartData}
            margin={{ top: 30, right: 20, left: 20, bottom: 60 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="rgba(136, 136, 136, 0.2)" 
              vertical={false} 
            />
            <XAxis 
              dataKey="address"
              axisLine={{ stroke: '#888', strokeWidth: 0 }}
              tickLine={false}
              tick={{ fill: '#888', fontSize: 12 }}
              angle={45}
              textAnchor="start"
              height={60}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#888', fontSize: 14 }}
              tickFormatter={(value) => formatNumber(value)}
              label={{ 
                value: 'HEX', 
                position: 'left',
                angle: -90,
                offset: 0,
                style: { 
                  fill: '#888',
                  fontSize: 12,
                }
              }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.85)', 
                border: '1px solid rgba(255, 255, 255, 0.2)', 
                borderRadius: '10px',
                padding: '12px'
              }}
              labelStyle={{ color: 'white', marginBottom: '10px' }}
              itemStyle={{ color: 'white', whiteSpace: 'pre-line' }}
              formatter={(value: number, name: string, props: any) => {
                if (value === 0) return ['', ''];
                
                const item = props.payload;
                const formattedDate = item.startDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                });
                const formattedEndDate = item.endDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                });
                
                const chain = name.includes('ETH') ? 'ETH' : 'PLS';
                const price = chain === 'ETH' ? eHexPrice?.price : pHexPrice?.price;
                const usdValue = price ? value * price : 0;
                
                const label = name.includes('End') ? 'Maturity' : 'Start';
                
                return [
                  `${item.fullAddress}\n${formatNumber(value)} HEX\n$${formatNumber(usdValue)}\n${label}: ${name.includes('End') ? formattedEndDate : formattedDate}`,
                  chain
                ];
              }}
            />
            <Legend content={customLegend} />
            <Bar 
              dataKey="ethStart"
              name="ETH Stakes"
              stackId="start"
              fill="#00FFFF"
              radius={[2, 2, 0, 0]}
              fillOpacity={0.8}
            />
            <Bar 
              dataKey="plsStart"
              name="PLS Stakes"
              stackId="start"
              fill="#9945FF"
              radius={[2, 2, 0, 0]}
              fillOpacity={0.8}
            />
            <Bar 
              dataKey="ethEnd"
              name="ETH Maturity"
              stackId="end"
              fill="#FF4B4B"
              radius={[2, 2, 0, 0]}
              fillOpacity={0.4}
            />
            <Bar 
              dataKey="plsEnd"
              name="PLS Maturity"
              stackId="end"
              fill="#FF8F00"
              radius={[2, 2, 0, 0]}
              fillOpacity={0.4}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default OAStakesChart; 