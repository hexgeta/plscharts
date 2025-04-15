'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { Skeleton } from "@/components/ui/skeleton2";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";

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

// Use the same color scheme as the table
const WALLET_COLORS = {
  'Main Sac': '#FFFF00',
  'Daughter 1': '#00FFFF',
  'Daughter 2': '#FF00FF'
};

function TransactionsChart({ transactions, isLoading, dateRange }: Props) {
  const [chartData, setChartData] = useState<any[]>([]);
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const formatNumber = (value: number) => {
    if (value === 0) return '0';
    return `${value.toFixed(0)} ETH`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/80 border border-[#333] p-4 rounded-lg shadow-lg">
          <p className="text-white mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index}>
              <p style={{ color: entry.color }}>
                {entry.value} ETH
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
      // Create a map to store daily transaction totals
      const dailyTotals = new Map();
      
      // Set min and max dates based on date range filter or transaction dates
      let minDate = dateRange?.from || new Date(3000, 0, 1);
      let maxDate = dateRange?.to || today; // Use today as the default end date

      // If no date range is set, find min from transactions but keep max as today
      if (!dateRange?.from) {
        transactions.forEach(tx => {
          const txDate = new Date(parseInt(tx.timeStamp) * 1000);
          if (txDate < minDate) minDate = txDate;
        });
      }

      // Ensure we have valid dates
      if (minDate > maxDate) {
        [minDate, maxDate] = [maxDate, minDate];
      }

      // Create entries for every day between min and max date
      for (let d = new Date(minDate); d <= maxDate; d.setDate(d.getDate() + 1)) {
        const dateKey = format(d, 'yyyy-MM-dd');
        dailyTotals.set(dateKey, {
          date: new Date(d),
          dateStr: dateKey,
          'Main Sac': 0,
          'Daughter 1': 0,
          'Daughter 2': 0
        });
      }

      // Fill in the actual transaction data
      transactions.forEach(tx => {
        const txDate = new Date(parseInt(tx.timeStamp) * 1000);
        const dateKey = format(txDate, 'yyyy-MM-dd');
        const entry = dailyTotals.get(dateKey);
        
        if (entry) {
          const value = Number(tx.value) / 1e18; // Convert from Wei to ETH
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

  const customLegend = (props: any) => {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        width: '100%',
        marginTop: '50px'
      }}
      className="hidden md:flex"
      >
        <ul style={{ 
          listStyle: 'none', 
          padding: 0, 
          display: 'grid',
          gridTemplateColumns: 'repeat(3, auto)',
          gap: '8px 14px',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          {Object.entries(WALLET_COLORS).map(([label, color]) => (
            <li key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ color, fontSize: '24px', lineHeight: '1' }}>●</span>
              <span style={{ color: '#fff', fontSize: '12px' }}>{label}</span>
            </li>
          ))}
        </ul>
      </div>
    );
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
            barCategoryGap="15%"
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
              tickFormatter={(value) => `${value.toFixed(0)}`}
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
            <Tooltip content={<CustomTooltip />} />
            <Legend content={customLegend} />
            {Object.entries(WALLET_COLORS).map(([label, color]) => (
              <Bar 
                key={label}
                dataKey={label}
                name={label}
                fill={color}
                radius={[2, 2, 0, 0]}
                fillOpacity={0.8}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default TransactionsChart; 