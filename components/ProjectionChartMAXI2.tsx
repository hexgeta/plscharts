import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { Skeleton } from "@/components/ui/skeleton2";
import { CumBackingValueMAXIV2 } from '@/hooks/CumBackingValueMAXIV2';

interface ProjectionChartV2Props {
  title?: string;
}

interface ProjectionDataPoint {
  day: number;
  date: string;
  backingValue: number | null;
  discount: number | null;
  trendValue?: number;
  linearTrend?: number;
  sineTrend?: number;
}

interface ProjectionTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
}

// Custom tooltip component
const ProjectionTooltipV2 = ({ active, payload, label }: ProjectionTooltipProps) => {
  if (active && payload && payload.length) {
    const orderedPayload = [
      payload.find(p => p.dataKey === "backingValue"),    // Backing Value
      payload.find(p => p.dataKey === "discount"),        // Market Value
      payload.find(p => p.dataKey === "trendValue"),      // Projected Backing Value (Exponential)
      payload.find(p => p.dataKey === "sineTrend"),       // Market Oscillation
      payload.find(p => p.dataKey === "linearTrend"),     // Projected Backing Value (Linear)
    ].filter(Boolean);

    return (
      <div style={{ 
        backgroundColor: 'rgba(0, 0, 0, 0.85)', 
        border: '1px solid rgba(255, 255, 255, 0.2)', 
        borderRadius: '10px',
        padding: '10px'
      }}>
        <p style={{ color: 'white', margin: '0 0 5px' }}>{`Day: ${label}`}</p>
        {orderedPayload.map((entry, index) => (
          entry && (
            <p key={index} style={{ color: 'white', margin: '3px 0' }}>
              <span style={{ color: entry.color }}>●</span>
              {` ${entry.name}: ${Number(entry.value).toFixed(2)}`}
            </p>
          )
        ))}
      </div>
    );
  }
  return null;
};

function ExtendedProjectionChart({ title = 'pMAXI Ⓜ️' }: ProjectionChartV2Props) {
  const { data, error, isLoading } = CumBackingValueMAXIV2();
  const [visibleLines, setVisibleLines] = useState({
    backingValue: true,
    discount: true,
    trendValue: true,
    linearTrend: false,
    sineTrend: true
  });

  const projectionXAxisTicks = useMemo(() => {
    const ticks: number[] = [];
    for (let day = 1000; day <= 5000; day += 500) {
      ticks.push(day);
    }
    ticks.push(5555);
    return ticks;
  }, []);

  const handleProjectionLegendClick = (dataKey: string) => {
    setVisibleLines(prev => ({
      ...prev,
      [dataKey]: !prev[dataKey]
    }));
  };

  const projectionLegend = (props: any) => {
    const { payload } = props;
    
    const orderedLegendItems = [
      payload.find(p => p.dataKey === "backingValue"),    // Backing Value
      payload.find(p => p.dataKey === "discount"),        // Market Value
      payload.find(p => p.dataKey === "trendValue"),      // Projected Backing Value (Exponential)
      payload.find(p => p.dataKey === "sineTrend"),       // Market Oscillation
      payload.find(p => p.dataKey === "linearTrend"),     // Projected Backing Value (Linear)
    ].filter(Boolean);

    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        width: '100%', 
        marginTop: '40px',
        marginBottom: '0px'
      }}>
        <ul style={{ 
          listStyle: 'none', 
          padding: 0, 
          display: 'flex', 
          flexWrap: 'wrap', 
          justifyContent: 'center',
          gap: '24px'
        }}>
          {orderedLegendItems.map((entry: any, index: number) => (
            <li 
              key={`item-${index}`}
              style={{ 
                display: 'inline-flex', 
                alignItems: 'center',
                cursor: 'pointer' 
              }}
              onClick={() => handleProjectionLegendClick(entry.dataKey)}
            >
              <span style={{ 
                color: entry.color, 
                marginRight: 5,
                fontSize: '24px',
                lineHeight: '1',
                display: 'flex',
                alignItems: 'center'
              }}>●</span>
              <span style={{ 
                color: visibleLines[entry.dataKey as keyof typeof visibleLines] ? '#fff' : '#888',
                fontSize: '12px',
                lineHeight: '1'
              }}>
                {entry.value}
              </span>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  if (error) {
    return <div>Error loading projection data</div>;
  }

  return (
    <div className="w-full h-[450px] my-10 relative">
      {isLoading ? (
        <Skeleton variant="chart" />
      ) : (
        <div style={{ width: '100%', height: '100%', padding: '20px', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '15px' }}>
          <h2 style={{ textAlign: 'left', color: 'white', fontSize: '24px', marginBottom: '0px', marginLeft: '40px'}}>
            {title}</h2>
          <ResponsiveContainer width="100%" height="100%" debounce={1}>
            <LineChart data={data} margin={{ top: 30, right: 20, left: 20, bottom: 60 }}>
              <CartesianGrid 
                strokeDasharray="3 3" 
                stroke="rgba(136, 136, 136, 0.2)" 
                vertical={false} 
              />
              <XAxis 
                dataKey="day" 
                axisLine={{ stroke: '#888', strokeWidth: 0 }}
                tickLine={{ stroke: '#888', strokeWidth: 0}}
                tick={{ fill: '#888', fontSize: 14, dy: 5 }}
                ticks={projectionXAxisTicks}
                domain={[881, 5555]}
                type="number"
                allowDataOverflow={true}
                scale="linear"
                label={{ 
                  value: 'DAY', 
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
                domain={[0, 25]}
                ticks={[0, 1, 5, 10, 15, 20, 25]}
                axisLine={false}
                tickLine={{ stroke: '#888', strokeWidth: 0 }}
                tick={{ fill: '#888', fontSize: 14, dx: -5}}
                tickFormatter={(value) => `${value.toFixed(0)}`}
                label={{ 
                  value: 'HEX', 
                  position: 'left',
                  angle: -90,
                  offset: 0,
                  style: { 
                    fill: '#888',
                    fontSize: 12,
                    marginTop: '0px',
                  }
                }}
              />
              <Tooltip content={<ProjectionTooltipV2 />} />
              <Legend content={projectionLegend} />
              <Line 
                type="linear"
                dataKey="linearTrend"
                name="Projected Backing Value (Linear)"
                dot={false}
                strokeWidth={2}
                stroke="#474747"
                activeDot={{ r: 4, fill: '#474747', stroke: 'white' }}
                hide={!visibleLines.linearTrend}
                connectNulls={false}
                isAnimationActive={true}
              />
              <Line 
                type="monotone"
                dataKey="trendValue"
                name="Projected Backing Value (Exp.)"
                dot={false}
                strokeWidth={2}
                stroke="#23411F"
                activeDot={{ r: 4, fill: '#23411F', stroke: 'white' }}
                connectNulls={false}
                isAnimationActive={true}
                hide={!visibleLines.trendValue}
              />
              <Line 
                type="monotone"
                dataKey="sineTrend"
                name="Projected Market Value (Exp.)"
                dot={false}
                strokeWidth={2}
                stroke="#132B47"
                activeDot={{ r: 4, fill: '#132B47', stroke: 'white' }}
                connectNulls={false}
                isAnimationActive={true}
                hide={!visibleLines.sineTrend}
              />
              <Line 
                type="monotone" 
                dataKey="backingValue" 
                name="Backing Value" 
                dot={false} 
                strokeWidth={2} 
                stroke='rgba(112, 214, 104)'
                activeDot={{ r: 4, fill: 'rgba(112, 214, 104)', stroke: 'white' }}
                connectNulls={false}
                isAnimationActive={true}
                hide={!visibleLines.backingValue}
              />
              <Line 
                type="monotone" 
                dataKey="discount" 
                name="Market Value" 
                dot={false} 
                strokeWidth={2} 
                stroke='#3991ED'
                activeDot={{ r: 4, fill: '#3991ED', stroke: 'white' }}
                hide={!visibleLines.discount}
                connectNulls={false}
                isAnimationActive={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

export default ExtendedProjectionChart;