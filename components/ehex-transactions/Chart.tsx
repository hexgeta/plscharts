import React, { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton2";
import { DateRange } from 'react-day-picker';
import { format, addDays, isToday, parseISO } from 'date-fns';
import { useCryptoPrice } from '@/hooks/crypto/useCryptoPrice';

interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timeStamp: string;
  blockNumber: string;
  tokenDecimal?: string;
}

interface ChartProps {
  transactions: Transaction[];
  isLoading: boolean;
  dateRange: DateRange | undefined;
}

const formatNumber = (value: number | string, decimals = 1) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  if (num >= 1_000_000_000) return `${(num / 1_000_000_000).toFixed(decimals)}B`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(decimals)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(decimals)}K`;
  return num.toFixed(decimals);
};

export const Chart: React.FC<ChartProps> = ({ transactions, isLoading }) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const { priceData, isLoading: priceLoading } = useCryptoPrice('eHEX');
  const ehexPrice = priceData?.price || null;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const value = payload[0]?.value || 0;
      const usd = ehexPrice ? value * ehexPrice : null;
      return (
        <div className="bg-black/80 border border-[#333] p-4 rounded-lg shadow-lg">
          <p className="text-white mb-2" style={{ fontSize: '14px' }}>{format(new Date(label), 'MMM d, yyyy')}</p>
          <span className="text-base font-medium text-white">{formatNumber(value, 0)} eHEX</span>
          <div className="text-[#FF6B6B] text-xs mt-1">{usd !== null ? `$${formatNumber(usd, 2)}` : '$...'}</div>
        </div>
      );
    }
    return null;
  };

  useEffect(() => {
    if (!transactions.length) {
      setChartData([]);
      return;
    }
    // Find min and max date
    let minDate = new Date();
    let maxDate = new Date(0);
    transactions.forEach(tx => {
      const d = new Date(Number(tx.timeStamp) * 1000);
      if (d < minDate) minDate = d;
      if (d > maxDate) maxDate = d;
    });
    // Extend maxDate to today if not already
    const today = new Date();
    if (maxDate < today) maxDate = today;
    // Fill in all days
    const daily: Record<string, number> = {};
    transactions.forEach(tx => {
      const date = format(new Date(Number(tx.timeStamp) * 1000), 'yyyy-MM-dd');
      const value = Number(tx.value) / Math.pow(10, Number(tx.tokenDecimal || 8));
      daily[date] = (daily[date] || 0) + value;
    });
    const days: any[] = [];
    for (let d = minDate; d <= maxDate; d = addDays(d, 1)) {
      const dateStr = format(d, 'yyyy-MM-dd');
      days.push({ date: dateStr, value: daily[dateStr] || 0 });
    }
    setChartData(days);
  }, [transactions]);

  // Custom tick formatter for X axis
  const xTickFormatter = (dateStr: string, index: number) => {
    const date = parseISO(dateStr);
    if (index === 0) return format(date, 'yyyy-MM-dd');
    if (isToday(date)) return 'Now';
    return '';
  };

  if (isLoading) {
    return (
      <div className="w-full h-[400px] my-8 relative">
        <div className="w-full h-full p-5 border border-white/20 rounded-[15px] bg-black/40">
          <Skeleton variant="chart" className="w-full h-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[600px] my-8 relative">
      <div className="w-full h-full p-5 border border-white/20 rounded-[15px] bg-black/40">
        <h2 className="text-left text-white text-2xl mb-4 ml-10">Sells Per Day</h2>
        <ResponsiveContainer width="100%" height="80%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 50, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(136, 136, 136, 0.2)" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: '#888', fontSize: 12, dy: 10 }} tickLine={false} axisLine={false} tickFormatter={xTickFormatter} />
            <YAxis tick={{ fill: '#888', fontSize: 12, dx: -10 }} tickFormatter={v => formatNumber(v, 0)} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }} />
            <Bar dataKey="value" fill="#FF6B6B" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}; 