import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LegendProps } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton2";
import { subYears, subMonths } from "date-fns";

interface ChartData {
  date: string;
  tshareRateHEX: number | null;
  tshareRateEHEX: number | null;
  projectedHEX: number | null;
  projectedEHEX: number | null;
}

// Constants for regression calculations
const CURVE_INTENSITY = 0.03;
const DAYS_IN_15_YEARS = 5475; // 365 * 15
const REGRESSION_MONTHS = 24; // Change this number to adjust regression period

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
    calculate: (x: number) => Math.exp(a * x + b),
    equation: `y = e^(${(a).toFixed(6)}x + ${b.toFixed(6)})`
  };
}

const TshareProjectionChart: React.FC = () => {
  const [data, setData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleLines, setVisibleLines] = useState({
    tshareRateHEX: true,
    tshareRateEHEX: true,
    projectedHEX: true,
    projectedEHEX: true,
  });
  const [isChartReady, setIsChartReady] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [ethereumResponse, pulseChainResponse] = await Promise.all([
          axios.get('https://hexdailystats.com/fulldata'),
          axios.get('https://hexdailystats.com/fulldatapulsechain'),
        ]);

        const ethereumData = ethereumResponse.data;
        const pulseChainData = pulseChainResponse.data;

        // Get the date for regression start
        const regressionStartDate = subMonths(new Date(), REGRESSION_MONTHS);
        
        // Format historical data
        let formattedData = ethereumData.map((item: any) => ({
          date: new Date(item.date).toISOString().split('T')[0],
          tshareRateHEX: (!item.totalTshares || item.totalTshares <= 0) ? null : item.totalTshares,
          tshareRateEHEX: null,
          projectedHEX: null,
          projectedEHEX: null,
        }));

        formattedData = formattedData.map(item => {
          const pulseChainItem = pulseChainData.find(
            (pItem: any) => new Date(pItem.date).toISOString().split('T')[0] === item.date
          );
          return {
            ...item,
            tshareRateEHEX: (!pulseChainItem?.totalTshares || pulseChainItem.totalTshares <= 0) ? null : pulseChainItem.totalTshares,
          };
        });

        // Sort and filter data
        formattedData = formattedData
          .filter(item => 
            (item.tshareRateHEX !== null && item.tshareRateHEX > 0) || 
            (item.tshareRateEHEX !== null && item.tshareRateEHEX > 0)
          )
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Calculate regression for both chains using last year's data
        const startDate = new Date(formattedData[0].date);
        const lastDate = new Date(formattedData[formattedData.length - 1].date);
        
        // Calculate the end date (15 years from start)
        const endDate = new Date(startDate);
        endDate.setFullYear(endDate.getFullYear() + 15);
        
        // Calculate days needed for projection to reach 15 years from start
        const daysToProject = Math.ceil((endDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

        const recentHexData = formattedData
          .filter(item => new Date(item.date) >= regressionStartDate && item.tshareRateHEX !== null)
          .map(item => ({
            x: (new Date(item.date).getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
            y: item.tshareRateHEX as number
          }));

        const recentEhexData = formattedData
          .filter(item => new Date(item.date) >= regressionStartDate && item.tshareRateEHEX !== null)
          .map(item => ({
            x: (new Date(item.date).getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
            y: item.tshareRateEHEX as number
          }));

        const hexRegression = calculateExponentialRegression(recentHexData);
        const ehexRegression = calculateExponentialRegression(recentEhexData);

        // Add projection data
        for (let i = 1; i <= daysToProject; i++) {
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
  }, []);

  useEffect(() => {
    if (!isLoading && data.length > 0) {
      const timer = setTimeout(() => {
        setIsChartReady(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, data]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  };

  const formatValue = (value: number | null) => {
    if (value === null || value <= 0) return null;
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(2)}M`;
    }
    return `${(value / 1000).toFixed(0)}K`;
  };

  const handleLegendClick = (dataKey: string) => {
    setVisibleLines(prev => {
      const isHex = dataKey === 'tshareRateHEX';
      const baseKey = isHex ? 'tshareRateHEX' : 'tshareRateEHEX';
      const projKey = isHex ? 'projectedHEX' : 'projectedEHEX';
      
      return {
        ...prev,
        [baseKey]: !prev[baseKey],
        [projKey]: !prev[baseKey], // Use the same value as the base key
      };
    });
  };

  const customLegend = (props: LegendProps) => {
    const { payload } = props;
    
    if (!payload) return null;

    const legendItems = [
      {
        dataKey: 'tshareRateHEX',
        value: 'pHEX T-Shares',
        color: '#9945FF',
        isVisible: visibleLines.tshareRateHEX && visibleLines.projectedHEX
      },
      {
        dataKey: 'tshareRateEHEX',
        value: 'eHEX T-Shares',
        color: '#00FFFF',
        isVisible: visibleLines.tshareRateEHEX && visibleLines.projectedEHEX
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
                opacity: item.isVisible ? 1 : 0.5
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
                color: item.isVisible ? '#fff' : '#888',
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

  return (
    <div className="w-full h-[450px] my-10 relative">
      <div className="w-full h-full p-5 bg-black border border-white/20 rounded-[15px] text-white">
        <div className="flex justify-between items-center px-4 mb-4">
          <h2 className="text-2xl font-bold">T-Shares Supply Projection</h2>
        </div>
        
        {!isChartReady ? (
          <Skeleton variant="chart" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={data}
              margin={{ top: 30, right: 10, left: 10, bottom: 80 }}
            >
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#888', fontSize: 12 }}
                tickFormatter={formatDate}
                interval={Math.floor(data.length / 6)}
              />
              <YAxis 
                stroke="#888" 
                allowDataOverflow={true}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#888', fontSize: 12 }}
                tickFormatter={(value) => {
                  if (value >= 1000000) {
                    return `${(value / 1000000).toFixed(0)}M`;
                  } else if (value >= 1000) {
                    return `${(value / 1000).toFixed(0)}K`;
                  }
                  return value;
                }}
                label={{ 
                  value: 'HEX', 
                  position: 'left',
                  angle: -90,
                  offset: 0,
                  style: { 
                    fill: '#888',
                    fontSize: 12,
                    marginTop: '0px',
                  }
                }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.85)', border: 'solid 1px rgba(255, 255, 255, 0.2)', borderRadius: '5px'}}
                labelStyle={{ color: 'white' }}
                formatter={(value: any, name: string) => {
                  if (value === null || value <= 0) return ['-', ''];
                  const millions = Number(value) / 1000000;
                  const seriesName = name === 'tshareRateHEX' || name === 'projectedHEX' ? 'pHEX T-Shares' : 'eHEX T-Shares';
                  return [`${millions.toFixed(2)}M`, seriesName];
                }}
                labelFormatter={formatDate}
              />
              <Legend content={customLegend} />
              <Area 
                type="monotone" 
                dataKey="tshareRateHEX" 
                name="pHEX T-Shares"
                stroke="#9945FF"
                fill="#9945FF"
                fillOpacity={0.1}
                dot={false} 
                strokeWidth={2}
                connectNulls={true}
                hide={!visibleLines.tshareRateHEX}
                isAnimationActive={false}
              />
              <Area 
                type="monotone" 
                dataKey="tshareRateEHEX" 
                name="eHEX T-Shares"
                stroke="#00FFFF"
                fill="#00FFFF"
                fillOpacity={0.1}
                dot={false} 
                strokeWidth={2}
                connectNulls={true}
                hide={!visibleLines.tshareRateEHEX}
                isAnimationActive={false}
              />
              <Area 
                type="monotone" 
                dataKey="projectedHEX" 
                name="pHEX T-Shares"
                stroke="#9945FF"
                fill="#9945FF"
                fillOpacity={0.05}
                dot={false} 
                strokeWidth={2}
                strokeDasharray="5 5"
                connectNulls={true}
                hide={!visibleLines.projectedHEX}
                isAnimationActive={false}
              />
              <Area 
                type="monotone" 
                dataKey="projectedEHEX" 
                name="eHEX T-Shares"
                stroke="#00FFFF"
                fill="#00FFFF"
                fillOpacity={0.05}
                dot={false} 
                strokeWidth={2}
                strokeDasharray="5 5"
                connectNulls={true}
                hide={!visibleLines.projectedEHEX}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default TshareProjectionChart; 