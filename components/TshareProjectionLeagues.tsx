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
  leagueTrident: number | null;
  leagueWhale: number | null;
  leagueShark: number | null;
  leagueDolphin: number | null;
  leagueSquid: number | null;
  leagueTurtle: number | null;
  leagueCrab: number | null;
  leagueShrimp: number | null;
  leagueShell: number | null;
  projLeagueTrident: number | null;
  projLeagueWhale: number | null;
  projLeagueShark: number | null;
  projLeagueDolphin: number | null;
  projLeagueSquid: number | null;
  projLeagueTurtle: number | null;
  projLeagueCrab: number | null;
  projLeagueShrimp: number | null;
  projLeagueShell: number | null;
  leagueTridentPHEX: number | null;
  leagueWhalePHEX: number | null;
  leagueSharkPHEX: number | null;
  leagueDolphinPHEX: number | null;
  leagueSquidPHEX: number | null;
  leagueTurtlePHEX: number | null;
  leagueCrabPHEX: number | null;
  leagueShrimpPHEX: number | null;
  leagueShellPHEX: number | null;
  projLeagueTridentPHEX: number | null;
  projLeagueWhalePHEX: number | null;
  projLeagueSharkPHEX: number | null;
  projLeagueDolphinPHEX: number | null;
  projLeagueSquidPHEX: number | null;
  projLeagueTurtlePHEX: number | null;
  projLeagueCrabPHEX: number | null;
  projLeagueShrimpPHEX: number | null;
  projLeagueShellPHEX: number | null;
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

const TshareProjectionLeagues: React.FC = () => {
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
          leagueTrident: null,
          leagueWhale: null,
          leagueShark: null,
          leagueDolphin: null,
          leagueSquid: null,
          leagueTurtle: null,
          leagueCrab: null,
          leagueShrimp: null,
          leagueShell: null,
          projLeagueTrident: null,
          projLeagueWhale: null,
          projLeagueShark: null,
          projLeagueDolphin: null,
          projLeagueSquid: null,
          projLeagueTurtle: null,
          projLeagueCrab: null,
          projLeagueShrimp: null,
          projLeagueShell: null,
          leagueTridentPHEX: null,
          leagueWhalePHEX: null,
          leagueSharkPHEX: null,
          leagueDolphinPHEX: null,
          leagueSquidPHEX: null,
          leagueTurtlePHEX: null,
          leagueCrabPHEX: null,
          leagueShrimpPHEX: null,
          leagueShellPHEX: null,
          projLeagueTridentPHEX: null,
          projLeagueWhalePHEX: null,
          projLeagueSharkPHEX: null,
          projLeagueDolphinPHEX: null,
          projLeagueSquidPHEX: null,
          projLeagueTurtlePHEX: null,
          projLeagueCrabPHEX: null,
          projLeagueShrimpPHEX: null,
          projLeagueShellPHEX: null,
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

        // Calculate league values for historical data
        formattedData = formattedData.map(item => {
          const baseValueEHEX = item.tshareRateEHEX;
          const baseValuePHEX = item.tshareRateHEX;

          return {
            ...item,
            leagueTrident: baseValueEHEX ? baseValueEHEX * 0.1 : null,
            leagueWhale: baseValueEHEX ? baseValueEHEX * 0.01 : null,
            leagueShark: baseValueEHEX ? baseValueEHEX * 0.001 : null,
            leagueDolphin: baseValueEHEX ? baseValueEHEX * 0.0001 : null,
            leagueSquid: baseValueEHEX ? baseValueEHEX * 0.00001 : null,
            leagueTurtle: baseValueEHEX ? baseValueEHEX * 0.000001 : null,
            leagueCrab: baseValueEHEX ? baseValueEHEX * 0.0000001 : null,
            leagueShrimp: baseValueEHEX ? baseValueEHEX * 0.00000001 : null,
            leagueShell: baseValueEHEX ? baseValueEHEX * 0.000000001 : null,
            leagueTridentPHEX: baseValuePHEX ? baseValuePHEX * 0.1 : null,
            leagueWhalePHEX: baseValuePHEX ? baseValuePHEX * 0.01 : null,
            leagueSharkPHEX: baseValuePHEX ? baseValuePHEX * 0.001 : null,
            leagueDolphinPHEX: baseValuePHEX ? baseValuePHEX * 0.0001 : null,
            leagueSquidPHEX: baseValuePHEX ? baseValuePHEX * 0.00001 : null,
            leagueTurtlePHEX: baseValuePHEX ? baseValuePHEX * 0.000001 : null,
            leagueCrabPHEX: baseValuePHEX ? baseValuePHEX * 0.0000001 : null,
            leagueShrimpPHEX: baseValuePHEX ? baseValuePHEX * 0.00000001 : null,
            leagueShellPHEX: baseValuePHEX ? baseValuePHEX * 0.000000001 : null,
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

        // Add projection data with league calculations
        for (let i = 1; i <= daysToProject; i++) {
          const projectionDate = new Date(lastDate);
          projectionDate.setDate(projectionDate.getDate() + i);
          const daysSinceStart = (projectionDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
          
          const projectedEHEXValue = ehexRegression?.calculate(daysSinceStart) || null;
          const projectedPHEXValue = hexRegression?.calculate(daysSinceStart) || null;

          formattedData.push({
            date: projectionDate.toISOString().split('T')[0],
            tshareRateHEX: null,
            tshareRateEHEX: null,
            projectedHEX: projectedPHEXValue,
            projectedEHEX: projectedEHEXValue,
            leagueTrident: null,
            leagueWhale: null,
            leagueShark: null,
            leagueDolphin: null,
            leagueSquid: null,
            leagueTurtle: null,
            leagueCrab: null,
            leagueShrimp: null,
            leagueShell: null,
            leagueTridentPHEX: null,
            leagueWhalePHEX: null,
            leagueSharkPHEX: null,
            leagueDolphinPHEX: null,
            leagueSquidPHEX: null,
            leagueTurtlePHEX: null,
            leagueCrabPHEX: null,
            leagueShrimpPHEX: null,
            leagueShellPHEX: null,
            projLeagueTrident: projectedEHEXValue ? projectedEHEXValue * 0.1 : null,
            projLeagueWhale: projectedEHEXValue ? projectedEHEXValue * 0.01 : null,
            projLeagueShark: projectedEHEXValue ? projectedEHEXValue * 0.001 : null,
            projLeagueDolphin: projectedEHEXValue ? projectedEHEXValue * 0.0001 : null,
            projLeagueSquid: projectedEHEXValue ? projectedEHEXValue * 0.00001 : null,
            projLeagueTurtle: projectedEHEXValue ? projectedEHEXValue * 0.000001 : null,
            projLeagueCrab: projectedEHEXValue ? projectedEHEXValue * 0.0000001 : null,
            projLeagueShrimp: projectedEHEXValue ? projectedEHEXValue * 0.00000001 : null,
            projLeagueShell: projectedEHEXValue ? projectedEHEXValue * 0.000000001 : null,
            projLeagueTridentPHEX: projectedPHEXValue ? projectedPHEXValue * 0.1 : null,
            projLeagueWhalePHEX: projectedPHEXValue ? projectedPHEXValue * 0.01 : null,
            projLeagueSharkPHEX: projectedPHEXValue ? projectedPHEXValue * 0.001 : null,
            projLeagueDolphinPHEX: projectedPHEXValue ? projectedPHEXValue * 0.0001 : null,
            projLeagueSquidPHEX: projectedPHEXValue ? projectedPHEXValue * 0.00001 : null,
            projLeagueTurtlePHEX: projectedPHEXValue ? projectedPHEXValue * 0.000001 : null,
            projLeagueCrabPHEX: projectedPHEXValue ? projectedPHEXValue * 0.0000001 : null,
            projLeagueShrimpPHEX: projectedPHEXValue ? projectedPHEXValue * 0.00000001 : null,
            projLeagueShellPHEX: projectedPHEXValue ? projectedPHEXValue * 0.000000001 : null,
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
          <h2 className="text-2xl font-bold">T-Share Projection Leagues</h2>
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
                scale="log"
                domain={[0.0000001, 'auto']}
                allowDataOverflow={true}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#888', fontSize: 12 }}
                tickFormatter={(value) => {
                  if (value >= 1000000) {
                    return `${(value / 1000000).toFixed(1)}M`;
                  }
                  if (value >= 1000) {
                    return `${(value / 1000).toFixed(1)}K`;
                  }
                  if (value >= 1) {
                    return value.toFixed(1);
                  }
                  if (value >= 0.001) {
                    return value.toFixed(3);
                  }
                  return value.toExponential(1);
                }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.85)', border: 'solid 1px rgba(255, 255, 255, 0.2)', borderRadius: '5px'}}
                labelStyle={{ color: 'white' }}
                content={({ active, payload, label }) => {
                  if (!active || !payload || !payload.length) return null;

                  // Helper function to get emoji from name
                  const getEmoji = (name: string | number | undefined) => {
                    if (typeof name !== 'string') return '';
                    const match = name.match(/(🔱|🐋|🦈|🐬|🦑|🐢|🦀|🦐|🐚)/);
                    return match ? match[1] : '';
                  };

                  // Helper function to format value
                  const formatValue = (value: any) => {
                    const numValue = Number(value);
                    if (isNaN(numValue) || numValue <= 0) return null;
                    
                    if (numValue >= 1000000) {
                      return `${(numValue / 1000000).toFixed(2)}M`;
                    }
                    if (numValue >= 1000) {
                      return `${(numValue / 1000).toFixed(1)}K`;
                    }
                    if (numValue >= 1) {
                      return numValue.toFixed(1);
                    }
                    if (numValue >= 0.001) {
                      return numValue.toFixed(3);
                    }
                    return numValue.toExponential(1);
                  };

                  // Get eHEX and pHEX data
                  const eHEXData = visibleLines.tshareRateEHEX ? payload.filter(p => {
                    const numValue = Number(p.value);
                    const name = String(p.name || '');
                    return !isNaN(numValue) && numValue > 0 && !name.includes('PHEX') && !name.includes('pHEX');
                  }) : [];
                  const pHEXData = visibleLines.tshareRateHEX ? payload.filter(p => {
                    const numValue = Number(p.value);
                    const name = String(p.name || '');
                    return !isNaN(numValue) && numValue > 0 && (name.includes('PHEX') || name.includes('pHEX'));
                  }) : [];

                  // Get T-Share values
                  const eHEXTShares = eHEXData.find(entry => String(entry.name) === 'eHEX T-Shares');
                  const pHEXTShares = pHEXData.find(entry => String(entry.name) === 'pHEX T-Shares');

                  return (
                    <div className="bg-black/85 border border-white/20 rounded-[5px] p-3">
                      <p className="text-white text-center mb-2">{formatDate(label)}</p>
                      <div className="flex gap-8">
                        {/* eHEX Column - only show if visible */}
                        {visibleLines.tshareRateEHEX && (
                          <div>
                            <p className="text-[#00FFFF] font-bold mb-1">eHEX</p>
                            {eHEXTShares && (
                              <p className="text-white text-sm mb-1">
                                {formatValue(eHEXTShares.value)}
                              </p>
                            )}
                            {eHEXData.map((entry, index) => {
                              const emoji = getEmoji(entry.name);
                              if (!emoji) return null;
                              return (
                                <p key={index} className="text-white text-sm">
                                  {emoji}: {formatValue(entry.value)}
                                </p>
                              );
                            })}
                          </div>
                        )}
                        {/* pHEX Column - only show if visible */}
                        {visibleLines.tshareRateHEX && (
                          <div>
                            <p className="text-[#9945FF] font-bold mb-1">pHEX</p>
                            {pHEXTShares && (
                              <p className="text-white text-sm mb-1">
                                {formatValue(pHEXTShares.value)}
                              </p>
                            )}
                            {pHEXData.map((entry, index) => {
                              const emoji = getEmoji(entry.name);
                              if (!emoji) return null;
                              return (
                                <p key={index} className="text-white text-sm">
                                  {emoji}: {formatValue(entry.value)}
                                </p>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  );
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
              <Area 
                type="monotone" 
                dataKey="leagueTrident" 
                name="🔱 10% League"
                stroke="#FFD700"
                fill="none"
                dot={false} 
                strokeWidth={1}
                strokeDasharray="3 3"
                connectNulls={true}
                isAnimationActive={false}
              />
              <Area 
                type="monotone" 
                dataKey="leagueWhale" 
                name="🐋 1% League"
                stroke="#87CEEB"
                fill="none"
                dot={false} 
                strokeWidth={1}
                strokeDasharray="3 3"
                connectNulls={true}
                isAnimationActive={false}
              />
              <Area 
                type="monotone" 
                dataKey="leagueShark" 
                name="🦈 0.1% League"
                stroke="#98FB98"
                fill="none"
                dot={false} 
                strokeWidth={1}
                strokeDasharray="3 3"
                connectNulls={true}
                isAnimationActive={false}
              />
              <Area 
                type="monotone" 
                dataKey="leagueDolphin" 
                name="🐬 0.01% League"
                stroke="#FFA07A"
                fill="none"
                dot={false} 
                strokeWidth={1}
                strokeDasharray="3 3"
                connectNulls={true}
                isAnimationActive={false}
              />
              <Area 
                type="monotone" 
                dataKey="leagueSquid" 
                name="🦑 0.001% League"
                stroke="#DDA0DD"
                fill="none"
                dot={false} 
                strokeWidth={1}
                strokeDasharray="3 3"
                connectNulls={true}
                isAnimationActive={false}
              />
              <Area 
                type="monotone" 
                dataKey="leagueTurtle" 
                name="🐢 0.0001% League"
                stroke="#F0E68C"
                fill="none"
                dot={false} 
                strokeWidth={1}
                strokeDasharray="3 3"
                connectNulls={true}
                isAnimationActive={false}
              />
              <Area 
                type="monotone" 
                dataKey="leagueCrab" 
                name="🦀 0.00001% League"
                stroke="#B8860B"
                fill="none"
                dot={false} 
                strokeWidth={1}
                strokeDasharray="3 3"
                connectNulls={true}
                isAnimationActive={false}
              />
              <Area 
                type="monotone" 
                dataKey="leagueShrimp" 
                name="🦐 0.000001% League"
                stroke="#CD853F"
                fill="none"
                dot={false} 
                strokeWidth={1}
                strokeDasharray="3 3"
                connectNulls={true}
                isAnimationActive={false}
              />
              <Area 
                type="monotone" 
                dataKey="leagueShell" 
                name="🐚 0.0000001% League"
                stroke="#DAA520"
                fill="none"
                dot={false} 
                strokeWidth={1}
                strokeDasharray="3 3"
                connectNulls={true}
                isAnimationActive={false}
              />
              <Area 
                type="monotone" 
                dataKey="projLeagueTrident" 
                name="🔱 10% League (Projected)"
                stroke="#FFD700"
                fill="none"
                dot={false} 
                strokeWidth={1}
                strokeDasharray="5 5"
                connectNulls={true}
                isAnimationActive={false}
              />
              <Area 
                type="monotone" 
                dataKey="projLeagueWhale" 
                name="🐋 1% League (Projected)"
                stroke="#87CEEB"
                fill="none"
                dot={false} 
                strokeWidth={1}
                strokeDasharray="5 5"
                connectNulls={true}
                isAnimationActive={false}
              />
              <Area 
                type="monotone" 
                dataKey="projLeagueShark" 
                name="🦈 0.1% League (Projected)"
                stroke="#98FB98"
                fill="none"
                dot={false} 
                strokeWidth={1}
                strokeDasharray="5 5"
                connectNulls={true}
                isAnimationActive={false}
              />
              <Area 
                type="monotone" 
                dataKey="projLeagueDolphin" 
                name="🐬 0.01% League (Projected)"
                stroke="#FFA07A"
                fill="none"
                dot={false} 
                strokeWidth={1}
                strokeDasharray="5 5"
                connectNulls={true}
                isAnimationActive={false}
              />
              <Area 
                type="monotone" 
                dataKey="projLeagueSquid" 
                name="🦑 0.001% League (Projected)"
                stroke="#DDA0DD"
                fill="none"
                dot={false} 
                strokeWidth={1}
                strokeDasharray="5 5"
                connectNulls={true}
                isAnimationActive={false}
              />
              <Area 
                type="monotone" 
                dataKey="projLeagueTurtle" 
                name="🐢 0.0001% League (Projected)"
                stroke="#F0E68C"
                fill="none"
                dot={false} 
                strokeWidth={1}
                strokeDasharray="5 5"
                connectNulls={true}
                isAnimationActive={false}
              />
              <Area 
                type="monotone" 
                dataKey="projLeagueCrab" 
                name="🦀 0.00001% League (Projected)"
                stroke="#B8860B"
                fill="none"
                dot={false} 
                strokeWidth={1}
                strokeDasharray="5 5"
                connectNulls={true}
                isAnimationActive={false}
              />
              <Area 
                type="monotone" 
                dataKey="projLeagueShrimp" 
                name="🦐 0.000001% League (Projected)"
                stroke="#CD853F"
                fill="none"
                dot={false} 
                strokeWidth={1}
                strokeDasharray="5 5"
                connectNulls={true}
                isAnimationActive={false}
              />
              <Area 
                type="monotone" 
                dataKey="projLeagueShell" 
                name="🐚 0.0000001% League (Projected)"
                stroke="#DAA520"
                fill="none"
                dot={false} 
                strokeWidth={1}
                strokeDasharray="5 5"
                connectNulls={true}
                isAnimationActive={false}
              />
              <Area 
                type="monotone" 
                dataKey="leagueTridentPHEX" 
                name="🔱 10% League (pHEX)"
                stroke="#FFD700"
                fill="none"
                dot={false} 
                strokeWidth={1}
                strokeDasharray="3 3"
                connectNulls={true}
                isAnimationActive={false}
              />
              <Area 
                type="monotone" 
                dataKey="leagueWhalePHEX" 
                name="🐋 1% League (pHEX)"
                stroke="#87CEEB"
                fill="none"
                dot={false} 
                strokeWidth={1}
                strokeDasharray="3 3"
                connectNulls={true}
                isAnimationActive={false}
              />
              <Area 
                type="monotone" 
                dataKey="leagueSharkPHEX" 
                name="🦈 0.1% League (pHEX)"
                stroke="#98FB98"
                fill="none"
                dot={false} 
                strokeWidth={1}
                strokeDasharray="3 3"
                connectNulls={true}
                isAnimationActive={false}
              />
              <Area 
                type="monotone" 
                dataKey="leagueDolphinPHEX" 
                name="🐬 0.01% League (pHEX)"
                stroke="#FFA07A"
                fill="none"
                dot={false} 
                strokeWidth={1}
                strokeDasharray="3 3"
                connectNulls={true}
                isAnimationActive={false}
              />
              <Area 
                type="monotone" 
                dataKey="leagueSquidPHEX" 
                name="🦑 0.001% League (pHEX)"
                stroke="#DDA0DD"
                fill="none"
                dot={false} 
                strokeWidth={1}
                strokeDasharray="3 3"
                connectNulls={true}
                isAnimationActive={false}
              />
              <Area 
                type="monotone" 
                dataKey="leagueTurtlePHEX" 
                name="🐢 0.0001% League (pHEX)"
                stroke="#F0E68C"
                fill="none"
                dot={false} 
                strokeWidth={1}
                strokeDasharray="3 3"
                connectNulls={true}
                isAnimationActive={false}
              />
              <Area 
                type="monotone" 
                dataKey="leagueCrabPHEX" 
                name="🦀 0.00001% League (pHEX)"
                stroke="#B8860B"
                fill="none"
                dot={false} 
                strokeWidth={1}
                strokeDasharray="3 3"
                connectNulls={true}
                isAnimationActive={false}
              />
              <Area 
                type="monotone" 
                dataKey="leagueShrimpPHEX" 
                name="🦐 0.000001% League (pHEX)"
                stroke="#CD853F"
                fill="none"
                dot={false} 
                strokeWidth={1}
                strokeDasharray="3 3"
                connectNulls={true}
                isAnimationActive={false}
              />
              <Area 
                type="monotone" 
                dataKey="leagueShellPHEX" 
                name="🐚 0.0000001% League (pHEX)"
                stroke="#DAA520"
                fill="none"
                dot={false} 
                strokeWidth={1}
                strokeDasharray="3 3"
                connectNulls={true}
                isAnimationActive={false}
              />
              <Area 
                type="monotone" 
                dataKey="projLeagueTridentPHEX" 
                name="🔱 10% League (pHEX Projected)"
                stroke="#FFD700"
                fill="none"
                dot={false} 
                strokeWidth={1}
                strokeDasharray="5 5"
                connectNulls={true}
                isAnimationActive={false}
              />
              <Area 
                type="monotone" 
                dataKey="projLeagueWhalePHEX" 
                name="🐋 1% League (pHEX Projected)"
                stroke="#87CEEB"
                fill="none"
                dot={false} 
                strokeWidth={1}
                strokeDasharray="5 5"
                connectNulls={true}
                isAnimationActive={false}
              />
              <Area 
                type="monotone" 
                dataKey="projLeagueSharkPHEX" 
                name="🦈 0.1% League (pHEX Projected)"
                stroke="#98FB98"
                fill="none"
                dot={false} 
                strokeWidth={1}
                strokeDasharray="5 5"
                connectNulls={true}
                isAnimationActive={false}
              />
              <Area 
                type="monotone" 
                dataKey="projLeagueDolphinPHEX" 
                name="🐬 0.01% League (pHEX Projected)"
                stroke="#FFA07A"
                fill="none"
                dot={false} 
                strokeWidth={1}
                strokeDasharray="5 5"
                connectNulls={true}
                isAnimationActive={false}
              />
              <Area 
                type="monotone" 
                dataKey="projLeagueSquidPHEX" 
                name="🦑 0.001% League (pHEX Projected)"
                stroke="#DDA0DD"
                fill="none"
                dot={false} 
                strokeWidth={1}
                strokeDasharray="5 5"
                connectNulls={true}
                isAnimationActive={false}
              />
              <Area 
                type="monotone" 
                dataKey="projLeagueTurtlePHEX" 
                name="🐢 0.0001% League (pHEX Projected)"
                stroke="#F0E68C"
                fill="none"
                dot={false} 
                strokeWidth={1}
                strokeDasharray="5 5"
                connectNulls={true}
                isAnimationActive={false}
              />
              <Area 
                type="monotone" 
                dataKey="projLeagueCrabPHEX" 
                name="🦀 0.00001% League (pHEX Projected)"
                stroke="#B8860B"
                fill="none"
                dot={false} 
                strokeWidth={1}
                strokeDasharray="5 5"
                connectNulls={true}
                isAnimationActive={false}
              />
              <Area 
                type="monotone" 
                dataKey="projLeagueShrimpPHEX" 
                name="🦐 0.000001% League (pHEX Projected)"
                stroke="#CD853F"
                fill="none"
                dot={false} 
                strokeWidth={1}
                strokeDasharray="5 5"
                connectNulls={true}
                isAnimationActive={false}
              />
              <Area 
                type="monotone" 
                dataKey="projLeagueShellPHEX" 
                name="🐚 0.0000001% League (pHEX Projected)"
                stroke="#DAA520"
                fill="none"
                dot={false} 
                strokeWidth={1}
                strokeDasharray="5 5"
                connectNulls={true}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default TshareProjectionLeagues; 