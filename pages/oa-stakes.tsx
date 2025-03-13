import type { NextPage } from 'next';
import { useState } from 'react';
import { DateRange } from 'react-day-picker';
import { Chart, OAStakesTable, Filters, SummaryCards } from '@/components/oa-stakes';
import { useCryptoPrice } from "@/hooks/crypto/useCryptoPrice";

const OAStakesPage: NextPage = () => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'ended'>('all');
  const [chainFilter, setChainFilter] = useState<'all' | 'ETH' | 'PLS'>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(2025, 1, 1),
    to: new Date()
  });
  const [isLoading, setIsLoading] = useState(true);
  const [stakes, setStakes] = useState<any[]>([]);

  const { priceData: pHexPrice } = useCryptoPrice('pHEX');
  const { priceData: eHexPrice } = useCryptoPrice('eHEX');

  // Calculate summary stats from stakes data
  const calculateSummaryStats = () => {
    const filteredStakes = stakes.filter(stake => {
      const matchesChain = chainFilter === 'all' || stake.chain === chainFilter;
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && stake.isActive) || 
        (statusFilter === 'ended' && !stake.isActive);
      
      if (!dateRange?.from || !dateRange?.to) return matchesChain && matchesStatus;
      
      const stakeStartDate = new Date(Number(stake.startDay) * 86400000 + new Date('2019-12-03').getTime());
      return matchesChain && 
             matchesStatus && 
             stakeStartDate >= dateRange.from && 
             stakeStartDate <= dateRange.to;
    });

    if (!filteredStakes.length) return {
      stakeCount: 0,
      walletCount: 0,
      totalHexStaked: { ETH: 0, PLS: 0 },
      averageStakeSize: 0,
      averageStakeLength: 0
    };

    const activeStakes = filteredStakes.filter(stake => stake.isActive);
    const totalStakeLength = activeStakes.reduce((sum, stake) => sum + Number(stake.stakedDays), 0);
    const averageStakeLength = activeStakes.length > 0 ? totalStakeLength / activeStakes.length : 0;
    
    const activeEthStakes = activeStakes.filter(stake => stake.chain === 'ETH');
    const activePlsStakes = activeStakes.filter(stake => stake.chain === 'PLS');
    
    const totalHexStakedETH = activeEthStakes.reduce((sum, stake) => {
      const hexAmount = Number(stake.stakedHearts) / 1e8;
      return sum + hexAmount;
    }, 0);
    
    const totalHexStakedPLS = activePlsStakes.reduce((sum, stake) => {
      const hexAmount = Number(stake.stakedHearts) / 1e8;
      return sum + hexAmount;
    }, 0);
    
    const uniqueWallets = new Set(activeStakes.map(stake => stake.address));
    const totalActiveStakes = activeStakes.length;
    
    return {
      stakeCount: totalActiveStakes,
      walletCount: uniqueWallets.size,
      totalHexStaked: {
        ETH: totalHexStakedETH,
        PLS: totalHexStakedPLS
      },
      averageStakeSize: totalActiveStakes > 0 ? (totalHexStakedETH + totalHexStakedPLS) / totalActiveStakes : 0,
      averageStakeLength
    };
  };

  const summaryStats = calculateSummaryStats();

  return (
    <div className="p-2 sm:p-4">
      <h1 className="text-2xl font-bold mt-10 mb-4 text-center">OA (Origin Address) HEX Stakes</h1>
      <p className="text-white/60 text-center mb-8">
        Track the staking activity of the largest OA & OA-related address HEX Stakes. 
        <br />(*This dataset is incomplete. It covers ~150 OA-related wallets with stake principle above 50M HEX. There are thousands of smaller stakes that have not been included on each chain.)
      </p>

      {/* Filters */}
      <Filters
        chainFilter={chainFilter}
        statusFilter={statusFilter}
        dateRange={dateRange}
        onChainFilterChange={setChainFilter}
        onStatusFilterChange={setStatusFilter}
        onDateRangeChange={setDateRange}
      />

      {/* Summary Cards */}
      <SummaryCards 
        isLoading={isLoading}
        stats={summaryStats}
        eHexPrice={eHexPrice}
        pHexPrice={pHexPrice}
      />

      {/* Chart */}
      <Chart 
        stakes={stakes}
        isLoading={isLoading}
        title="OA Stakes Over Time"
        chainFilter={chainFilter}
        statusFilter={statusFilter}
        dateRange={dateRange}
      />

      {/* Table */}
      <OAStakesTable 
        chainFilter={chainFilter}
        statusFilter={statusFilter}
        dateRange={dateRange}
        onChainFilterChange={setChainFilter}
        onStatusFilterChange={setStatusFilter}
        onDateRangeChange={setDateRange}
        onStakesChange={setStakes}
        onLoadingChange={setIsLoading}
      />
    </div>
  );
};

export default OAStakesPage; 