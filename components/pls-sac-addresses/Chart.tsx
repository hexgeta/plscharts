'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { Skeleton } from "@/components/ui/skeleton2";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { useCryptoPrice } from "@/hooks/crypto/useCryptoPrice";
import { formatNumber } from "@/utils/format";

interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp: string;
  blockNumber: string;
  isError?: string;
  reference: string;
  label: string;
}

interface Props {
  transactions: Transaction[];
  isLoading: boolean;
  dateRange: DateRange | undefined;
}

// Update the color scheme to include all daughters
const WALLET_COLORS = {
  'Main Sac': '#FFFF00',
  'Daughter 1': '#00FFFF',  // 0x1b7baa734c00298b9429b518d621753bb0f6eff2
  'Daughter 2': '#FF00FF',  // 0x799bdc3f2075230ff85ec6767eaaa92365fdde0b
  'Daughter 3': '#00FF00',
  'Daughter 4': '#FF8C00',
  'Daughter 5': '#4B0082',
  'Daughter 6': '#FF1493',
  'Daughter 7': '#20B2AA',
  'Daughter 8': '#BA55D3',
  'Daughter 9': '#F0E68C',
  'Daughter 10': '#98FB98',
  'Daughter 11': '#FFA07A',
  'Daughter 12': '#9370DB',
  'Daughter 13': '#3CB371',
  'Daughter 14': '#FFB6C1',
  'Daughter 15': '#BDB76B',
  'Daughter 16': '#20B2AA',
  'Daughter 17': '#FF69B4',
  'Daughter 18': '#7B68EE',
  'Daughter 19': '#00CED1',
  'Daughter 20': '#DEB887',
  'Daughter 21': '#00FFFF',
  'Daughter 22': '#9932CC',
  'Daughter 23': '#FF7F50',
  'Daughter 24': '#8FBC8F',
  'Daughter 25': '#E6E6FA',
  'Daughter 26': '#B8860B',
  'Daughter 27': '#98FB98',
  'Daughter 28': '#CD853F',
  'Daughter 29': '#FFB6C1',
  'Daughter 30': '#7B68EE'
};

function TransactionsChart({ transactions, isLoading, dateRange }: Props) {
  const [chartData, setChartData] = useState<any[]>([]);
  const { priceData: ethPrice } = useCryptoPrice('WETH');
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const formatEthValue = (value: number) => {
    const prefix = value >= 0 ? '+' : '';
    return `${prefix}${Math.round(value)} ETH`;
  };

  const formatDollarValue = (ethAmount: number) => {
    if (!ethPrice?.price) return '$...';
    const value = Math.abs(ethAmount) * ethPrice.price;
    if (value >= 1000000) {
      return `$${(value / 1000000).toFixed(2)}M`;
    } else if (value >= 1000) {
      return `$${(value / 1000).toFixed(2)}K`;
    }
    return formatNumber(value, { prefix: '$' });
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // First filter out zero values, then sort by sign (positive first) and then by absolute magnitude
      const sortedPayload = [...payload]
        .filter(entry => entry.value !== 0)
        .sort((a, b) => {
          // First sort by sign (positive before negative)
          if (a.value >= 0 && b.value < 0) return -1;
          if (a.value < 0 && b.value >= 0) return 1;
          // Then sort by absolute magnitude within each sign group
          return Math.abs(b.value) - Math.abs(a.value);
        });

      return (
        <div className="bg-black/80 border border-[#333] p-4 rounded-lg shadow-lg" style={{
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          borderRadius: '6px',
          padding: '10px'
        }}>
          <p className="text-white mb-2" style={{ fontSize: '14px' }}>{formatDate(label)}</p>
          {sortedPayload.map((entry: any, index: number) => (
            <div key={index} className="mb-1">
              <p style={{ color: entry.color }} className="flex flex-col">
                <span className="text-base font-medium">{formatEthValue(entry.value)}</span>
                <span className="text-xs opacity-80">{formatDollarValue(entry.value)}</span>
              </p>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  useEffect(() => {
    if (transactions.length > 0) {
      const dailyTotals = new Map();
      
      let minDate = dateRange?.from || new Date(3000, 0, 1);
      let maxDate = dateRange?.to || today;

      if (!dateRange?.from) {
        transactions.forEach(tx => {
          const txDate = new Date(parseInt(tx.timeStamp) * 1000);
          if (txDate < minDate) minDate = txDate;
        });
      }

      if (minDate > maxDate) {
        [minDate, maxDate] = [maxDate, minDate];
      }

      // Initialize with all wallet addresses
      for (let d = new Date(minDate); d <= maxDate; d.setDate(d.getDate() + 1)) {
        const dateKey = format(d, 'yyyy-MM-dd');
        const initialValues = Object.keys(WALLET_COLORS).reduce((acc, label) => ({
          ...acc,
          [label]: 0
        }), {});
        
        dailyTotals.set(dateKey, {
          date: new Date(d),
          dateStr: dateKey,
          ...initialValues
        });
      }

      // Fill in the actual transaction data
      transactions.forEach(tx => {
        const txDate = new Date(parseInt(tx.timeStamp) * 1000);
        const dateKey = format(txDate, 'yyyy-MM-dd');
        const entry = dailyTotals.get(dateKey);
        
        if (entry && tx.label in WALLET_COLORS) {
          const value = Number(tx.value) / 1e18;
          const isOutgoing = tx.from.toLowerCase() === tx.reference.toLowerCase();
          const adjustedValue = isOutgoing ? -value : value;
          
          entry[tx.label] += adjustedValue;
        }
      });

      setChartData(Array.from(dailyTotals.values())
        .sort((a, b) => a.date.getTime() - b.date.getTime()));
    }
  }, [transactions, dateRange]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return format(new Date(dateStr), 'MMM d, yyyy');
  };

  if (isLoading) {
    return (
      <div className="w-full h-[600px] my-8 relative">
        <div className="w-full h-full p-5 border border-white/20 rounded-[15px]">
          <Skeleton variant="chart" className="w-full h-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[600px] my-8 relative">
      <div className="w-full h-full p-5 border border-white/20 rounded-[15px]">
        <h2 className="text-left text-white text-2xl mb-4 ml-10">
          Pls Sac Movements Over Time
        </h2>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart 
            data={chartData}
            margin={{ 
              top: 20, 
              right: 30, 
              left: 50, 
              bottom: window.innerWidth < 768 ? 0 : 0
            }}
            barGap={0}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="rgba(136, 136, 136, 0.2)" 
              vertical={false} 
            />
            <XAxis 
              dataKey="dateStr"
              axisLine={{ stroke: '#888', strokeWidth: 0 }}
              tickLine={false}
              tick={{ fill: '#888', fontSize: 12, dy: 10 }}
              interval="preserveStartEnd"
              minTickGap={50}
              tickFormatter={formatDate}
              label={{ 
                value: 'DATE', 
                position: 'bottom',
                offset: 15,
                style: { fill: '#888', fontSize: 12 }
              }}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#888', fontSize: 12, dx: -10 }}
              tickFormatter={(value) => `${Math.round(value)}`}
              domain={['auto', 'auto']}
              allowDataOverflow={false}
              label={{ 
                value: 'ETH', 
                position: 'left',
                angle: -90,
                offset: 15,
                style: { 
                  fill: '#888',
                  fontSize: 12,
                }
              }}
            />
            <Tooltip 
              content={<CustomTooltip />}
              cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
            />
            {Object.entries(WALLET_COLORS).map(([label, color]) => (
              <Bar 
                key={`${label}-negative`}
                dataKey={(entry) => entry[label] < 0 ? entry[label] : 0}
                name={label}
                fill="#FF6B6B"
                radius={[2, 2, 0, 0]}
                fillOpacity={0.8}
                stackId="negative"
              />
            ))}
            {Object.entries(WALLET_COLORS).map(([label, color]) => (
              <Bar 
                key={`${label}-positive`}
                dataKey={(entry) => entry[label] > 0 ? entry[label] : 0}
                name={label}
                fill="#90EE90"
                radius={[2, 2, 0, 0]}
                fillOpacity={0.8}
                stackId="positive"
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default TransactionsChart; 