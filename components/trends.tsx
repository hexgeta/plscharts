"use client"

import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from 'recharts';
import axios from 'axios';

interface TrendsData {
  date: string;
  searchInterest: number;
  term: string;
}

const LuxuryTrends: React.FC = () => {
  const [data, setData] = useState<TrendsData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerms] = useState([
    "Speedy P9 Louis Vuitton",
    "LV Speedy bag",
    "Louis Vuitton SS24"
  ]);

  useEffect(() => {
    const fetchTrendsData = async () => {
      try {
        // You'll need to set up a backend API endpoint that interfaces with Google Trends
        const response = await axios.get('/api/trends', {
          params: {
            terms: searchTerms,
            startTime: '2023-01-01'
          }
        });

        const formattedData = response.data.map((item: any) => ({
          date: item.date,
          searchInterest: item.value,
          term: item.term
        }));

        setData(formattedData);
        setIsLoading(false);
      } catch (err) {
        setError('Failed to fetch trends data');
        setIsLoading(false);
      }
    };

    fetchTrendsData();
  }, [searchTerms]);

  if (isLoading) {
    return <div className="text-center text-white">Loading...</div>;
  }

  if (error) {
    return <div className="text-center text-red-500">Error: {error}</div>;
  }

  return (
    <div style={{ width: '100%', height: '450px', backgroundColor: '#000', padding: '20px', color: '#fff', position: 'relative' }}>
      <ResponsiveContainer width="100%" height="90%">
        <LineChart
          data={data}
          margin={{ top: 15, right: 30, left: 20, bottom: 20 }}
        >
          <XAxis 
            dataKey="date" 
            stroke="#888"
            tickLine={{ stroke: '#333' }}
            tick={{ fill: '#888', fontSize: 14 }}
            tickFormatter={(date) => new Date(date).toLocaleDateString('en-UK', { 
              month: 'short',
              year: '2-digit'
            })}
          />
          <YAxis 
            stroke="#888"
            tickLine={false}
            tick={{ fill: '#888', fontSize: 14 }}
            label={{ value: 'Search Interest', angle: -90, position: 'insideLeft', fill: '#888' }}
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
              color: '#fff'
            }}
            formatter={(value: number, name: string) => [`Interest: ${value}`, name]}
            labelFormatter={(label) => new Date(label).toLocaleDateString('en-UK', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
          />
          <Legend />
          {searchTerms.map((term, index) => (
            <Line 
              key={term}
              type="monotone" 
              dataKey={(item) => item.term === term ? item.searchInterest : null}
              name={term}
              stroke={`hsl(${(index * 360) / searchTerms.length}, 70%, 50%)`}
              strokeWidth={2}
              dot={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default LuxuryTrends;

