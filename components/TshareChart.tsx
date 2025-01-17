import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface TShareData {
  date: string;
  totalTshares: number;
}

const TSharesChart: React.FC = () => {
  const [data, setData] = useState<TShareData[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get('https://hexdailystats.com/fulldatapulsechain');
        const pulsechainData = response.data;

        const formattedData = pulsechainData.map((item: any) => ({
          date: new Date(item.date).toISOString().split('T')[0],
          totalTshares: Number(item.totalTshares) || 0
        })).reverse(); // Reverse to show oldest data first

        setData(formattedData);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };

    fetchData();
  }, []);

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${year}-${month}-${day}`;
  };

  return (
    <div style={{ width: '100%', height: '450px', backgroundColor: '#000', padding: '20px'}}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 20, right: 30, left: 50, bottom: 20 }}
        >
          <XAxis 
            dataKey="date" 
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#888' }}
            tickFormatter={(tick) => formatDate(tick)}
          />
          <YAxis 
            stroke="#888" 
            domain={['auto', 'auto']}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#888' }}
            scale="log"
          />
          <Tooltip 
            contentStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.85)', border: 'solid 1px rgba(255, 255, 255, 0.2)', borderRadius: '5px'}}
            labelStyle={{ color: 'white' }}
            formatter={(value: number) => [value.toFixed(2), 'Total T-Shares']}
            labelFormatter={(label) => formatDate(label)}
          />
          <Line 
            type="monotone" 
            dataKey="totalTshares" 
            name="Total T-Shares"
            stroke="#FFFFFF"
            dot={false} 
            strokeWidth={2}
            connectNulls={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TSharesChart;