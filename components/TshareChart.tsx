import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LegendProps } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton2";
import { DatePickerWithRange } from "./ui/date-range-picker";
import { addDays, subDays } from "date-fns";
import { DateRange } from "react-day-picker";

interface ChartData {
  date: string;
  tshareRateHEX: number | null;
  tshareRateEHEX: number | null;
  projectedHEX?: number | null;
  projectedEHEX?: number | null;
}

// Constants for regression calculations
const CURVE_INTENSITY = 0.03;
const PROJECTION_DAYS = 3650; // 10 years

function calculateExponentialRegression(data: { x: number, y: number }[], curveIntensity = CURVE_INTENSITY) {
  const validData = data.filter(point => point.y > 0);
  if (validData.length < 2) return null;

  const n = validData.length;
  let sumX = 0;
  let sumY = 0;
  let sumXlnY = 0;
  let sumXX = 0;

  validData.forEach(point => {
    const x = point.x;
    const lnY = Math.log(point.y);
    
    sumX += x;
    sumY += lnY;
    sumXlnY += x * lnY;
    sumXX += x * x;
  });

  const a = (n * sumXlnY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const b = (sumY - a * sumX) / n;

  return {
    calculate: (x: number) => Math.exp((a * x + b) * curveIntensity),
    equation: `y = e^(${(a).toFixed(6)}x + ${b.toFixed(6)}) * ${curveIntensity}`
  };
}

const TshareChart: React.FC = () => {
  const [data, setData] = useState<ChartData[]>([]);
  const [filteredData, setFilteredData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleLines, setVisibleLines] = useState({
    tshareRateHEX: true,
    tshareRateEHEX: true,
  });
  const [currentHEXTShares, setCurrentHEXTShares] = useState<number | null>(null);
  const [currentEHEXTShares, setCurrentEHEXTShares] = useState<number | null>(null);
  const [isChartReady, setIsChartReady] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [date, setDate] = useState<DateRange | undefined>({
    from: subDays(new Date(), 600),
    to: new Date(),
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [ethereumResponse, pulseChainResponse, liveResponse] = await Promise.all([
          axios.get('https://hexdailystats.com/fulldata'),
          axios.get('https://hexdailystats.com/fulldatapulsechain'),
          axios.get('https://hexdailystats.com/livedata')
        ]);

        const ethereumData = ethereumResponse.data;
        const pulseChainData = pulseChainResponse.data;

        let formattedData = ethereumData.map((item: any) => ({
          date: new Date(item.date).toISOString().split('T')[0],
          tshareRateHEX: (!item.totalTshares || item.totalTshares <= 0) ? null : item.totalTshares,
          tshareRateEHEX: null,
        }));

        formattedData = formattedData.map(item => {
          const pulseChainItem = pulseChainData.find(
            (pItem: any) => new Date(pItem.date).toISOString().split('T')[0] === item.date
          );
          const tshareRateEHEX = (!pulseChainItem?.totalTshares || pulseChainItem.totalTshares <= 0) ? null : pulseChainItem.totalTshares;
          
          return {
            ...item,
            tshareRateEHEX,
          };
        });

        // Remove entries where both values are null or zero
        formattedData = formattedData.filter(item => 
          (item.tshareRateHEX !== null && item.tshareRateHEX > 0) || 
          (item.tshareRateEHEX !== null && item.tshareRateEHEX > 0)
        );

        formattedData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        while (formattedData.length > 0 && 
               formattedData[0].tshareRateHEX === null) {
          formattedData.shift();
        }

        const today = new Date().toISOString().split('T')[0];
        const liveData = liveResponse.data;
        
        const liveTShareRate = (!liveData.totalTshares || liveData.totalTshares <= 0) ? null : liveData.totalTshares;
        const lastEHEXValue = formattedData[formattedData.length - 1]?.tshareRateEHEX;
        
        // Only add today's data if we have valid values
        if (liveTShareRate !== null || (lastEHEXValue !== null && lastEHEXValue > 0)) {
          formattedData.push({
            date: today,
            tshareRateHEX: liveTShareRate,
            tshareRateEHEX: lastEHEXValue,
          });
        }

        const lastDataPoint = formattedData[formattedData.length - 1];
        setCurrentHEXTShares(lastDataPoint.tshareRateHEX);
        setCurrentEHEXTShares(lastDataPoint.tshareRateEHEX);

        // Calculate regression for both chains
        const startDate = new Date(formattedData[0].date);
        
        // Prepare data for regression
        const hexData = formattedData
          .filter(item => item.tshareRateHEX !== null && item.tshareRateHEX > 0)
          .map(item => ({
            x: (new Date(item.date).getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
            y: item.tshareRateHEX as number
          }));

        const ehexData = formattedData
          .filter(item => item.tshareRateEHEX !== null && item.tshareRateEHEX > 0)
          .map(item => ({
            x: (new Date(item.date).getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
            y: item.tshareRateEHEX as number
          }));

        const hexRegression = calculateExponentialRegression(hexData);
        const ehexRegression = calculateExponentialRegression(ehexData);

        // Add projection data
        const lastDate = new Date(formattedData[formattedData.length - 1].date);
        for (let i = 1; i <= PROJECTION_DAYS; i++) {
          const projectionDate = new Date(lastDate);
          projectionDate.setDate(projectionDate.getDate() + i);
          const daysSinceStart = (projectionDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);

          formattedData.push({
            date: projectionDate.toISOString().split('T')[0],
            tshareRateHEX: null,
            tshareRateEHEX: null,
            projectedHEX: hexRegression?.calculate(daysSinceStart) || null,
            projectedEHEX: ehexRegression?.calculate(daysSinceStart) || null
          });
        }

        setData(formattedData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isMounted]);

  useEffect(() => {
    if (data.length > 0 && date?.from && date?.to) {
      const from = date.from;
      const to = date.to;
      const filtered = data.filter(item => {
        const itemDate = new Date(item.date);
        return itemDate >= from && itemDate <= addDays(to, 1);
      });
      setFilteredData(filtered);
    } else {
      setFilteredData(data);
    }
  }, [data, date]);

  useEffect(() => {
    if (!isLoading && filteredData.length > 0) {
      const timer = setTimeout(() => {
        setIsChartReady(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, filteredData]);

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${year}-${month}-${day}`;
  };

  const handleLegendClick = (dataKey: string) => {
    setVisibleLines(prev => ({
      ...prev,
      [dataKey]: !prev[dataKey]
    }));
  };

  const customLegend = (props: LegendProps) => {
    const { payload } = props;
    
    if (!payload) return null;

    const legendItems = [
      {
        dataKey: 'tshareRateHEX',
        value: `HEX T-Shares (${currentHEXTShares ? 
          currentHEXTShares >= 1000000 
            ? `${(currentHEXTShares / 1000000).toFixed(2)}M` 
            : `${(currentHEXTShares / 1000).toFixed(0)}K`
          : '0K'})`,
        color: '#9945FF'
      },
      {
        dataKey: 'tshareRateEHEX',
        value: `eHEX T-Shares (${currentEHEXTShares ? 
          currentEHEXTShares >= 1000000 
            ? `${(currentEHEXTShares / 1000000).toFixed(2)}M` 
            : `${(currentEHEXTShares / 1000).toFixed(0)}K`
          : '0K'})`,
        color: '#00FFFF'
      }
    ];

    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        width: '100%', 
        marginTop: '10px' 
      }}>
        <ul style={{ 
          listStyle: 'none', 
          padding: 0, 
          display: 'flex', 
          flexWrap: 'wrap', 
          justifyContent: 'center' 
        }}>
          {legendItems.map((item, index) => (
            <li 
              key={`item-${index}`}
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center', 
                marginRight: 20, 
                marginBottom: 5,
                cursor: 'pointer',
                opacity: visibleLines[item.dataKey] ? 1 : 0.5
              }}
              onClick={() => handleLegendClick(item.dataKey)}
            >
              <span style={{ 
                color: item.color, 
                marginRight: 5,
                fontSize: '24px',
                lineHeight: '1'
              }}>●</span>
              <span style={{ 
                color: visibleLines[item.dataKey] ? '#fff' : '#888',
                fontSize: '14px'
              }}>
                {item.value}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  if (!isMounted) {
    return <Skeleton variant="chart" />;
  }

  return (
    <div className="w-full h-[450px] my-10 relative">
      <div className="w-full h-full p-5 bg-black border border-white/20 rounded-[15px] text-white">
        <div className="flex justify-between items-center px-4 mb-4">
          <h2 className="text-2xl font-bold">T-Shares by Chain</h2>
          <DatePickerWithRange date={date} setDate={setDate} />
        </div>
        
        {!isChartReady ? (
          <Skeleton variant="chart" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={filteredData}
              margin={{ top: 30, right: 10, left: 10, bottom: 80 }}
            >
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={false}
              />
              <YAxis 
                yAxisId="tshares"
                stroke="#888" 
                allowDataOverflow={true}
                axisLine={false}
                tickLine={{ stroke: '#888', strokeWidth: 0 }}
                tick={{ fill: '#888', fontSize: 12 }}
                tickFormatter={(value) => {
                  if (value >= 1000000) {
                    return `${(value / 1000000).toFixed(1)}M`;
                  } else if (value >= 1000) {
                    return `${(value / 1000).toFixed(0)}K`;
                  }
                  return value;
                }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.85)', border: 'solid 1px rgba(255, 255, 255, 0.2)', borderRadius: '5px'}}
                labelStyle={{ color: 'white' }}
                formatter={(value: any, name: string) => {
                  const millions = Number(value) / 1000000;
                  const thousands = Number(value) / 1000;
                  
                  if (millions >= 1) {
                    return [`${millions.toFixed(2)}M`, name];
                  } else {
                    return [`${thousands.toFixed(0)}K`, name];
                  }
                }}
                labelFormatter={(label) => formatDate(label)}
              />
              <Legend content={customLegend} />
              <Line 
                yAxisId="tshares"
                type="monotone" 
                dataKey="tshareRateHEX" 
                name="HEX T-Shares"
                stroke="#9945FF"
                dot={false} 
                strokeWidth={2}
                connectNulls={true}
                hide={!visibleLines.tshareRateHEX}
              />
              <Line 
                yAxisId="tshares"
                type="monotone" 
                dataKey="tshareRateEHEX" 
                name="eHEX T-Shares"
                stroke="#00FFFF"
                dot={false} 
                strokeWidth={2}
                connectNulls={true}
                hide={!visibleLines.tshareRateEHEX}
              />
              <Line 
                yAxisId="tshares"
                type="monotone" 
                dataKey="projectedHEX" 
                name="HEX T-Shares (Projected)"
                stroke="#9945FF"
                strokeDasharray="5 5"
                dot={false} 
                strokeWidth={2}
                connectNulls={true}
                opacity={0.5}
              />
              <Line 
                yAxisId="tshares"
                type="monotone" 
                dataKey="projectedEHEX" 
                name="eHEX T-Shares (Projected)"
                stroke="#00FFFF"
                strokeDasharray="5 5"
                dot={false} 
                strokeWidth={2}
                connectNulls={true}
                opacity={0.5}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default TshareChart; 