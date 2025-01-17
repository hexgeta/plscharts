"use client"

import React from 'react';
import { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import { supabase } from '../supabaseClient';
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton2";

interface TokenData {
  date: string;
  hexX: number;
  btcX: number;
  ethX: number;
  solX: number;
  pulseX: number;
  plsX: number;
  plsxX: number;
  incX: number;
  ehexX: number;
}

interface DexScreenerResponse {
  pair: {
    priceUsd: string;
    // ... other fields we might need
  };
}

// Helper function to format numbers with appropriate decimals and commas
const formatPrice = (price: number, symbol: string) => {
  if (!price) return '0';  // Handle undefined/null cases
  
  if (symbol === 'BTC' || symbol === 'ETH' || symbol === 'SOL') {
    return price.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
  if (symbol === 'pHEX') {
    return price.toFixed(3);  // Example: 7 decimal places for INC
  }
  if (symbol === 'PLS') {
    return price.toFixed(6);  // Example: 5 decimal places for PLS
  }
  if (symbol === 'PLSX') {
    return price.toFixed(6);  // Example: 6 decimal places for PLSX
  }
  if (symbol === 'INC') {
    return price.toFixed(2);  // Example: 7 decimal places for INC
  }
  if (symbol === 'eHEX') {
    return price.toFixed(3);  // Example: 7 decimal places for INC
  }
};

const safeParsePriceUsd = (data: any): number | null => {
  try {
    if (data && data.pair && data.pair.priceUsd) {
      const price = parseFloat(data.pair.priceUsd);
      return isNaN(price) ? null : price;
    }
    return null;
  } catch (error) {
    console.error('Error parsing price:', error);
    return null;
  }
};

interface LowDates {
  id: string;
  name: string;
  date: string;
  color: string;
}

const lowDates: LowDates[] = [
  { id: 'hex', name: 'pHEX low', date: '2024-09-07T00:00:00.000Z', color: '#ff00ff' },
  { id: 'ehex', name: 'eHEX low', date: '2024-08-05T00:00:00.000Z', color: '#627EEA' },
  { id: 'pls', name: 'PLS low', date: '2024-09-04T00:00:00.000Z', color: '#9945FF' },
  { id: 'plsx', name: 'PLSX low', date: '2023-09-11T00:00:00.000Z', color: '#FFD700' },
  { id: 'inc', name: 'INC low', date: '2023-12-12T00:00:00.000Z', color: '#00FF00' },
  { id: 'btc', name: 'BTC low', date: '2022-11-22T00:00:00.000Z', color: '#f7931a' },
  { id: 'eth', name: 'ETH low', date: '2022-06-19T00:00:00.000Z', color: '#00FFFF' },
  { id: 'sol', name: 'SOL low', date: '2022-12-30T00:00:00.000Z', color: '#14F195' },
];

const FALLBACK_PRICES = {
  pls_price: 0.0001,
  plsx_price: 0.0001
};

const VsGainsEverything: React.FC = () => {
  const [data, setData] = useState<TokenData[]>([]);
  const [historicPrices, setHistoricPrices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleLines, setVisibleLines] = useState({
    hexX: true,
    btcX: true,
    ethX: true,
    solX: true,
    plsX: true,
    plsxX: true,
    incX: true,
    ehexX: true
  });
  const [baselineDate, setBaselineDate] = useState('2024-09-07T00:00:00.000Z');
  const [activeButton, setActiveButton] = useState<string>('HEX');
  const [date, setDate] = useState<Date | undefined>(new Date('2024-09-07'));
  const [isChartReady, setIsChartReady] = useState(false);

  useEffect(() => {
    handleDateChange('2024-09-07T00:00:00.000Z', 'HEX');
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      const { data: fetchedHistoricPrices, error } = await supabase
        .from('historic_prices')
        .select('*')
        .gte('date', baselineDate)
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching data:', error);
        setError(error.message);
        return;
      }

      // Check if we need to fetch current prices
      const lastDataPoint = fetchedHistoricPrices[fetchedHistoricPrices.length - 1];
      const lastDataDate = new Date(lastDataPoint.date);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      // If last data point is older than yesterday, fetch current prices
      if (lastDataDate <= yesterday) {
        try {
          // Get the most recent prices as fallback values
          const lastKnownPrices = fetchedHistoricPrices[fetchedHistoricPrices.length - 1];
          
          // Initialize todayData with last known prices
          let todayData = {
            date: today.toISOString(),
            hex_price: lastKnownPrices.hex_price,
            ehex_price: lastKnownPrices.ehex_price,
            pls_price: lastKnownPrices.pls_price,
            plsx_price: lastKnownPrices.plsx_price,
            inc_price: lastKnownPrices.inc_price,
            btc_price: lastKnownPrices.btc_price,
            eth_price: lastKnownPrices.eth_price,
            sol_price: lastKnownPrices.sol_price
          };

          // Fetch current prices from DEXScreener
          try {
            const hexResponse = await fetch('https://api.dexscreener.com/latest/dex/pairs/pulsechain/0xf1F4ee610b2bAbB05C635F726eF8B0C568c8dc65');
            const hexData = await hexResponse.json();
            todayData.hex_price = parseFloat(hexData?.pair?.priceUsd) || lastKnownPrices.hex_price;
          } catch (error) {
            console.error('Error fetching HEX price:', error);
          }

          try {
            const ehexResponse = await fetch('https://api.dexscreener.com/latest/dex/pairs/ethereum/0x9e0905249ceefffb9605e034b534544684a58be6');
            const ehexData = await ehexResponse.json();
            todayData.ehex_price = parseFloat(ehexData?.pair?.priceUsd) || lastKnownPrices.ehex_price;
          } catch (error) {
            console.error('Error fetching eHEX price:', error);
          }

          // Add API calls for other tokens
          try {
            const plsResponse = await fetch('https://api.dexscreener.com/latest/dex/pairs/pulsechain/0x6753560538eca67617a9ce605178f788be7e524e');
            const plsData = await plsResponse.json();
            todayData.pls_price = parseFloat(plsData?.pair?.priceUsd) || lastKnownPrices.pls_price;
          } catch (error) {
            console.error('Error fetching PLS price:', error);
          }

          try {
            const plsxResponse = await fetch('https://api.dexscreener.com/latest/dex/pairs/pulsechain/0x1b45b9148791d3a104184cd5dfe5ce57193a3ee9');
            const plsxData = await plsxResponse.json();
            todayData.plsx_price = parseFloat(plsxData?.pair?.priceUsd) || lastKnownPrices.plsx_price;
          } catch (error) {
            console.error('Error fetching PLSX price:', error);
          }

          try {
            const incResponse = await fetch('https://api.dexscreener.com/latest/dex/pairs/pulsechain/0xf808Bb6265e9Ca27002c0A04562Bf50d4FE37EAA');
            const incData = await incResponse.json();
            todayData.inc_price = parseFloat(incData?.pair?.priceUsd) || lastKnownPrices.inc_price;
          } catch (error) {
            console.error('Error fetching INC price:', error);
          }

          // Add fetch calls for BTC, ETH, SOL
          try {
            const btcResponse = await fetch('https://api.dexscreener.com/latest/dex/pairs/ethereum/0xCBCdF9626bC03E24f779434178A73a0B4bad62eD');
            const btcData = await btcResponse.json();
            todayData.btc_price = parseFloat(btcData?.pair?.priceUsd) || lastKnownPrices.btc_price;
          } catch (error) {
            console.error('Error fetching BTC price:', error);
          }

          try {
            const ethResponse = await fetch('https://api.dexscreener.com/latest/dex/pairs/ethereum/0x11b815efB8f581194ae79006d24E0d814B7697F6');
            const ethData = await ethResponse.json();
            todayData.eth_price = parseFloat(ethData?.pair?.priceUsd) || lastKnownPrices.eth_price;
          } catch (error) {
            console.error('Error fetching ETH price:', error);
          }

          try {
            const solResponse = await fetch('https://api.dexscreener.com/latest/dex/pairs/ethereum/0x127452F3f9cDc0389b0Bf59ce6131aA3Bd763598');
            const solData = await solResponse.json();
            todayData.sol_price = parseFloat(solData?.pair?.priceUsd) || lastKnownPrices.sol_price;
          } catch (error) {
            console.error('Error fetching SOL price:', error);
          }

          console.log('Today\'s prices:', todayData);
          fetchedHistoricPrices.push(todayData);
        } catch (error) {
          console.error('Error in price fetching process:', error);
        }
      }

      // Simplified data processing
      if (fetchedHistoricPrices && fetchedHistoricPrices.length > 0) {
        const baselinePrices = fetchedHistoricPrices[0];
        setHistoricPrices(fetchedHistoricPrices);

        // For INC, get the first available price
        const firstIncPrice = fetchedHistoricPrices.find(price => price.inc_price)?.inc_price;

        const formattedData = fetchedHistoricPrices.map((item) => ({
          date: item.date,
          hexX: (item.hex_price / (baselinePrices.hex_price || 1)),
          btcX: (item.btc_price / (baselinePrices.btc_price || 1)),
          ethX: (item.eth_price / (baselinePrices.eth_price || 1)),
          solX: (item.sol_price / (baselinePrices.sol_price || 1)),
          // Use fallback prices for tokens that didn't exist
          plsX: (item.pls_price / (baselinePrices.pls_price || FALLBACK_PRICES.pls_price)),
          plsxX: (item.plsx_price / (baselinePrices.plsx_price || FALLBACK_PRICES.plsx_price)),
          incX: (item.inc_price / (baselinePrices.inc_price || firstIncPrice || 1)),
          ehexX: (item.ehex_price / (baselinePrices.ehex_price || 1))
        }));
        
        setData(formattedData);
      } else {
        setError('No data available for the selected date range');
      }
      setIsLoading(false);
    };

    fetchData();
  }, [baselineDate]);

  useEffect(() => {
    if (!isLoading && data.length > 0) {
      const timer = setTimeout(() => {
        setIsChartReady(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, data]);

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
      const lastPrices = historicPrices[historicPrices.length - 1];

      // Remove the filtering logic to include BTC, ETH, and SOL in the legend
      const filteredPayload = payload; // No filtering

      return (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          width: '100%', 
          marginTop: '0px' 
        }}>
          <ul style={{ 
            listStyle: 'none', 
            padding: '10px 0 40px 0', 
            display: 'flex', 
            flexWrap: 'wrap', 
            justifyContent: 'center' 
          }}>
            {filteredPayload.map((entry, index) => {
              const symbol = entry.value;
              const xValue = latestData[entry.dataKey];
              const priceField = symbol.toLowerCase() === 'phex' ? 'hex_price' :  // Add specific mapping for pHEX
                                 `${symbol.toLowerCase()}_price`;
              const currentPrice = lastPrices[priceField];
              const formattedPrice = formatPrice(currentPrice, symbol);
              const formattedLabel = `${symbol} ($${formattedPrice} | ${xValue.toFixed(1)}X)`;
              
              return (
                <li 
                  key={`item-${index}`}
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    marginRight: 20, 
                    marginBottom: 5,
                    cursor: 'pointer' 
                  }}
                  onClick={() => handleLegendClick(entry.dataKey)}
                >
                  <span style={{ 
                    color: entry.color, 
                    marginRight: 5,
                    fontSize: '28px',
                    lineHeight: '18px',
                    display: 'flex',
                    alignItems: 'center'
                  }}>●</span>
                  <span style={{ 
                    color: visibleLines[entry.dataKey] ? '#fff' : '#888',
                    fontSize: '12px',
                    lineHeight: '12px'
                  }}>
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
      ),
      plsX: (
        <g transform={`translate(${lastPoint.x + 10},${lastPoint.y - 8})`}>
          <circle r="8" fill="#9945FF" />
          <text x="0" y="0" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="10">P</text>
        </g>
      ),
      plsxX: (
        <g transform={`translate(${lastPoint.x + 10},${lastPoint.y - 8})`}>
          <circle r="8" fill="#FFD700" />
          <text x="0" y="0" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="10">X</text>
        </g>
      ),
      incX: (
        <g transform={`translate(${lastPoint.x + 10},${lastPoint.y - 8})`}>
          <circle r="8" fill="#00FF00" />
          <text x="0" y="0" textAnchor="middle" dominantBaseline="middle" fill="white" fontSize="10">I</text>
        </g>
      )
    };

    return icons[props.dataKey];
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.85)', 
          border: '1px solid rgba(255, 255, 255, 0.2)', 
          borderRadius: '10px',
          padding: '10px'
        }}>
          <p style={{ color: 'white', margin: '0 0 5px' }}>{`Date: ${label}`}</p>
          {payload.map((entry, index) => {
            const symbol = entry.dataKey.replace('X', '').toUpperCase();
            const formattedPrice = formatPrice(entry.value, symbol);
            return (
              <p key={index} style={{ color: 'white', margin: '3px 0' }}>
                <span style={{ color: entry.color }}>●</span>
                {` ${symbol}: $${formattedPrice}`}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  const handleDateChange = (newDate: string, buttonName: string) => {
    const dateObj = new Date(newDate);
    setBaselineDate(newDate);
    setActiveButton(buttonName);
    setDate(dateObj);
  };

  if (error) {
    return <div className="text-center text-red-500">Error: {error}</div>;
  }

  return (
    <div className="w-full h-[650px] sm:h-[550px] md:h-[400px] lg:h-[550px] my-10 relative">
      {!isChartReady ? (
        <Skeleton variant="chart" />
      ) : (
        <div className="w-full h-full p-5 bg-black border border-white/20 rounded-xl text-white">
          <div className="flex justify-between items-start mb-2.5 px-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-white text-sm lg:text-2xl m-0 pr-2.5 font-bold">
                <u>RH Tickers</u> vs BTC, ETH & SOL
              </h2>
              <p className="text-xs sm:text-sm text-gray-400">
                From any token's market bottom
              </p>
            </div>

            <div className="flex gap-2.5 items-center flex-col">
              {/* Controls Container */}
              <div className="w-full flex flex-col lg:flex-row gap-2 lg:gap-4 items-center justify-end">
                {/* Date Picker */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-[140px] sm:w-[180px] justify-start text-left font-normal bg-black border-white/20 text-white",
                        "hover:bg-black hover:border-white/20 hover:text-white",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "yyyy/MM/dd") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-black border border-white/20">
                    <Calendar
                      mode="single"
                      selected={date}
                      defaultMonth={date}
                      onSelect={(newDate) => {
                        if (newDate) {
                          const isoString = newDate.toISOString();
                          setDate(newDate);
                          setBaselineDate(isoString);
                          setActiveButton('');
                        }
                      }}
                      initialFocus
                      className="bg-black text-white"
                      classNames={{
                        months: "text-white",
                        month: "text-white",
                        caption: "flex justify-center pt-1 relative items-center text-white",
                        caption_label: "text-sm font-medium text-white",
                        nav: "space-x-1 flex items-center",
                        nav_button: "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100 text-white",
                        nav_button_previous: "absolute left-1",
                        nav_button_next: "absolute right-1",
                        table: "w-full border-collapse space-y-1",
                        head_row: "flex",
                        head_cell: "text-gray-500 rounded-md w-9 font-normal text-[0.8rem]",
                        row: "flex w-full mt-2",
                        cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-transparent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                        day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-gray-800 rounded-md text-white",
                        day_selected: "bg-gray-800 text-white hover:bg-gray-700 hover:text-white focus:bg-gray-800 focus:text-white",
                        day_today: "bg-gray-800/80 text-white",
                        day_outside: "text-gray-700 opacity-50",
                        day_disabled: "text-gray-700 opacity-50",
                        day_range_middle: "aria-selected:bg-transparent",
                        day_hidden: "hidden",
                        ...(date && {
                          day_selected: "bg-gray-800 text-white hover:bg-gray-700 hover:text-white focus:bg-gray-800 focus:text-white",
                          day_today: "bg-gray-800/80 text-white",
                          day_outside: "text-gray-700 opacity-50",
                          day_disabled: "text-gray-700 opacity-50",
                          day_range_middle: "aria-selected:bg-transparent",
                          day_hidden: "hidden",
                        }),
                      }}
                    />
                  </PopoverContent>
                </Popover>

                {/* Lows Dropdown */}
                <Select 
                  defaultValue="hex" 
                  modal={false} 
                  onValueChange={(value) => {
                    const selectedDate = lowDates.find(date => date.id === value);
                    if (selectedDate) {
                      handleDateChange(selectedDate.date, selectedDate.name.split(' ')[0]);
                    }
                  }}
                >
                  <SelectTrigger className="w-[140px] sm:w-[180px] bg-black border-white/20 text-white hover:bg-gray-900 hover:border-white/20">
                    <SelectValue placeholder="Select low" />
                  </SelectTrigger>
                  <SelectContent 
                    className="bg-black border border-white/20 fixed overflow-hidden max-h-[var(--radix-select-content-available-height)] z-50"
                  >
                    {lowDates.map((date) => (
                      <SelectItem 
                        key={date.id} 
                        value={date.id}
                        className="text-white hover:bg-gray-900 focus:bg-gray-900 focus:text-white whitespace-nowrap truncate w-full"
                      >
                        <div className="flex items-center gap-2 truncate w-full">
                          <div 
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: date.color }}
                          />
                          <span className="truncate">{date.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          
          <div className="w-full h-[calc(100%-60px)]">
            <ResponsiveContainer width="100%" height="100%">
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
                  domain={['dataMin', 'dataMax']}
                  ticks={data.reduce((acc, item, index) => {
                    if (index === 0 || index === data.length - 1) {
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
                  domain={[0, 'auto']}
                  allowDataOverflow={false}
                  interval="preserveStartEnd"
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
                    const color = name === 'pHEX' ? '#ff00ff' : 
                                 name === 'BTC' ? '#f7931a' : 
                                 name === 'ETH' ? '#00FFFF' : 
                                 name === 'SOL' ? '#14F195' :
                                 name === 'PLS' ? '#9945FF' :
                                 name === 'PLSX' ? '#FFD700' :
                                 name === 'INC' ? '#00FF00' :
                                 name === 'eHEX' ? '#627EEA' :
                                 '#fff';
                    return [
                      <span style={{ color }}>
                        {name} : {value.toFixed(1)}X
                      </span>
                    ];
                  }}
                  labelFormatter={(label) => (
                    <div style={{ 
                      marginBottom: '5px',
                      fontSize: '14px',
                      color: '#fff'
                    }}>
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
                  name="pHEX"
                  label={renderCustomizedLabel}
                  hide={!visibleLines.hexX}
                />
                <Line 
                  type="monotone" 
                  dataKey="ehexX" 
                  stroke="#627EEA" 
                  strokeWidth={2}
                  dot={false}
                  name="eHEX"
                  hide={!visibleLines.ehexX}
                  label={renderCustomizedLabel}
                />
                          <Line 
                  type="monotone" 
                  dataKey="plsX" 
                  stroke="#9945FF" 
                  strokeWidth={2}
                  dot={false}
                  name="PLS"
                  label={renderCustomizedLabel}
                  hide={!visibleLines.plsX}
                />
                <Line 
                  type="monotone" 
                  dataKey="plsxX" 
                  stroke="#FFD700" 
                  strokeWidth={2}
                  dot={false}
                  name="PLSX"
                  label={renderCustomizedLabel}
                  hide={!visibleLines.plsxX}
                />
                <Line 
                  type="monotone" 
                  dataKey="incX" 
                  stroke="#00FF00" 
                  strokeWidth={2}
                  dot={false}
                  name="INC"
                  hide={!visibleLines.incX}
                  label={renderCustomizedLabel}
                />
                <Line 
                  type="monotone" 
                  dataKey="btcX" 
                  stroke="#f7931a" 
                  strokeWidth={2}
                  dot={false}
                  name="BTC"
                  label={renderCustomizedLabel}
                  hide={!visibleLines.btcX}
                />
                <Line 
                  type="monotone" 
                  dataKey="ethX" 
                  stroke="#00FFFF" 
                  strokeWidth={2}
                  dot={false}
                  name="ETH"
                  label={renderCustomizedLabel}
                  hide={!visibleLines.ethX}
                />
                <Line 
                  type="monotone" 
                  dataKey="solX" 
                  stroke="#14F195" 
                  strokeWidth={2}
                  dot={false}
                  name="SOL"
                  label={renderCustomizedLabel}
                  hide={!visibleLines.solX}
                />


              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default VsGainsEverything;

