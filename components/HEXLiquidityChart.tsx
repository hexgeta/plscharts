import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, LegendProps } from 'recharts';
import { Skeleton } from "@/components/ui/skeleton2";

interface ChartData {
  date: string;
  liquidityPulseX_HEX: number | null;
  pricePulseX: number | null;
  dollarLiquidity: number | null;
}

const HEXLiquidityChart: React.FC = () => {
  const [data, setData] = useState<ChartData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentLiquidity, setCurrentLiquidity] = useState<number | null>(null);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [visibleLines, setVisibleLines] = useState({
    liquidityPulseX_HEX: true,
    pricePulseX: true,
    dollarLiquidity: false
  });
  const [isChartReady, setIsChartReady] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch historical data
        const response = await axios.get('https://hexdailystats.com/fulldatapulsechain');
        const pulsechainData = response.data;

        let formattedData = pulsechainData.map((item: any) => ({
          date: new Date(item.date).toISOString().split('T')[0],
          liquidityPulseX_HEX: item.liquidityPulseX_HEX || null,
          pricePulseX: item.pricePulseX || null,
          dollarLiquidity: item.liquidityPulseX_HEX && item.pricePulseX 
            ? item.liquidityPulseX_HEX * item.pricePulseX 
            : null
        }));

        formattedData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Remove leading null entries
        while (formattedData.length > 0 && 
               formattedData[0].liquidityPulseX_HEX === null && 
               formattedData[0].pricePulseX === null) {
          formattedData.shift();
        }

        // Fetch live data
        const liveResponse = await axios.get('https://hexdailystats.com/livedata');
        const liveData = liveResponse.data;

        // Append live data to the dataset
        const today = new Date().toISOString().split('T')[0];
        formattedData.push({
          date: today,
          liquidityPulseX_HEX: liveData.liquidityHEX_Pulsechain || null,
          pricePulseX: liveData.price_Pulsechain || null,
          dollarLiquidity: liveData.liquidityHEX_Pulsechain && liveData.price_Pulsechain
            ? liveData.liquidityHEX_Pulsechain * liveData.price_Pulsechain
            : null
        });

        // After setting the formatted data, get the current values
        if (formattedData.length > 0) {
          const lastDataPoint = formattedData[formattedData.length - 1];
          setCurrentLiquidity(lastDataPoint.liquidityPulseX_HEX);
          setCurrentPrice(lastDataPoint.pricePulseX);
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
    const [year, month, day] = dateStr.split('-');
    return `${year}-${month}-${day}`;
  };

  // Function to format millions
  const formatToMillions = (value: number | null): string => {
    if (!value) return '0M';
    return `${(value / 1000000).toFixed(0)}M`;
  };

  // Function to format price
  const formatPrice = (value: number | null): string => {
    if (!value) return '$0.000';
    return `$${value.toFixed(3)}`;
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
        dataKey: 'liquidityPulseX_HEX',
        value: `Total pHEX Liquidity (${formatToMillions(currentLiquidity)} HEX)`,
        color: '#fff'
      },
      {
        dataKey: 'pricePulseX',
        value: `pHEX Price (${formatPrice(currentPrice)})`,
        color: '#ff00ff'
      },
      {
        dataKey: 'dollarLiquidity',
        value: `Total $ Liquidity (${currentLiquidity && currentPrice ? 
          (currentLiquidity * currentPrice) >= 1000000000 
            ? `$${((currentLiquidity * currentPrice) / 1000000000).toFixed(2)}B` 
            : `$${((currentLiquidity * currentPrice) / 1000000).toFixed(2)}M`
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

  return (
    <div className="w-full h-[450px] my-10 relative">
      <div className="w-full h-full p-5 bg-black border border-white/20 rounded-[15px] text-white">
        <div style={{ display: 'flex', alignItems: 'center', marginLeft: '40px', marginBottom: '0px' }}>
          <h2 style={{ color: 'white', fontSize: '24px', margin: '0' }}>
            pHEX Liquidity Chart
          </h2>
        </div>
        
        {!isChartReady ? (
          <Skeleton variant="chart" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={data}
              margin={{ top: 30, right: 0, left: 0, bottom: 20 }}
            >
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={false}
              />
              <YAxis 
                yAxisId="left"
                stroke="#888" 
                domain={['auto', 'auto']}
                allowDataOverflow={true}
                axisLine={false}
                tickLine={false}
                tick={false}
              />
              <YAxis 
                yAxisId="right"
                orientation="right"
                stroke="#888" 
                domain={['auto', 'auto']}
                allowDataOverflow={true}
                axisLine={false}
                tickLine={false}
                tick={false}
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
                yAxisId="left"
                type="monotone" 
                dataKey="liquidityPulseX_HEX" 
                name={`Total pHEX Liquidity (${formatToMillions(currentLiquidity)} HEX)`}
                stroke="#fff"
                dot={false} 
                strokeWidth={2}
                connectNulls={true}
              />
              <Line 
                yAxisId="right"
                type="monotone" 
                dataKey="pricePulseX" 
                name={`pHEX Price (${formatPrice(currentPrice)})`}
                stroke="#ff00ff"
                dot={false} 
                strokeWidth={2}
                connectNulls={true}
              />
              <Line 
                yAxisId="dollarLiquidity"
                type="monotone" 
                dataKey="dollarLiquidity" 
                name={`Total $ Liquidity (${currentLiquidity && currentPrice ? 
                  (currentLiquidity * currentPrice) >= 1000000000 
                    ? `$${((currentLiquidity * currentPrice) / 1000000000).toFixed(2)}B` 
                    : `$${((currentLiquidity * currentPrice) / 1000000).toFixed(2)}M`
                  : '$0M'})`}
                stroke="#00ff00"
                dot={false} 
                strokeWidth={2}
                connectNulls={true}
                hide={!visibleLines.dollarLiquidity}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default HEXLiquidityChart;