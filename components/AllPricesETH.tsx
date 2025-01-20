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
        backgroundColor: 'rgba(0, 0, 0, 0.87)', 
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

function AllPricesETH({ 
  tableName = 'historic_prices',
  title = 'Ethereum Prices',
}) {
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isChartReady, setIsChartReady] = useState(false);
  const [visibleLines, setVisibleLines] = useState({
    eHEX: true,
    eMAXI: true,
    eDECI: true,
    eLUCKY: true,
    eTRIO: true,
    eBASE: true
  });
  const [page, setPage] = useState(1);
  const itemsPerPage = 100;

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
          .from(tableName)
          .select('date, ehex_price, emaxi_price, edeci_price, elucky_price, etrio_price, ebase_price')
          .not('emaxi_price', 'is', null)
          .order('date', { ascending: true });
        
        if (error) {
          console.error('Supabase query error:', error);
          throw error;
        }

        const formattedData = response.map((item) => ({
          date: new Date(item.date).toLocaleDateString(),
          eHEX: item.ehex_price ? parseFloat(item.ehex_price) : null,
          eMAXI: item.emaxi_price ? parseFloat(item.emaxi_price) : null,
          eDECI: item.edeci_price ? parseFloat(item.edeci_price) : null,
          eLUCKY: item.elucky_price ? parseFloat(item.elucky_price) : null,
          eTRIO: item.etrio_price ? parseFloat(item.etrio_price) : null,
          eBASE: item.ebase_price ? parseFloat(item.ebase_price) : null
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
          <div style={{ display: 'flex', alignItems: 'center', marginLeft: '20px', marginBottom: '0px' }}>
            <h2 style={{ color: 'white', fontSize: '24px', margin: '0' }}>
              {title}
            </h2>
          </div>
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
                dataKey="eBASE" 
                name="eBASE" 
                dot={false} 
                strokeWidth={1} 
                stroke="#F09B1A"
                connectNulls={false}
                hide={!visibleLines.eBASE}
              />
              <Line 
                type="monotone" 
                dataKey="eTRIO" 
                name="eTRIO" 
                dot={false} 
                strokeWidth={1} 
                stroke="white"
                connectNulls={false}
                hide={!visibleLines.eTRIO}
              />
              <Line 
                type="monotone" 
                dataKey="eLUCKY" 
                name="eLUCKY" 
                dot={false} 
                strokeWidth={1} 
                stroke="#416F22"
                connectNulls={false}
                hide={!visibleLines.eLUCKY}
              />
              <Line 
                type="monotone" 
                dataKey="eDECI" 
                name="eDECI" 
                dot={false} 
                strokeWidth={1} 
                stroke="#C24C35"
                connectNulls={false}
                hide={!visibleLines.eDECI}
              />
              <Line 
                type="monotone" 
                dataKey="eMAXI" 
                name="eMAXI" 
                dot={false} 
                strokeWidth={1} 
                stroke="#3991ED"
                connectNulls={false}
                hide={!visibleLines.eMAXI}
              />
              <Line 
                type="monotone" 
                dataKey="eHEX" 
                name="eHEX" 
                dot={false} 
                strokeWidth={1} 
                stroke="#FF00FF"
                connectNulls={false}
                hide={!visibleLines.eHEX}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default AllPricesETH;