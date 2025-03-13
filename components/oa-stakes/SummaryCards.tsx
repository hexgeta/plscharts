'use client';

import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton2";

interface SummaryStats {
  stakeCount: number;
  walletCount: number;
  totalHexStaked: {
    ETH: number;
    PLS: number;
  };
  averageStakeSize: number;
  averageStakeLength: number;
}

interface SummaryCardsProps {
  isLoading: boolean;
  stats: SummaryStats;
  eHexPrice?: { price: number };
  pHexPrice?: { price: number };
}

const formatNumber = (value: number | string, decimals = 1) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) return '0';
  
  if (num >= 1_000_000_000) {
    return `${(num / 1_000_000_000).toFixed(decimals)}B`;
  }
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(decimals)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(decimals)}K`;
  }
  
  return num.toFixed(decimals);
};

export function SummaryCards({ isLoading, stats, eHexPrice, pHexPrice }: SummaryCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
        {[...Array(5)].map((_, i) => (
          <Card key={i} className="bg-black border border-white/20">
            <CardContent className="p-0">
              <div className="skeleton h-[104px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
      <Card className="bg-black border border-white/20">
        <CardContent className="p-4">
          <p className="text-gray-400 text-sm">Total Active Stake Count</p>
          <p className="text-2xl font-bold text-white">{formatNumber(stats.stakeCount, 0)}</p>
        </CardContent>
      </Card>
      
      <Card className="bg-black border border-white/20">
        <CardContent className="p-4">
          <p className="text-gray-400 text-sm">Wallet Count</p>
          <p className="text-2xl font-bold text-white">{formatNumber(stats.walletCount, 0)}</p>
        </CardContent>
      </Card>
      
      <Card className="bg-black border border-white/20">
        <CardContent className="p-4">
          <p className="text-gray-400 text-sm">Total HEX Staked</p>
          <p className="text-2xl font-bold text-white">{formatNumber(stats.totalHexStaked.ETH + stats.totalHexStaked.PLS)} HEX</p>
          <p className="text-gray-400 text-sm">
            {(eHexPrice?.price && pHexPrice?.price) ? 
              `$${formatNumber((stats.totalHexStaked.ETH * eHexPrice.price) + (stats.totalHexStaked.PLS * pHexPrice.price))}` 
              : '-'}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-black border border-white/20">
        <CardContent className="p-4">
          <p className="text-gray-400 text-sm">Average Stake Size</p>
          <p className="text-2xl font-bold text-white">{formatNumber(stats.averageStakeSize)} HEX</p>
          <p className="text-gray-400 text-sm">
            {(eHexPrice?.price && pHexPrice?.price) ? 
              `$${formatNumber(stats.averageStakeSize * ((eHexPrice.price + pHexPrice.price) / 2))}` 
              : '-'}
          </p>
        </CardContent>
      </Card>

      <Card className="bg-black border border-white/20">
        <CardContent className="p-4">
          <p className="text-gray-400 text-sm">Average Stake Length</p>
          <p className="text-2xl font-bold text-white">{Math.round(stats.averageStakeLength)} D</p>
        </CardContent>
      </Card>
    </div>
  );
} 