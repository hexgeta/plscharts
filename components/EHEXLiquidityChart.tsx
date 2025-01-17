import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LegendProps } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton2";

interface ChartData {
  date: string;
  liquidityUV2UV3_HEX: number | null;
  priceUV2UV3: number | null;
  liquidityPulseX_EHEX: number | null;
  totalLiquidity: number | null;
  dollarLiquidity: number | null;
}

const EHEXLiquidityChart: React.FC = () => {
  const [data, setData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [visibleLines, setVisibleLines] = useState({
    totalLiquidity: true,
    liquidityUV2UV3_HEX: false,
    liquidityPulseX_EHEX: false,
    priceUV2UV3: true,
    dollarLiquidity: false
  });
  const [currentTotalLiquidity, setCurrentTotalLiquidity] = useState<number | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [isChartReady, setIsChartReady] = useState(false);

  useEffect(() => {
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
          liquidityUV2UV3_HEX: item.liquidityUV2UV3_HEX || null,
          priceUV2UV3: item.priceUV2UV3 || null,
          liquidityPulseX_EHEX: null,
          totalLiquidity: null,
          dollarLiquidity: null
        }));

        formattedData = formattedData.map(item => {
          const pulseChainItem = pulseChainData.find(
            (pItem: any) => new Date(pItem.date).toISOString().split('T')[0] === item.date
          );
          const liquidityPulseX_EHEX = pulseChainItem ? pulseChainItem.liquidityPulseX_EHEX || 0 : 0;
          const totalLiquidity = item.liquidityUV2UV3_HEX !== null 
            ? item.liquidityUV2UV3_HEX + liquidityPulseX_EHEX 
            : null;
          const dollarLiquidity = totalLiquidity !== null && item.priceUV2UV3 !== null
            ? totalLiquidity * item.priceUV2UV3
            : null;
          
          return {
            ...item,
            liquidityPulseX_EHEX: liquidityPulseX_EHEX || null,
            totalLiquidity,
            dollarLiquidity
          };
        });

        formattedData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        while (formattedData.length > 0 && 
               formattedData[0].liquidityUV2UV3_HEX === null && 
               formattedData[0].priceUV2UV3 === null &&
               formattedData[0].totalLiquidity === null) {
          formattedData.shift();
        }

        const today = new Date().toISOString().split('T')[0];
        const liveData = liveResponse.data;
        
        const liveLiquidityHEX = liveData.liquidityHEX || 0;
        const livePrice = liveData.price || null;
        
        formattedData.push({
          date: today,
          liquidityUV2UV3_HEX: liveLiquidityHEX,
          priceUV2UV3: livePrice,
          liquidityPulseX_EHEX: formattedData[formattedData.length - 1]?.liquidityPulseX_EHEX || 0,
          totalLiquidity: liveLiquidityHEX + (formattedData[formattedData.length - 1]?.liquidityPulseX_EHEX || 0),
          dollarLiquidity: (liveLiquidityHEX + (formattedData[formattedData.length - 1]?.liquidityPulseX_EHEX || 0)) * (livePrice || 0)
        });

        const lastDataPoint = formattedData[formattedData.length - 1];
        setCurrentTotalLiquidity(lastDataPoint.totalLiquidity);
        setCurrentPrice(lastDataPoint.priceUV2UV3);

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

    // Define the exact names that match what's in the Line components
    const legendItems = [
      {
        dataKey: 'totalLiquidity',
        value: `Total eHEX Liquidity (${currentTotalLiquidity ? 
          currentTotalLiquidity >= 1000000000 
            ? `${(currentTotalLiquidity / 1000000000).toFixed(2)}B` 
            : `${(currentTotalLiquidity / 1000000).toFixed(0)}M`
          : '0M'} HEX)`,
        color: '#fff'
      },
      {
        dataKey: 'liquidityUV2UV3_HEX',
        value: 'eHEX Liquidity on ETH',
        color: '#00FFFF'
      },
      {
        dataKey: 'liquidityPulseX_EHEX',
        value: 'eHEX Liquidity on PLS',
        color: '#ffc658'
      },
      {
        dataKey: 'priceUV2UV3',
        value: `eHEX Price (${currentPrice ? `$${currentPrice.toFixed(3)}` : '$0.000'})`,
        color: '#627EEA'
      },
      {
        dataKey: 'dollarLiquidity',
        value: `Total $ Liquidity (${currentTotalLiquidity && currentPrice ? 
          (currentTotalLiquidity * currentPrice) >= 1000000000 
            ? `$${((currentTotalLiquidity * currentPrice) / 1000000000).toFixed(2)}B` 
            : `$${((currentTotalLiquidity * currentPrice) / 1000000).toFixed(2)}M`
          : '$0M'})`,
        color: '#00ff00'
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

  const formatToMillions = (value: number | null): string => {
    if (!value) return '0M';
    return `${(value / 1000000).toFixed(0)}M`;
  };

  const formatPrice = (value: number | null): string => {
    if (!value) return '$0.000';
    return `$${value.toFixed(4)}`;
  };

  return (
    <div className="w-full h-[450px] my-10 relative">
      <div className="w-full h-full p-5 bg-black border border-white/20 rounded-[15px] text-white">
        <div style={{ display: 'flex', alignItems: 'center', marginLeft: '40px', marginBottom: '0px' }}>
          <h2 style={{ color: 'white', fontSize: '24px', margin: '0' }}>
            eHEX Liquidity Chart
          </h2>
        </div>
        
        {!isChartReady ? (
          <Skeleton variant="chart" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 30, right: 0, left: 0, bottom: 80 }}
            >
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={false}
              />
              <YAxis 
                yAxisId="liquidity"
                stroke="#888" 
                domain={[(dataMin) => dataMin * 0.9, (dataMax) => dataMax * 1.3]}
                allowDataOverflow={true}
                axisLine={false}
                tickLine={false}
                tick={false}
                scale="log"
              />
              <YAxis 
                yAxisId="price"
                orientation="right"
                stroke="#888" 
                domain={['auto', 'auto']}
                allowDataOverflow={true}
                axisLine={false}
                tickLine={false}
                tick={false}
                scale="log"
              />
              <YAxis 
                yAxisId="dollarLiquidity"
                orientation="right"
                stroke="#888" 
                domain={['auto', 'auto']}
                allowDataOverflow={true}
                axisLine={false}
                tickLine={false}
                tick={false}
                scale="log"          
                />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.85)', border: 'solid 1px rgba(255, 255, 255, 0.2)', borderRadius: '5px'}}
                labelStyle={{ color: 'white' }}
                formatter={(value: any, name: string) => {
                  if (name.includes('Price')) {
                    return [`$${Number(value).toFixed(4)}`, name];
                  } else if (name.includes('Liquidity')) {
                    const billions = Number(value) / 1000000000;
                    const millions = Number(value) / 1000000;
                    
                    if (name.includes('$ Liquidity')) {
                      // Format dollar liquidity with $ symbol
                      if (billions >= 1) {
                        return [`$${billions.toFixed(2)}B`, name];
                      } else {
                        return [`$${millions.toFixed(2)}M`, name];
                      }
                    } else {
                      // Format HEX liquidity
                      if (billions >= 1) {
                        return [`${billions.toFixed(2)}B`, name];
                      } else {
                        return [`${millions.toFixed(0)}M`, name];
                      }
                    }
                  }
                  return [value, name];
                }}
                labelFormatter={(label) => formatDate(label)}
              />
              <Legend content={customLegend} />
              <Line 
                yAxisId="dollarLiquidity"
                type="monotone" 
                dataKey="dollarLiquidity" 
                name={`Total $ Liquidity (${currentTotalLiquidity && currentPrice ? 
                  (currentTotalLiquidity * currentPrice) >= 1000000000 
                    ? `$${((currentTotalLiquidity * currentPrice) / 1000000000).toFixed(2)}B` 
                    : `$${((currentTotalLiquidity * currentPrice) / 1000000).toFixed(2)}M`
                  : '$0M'})`}
                stroke="#00ff00"
                dot={false} 
                strokeWidth={2}
                connectNulls={true}
                hide={!visibleLines.dollarLiquidity}
              />

              <Line 
                yAxisId="liquidity"
                type="monotone" 
                dataKey="totalLiquidity" 
                name={`Total eHEX Liquidity (${currentTotalLiquidity ? 
                  currentTotalLiquidity >= 1000000000 
                    ? `${(currentTotalLiquidity / 1000000000).toFixed(2)}B` 
                    : `${(currentTotalLiquidity / 1000000).toFixed(0)}M`
                  : '0M'} HEX)`}
                stroke="#fff"
                dot={false} 
                strokeWidth={2}
                connectNulls={true}
                hide={!visibleLines.totalLiquidity}
              />
              <Line 
                yAxisId="liquidity"
                type="monotone" 
                dataKey="liquidityUV2UV3_HEX" 
                name="eHEX Liquidity on ETH"
                stroke="#00FFFF"
                dot={false} 
                strokeWidth={2}
                connectNulls={true}
                hide={!visibleLines.liquidityUV2UV3_HEX}
              />
                                <Line 
                yAxisId="price"
                type="monotone" 
                dataKey="priceUV2UV3" 
                name={`eHEX Price (${currentPrice ? `$${currentPrice.toFixed(3)}` : '$0.000'})`}
                stroke="#627EEA"
                dot={false} 
                strokeWidth={2}
                connectNulls={true}
                hide={!visibleLines.priceUV2UV3}
              />
              <Line 
                yAxisId="liquidity"
                type="monotone" 
                dataKey="liquidityPulseX_EHEX" 
                name="eHEX Liquidity on PLS"
                stroke="#ffc658"
                dot={false} 
                strokeWidth={2}
                connectNulls={true}
                hide={!visibleLines.liquidityPulseX_EHEX}
              />

              
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default EHEXLiquidityChart;