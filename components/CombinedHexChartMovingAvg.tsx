import { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../supabaseClient';
import { Skeleton } from "@/components/ui/skeleton2";

interface PriceData {
  date: string;
  ehex_price: number;
  hex_price: number;
  combined_price?: number;
  average_price?: number;
  median_price?: number;
}

const CombinedHexChartMovingAvg = () => {
  const [data, setData] = useState<PriceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChartReady, setIsChartReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPriceData();
  }, []);

  const fetchPriceData = async () => {
    setIsLoading(true);
    try {
      let allData: PriceData[] = [];
      let hasMore = true;
      let page = 0;
      const pageSize = 1000;

      while (hasMore) {
        const { data: priceData, error } = await supabase
          .from('historic_prices')
          .select('date, ehex_price, hex_price')
          .or('hex_price.not.is.null,ehex_price.not.is.null')
          .order('date', { ascending: true })
          .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;

        if (priceData && priceData.length > 0) {
          allData = [...allData, ...priceData];
          page++;
        }

        // If we got less than pageSize results, we've reached the end
        hasMore = priceData && priceData.length === pageSize;
      }

      console.log('Total rows:', allData.length);
      console.log('First date:', allData[0]?.date);
      console.log('Last date:', allData[allData.length - 1]?.date);

      setData(allData);
    } catch (error) {
      console.error('Error fetching price data:', error);
      setError('Error fetching price data');
    } finally {
      setIsLoading(false);
    }
  };

  const processedData = useMemo(() => {
    let runningSum = 0;
    let validPrices: number[] = [];
    
    return data.map((item, index) => {
      const combinedPrice = (item.hex_price || 0) + (item.ehex_price || 0);
      runningSum += combinedPrice;
      validPrices.push(combinedPrice);
      
      // Calculate median
      const sortedPrices = [...validPrices].sort((a, b) => a - b);
      const mid = Math.floor(sortedPrices.length / 2);
      const median = sortedPrices.length % 2 !== 0 
        ? sortedPrices[mid] 
        : (sortedPrices[mid - 1] + sortedPrices[mid]) / 2;

      return {
        ...item,
        combined_price: combinedPrice,
        average_price: runningSum / (index + 1),
        median_price: median
      };
    });
  }, [data]);

  useEffect(() => {
    if (!isLoading && data.length > 0) {
      const timer = setTimeout(() => {
        setIsChartReady(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, data]);

  if (error) {
    return <div className="text-center text-red-500">Error: {error}</div>;
  }

  return (
    <div className="w-full h-[550px] sm:h-[450px] md:h-[400px] lg:h-[450px] my-10 relative">
      {!isChartReady ? (
        <Skeleton variant="chart" />
      ) : (
        <div className="w-full h-full p-5 bg-black border border-white/20 rounded-xl text-white">
          <div className="flex justify-between items-start mb-2.5 px-6">
            <h2 className="text-xl font-semibold ml-2">
              Combined HEX Price (All-Time Median & Average)
            </h2>
          </div>
          
          <div className="w-full h-[calc(100%-60px)]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={processedData}
                margin={{ top: 20, right: 0, left: 0, bottom: 20 }}
              >
                <CartesianGrid 
                  strokeDasharray="3 3" 
                  stroke="rgba(136, 136, 136, 0.2)" 
                  vertical={false} 
                />          <XAxis
                dataKey="date"
                type="category"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#888', fontSize: 12, dy: 4 }}
                ticks={[data[0]?.date, data[data.length - 1]?.date]}
                tickFormatter={(dateStr) => {
                  const date = new Date(dateStr);
                  return date.toLocaleDateString('en-US', {
                    month: 'short',
                    year: 'numeric'
                  });
                }}
              />
                <YAxis
                  scale="log"
                  domain={[0.0001, 1]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#888', fontSize: 12 }}
                  tickFormatter={(value) => `$${value.toFixed(4)}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '5px'
                  }}
                  labelStyle={{ color: 'white' }}
                  formatter={(value: number, name: string) => [
                    `$${value.toFixed(4)}`,
                    name
                  ]}
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                />
                <Line
                  type="monotone"
                  dataKey="average_price"
                  name="Average Price"
                  stroke="#8B6B23"
                  dot={false}
                  strokeWidth={2}
                  connectNulls={true}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="median_price"
                  name="Median Price"
                  stroke="#4A6F8F"
                  dot={false}
                  strokeWidth={2}
                  connectNulls={true}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="combined_price"
                  name="Combined Price"
                  stroke="#FFFFFF"
                  dot={false}
                  strokeWidth={2}
                  connectNulls={true}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default CombinedHexChartMovingAvg;
