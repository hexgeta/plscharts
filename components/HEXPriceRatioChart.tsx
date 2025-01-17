import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid } from 'recharts';

interface PriceData {
  date: string;
  priceRatio: number | null;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
  }>;
  label?: string;
}

const HEXPriceRatioChart: React.FC = () => {
  const [data, setData] = useState<PriceData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [pulsechainResponse, ethereumResponse] = await Promise.all([
          axios.get('https://hexdailystats.com/fulldatapulsechain'),
          axios.get('https://hexdailystats.com/fulldata')
        ]);

        const pulsechainData = pulsechainResponse.data;
        const ethereumData = ethereumResponse.data;

        const ethereumMap = new Map(ethereumData.map((item: any) => [
          new Date(item.date).toISOString().split('T')[0],
          Number(item.priceUV2UV3)
        ]));

        const formattedData = pulsechainData.map((item: any) => {
          const dateStr = new Date(item.date).toISOString().split('T')[0];
          const pricePulseX = Number(item.pricePulseX) || null;
          const priceEthereum = ethereumMap.get(dateStr) || null;

          let priceRatio = null;
          if (pricePulseX && priceEthereum && pricePulseX > 0) {
            priceRatio = pricePulseX / priceEthereum;
          }

          return {
            date: dateStr,
            priceRatio: priceRatio
          };
        });

        formattedData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setData(formattedData.filter(item => item.priceRatio !== null));
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [year, month, day] = dateStr.split('-');
    return `${year}-${month}-${day}`;
  };

  const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
    if (active && payload && payload.length && label) {
      const ratio = Number(payload[0].value).toFixed(4);
      return (
        <div style={{ 
          backgroundColor: 'rgba(0, 0, 0, 0.85)', 
          border: 'solid 1px rgba(255, 255, 255, 0.2)', 
          borderRadius: '5px',
          padding: '10px',
          color: 'white'
        }}>
          <p>{formatDate(label)}</p>
          <p>1 eHEX = {ratio} pHEX</p>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div style={{ width: '100%', height: '450px', backgroundColor: '#000', padding: '0px'}}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 10, right: 0, left: 0, bottom: 60 }}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="rgba(136, 136, 136, 0.2)" 
            vertical={true} 
          />
          <XAxis 
            dataKey="date" 
            axisLine={false}
            tickLine={false}
            tick={false}
          />
          <YAxis 
            stroke="#888" 
            domain={[0, 10]}
            axisLine={false}
            tickLine={{ stroke: '#888', strokeWidth: 0 }}
            tick={{ fill: '#888', fontSize: 14, dx: -5}}
            ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
          />
          <Tooltip 
            content={<CustomTooltip formatDate={formatDate} />} 
            labelStyle={{ color: 'white' }}
            formatter={(value, name, props) => {
              if (value !== null) {
                const ratio = Number(value).toFixed(4);
                return [`1 eHEX = ${ratio} pHEX`, ''];
              }
              return ['N/A', ''];
            }}
            labelFormatter={(label) => formatDate(label)}
          />
          <Line 
            type="monotone" 
            dataKey="priceRatio" 
            name="eHEX:pHEX Price Ratio"
            stroke="#FFFFFF" 
            dot={false} 
            strokeWidth={2}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default HEXPriceRatioChart;