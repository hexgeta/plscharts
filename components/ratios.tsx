import React, { useEffect, useState, useMemo } from 'react';
import { CartesianGrid, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton2';
import { supabase } from '../supabaseClient';
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useRouter } from 'next/router';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PriceData {
  date: string;
  priceRatio: number;
}

interface RawPriceData {
  date: string;
  priceRatio: number | null;
}

interface CoinOption {
  id: string;
  name: string;
  color: string;
  priceKey: string;
  pairAddress?: string;
}

const coins: CoinOption[] = [
  { id: 'hex', name: 'pHEX', color: '#ff00ff', priceKey: 'hex_price', pairAddress: '0xf1F4ee610b2bAbB05C635F726eF8B0C568c8dc65' },
  { id: 'ehex', name: 'eHEX', color: '#627EEA', priceKey: 'ehex_price', pairAddress: '0x9e0905249ceefffb9605e034b534544684a58be6' },
  { id: 'pls', name: 'PLS', color: '#9945FF', priceKey: 'pls_price', pairAddress: '0x6753560538eca67617a9ce605178f788be7e524e' },
  { id: 'plsx', name: 'PLSX', color: '#FFD700', priceKey: 'plsx_price', pairAddress: '0x1b45b9148791d3a104184cd5dfe5ce57193a3ee9' },
  { id: 'inc', name: 'INC', color: '#00FF00', priceKey: 'inc_price', pairAddress: '0xf808Bb6265e9Ca27002c0A04562Bf50d4FE37EAA' },
  { id: 'btc', name: 'BTC', color: '#f7931a', priceKey: 'btc_price' },
  { id: 'eth', name: 'ETH', color: '#00FFFF', priceKey: 'eth_price' },
  { id: 'sol', name: 'SOL', color: '#14F195', priceKey: 'sol_price' },
  { id: 'xrp', name: 'XRP', color: '#fff', priceKey: 'xrp_price' },
  { id: 'bnb', name: 'BNB', color: '#F3BA2F', priceKey: 'bnb_price' },
  { id: 'doge', name: 'DOGE', color: '#C2A633', priceKey: 'dogecoin_price' },
  { id: 'ada', name: 'ADA', color: '#0033AD', priceKey: 'cardano_price' },
  { id: 'tron', name: 'TRX', color: '#FF0013', priceKey: 'tron_price' },
  { id: 'avax', name: 'AVAX', color: '#E84142', priceKey: 'avalanche_price' },
  { id: 'link', name: 'LINK', color: '#2A5ADA', priceKey: 'chainlink_price' },
  { id: 'shib', name: 'SHIB', color: '#FFA409', priceKey: 'shibainu_price' },
  { id: 'ton', name: 'TON', color: '#0098EA', priceKey: 'toncoin_price' },
  { id: 'xlm', name: 'XLM', color: '#14B6E7', priceKey: 'stellar_price' },
  { id: 'sui', name: 'SUI', color: '#6FBCF0', priceKey: 'sui_price' },
  { id: 'dot', name: 'DOT', color: '#E6007A', priceKey: 'polkadot_price' },
  { id: 'hbar', name: 'HBAR', color: '#00ADED', priceKey: 'hedera_price' },
  { id: 'bch', name: 'BCH', color: '#8DC351', priceKey: 'bitcoincash_price' },
  { id: 'pepe', name: 'PEPE', color: '#00B84C', priceKey: 'pepe_price' },
  { id: 'uni', name: 'UNI', color: '#FF007A', priceKey: 'uniswap_price' }
];

const formatDateForURL = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseURLDate = (dateStr: string) => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const getEndOfDay = (date: Date) => {
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay;
};

const getStartOfDay = (date: Date) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  return startOfDay;
};

const ensureDateNotInFuture = (date: Date) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date > today ? today : date;
};

const TokenRatioChart: React.FC = () => {
  const router = useRouter();
  const [data, setData] = useState<PriceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numeratorCoin, setNumeratorCoin] = useState<string>('eth');
  const [denominatorCoin, setDenominatorCoin] = useState<string>('btc');
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [isChartReady, setIsChartReady] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [baselineRatio, setBaselineRatio] = useState<number | null>(null);

  // Initialize state from URL parameters or defaults
  useEffect(() => {
    if (!router.isReady || isInitialized) return;

    const { start_date, end_date, first_ticker, second_ticker } = router.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Set dates
    if (start_date && typeof start_date === 'string') {
      try {
        const parsedDate = parseURLDate(start_date);
        if (!isNaN(parsedDate.getTime())) {
          setStartDate(getStartOfDay(ensureDateNotInFuture(parsedDate)));
        }
      } catch (e) {
        const defaultStart = new Date(today);
        defaultStart.setDate(defaultStart.getDate() - 365);
        setStartDate(getStartOfDay(defaultStart));
      }
    } else {
      const defaultStart = new Date(today);
      defaultStart.setDate(defaultStart.getDate() - 365);
      setStartDate(getStartOfDay(defaultStart));
    }

    if (end_date && typeof end_date === 'string') {
      try {
        const parsedDate = parseURLDate(end_date);
        if (!isNaN(parsedDate.getTime())) {
          setEndDate(getEndOfDay(ensureDateNotInFuture(parsedDate)));
        }
      } catch (e) {
        setEndDate(getEndOfDay(today));
      }
    } else {
      setEndDate(getEndOfDay(today));
    }

    // Set tokens
    if (first_ticker && typeof first_ticker === 'string' && coins.some(c => c.id === first_ticker)) {
      setNumeratorCoin(first_ticker);
    }
    if (second_ticker && typeof second_ticker === 'string' && coins.some(c => c.id === second_ticker)) {
      setDenominatorCoin(second_ticker);
    }

    setIsInitialized(true);
  }, [router.isReady, router.query, isInitialized]);

  // Update URL parameters when filters change
  useEffect(() => {
    if (!router.isReady || !isInitialized || !startDate || !endDate) return;

    const urlParams = new URLSearchParams();
    urlParams.append('start_date', formatDateForURL(startDate));
    urlParams.append('end_date', formatDateForURL(endDate));
    urlParams.append('first_ticker', numeratorCoin);
    urlParams.append('second_ticker', denominatorCoin);
    urlParams.append('utm_source', 'filter_feature');

    router.push(
      {
        pathname: router.pathname,
        search: urlParams.toString(),
      },
      undefined,
      { shallow: true, scroll: false }
    );
  }, [startDate, endDate, numeratorCoin, denominatorCoin, router.isReady, isInitialized]);

  const selectedNumerator = useMemo(() => coins.find(c => c.id === numeratorCoin), [numeratorCoin]);
  const selectedDenominator = useMemo(() => coins.find(c => c.id === denominatorCoin), [denominatorCoin]);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      if (!selectedNumerator || !selectedDenominator || !startDate || !endDate) {
        setDebugInfo('No tokens selected or invalid date range');
        return;
      }
      
      setIsLoading(true);
      setError(null);
      setDebugInfo('Fetching data...');
      
      try {
        console.log('Attempting to connect to Supabase...');
        console.log('Date range:', {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        });
        
        let query = supabase
          .from('historic_prices')
          .select('*')
          .not(selectedNumerator.priceKey, 'is', null)
          .not(selectedDenominator.priceKey, 'is', null)
          .gte('date', startDate.toISOString())
          .lte('date', endDate.toISOString())
          .order('date', { ascending: true });

        const { data: historicPrices, error } = await query;

        if (error) {
          setDebugInfo(`Supabase error: ${error.message}`);
          throw error;
        }

        if (!historicPrices || historicPrices.length === 0) {
          setDebugInfo('No historic prices found in database');
          throw new Error('No price data available');
        }

        const formattedData: PriceData[] = historicPrices.map((item: any) => {
          const numeratorPrice = Number(item[selectedNumerator.priceKey]);
          const denominatorPrice = Number(item[selectedDenominator.priceKey]);

          return {
            date: item.date.split('T')[0],
            priceRatio: numeratorPrice && denominatorPrice && denominatorPrice > 0 
              ? numeratorPrice / denominatorPrice 
              : 0
          };
        }).filter(item => item.priceRatio > 0);

        if (isMounted) {
          setData(formattedData);
          setIsLoading(false);
          setIsChartReady(true);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        if (isMounted) {
          setError(error instanceof Error ? error.message : 'Failed to fetch data');
          setIsLoading(false);
          setIsChartReady(true);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [numeratorCoin, denominatorCoin, selectedNumerator, selectedDenominator, startDate, endDate]);

  // Add effect to set baseline ratio when data changes
  useEffect(() => {
    if (data.length > 0) {
      setBaselineRatio(data[0].priceRatio);
    } else {
      setBaselineRatio(null);
    }
  }, [data]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTooltipDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleSwapPair = () => {
    const tempNumerator = numeratorCoin;
    setNumeratorCoin(denominatorCoin);
    setDenominatorCoin(tempNumerator);
  };

  if (error) {
    return (
      <div className="w-full h-[450px] my-32 relative">
        <div className="w-full h-full p-5 bg-black border border-white/20 rounded-xl text-white flex flex-col items-center justify-center">
          <p className="text-red-500 mb-2">Error: {error}</p>
          <p className="text-gray-400 text-sm">{debugInfo}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[700px] my-20 relative">
      {!isChartReady ? (
        <Skeleton variant="chart" />
      ) : (
        <div className="w-full h-full p-5 bg-black border border-white/20 rounded-xl text-white">
          <div className="flex flex-col gap-4 mb-8">
            <div className="flex items-center justify-center px-4 sm:px-10">
              <div className="flex flex-col lg:flex-row items-center gap-4 max-w-[1200px] w-full py-4">
                {/* Date Range Pickers */}
                <div className="flex flex-col sm:flex-row items-center gap-2 justify-center lg:flex-1">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-[200px] justify-start text-left font-normal bg-black border-white/20 text-white",
                          "hover:bg-black hover:border-white/20 hover:text-white",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "yyyy-MM-dd") : <span>Start date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-black border border-white/20">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        defaultMonth={startDate}
                        onSelect={(date) => {
                          if (date) {
                            const selectedDate = new Date(
                              date.getFullYear(),
                              date.getMonth(),
                              date.getDate()
                            );
                            const newDate = ensureDateNotInFuture(selectedDate);
                            setStartDate(getStartOfDay(newDate));
                          }
                        }}
                        disabled={(date) => date > new Date()}
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
                        }}
                      />
                    </PopoverContent>
                  </Popover>

                  <span className="text-white/60 w-[40px] text-center">to</span>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-[200px] justify-start text-left font-normal bg-black border-white/20 text-white",
                          "hover:bg-black hover:border-white/20 hover:text-white",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "yyyy-MM-dd") : <span>End date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 bg-black border border-white/20">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        defaultMonth={endDate}
                        onSelect={(date) => {
                          if (date) {
                            const selectedDate = new Date(
                              date.getFullYear(),
                              date.getMonth(),
                              date.getDate()
                            );
                            const newDate = ensureDateNotInFuture(selectedDate);
                            setEndDate(getEndOfDay(newDate));
                          }
                        }}
                        disabled={(date) => date > new Date()}
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
                        }}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {/* Token Selectors */}
                <div className="flex flex-col sm:flex-row items-center gap-2 justify-center lg:flex-1">
                  <Select value={numeratorCoin} onValueChange={setNumeratorCoin}>
                    <SelectTrigger className="w-[200px] bg-black border-white/20 text-white hover:bg-black/90">
                      <SelectValue placeholder="Select token" />
                    </SelectTrigger>
                    <SelectContent className="bg-black border border-white/20">
                      {coins.map((coin) => (
                        <SelectItem 
                          key={coin.id} 
                          value={coin.id}
                          className="text-white hover:bg-gray-900 focus:bg-gray-900 focus:text-white cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: coin.color }}
                            />
                            <span>{coin.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <button
                    onClick={handleSwapPair}
                    className="p-2 w-[40px] h-[40px] text-gray-400 hover:text-white transition-colors flex-shrink-0 flex items-center justify-center"
                    title="Swap tokens"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 17h16M4 17l4 4M4 17l4-4" />
                      <path d="M20 7H4M20 7l-4 4M20 7l-4-4" />
                    </svg>
                  </button>

                  <Select value={denominatorCoin} onValueChange={setDenominatorCoin}>
                    <SelectTrigger className="w-[200px] bg-black border-white/20 text-white hover:bg-black/90">
                      <SelectValue placeholder="Select token" />
                    </SelectTrigger>
                    <SelectContent className="bg-black border border-white/20">
                      {coins.map((coin) => (
                        <SelectItem 
                          key={coin.id} 
                          value={coin.id}
                          className="text-white hover:bg-gray-900 focus:bg-gray-900 focus:text-white cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: coin.color }}
                            />
                            <span>{coin.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
          
          {data.length === 0 ? (
            <div className="w-full h-[calc(100%-100px)] flex flex-col items-center justify-center gap-4">
              <p className="text-gray-400">No data available for this pair</p>
              <p className="text-sm text-gray-500">{debugInfo}</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="90%">
              <LineChart
                data={data}
                margin={{ 
                  top: 0, 
                  right: 20, 
                  left: 20, 
                  bottom: window.innerWidth < 768 
                    ? 280  // mobile
                    : window.innerWidth < 1024 
                      ? 110  // tablet
                      : 100   // desktop
                }}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="rgba(136, 136, 136, 0.2)" 
                  vertical={false} 
                />
                <XAxis 
                  dataKey="date" 
                  axisLine={{ stroke: '#888', strokeWidth: 0 }}
                  tickLine={false}
                  tick={{ fill: '#888', fontSize: 14, dy: 5 }}
                  ticks={data.reduce((acc, item, index) => {
                    if (index === 0 || index === data.length - 1) {
                      acc.push(item.date);
                    }
                    return acc;
                  }, [] as string[])}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString('en-US', { 
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    });
                  }}
                  label={{ 
                    value: 'DATE', 
                    position: 'bottom',
                    offset: 10,
                    style: { 
                      fill: '#888',
                      fontSize: 12,
                      marginTop: '0px',
                    }
                  }}
                />
                <YAxis 
                  stroke="#888" 
                  domain={['dataMin', dataMax => dataMax * 1.005]}
                  allowDataOverflow={true}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#888', fontSize: 14, dx: -5}}
                  interval="preserveStartEnd"
                  tickFormatter={(value) => {
                    if (value >= 1000000) {
                      return (value / 1000000).toFixed(2) + 'M';
                    } else if (value >= 1000) {
                      return (value / 1000).toFixed(2) + 'K';
                    } else if (value < 0.0001) {
                      return value.toExponential(2);
                    }
                    return value.toFixed(2);
                  }}
                  label={{ 
                    value: 'RATIO', 
                    position: 'left',
                    angle: -90,
                    offset: 12,
                    style: { 
                      fill: '#888',
                      fontSize: 12,
                      marginTop: '0px',
                    }
                  }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(0, 0, 0, 0.85)', 
                    border: 'solid 1px rgba(255, 255, 255, 0.2)', 
                    borderRadius: '5px'
                  }}
                  labelStyle={{ color: 'white' }}
                  formatter={(value: number) => {
                    let ratio;
                    if (value < 0.0001) {
                      ratio = value.toExponential(2);
                    } else if (value > 10000) {
                      ratio = value.toExponential(2);
                    } else {
                      ratio = value.toFixed(2);
                    }
                    const xValue = baselineRatio ? (value / baselineRatio).toFixed(2) : 'N/A';
                    return [
                      `${ratio} (${xValue}X)`,
                      `${selectedNumerator?.name}/${selectedDenominator?.name} Ratio`
                    ];
                  }}
                  labelFormatter={formatTooltipDate}
                />
                <Line 
                  type="monotone" 
                  dataKey="priceRatio" 
                  name={`${selectedNumerator?.name}/${selectedDenominator?.name} Ratio`}
                  stroke={selectedNumerator?.color || '#fff'}
                  dot={false} 
                  strokeWidth={2}
                  connectNulls={true}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  );
};

export default TokenRatioChart;
