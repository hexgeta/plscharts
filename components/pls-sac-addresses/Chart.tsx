'use client';

import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { Skeleton } from "@/components/ui/skeleton2";
import { useCryptoPrice } from "@/hooks/crypto/useCryptoPrice";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";

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
  chainFilter: 'all' | 'ETH' | 'PLS';
  statusFilter: 'all' | 'active' | 'ended';
  dateRange: DateRange | undefined;
}

function OAStakesChart({ stakes, isLoading, title, chainFilter, statusFilter, dateRange }: Props) {
  const [chartData, setChartData] = useState<any[]>([]);
  const [endingStakesData, setEndingStakesData] = useState<any[]>([]);
  const { priceData: pHexPrice } = useCryptoPrice('pHEX');
  const { priceData: eHexPrice } = useCryptoPrice('eHEX');
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (stakes.length > 0) {
      // Filter stakes based on criteria
      const filteredStakes = stakes.filter(stake => {
        // Status filter
        if (statusFilter !== 'all') {
          if (statusFilter === 'active' && !stake.isActive) return false;
          if (statusFilter === 'ended' && stake.isActive) return false;
        }

        // Chain filter
        if (chainFilter !== 'all' && stake.chain !== chainFilter) return false;

        // Date filter
        if (dateRange?.from || dateRange?.to) {
          const stakeStartDate = new Date(Number(stake.startDay) * 86400000 + new Date('2019-12-03').getTime());
          if (dateRange?.from && stakeStartDate < dateRange.from) return false;
          if (dateRange?.to && stakeStartDate > dateRange.to) return false;
        }

        return true;
      });

      // Process data for both charts
      const processChartData = (useEndDateRange: boolean) => {
        const allDates = new Map();
        
        // Set min and max dates based on date range filter or stake dates
        let minDate = useEndDateRange ? new Date(3000, 0, 1) : (dateRange?.from || new Date(3000, 0, 1));
        let maxDate = useEndDateRange ? new Date(2000, 0, 1) : (dateRange?.to || new Date(2000, 0, 1));

        // If no date range is set or if using end date range, find min/max from stakes
        if (useEndDateRange || !dateRange?.from || !dateRange?.to) {
          filteredStakes.forEach(stake => {
            const startDate = new Date(Number(stake.startDay) * 86400000 + new Date('2019-12-03').getTime());
            const endDate = new Date(Number(stake.endDay) * 86400000 + new Date('2019-12-03').getTime());
            
            if (useEndDateRange) {
              if (endDate < minDate) minDate = endDate;
              if (endDate > maxDate) maxDate = endDate;
            } else {
              if (!dateRange?.from && startDate < minDate) minDate = startDate;
              if (!dateRange?.to && endDate > maxDate) maxDate = endDate;
            }
          });
        }

        // Ensure we have valid dates
        if (minDate > maxDate) {
          [minDate, maxDate] = [maxDate, minDate];
        }

        // Create entries for every day between min and max date
        for (let d = new Date(minDate); d <= maxDate; d.setDate(d.getDate() + 1)) {
          const dateKey = format(d, 'yyyy-MM-dd');
          allDates.set(dateKey, {
            dateStr: dateKey,
            ethStart: 0,
            plsStart: 0,
            ethEnd: 0,
            plsEnd: 0,
            ethStartStakes: 0,
            plsStartStakes: 0,
            ethEndStakes: 0,
            plsEndStakes: 0,
            date: new Date(d)
          });
        }

        // Fill in the actual stake data
        filteredStakes.forEach(stake => {
          const startDate = new Date(Number(stake.startDay) * 86400000 + new Date('2019-12-03').getTime() - (1 * 86400000));
          const endDate = new Date(Number(stake.endDay) * 86400000 + new Date('2019-12-03').getTime() - (1 * 86400000));
          const startDateKey = format(startDate, 'yyyy-MM-dd');
          const endDateKey = format(endDate, 'yyyy-MM-dd');
          
          const hexAmount = Number(stake.stakedHearts) / 1e8;
          
          // Update start date entry if it's within our date range and not in ending stakes view
          if (!useEndDateRange) {
            const startEntry = allDates.get(startDateKey);
            if (startEntry) {
              if (stake.chain === 'ETH') {
                startEntry.ethStart += hexAmount;
                startEntry.ethStartStakes++;
              } else {
                startEntry.plsStart += hexAmount;
                startEntry.plsStartStakes++;
              }
            }
          }

          // Update end date entry if it's within our date range
          const endEntry = allDates.get(endDateKey);
          if (endEntry) {
            if (stake.chain === 'ETH') {
              endEntry.ethEnd += hexAmount;
              endEntry.ethEndStakes++;
            } else {
              endEntry.plsEnd += hexAmount;
              endEntry.plsEndStakes++;
            }
          }
        });

        return Array.from(allDates.values())
          .sort((a, b) => a.date.getTime() - b.date.getTime());
      };

      setChartData(processChartData(false));
      setEndingStakesData(processChartData(true));
    }
  }, [stakes, eHexPrice, pHexPrice, chainFilter, statusFilter, dateRange]);

  const formatNumber = (value: number) => {
    if (value >= 1_000_000_000) {
      return `${(value / 1_000_000_000).toFixed(0)}B`;
    }
    if (value >= 1_000_000) {
      return `${(value / 1_000_000).toFixed(0)}M`;
    }
    if (value >= 1_000) {
      return `${(value / 1_000).toFixed(0)}K`;
    }
    return value.toFixed(0);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    return format(new Date(dateStr), 'MMM d, yyyy');
  };

  const customLegend = (props: any) => {
    const { payload } = props;
    
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
          gridTemplateColumns: 'repeat(2, auto)',
          gap: '8px 14px',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <li style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: '#00FFFF', fontSize: '24px', lineHeight: '1' }}>●</span>
            <span style={{ color: '#fff', fontSize: '12px' }}>ETH Stakes Started</span>
          </li>
          <li style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: '#9945FF', fontSize: '24px', lineHeight: '1' }}>●</span>
            <span style={{ color: '#fff', fontSize: '12px' }}>PLS Stakes Started</span>
          </li>
          <li style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: '#00FFFF', fontSize: '24px', lineHeight: '1', opacity: 0.4 }}>●</span>
            <span style={{ color: '#fff', fontSize: '12px' }}>ETH Stakes Ending</span>
          </li>
          <li style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: '#9945FF', fontSize: '24px', lineHeight: '1', opacity: 0.4 }}>●</span>
            <span style={{ color: '#fff', fontSize: '12px' }}>PLS Stakes Ending</span>
          </li>
        </ul>
      </div>
    );
  };

  const customLegendEnding = (props: any) => {
    const { payload } = props;
    
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
          gridTemplateColumns: 'repeat(2, auto)',
          gap: '8px 14px',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <li style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: '#00FFFF', fontSize: '24px', lineHeight: '1', opacity: 0.4 }}>●</span>
            <span style={{ color: '#fff', fontSize: '12px' }}>ETH Stakes Ending</span>
          </li>
          <li style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: '#9945FF', fontSize: '24px', lineHeight: '1', opacity: 0.4 }}>●</span>
            <span style={{ color: '#fff', fontSize: '12px' }}>PLS Stakes Ending</span>
          </li>
        </ul>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="w-full h-[1200px] my-8 relative">
        <div className="w-full h-full p-5 border border-white/20 rounded-[15px]">
          <Skeleton variant="chart" className="w-full h-full" />
        </div>
      </div>
    );
  }

  const renderChart = (data: any[], showStartBars: boolean, customTitle: string, legendContent: any) => (
    <div className="w-full h-[600px] my-8 relative">
      <div className="w-full h-full p-5 border border-white/20 rounded-[15px]">
        <h2 className="text-left text-white text-2xl mb-4 ml-10">
          {customTitle}
        </h2>
        <ResponsiveContainer width="100%" height="90%">
          <BarChart 
            data={data}
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
            <ReferenceLine
              x={today}
              stroke="#FFD700"
              strokeWidth={2}
              strokeDasharray="3 3"
              label={{
                value: 'Today',
                position: 'top',
                fill: '#FFD700',
                fontSize: 12
              }}
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
              tickFormatter={(value) => formatNumber(value)}
              domain={['auto', 'auto']}
              allowDataOverflow={false}
              label={{ 
                value: 'HEX', 
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
              contentStyle={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.85)', 
                border: '1px solid rgba(255, 255, 255, 0.2)', 
                borderRadius: '6px',
                padding: '10px'
              }}
              labelStyle={{ color: 'white', marginBottom: '4px', fontSize: '14px' }}
              itemStyle={{ color: 'white', padding: 0, margin: 0 }}
              formatter={(value: number, name: string, props: any) => {
                if (value === 0) return ['', ''];
                
                const item = props.payload;
                const chain = name.includes('ETH') ? 'ETH' : 'PLS';
                const price = chain === 'ETH' ? eHexPrice?.price : pHexPrice?.price;
                const usdValue = price ? value * price : 0;
                const isEnd = name.includes('End');
                const color = chain === 'ETH' ? '#00FFFF' : '#9945FF';
                const opacity = isEnd ? 0.5 : 1;
                
                let stakesText = '';
                if (isEnd) {
                  const count = chain === 'ETH' ? item.ethEndStakes : item.plsEndStakes;
                  if (count > 0) {
                    stakesText = ` [${count} stake${count !== 1 ? 's' : ''} ending]`;
                  }
                } else {
                  const count = chain === 'ETH' ? item.ethStartStakes : item.plsStartStakes;
                  if (count > 0) {
                    stakesText = ` [${count} stake${count !== 1 ? 's' : ''} started]`;
                  }
                }

                const formattedValue = `${chain} ${formatNumber(value)} HEX, $${formatNumber(usdValue)}${stakesText}`;
                return [<span style={{ color, opacity }}>{formattedValue}</span>, ''];
              }}
              separator=""
              labelFormatter={(label) => formatDate(label)}
              cursor={{ fill: 'rgba(255, 255, 255, 0.1)' }}
            />
            <Legend content={legendContent} />
            {showStartBars && (
              <>
                <Bar 
                  dataKey="ethStart"
                  name="ETH Stakes Started"
                  fill="#00FFFF"
                  radius={[2, 2, 0, 0]}
                  fillOpacity={1}
                />
                <Bar 
                  dataKey="plsStart"
                  name="PLS Stakes Started"
                  fill="#9945FF"
                  radius={[2, 2, 0, 0]}
                  fillOpacity={1}
                />
              </>
            )}
            <Bar 
              dataKey="ethEnd"
              name="ETH Stakes Ending"
              fill="#00FFFF"
              radius={[2, 2, 0, 0]}
              fillOpacity={0.6}
            />
            <Bar 
              dataKey="plsEnd"
              name="PLS Stakes Ending"
              fill="#9945FF"
              radius={[2, 2, 0, 0]}
              fillOpacity={0.6}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );

  return (
    <div>
      {renderChart(chartData, true, title, customLegend)}
      {renderChart(endingStakesData, false, "All Ending Stakes", customLegendEnding)}
    </div>
  );
}

export default OAStakesChart; 