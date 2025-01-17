"use client"

import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { supabase } from '../supabaseClient';

interface TokenData {
  date: string;
  hexX: number;
  btcX: number;
  ethX: number;
  solX: number;
}

interface DexScreenerResponse {
  pair: {
    priceUsd: string;
    // ... other fields we might need
  };
}

// Helper function to format numbers with appropriate decimals and commas
const formatPrice = (price: number, symbol: string) => {
  if (symbol === 'BTC' || symbol === 'ETH' || symbol === 'SOL') {
    return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
  return price.toFixed(3);
};

const VsGainsHEX: React.FC = () => {
  const [data, setData] = useState<TokenData[]>([]);
  const [historicPrices, setHistoricPrices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleLines, setVisibleLines] = useState({
    hexX: true,
    btcX: true,
    ethX: true,
    solX: true
  });

  useEffect(() => {
    const fetchData = async () => {
      const baselineDate = '2024-09-07T00:00:00.000Z';
      
      // Single query to get all data including the baseline
      const { data: fetchedHistoricPrices, error } = await supabase
        .from('historic_prices')
        .select('*')
        .gte('date', baselineDate)
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching data:', error);
        setError(error.message);
        setIsLoading(false);
        return;
      }

      // Get baseline data from first record
      const baselineData = fetchedHistoricPrices[0];
      
      // Log baseline prices
      console.log('Baseline Prices:', {
        HEX: baselineData.hex_price,
        BTC: baselineData.btc_price,
        ETH: baselineData.eth_price,
        SOL: baselineData.sol_price
      });

      setHistoricPrices(fetchedHistoricPrices);

      // Log last known prices from database
      const lastDataPoint = fetchedHistoricPrices[fetchedHistoricPrices.length - 1];
      console.log('Last Known Prices from DB:', {
        date: lastDataPoint.date,
        HEX: lastDataPoint.hex_price,
        BTC: lastDataPoint.btc_price,
        ETH: lastDataPoint.eth_price,
        SOL: lastDataPoint.sol_price
      });

      const lastDataDate = new Date(lastDataPoint.date);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // If last data point is old, fetch current prices
      if (lastDataDate <= yesterday) {
        try {
          // Fetch current prices from DexScreener
          const [hexResponse, btcResponse, ethResponse, solResponse] = await Promise.all([
            fetch('https://api.dexscreener.com/latest/dex/pairs/pulsechain/0xf1F4ee610b2bAbB05C635F726eF8B0C568c8dc65'),
            fetch('https://api.dexscreener.com/latest/dex/pairs/ethereum/0xCBCdF9626bC03E24f779434178A73a0B4bad62eD'),
            fetch('https://api.dexscreener.com/latest/dex/pairs/ethereum/0x11b815efB8f581194ae79006d24E0d814B7697F6'),
            fetch('https://api.dexscreener.com/latest/dex/pairs/ethereum/0x127452F3f9cDc0389b0Bf59ce6131aA3Bd763598')
          ]);

          const [hexData, btcData, ethData, solData] = await Promise.all([
            hexResponse.json(),
            btcResponse.json(),
            ethResponse.json(),
            solResponse.json()
          ]);

          // Log the new prices from DexScreener
          console.log('New DexScreener Prices:', {
            date: today.toISOString(),
            HEX: parseFloat(hexData.pair.priceUsd),
            BTC: parseFloat(btcData.pair.priceUsd),
            ETH: parseFloat(ethData.pair.priceUsd),
            SOL: parseFloat(solData.pair.priceUsd)
          });

          const todayData = {
            date: today.toISOString(),
            hex_price: parseFloat(hexData.pair.priceUsd),
            btc_price: parseFloat(btcData.pair.priceUsd),
            eth_price: parseFloat(ethData.pair.priceUsd),
            sol_price: parseFloat(solData.pair.priceUsd)
          };

          fetchedHistoricPrices.push(todayData);
        } catch (error) {
          console.error('Error fetching current prices:', error);
        }
      } else {
        console.log('Data is current, no need to fetch new prices');
      }

      const formattedData = fetchedHistoricPrices.map((item) => ({
        date: item.date,
        hexX: (item.hex_price / baselineData.hex_price),
        btcX: (item.btc_price / baselineData.btc_price),
        ethX: (item.eth_price / baselineData.eth_price),
        solX: (item.sol_price / baselineData.sol_price),
      }));
      
      setData(formattedData);
      setIsLoading(false);
    };

    fetchData();
  }, []);

  const handleLegendClick = (dataKey: string) => {
    setVisibleLines(prev => ({
      ...prev,
      [dataKey]: !prev[dataKey]
    }));
  };

  const customLegend = (props: LegendProps) => {
    const { payload } = props;
    
    if (payload && data.length > 0) {
      const latestData = data[data.length - 1];

      return (
        <div className="flex justify-center w-full mt-5">
          <ul className="list-none p-2.5 flex flex-wrap justify-center">
            {payload.map((entry, index) => {
              const symbol = entry.dataKey.replace('X', '').toUpperCase();
              const xValue = latestData[entry.dataKey];
              const currentPrice = historicPrices[historicPrices.length - 1][`${entry.dataKey.replace('X', '_price')}`];
              const formattedPrice = formatPrice(currentPrice, symbol);
              const formattedLabel = `${symbol} ($${formattedPrice} | ${xValue.toFixed(1)}X)`;
              
              return (
                <li 
                  key={`item-${index}`}
                  className="inline-flex items-center mr-5 mb-1.5 cursor-pointer"
                  onClick={() => handleLegendClick(entry.dataKey)}
                >
                  <span className={`mr-1.5 text-[28px] leading-[18px] flex items-center`} style={{ color: entry.color }}>●</span>
                  <span className={`text-xs leading-3 ${visibleLines[entry.dataKey] ? 'text-white' : 'text-gray-500'}`}>
                    {formattedLabel}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      );
    }
    return null;
  };

  const renderCustomizedLabel = (props: any) => {
    const { points } = props;
    if (!points || points.length === 0) return null;

    // Get the last point of the line
    const lastPoint = points[points.length - 1];
    if (!lastPoint) return null;

    const icons = {
      hexX: (
        <g transform={`translate(${lastPoint.x + 10},${lastPoint.y - 8})`}>
          <circle r="8" fill="#ff00ff" />
          <text 
            x="0" 
            y="0" 
            textAnchor="middle" 
            dominantBaseline="middle" 
            fill="white" 
            fontSize="10"
          >
            H
          </text>
        </g>
      ),
      btcX: (
        <g transform={`translate(${lastPoint.x + 10},${lastPoint.y - 8})`}>
          <circle r="8" fill="#f7931a" />
          <text 
            x="0" 
            y="0" 
            textAnchor="middle" 
            dominantBaseline="middle" 
            fill="white" 
            fontSize="10"
          >
            ₿
          </text>
        </g>
      ),
      ethX: (
        <g transform={`translate(${lastPoint.x + 10},${lastPoint.y - 8})`}>
          <circle r="8" fill="#00FFFF" />
          <text 
            x="0" 
            y="0" 
            textAnchor="middle" 
            dominantBaseline="middle" 
            fill="white" 
            fontSize="10"
          >
            Ξ
          </text>
        </g>
      ),
      solX: (
        <g transform={`translate(${lastPoint.x + 10},${lastPoint.y - 8})`}>
          <circle r="8" fill="#14F195" />
          <text 
            x="0" 
            y="0" 
            textAnchor="middle" 
            dominantBaseline="middle" 
            fill="white" 
            fontSize="10"
          >
            S
          </text>
        </g>
      )
    };

    return icons[props.dataKey];
  };

  // Update the CustomTooltip component
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-black/85 border border-white/20 rounded-lg p-2.5">
          <p className="text-white m-0 mb-1.5">{`Date: ${label}`}</p>
          {payload.map((entry, index) => {
            const symbol = entry.dataKey.replace('X', '').toUpperCase();
            const formattedPrice = formatPrice(entry.value, symbol);
            return (
              <p key={index} className="text-white m-0 mb-1.5">
                <span className={`text-${entry.color}`}>●</span>
                {` ${symbol}: $${formattedPrice}`}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return <div className="text-center text-white">Loading...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500">Error: {error}</div>;
  }

  return (
    <div className="w-full  h-[550px] sm:h-[350px] md:h-[400px] lg:h-[450px] my-10 p-4 bg-black border border-white/20 rounded-lg text-white relative">
      <div className="flex flex-col gap-1.5 mb-2.5 ml-10">
        <h2 className="text-sm sm:text-2xl font-bold">
          <u>HEX</u> vs BTC, Eth & SOL
        </h2>
        <p className="text-xs sm:text-sm text-gray-400">
          From the HEX bear market bottom
        </p>
      </div>
      
      <ResponsiveContainer width="100%" height="90%">
        <LineChart
          data={data}
          margin={{ top: 15, right: 0, left: 0, bottom: 20 }}
        >
          <XAxis 
            dataKey="date" 
            stroke="#888"
            axisLine={{ stroke: '#888', strokeWidth: 0 }}
            tickLine={false}
            tick={{ fill: '#888', fontSize: 14, dy: 10 }}
            tickFormatter={(date) => new Date(date).toLocaleDateString('en-UK', { 
              day: 'numeric', 
              month: 'short',
              year: '2-digit'
            })}
            ticks={data.reduce((acc, item, index) => {
              const currentDate = new Date(item.date);
              const isFirstDate = index === 0;
              const isLastDate = index === data.length - 1;
              const isFirstOfMonth = currentDate.getDate() === 1;
              
              if (isFirstDate || isLastDate || isFirstOfMonth) {
                acc.push(item.date);
              }
              
              return acc;
            }, [] as string[])}
          />
          <YAxis 
            tickFormatter={(value) => `${Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1)}X`}
            stroke="#888"
            axisLine={{ stroke: '#888', strokeWidth: 0 }}
            tickLine={false}
            tick={(props) => {
              return (
                <text
                  x={props.x}
                  y={props.y}
                  dy={4}
                  textAnchor="end"
                  fill="#888"
                  fontSize={14}
                >
                  {`${Number.isInteger(props.payload.value) ? 
                    props.payload.value.toFixed(0) : 
                    props.payload.value.toFixed(1)}X`}
                </text>
              );
            }}
            domain={visibleLines.hexX ? [1, 4] : [0.9, 1.5]}
            ticks={visibleLines.hexX ? 
              [1, 2, 3, 4, 5, 6, 7,8,9,10] : 
              [0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 2.0]
            }
          />
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="rgba(136, 136, 136, 0.2)" 
            vertical={false} 
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(0, 0, 0, 0.85)', 
              border: '1px solid rgba(255, 255, 255, 0.2)', 
              borderRadius: '10px', 
              padding: '10px',
              color: '#fff',
              boxShadow: '0 0 10px rgba(0,0,0,0.5)'
            }}
            formatter={(value: number, name: string) => {
              const color = name === 'HEX' ? '#ff00ff' : 
                           name === 'BTC' ? '#f7931a' : 
                           name === 'ETH' ? '#00FFFF' : 
                           '#14F195';
              return [
                <span style={{ color }}>
                  {name} : {value.toFixed(1)}X
                </span>
              ];
            }}
            labelFormatter={(label) => (
              <div className="mb-2.5 text-sm text-white">
                {label.split('T')[0]}
              </div>
            )}
          />
          <Legend content={customLegend} />
          <Line 
            type="monotone" 
            dataKey="hexX" 
            stroke="#ff00ff" 
            strokeWidth={2}
            dot={false}
            name="HEX"
            hide={!visibleLines.hexX}
            label={renderCustomizedLabel}
          />
          <Line 
            type="monotone" 
            dataKey="btcX" 
            stroke="#f7931a" 
            strokeWidth={2}
            dot={false}
            name="BTC"
            hide={!visibleLines.btcX}
            label={renderCustomizedLabel}
          />
          <Line 
            type="monotone" 
            dataKey="ethX" 
            stroke="#00FFFF" 
            strokeWidth={2}
            dot={false}
            name="ETH"
            hide={!visibleLines.ethX}
            label={renderCustomizedLabel}
          />
          <Line 
            type="monotone" 
            dataKey="solX" 
            stroke="#14F195" 
            strokeWidth={2}
            dot={false}
            name="SOL"
            hide={!visibleLines.solX}
            label={renderCustomizedLabel}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default VsGainsHEX;

