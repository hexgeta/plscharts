import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Skeleton } from "@/components/ui/skeleton2";

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
        {[...payload].reverse().map((entry, index) => (
          entry.value && (
            <p key={index} style={{ color: 'white', margin: '3px 0' }}>
              <span style={{ color: entry.color }}>●</span>
              {` ${entry.name}: $${Number(entry.value).toFixed(3)}`}
            </p>
          )
        ))}
      </div>
    );
  }
  return null;
};

function PriceChart({ 
  tableName = 'maxi_prices',
  title = 'Price Chart',
}) {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChartReady, setIsChartReady] = useState(false);
  const [visibleLines, setVisibleLines] = useState({
    pHEX: true,
    pMAXI: true,
    pDECI: true,
    pLUCKY: true,
    pTRIO: true,
    pBASE: true
  });

  const handleLegendClick = (dataKey: string) => {
    setVisibleLines(prev => ({
      ...prev,
      [dataKey]: !prev[dataKey]
    }));
  };

  const customLegend = (props: any) => {
    const { payload } = props;
    
    if (payload && data.length > 0) {
      const latestData = data[data.length - 1];

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
            {[...payload].reverse().map((entry: any, index: number) => {
              const value = latestData[entry.dataKey];
              const formattedValue = value !== undefined ? `($${Number(value).toFixed(3)})` : '';
              
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
                    {entry.value} {formattedValue}
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        console.log('Attempting to connect to Supabase...');
        
        const { data: response, error } = await supabase
          .from('maxi_prices')
          .select('Date, pHEX, pMAXI, pDECI, pLUCKY, pTRIO, pBASE')
          .order('Date', { ascending: true });
        
        if (error) {
          console.error('Supabase query error:', error);
          throw error;
        }

        const formattedData = response.map((item) => ({
          date: new Date(item.Date).toLocaleDateString(),
          pHEX: item.pHEX ? parseFloat(item.pHEX) : null,
          pMAXI: item.pMAXI ? parseFloat(item.pMAXI) : null,
          pDECI: item.pDECI ? parseFloat(item.pDECI) : null,
          pLUCKY: item.pLUCKY ? parseFloat(item.pLUCKY) : null,
          pTRIO: item.pTRIO ? parseFloat(item.pTRIO) : null,
          pBASE: item.pBASE ? parseFloat(item.pBASE) : null
        }));
        
        setData(formattedData);
      } catch (error) {
        console.error('Fatal error in fetchData:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [tableName]);

  useEffect(() => {
    if (!isLoading && data.length > 0) {
      const timer = setTimeout(() => {
        setIsChartReady(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, data]);

  return (
    <div className="w-full h-[450px] my-10 relative">
      {!isChartReady ? (
        <Skeleton variant="chart" />
      ) : (
        <div style={{ width: '100%', height: '100%', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '15px' }}>
          <ResponsiveContainer width="100%" height="100%" debounce={1}>
            <LineChart data={data} margin={{ top: 30, right: 20, left: 20, bottom: 60 }}>
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
                ticks={[data[0]?.date, data[data.length - 1]?.date]}
                tickFormatter={(value) => {
                  const date = new Date(value);
                  return date.toLocaleDateString('en-US', { 
                    month: 'short',
                    year: 'numeric'
                  });
                }}
              />
              <YAxis 
                scale="log"
                domain={['auto', 'auto']}
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#888', fontSize: 14, dx: -5}}
                tickFormatter={(value) => `$${value.toFixed(2)}`}
                ticks={[0.001, 0.010, 0.020, 0.050, 0.100, 0.200, 0.500]}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend content={customLegend} />
              
              <Line 
                type="monotone" 
                dataKey="pBASE" 
                name="pBASE" 
                dot={false} 
                strokeWidth={1} 
                stroke="#F09B1A"
                connectNulls={false}
                hide={!visibleLines.pBASE}
              />
              <Line 
                type="monotone" 
                dataKey="pTRIO" 
                name="pTRIO" 
                dot={false} 
                strokeWidth={1} 
                stroke="white"
                connectNulls={false}
                hide={!visibleLines.pTRIO}
              />
              <Line 
                type="monotone" 
                dataKey="pLUCKY" 
                name="pLUCKY" 
                dot={false} 
                strokeWidth={1} 
                stroke="#416F22"
                connectNulls={false}
                hide={!visibleLines.pLUCKY}
              />
              <Line 
                type="monotone" 
                dataKey="pDECI" 
                name="pDECI" 
                dot={false} 
                strokeWidth={1} 
                stroke="#C24C35"
                connectNulls={false}
                hide={!visibleLines.pDECI}
              />
              <Line 
                type="monotone" 
                dataKey="pMAXI" 
                name="pMAXI" 
                dot={false} 
                strokeWidth={1} 
                stroke="#3991ED"
                connectNulls={false}
                hide={!visibleLines.pMAXI}
              />
              <Line 
                type="monotone" 
                dataKey="pHEX" 
                name="pHEX" 
                dot={false} 
                strokeWidth={1} 
                stroke="#FF00FF"
                connectNulls={false}
                hide={!visibleLines.pHEX}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default PriceChart;