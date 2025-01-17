import { useState, useEffect, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '../supabaseClient';
import { Skeleton } from "@/components/ui/skeleton2";

interface PriceData {
  date: string;
  ehex_price: number;
  hex_price: number;
  combined_price?: number;
}

const CombinedHexChartSplit = () => {
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

        hasMore = priceData && priceData.length === pageSize;
      }

      setData(allData);
    } catch (error) {
      console.error('Error fetching price data:', error);
      setError('Error fetching price data');
    } finally {
      setIsLoading(false);
    }
  };

  const processedData = useMemo(() => {
    return data.map(item => ({
      ...item,
      combined_price: (item.hex_price || 0) + (item.ehex_price || 0)
    }));
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
              Combined HEX Price (Split by Token)
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
                    name.replace(' Price', '')
                  ]}
                  labelFormatter={(date) => new Date(date).toLocaleDateString()}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="hex_price"
                  name="pHEX Price"
                  stroke="#FF00FF"
                  dot={false}
                  strokeWidth={2}
                  connectNulls={true}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="ehex_price"
                  name="eHEX Price"
                  stroke="#00FFFF"
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

export default CombinedHexChartSplit;
